import * as PIXI from 'pixi.js'
import type { Scene } from '../SceneManager'
import { FaceTracker } from '../tracking/FaceTracker'
import { Player } from '../game/Player'
import { GameLoop } from '../game/GameLoop'
import { HUD } from '../ui/HUD'
import { GAME } from '../constants'
import type { EnemyBase } from '../game/Enemy'
import type { Projectile } from '../game/Projectile'
import type { Item, BuffType } from '../game/Item'

type SpriteMap<T> = Map<T, PIXI.Graphics>

export class GameScene implements Scene {
  readonly container: PIXI.Container
  private player: Player
  private loop: GameLoop
  private hud: HUD
  private enemySprites: SpriteMap<EnemyBase> = new Map()
  private projectileSprites: SpriteMap<Projectile> = new Map()
  private itemSprites: SpriteMap<Item> = new Map()
  private faceDetected = true
  private resumeCountdownStart: number | null = null
  private fireTimer = 0
  private ticker: PIXI.Ticker
  private score = 0

  constructor(
    private app: PIXI.Application,
    private tracker: FaceTracker,
    private video: HTMLVideoElement,
    private onGameOverCb: (score: number) => void
  ) {
    const W = app.screen.width
    const H = app.screen.height
    this.container = new PIXI.Container()

    const bg = new PIXI.Graphics()
    bg.rect(0, 0, W, H).fill({ color: 0x050510 })
    this.container.addChild(bg)

    this.player = new Player(app, video)
    this.container.addChild(this.player.container)

    this.hud = new HUD(app)
    this.container.addChild(this.hud.container)

    this.loop = new GameLoop(W, H, {
      onScoreChange: (s) => { this.score = s; this.hud.updateScore(s) },
      onComboChange: (c, _f) => { this.hud.updateCombo(c) },
      onEnemyAdded: (e) => this.addEnemySprite(e),
      onEnemyRemoved: (e) => this.removeSprite(this.enemySprites, e),
      onProjectileAdded: (p) => this.addProjectileSprite(p),
      onProjectileRemoved: (p) => this.removeSprite(this.projectileSprites, p),
      onItemAdded: (i) => this.addItemSprite(i),
      onItemRemoved: (i) => this.removeSprite(this.itemSprites, i),
      onBuffApplied: (_b: BuffType) => {},
      onGameOver: () => this.onGameOverCb(this.score),
      onFeverChange: (active) => this.hud.setFeverBorder(active),
    })
    this.loop.start()

    this.ticker = app.ticker.add((ticker) => this.tick(ticker.deltaMS))
  }

  private tick(deltaMs: number): void {
    const now = performance.now()
    const face = this.tracker.detect(now)

    if (!face.detected) {
      if (this.faceDetected) {
        this.faceDetected = false
        this.loop.pause()
        this.hud.showFaceNotDetected(true)
        this.resumeCountdownStart = null
      }
      return
    }

    if (!this.faceDetected) {
      this.faceDetected = true
      this.hud.showFaceNotDetected(false)
      this.resumeCountdownStart = now
    }

    if (this.resumeCountdownStart !== null) {
      const elapsed = now - this.resumeCountdownStart
      const remain = (GAME.RESUME_COUNTDOWN_MS - elapsed) / 1000
      if (remain > 0) {
        this.hud.showCountdown(remain)
        return
      }
      this.hud.showCountdown(0)
      this.resumeCountdownStart = null
      this.loop.resume()
    }

    this.fireTimer += deltaMs
    if (this.fireTimer >= this.loop.currentFireInterval) {
      this.fireTimer = 0
      this.loop.fire(this.player.crownX, this.player.crownY, face.yaw)
    }

    this.loop.update(deltaMs, face.yaw, this.player.getBounds())
    this.syncSprites()
  }

  private syncSprites(): void {
    this.enemySprites.forEach((sprite, enemy) => {
      sprite.x = enemy.x
      sprite.y = enemy.y
    })
    this.projectileSprites.forEach((sprite, p) => {
      sprite.x = p.x
      sprite.y = p.y
    })
    this.itemSprites.forEach((sprite, item) => {
      sprite.x = item.x
      sprite.y = item.y
    })
  }

  private addEnemySprite(enemy: EnemyBase): void {
    const colors: Record<string, number> = {
      normal: 0xff4455,
      heavy: 0xff8800,
      zigzag: 0xee44ff,
      boss: 0xff2200,
    }
    const g = new PIXI.Graphics()
    g.circle(0, 0, enemy.width / 2).fill({ color: colors[enemy.type] ?? 0xff0000 })
    g.x = enemy.x
    g.y = enemy.y
    this.enemySprites.set(enemy, g)
    this.container.addChild(g)
  }

  private addProjectileSprite(p: Projectile): void {
    const g = new PIXI.Graphics()
    g.circle(0, 0, p.radius).fill({ color: 0x44aaff })
    // 발광 효과
    const glow = new PIXI.Graphics()
    glow.circle(0, 0, p.radius * 1.8).fill({ color: 0x2255ff, alpha: 0.3 })
    g.addChild(glow)
    g.x = p.x
    g.y = p.y
    this.projectileSprites.set(p, g)
    this.container.addChild(g)
  }

  private addItemSprite(item: Item): void {
    const colors: Record<string, number> = {
      rapidFire: 0xffff44,
      damage: 0xff6644,
      size: 0x44ffaa,
    }
    const g = new PIXI.Graphics()
    g.star(0, 0, 5, 14, 7).fill({ color: colors[item.buff] ?? 0xffffff })
    g.x = item.x
    g.y = item.y
    this.itemSprites.set(item, g)
    this.container.addChild(g)
  }

  private removeSprite<T>(map: SpriteMap<T>, key: T): void {
    const sprite = map.get(key)
    if (sprite) {
      this.container.removeChild(sprite)
      sprite.destroy()
      map.delete(key)
    }
  }

  destroy(): void {
    this.ticker.destroy()
    this.loop.stop()
    this.player.destroy()
    this.hud.destroy()
    this.enemySprites.forEach(s => s.destroy())
    this.projectileSprites.forEach(s => s.destroy())
    this.itemSprites.forEach(s => s.destroy())
    this.container.destroy({ children: true })
  }
}
