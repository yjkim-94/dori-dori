const ITEM_SPEED = 0.1  // px/ms
const ITEM_SIZE = 28

export type BuffType = 'rapidFire' | 'damage' | 'size'
const BUFF_TYPES: BuffType[] = ['rapidFire', 'damage', 'size']

export class Item {
  x: number
  y: number
  alive = true
  readonly buff: BuffType

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
    this.buff = BUFF_TYPES[Math.floor(Math.random() * BUFF_TYPES.length)]
  }

  update(deltaMs: number): void {
    this.y += ITEM_SPEED * deltaMs
  }

  getBounds() {
    return {
      x: this.x - ITEM_SIZE / 2,
      y: this.y - ITEM_SIZE / 2,
      width: ITEM_SIZE,
      height: ITEM_SIZE,
    }
  }
}
