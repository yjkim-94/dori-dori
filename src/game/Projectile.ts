const BASE_RADIUS = 10
const SPEED = 0.5  // px/ms

export class Projectile {
  x: number
  y: number
  alive = true
  readonly damage: number
  readonly radius: number
  private readonly vx: number
  private readonly vy: number

  constructor(
    x: number,
    y: number,
    yawDeg: number,
    damage = 1,
    radiusMultiplier = 1
  ) {
    this.x = x
    this.y = y
    this.damage = damage
    this.radius = BASE_RADIUS * radiusMultiplier
    const amplified = yawDeg * 3.0  // 감도 3배 증폭
    const clampedYaw = Math.max(-60, Math.min(60, amplified))
    const rad = (clampedYaw * Math.PI) / 180
    this.vx = Math.sin(rad) * SPEED
    this.vy = -Math.cos(rad) * SPEED
  }

  update(deltaMs: number): void {
    this.x += this.vx * deltaMs
    this.y += this.vy * deltaMs
  }

  getBounds() {
    return {
      x: this.x - this.radius,
      y: this.y - this.radius,
      width: this.radius * 2,
      height: this.radius * 2,
    }
  }
}
