import { GAME } from '../constants'
import { createEnemy, type EnemyBase, type EnemyType } from './Enemy'
import { Projectile } from './Projectile'
import { Item, type BuffType } from './Item'
import { FeverSystem } from './FeverSystem'

export type GameLoopCallbacks = {
  onScoreChange: (score: number) => void
  onComboChange: (combo: number, isFever: boolean) => void
  onEnemyAdded: (enemy: EnemyBase) => void
  onEnemyRemoved: (enemy: EnemyBase) => void
  onProjectileAdded: (p: Projectile) => void
  onProjectileRemoved: (p: Projectile) => void
  onItemAdded: (item: Item) => void
  onItemRemoved: (item: Item) => void
  onBuffApplied: (buff: BuffType) => void
  onGameOver: () => void
  onFeverChange: (active: boolean) => void
}

type ActiveBuff = { type: BuffType; expiresAt: number } | null

const ENEMY_TYPES: EnemyType[] = ['normal', 'normal', 'normal', 'heavy', 'zigzag', 'boss']
const SPAWN_WEIGHT = [5, 5, 5, 3, 3, 1]

export class GameLoop {
  private enemies: EnemyBase[] = []
  private projectiles: Projectile[] = []
  private items: Item[] = []
  private fever = new FeverSystem()
  private score = 0
  private paused = false
  private stopped = false
  private spawnInterval: number
  private timeSinceSpawn = 0
  private elapsed = 0
  private activeBuff: ActiveBuff = null
  private feverTimer: ReturnType<typeof setTimeout> | null = null
  private prevFever = false

  constructor(
    private readonly screenWidth: number,
    private readonly screenHeight: number,
    private readonly cb: GameLoopCallbacks
  ) {
    this.spawnInterval = GAME.SPAWN_INTERVAL_START_MS
  }

  start(): void {
    this.paused = false
    this.stopped = false
  }

  pause(): void { this.paused = true }
  resume(): void { this.paused = false }

  stop(): void {
    this.stopped = true
    if (this.feverTimer) clearTimeout(this.feverTimer)
  }

  update(
    deltaMs: number,
    yaw: number,
    playerBounds: { x: number; y: number; width: number; height: number }
  ): void {
    if (this.paused || this.stopped) return
    this.elapsed += deltaMs
    this.updateDifficulty()
    this.updateSpawn(deltaMs)
    this.updateProjectiles(deltaMs)
    this.updateItems(deltaMs, playerBounds)
    this.updateEnemies(deltaMs, playerBounds)
    this.checkExpiredBuff()
    this.updateFeverState()
  }

  fire(x: number, y: number, yaw: number): void {
    if (this.paused || this.stopped) return
    if (this.projectiles.length >= GAME.MAX_PROJECTILES) return
    const damage = this.activeBuff?.type === 'damage' ? 1 + GAME.DAMAGE_BUFF_AMOUNT : 1
    const radiusMultiplier = this.activeBuff?.type === 'size' ? GAME.PROJECTILE_SIZE_BUFF_MULTIPLIER : 1
    const p = new Projectile(x, y, yaw, damage, radiusMultiplier)
    this.projectiles.push(p)
    this.cb.onProjectileAdded(p)
  }

  get currentFireInterval(): number {
    return this.activeBuff?.type === 'rapidFire'
      ? GAME.FIRE_INTERVAL_BUFFED_MS
      : GAME.FIRE_INTERVAL_MS
  }

  private updateDifficulty(): void {
    const progress = Math.min(this.elapsed / 120_000, 1)
    this.spawnInterval =
      GAME.SPAWN_INTERVAL_START_MS -
      (GAME.SPAWN_INTERVAL_START_MS - GAME.SPAWN_INTERVAL_MIN_MS) * progress
  }

  private updateSpawn(deltaMs: number): void {
    this.timeSinceSpawn += deltaMs
    if (this.timeSinceSpawn < this.spawnInterval) return
    if (this.enemies.length >= GAME.MAX_ENEMIES) return
    this.timeSinceSpawn = 0
    const type = this.pickEnemyType()
    const x = Math.random() * (this.screenWidth * 0.8) + this.screenWidth * 0.1
    const enemy = createEnemy(type, x, this.screenWidth)
    this.enemies.push(enemy)
    this.cb.onEnemyAdded(enemy)
  }

  private pickEnemyType(): EnemyType {
    const totalWeight = SPAWN_WEIGHT.reduce((a, b) => a + b, 0)
    let r = Math.random() * totalWeight
    for (let i = 0; i < ENEMY_TYPES.length; i++) {
      r -= SPAWN_WEIGHT[i]
      if (r <= 0) return ENEMY_TYPES[i]
    }
    return 'normal'
  }

  private updateProjectiles(deltaMs: number): void {
    for (const p of this.projectiles) {
      p.update(deltaMs)
      if (p.y < -50 || p.x < -50 || p.x > this.screenWidth + 50) p.alive = false
    }
    this.removeDeadProjectiles()
  }

  private updateEnemies(
    deltaMs: number,
    playerBounds: { x: number; y: number; width: number; height: number }
  ): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue
      enemy.update(deltaMs)

      if (this.overlaps(enemy.getBounds(), playerBounds)) {
        this.stop()
        this.cb.onGameOver()
        return
      }

      if (enemy.y > this.screenHeight + 50) {
        enemy.alive = false
        this.fever.onEnemyEscaped()
        this.cb.onComboChange(this.fever.combo, this.fever.isFever)
        continue
      }

      for (const p of this.projectiles) {
        if (!p.alive) continue
        if (this.overlaps(p.getBounds(), enemy.getBounds())) {
          p.alive = false
          const killed = enemy.takeDamage(p.damage)
          if (killed) {
            this.score += enemy.scoreValue * this.fever.scoreMultiplier
            this.cb.onScoreChange(this.score)
            this.fever.addKill()
            this.cb.onComboChange(this.fever.combo, this.fever.isFever)
            this.tryDropItem(enemy.x, enemy.y)
          }
        }
      }
    }

    const deadEnemies = this.enemies.filter(e => !e.alive)
    deadEnemies.forEach(e => this.cb.onEnemyRemoved(e))
    this.enemies = this.enemies.filter(e => e.alive)
    this.removeDeadProjectiles()
  }

  private updateItems(
    deltaMs: number,
    playerBounds: { x: number; y: number; width: number; height: number }
  ): void {
    for (const item of this.items) {
      item.update(deltaMs)
      if (item.y > this.screenHeight + 50) { item.alive = false; continue }
      if (this.overlaps(item.getBounds(), playerBounds)) {
        item.alive = false
        this.applyBuff(item.buff)
        this.cb.onBuffApplied(item.buff)
      }
    }
    const dead = this.items.filter(i => !i.alive)
    dead.forEach(i => this.cb.onItemRemoved(i))
    this.items = this.items.filter(i => i.alive)
  }

  private tryDropItem(x: number, y: number): void {
    if (Math.random() < GAME.ITEM_DROP_CHANCE) {
      const item = new Item(x, y)
      this.items.push(item)
      this.cb.onItemAdded(item)
    }
  }

  private applyBuff(buff: BuffType): void {
    this.activeBuff = { type: buff, expiresAt: Date.now() + GAME.BUFF_DURATION_MS }
  }

  private checkExpiredBuff(): void {
    if (this.activeBuff && Date.now() > this.activeBuff.expiresAt) {
      this.activeBuff = null
    }
  }

  private updateFeverState(): void {
    const nowFever = this.fever.isFever
    if (nowFever && !this.prevFever) {
      this.cb.onFeverChange(true)
      this.feverTimer = setTimeout(() => {
        this.fever.endFever()
        this.cb.onFeverChange(false)
        this.cb.onComboChange(this.fever.combo, this.fever.isFever)
      }, GAME.FEVER_DURATION_MS)
    }
    this.prevFever = nowFever
  }

  private removeDeadProjectiles(): void {
    const dead = this.projectiles.filter(p => !p.alive)
    dead.forEach(p => this.cb.onProjectileRemoved(p))
    this.projectiles = this.projectiles.filter(p => p.alive)
  }

  private overlaps(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    )
  }
}
