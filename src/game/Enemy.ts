import { SCORE, ENEMY_HP } from '../constants'

export type EnemyType = 'normal' | 'heavy' | 'zigzag' | 'boss'

const SPEEDS: Record<EnemyType, number> = {
  normal: 0.18,
  heavy: 0.12,
  zigzag: 0.15,
  boss: 0.07,
}

const SIZES: Record<EnemyType, { w: number; h: number }> = {
  normal: { w: 36, h: 36 },
  heavy:  { w: 48, h: 48 },
  zigzag: { w: 32, h: 32 },
  boss:   { w: 72, h: 72 },
}

abstract class EnemyBase {
  hp: number
  readonly type: EnemyType
  readonly scoreValue: number
  x: number
  y: number
  readonly width: number
  readonly height: number
  alive = true
  protected speed: number

  constructor(type: EnemyType, x: number, hp: number, score: number) {
    this.type = type
    this.x = x
    this.y = -SIZES[type].h
    this.width = SIZES[type].w
    this.height = SIZES[type].h
    this.hp = hp
    this.scoreValue = score
    this.speed = SPEEDS[type]
  }

  abstract update(deltaMs: number): void

  takeDamage(amount: number): boolean {
    this.hp -= amount
    if (this.hp <= 0) {
      this.alive = false
      return true
    }
    return false
  }

  getBounds() {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      width: this.width,
      height: this.height,
    }
  }
}

class NormalEnemy extends EnemyBase {
  constructor(x: number) {
    super('normal', x, ENEMY_HP.NORMAL, SCORE.NORMAL)
  }
  update(deltaMs: number) { this.y += this.speed * deltaMs }
}

class HeavyEnemy extends EnemyBase {
  constructor(x: number) {
    super('heavy', x, ENEMY_HP.HEAVY, SCORE.HEAVY)
  }
  update(deltaMs: number) { this.y += this.speed * deltaMs }
}

class ZigzagEnemy extends EnemyBase {
  private phase = 0
  private readonly amplitude = 60
  private readonly originX: number

  constructor(x: number) {
    super('zigzag', x, ENEMY_HP.ZIGZAG, SCORE.ZIGZAG)
    this.originX = x
  }
  update(deltaMs: number) {
    this.phase += deltaMs * 0.003
    this.y += this.speed * deltaMs
    this.x = this.originX + Math.sin(this.phase) * this.amplitude
  }
}

class BossEnemy extends EnemyBase {
  constructor(x: number) {
    super('boss', x, ENEMY_HP.BOSS, SCORE.BOSS)
  }
  update(deltaMs: number) { this.y += this.speed * deltaMs }
}

export function createEnemy(type: EnemyType, x: number, _screenWidth: number): EnemyBase {
  switch (type) {
    case 'normal':  return new NormalEnemy(x)
    case 'heavy':   return new HeavyEnemy(x)
    case 'zigzag':  return new ZigzagEnemy(x)
    case 'boss':    return new BossEnemy(x)
  }
}

export type { EnemyBase }
