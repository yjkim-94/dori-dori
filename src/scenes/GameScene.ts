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

type SpriteMap<T> = Map<T, PIXI.Container>

type TrailParticle = {
  g: PIXI.Graphics
  life: number       // ms remaining
  maxLife: number
}

// 발사체 색상 (기본 파랑, 피버 중 주황)
const PROJ_COLOR_NORMAL = 0x44aaff
const PROJ_COLOR_CORE   = 0xddeeff

export class GameScene implements Scene {
  readonly container: PIXI.Container
  private trailLayer: PIXI.Container  // 발사체 뒤 궤적 레이어 (z-order 낮게)
  private player: Player
  private loop: GameLoop
  private hud: HUD
  private enemySprites: SpriteMap<EnemyBase> = new Map()
  private projectileSprites: SpriteMap<Projectile> = new Map()
  private itemSprites: SpriteMap<Item> = new Map()
  private trailParticles: TrailParticle[] = []
  private faceDetected = true
  private resumeCountdownStart: number | null = null
  private fireTimer = 0
  private ticker: PIXI.Ticker
  private score = 0
  private isFever = false

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

    // 궤적 레이어는 발사체/적 아래에 렌더링
    this.trailLayer = new PIXI.Container()
    this.container.addChild(this.trailLayer)

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
      onGameOver: () => setTimeout(() => this.onGameOverCb(this.score), 0),
      onFeverChange: (active) => {
        this.isFever = active
        this.hud.setFeverBorder(active)
      },
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
      this.updateTrails(deltaMs)
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
        this.updateTrails(deltaMs)
        return
      }
      this.hud.showCountdown(0)
      this.resumeCountdownStart = null
      this.loop.resume()
    }

    this.fireTimer += deltaMs
    if (this.fireTimer >= this.loop.currentFireInterval) {
      this.fireTimer = 0
      this.loop.fire(this.player.crownX, this.player.crownY, -face.yaw)
    }

    this.loop.update(deltaMs, face.yaw, this.player.getBounds())
    this.syncSprites()
    this.updateTrails(deltaMs)
  }

  private syncSprites(): void {
    this.enemySprites.forEach((sprite, enemy) => {
      sprite.x = enemy.x
      sprite.y = enemy.y
    })
    this.projectileSprites.forEach((sprite, p) => {
      // 궤적 파티클 방출
      this.emitTrail(p.x, p.y, p.radius)
      sprite.x = p.x
      sprite.y = p.y
    })
    this.itemSprites.forEach((sprite, item) => {
      sprite.x = item.x
      sprite.y = item.y
    })
  }

  // 발사체 위치에 궤적 파티클 하나 생성
  private emitTrail(x: number, y: number, radius: number): void {
    const color = this.isFever ? 0xff8800 : PROJ_COLOR_NORMAL
    const size = (radius * 0.6) * (0.5 + Math.random() * 0.5)
    const g = new PIXI.Graphics()
    g.circle(0, 0, size).fill({ color, alpha: 0.7 })
    // 살짝 랜덤 오프셋으로 자연스러운 궤적
    g.x = x + (Math.random() - 0.5) * radius
    g.y = y + (Math.random() - 0.5) * radius

    const maxLife = 220 + Math.random() * 120
    this.trailLayer.addChild(g)
    this.trailParticles.push({ g, life: maxLife, maxLife })
  }

  // 매 프레임 궤적 파티클 알파 감소 후 제거
  private updateTrails(deltaMs: number): void {
    const toRemove: TrailParticle[] = []
    for (const t of this.trailParticles) {
      t.life -= deltaMs
      if (t.life <= 0) {
        toRemove.push(t)
      } else {
        t.g.alpha = t.life / t.maxLife
        // 파티클이 약간 위로 흘러올라가는 느낌
        t.g.y -= 0.3
        t.g.scale.set(t.g.scale.x * 0.98)
      }
    }
    for (const t of toRemove) {
      this.trailLayer.removeChild(t.g)
      t.g.destroy()
    }
    this.trailParticles = this.trailParticles.filter(t => t.life > 0)
  }

  private addEnemySprite(enemy: EnemyBase): void {
    const colors: Record<string, number> = {
      normal: 0xff4455,
      heavy: 0xff8800,
      zigzag: 0xee44ff,
      boss: 0xff2200,
    }
    const color = colors[enemy.type] ?? 0xff0000
    const r = enemy.width / 2

    const c = new PIXI.Container()

    // 외곽 발광
    const outerGlow = new PIXI.Graphics()
    outerGlow.circle(0, 0, r * 1.6).fill({ color, alpha: 0.15 })
    outerGlow.filters = [new PIXI.BlurFilter({ strength: 6, quality: 2 })]

    // 몸체
    const body = new PIXI.Graphics()
    body.circle(0, 0, r).fill({ color })

    // 하이라이트
    const shine = new PIXI.Graphics()
    shine.circle(-r * 0.3, -r * 0.3, r * 0.35).fill({ color: 0xffffff, alpha: 0.25 })

    c.addChild(outerGlow, body, shine)
    c.x = enemy.x
    c.y = enemy.y
    this.enemySprites.set(enemy, c)
    this.container.addChild(c)
  }

  private addProjectileSprite(p: Projectile): void {
    const color = this.isFever ? 0xff6600 : PROJ_COLOR_NORMAL
    const r = p.radius

    const c = new PIXI.Container()

    // 가장 바깥 블러 글로우
    const outerGlow = new PIXI.Graphics()
    outerGlow.circle(0, 0, r * 3.5).fill({ color, alpha: 0.12 })
    outerGlow.filters = [new PIXI.BlurFilter({ strength: 10, quality: 3 })]

    // 중간 글로우
    const midGlow = new PIXI.Graphics()
    midGlow.circle(0, 0, r * 2).fill({ color, alpha: 0.35 })
    midGlow.filters = [new PIXI.BlurFilter({ strength: 5, quality: 2 })]

    // 코어 (밝은 흰빛)
    const core = new PIXI.Graphics()
    core.circle(0, 0, r).fill({ color: PROJ_COLOR_CORE })

    // 코어 중심 하이라이트
    const highlight = new PIXI.Graphics()
    highlight.circle(-r * 0.25, -r * 0.25, r * 0.4).fill({ color: 0xffffff, alpha: 0.8 })

    c.addChild(outerGlow, midGlow, core, highlight)
    c.x = p.x
    c.y = p.y
    this.projectileSprites.set(p, c)
    this.container.addChild(c)
  }

  private addItemSprite(item: Item): void {
    const colors: Record<string, number> = {
      rapidFire: 0xffff44,
      damage: 0xff6644,
      size: 0x44ffaa,
    }
    const color = colors[item.buff] ?? 0xffffff

    const c = new PIXI.Container()

    const glow = new PIXI.Graphics()
    glow.circle(0, 0, 20).fill({ color, alpha: 0.3 })
    glow.filters = [new PIXI.BlurFilter({ strength: 8, quality: 2 })]

    const star = new PIXI.Graphics()
    star.star(0, 0, 5, 14, 7).fill({ color })

    c.addChild(glow, star)
    c.x = item.x
    c.y = item.y
    this.itemSprites.set(item, c)
    this.container.addChild(c)
  }

  private removeSprite<T>(map: SpriteMap<T>, key: T): void {
    const sprite = map.get(key)
    if (sprite) {
      this.container.removeChild(sprite)
      sprite.destroy({ children: true })
      map.delete(key)
    }
  }

  destroy(): void {
    this.ticker.destroy()
    this.loop.stop()
    this.player.destroy()
    this.hud.destroy()
    this.trailParticles.forEach(t => t.g.destroy())
    this.trailParticles = []
    this.enemySprites.forEach(s => s.destroy({ children: true }))
    this.projectileSprites.forEach(s => s.destroy({ children: true }))
    this.itemSprites.forEach(s => s.destroy({ children: true }))
    this.container.destroy({ children: true })
  }
}
