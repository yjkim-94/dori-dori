import * as PIXI from 'pixi.js'

const FACE_SIZE = 120
const BOTTOM_MARGIN = 40

export class Player {
  readonly container: PIXI.Container
  private sprite: PIXI.Sprite
  private readonly screenW: number
  private readonly screenH: number

  constructor(app: PIXI.Application, video: HTMLVideoElement) {
    this.screenW = app.screen.width
    this.screenH = app.screen.height

    const videoTexture = PIXI.Texture.from(video as unknown as HTMLImageElement)
    this.sprite = new PIXI.Sprite(videoTexture)
    this.sprite.width = FACE_SIZE
    this.sprite.height = FACE_SIZE
    this.sprite.anchor.set(0.5)
    this.sprite.scale.x = -1  // mirror horizontally for natural selfie view

    const mask = new PIXI.Graphics()
    mask.circle(0, 0, FACE_SIZE / 2).fill({ color: 0xffffff })
    this.sprite.mask = mask

    this.container = new PIXI.Container()
    this.container.x = this.screenW / 2
    this.container.y = this.screenH - FACE_SIZE / 2 - BOTTOM_MARGIN
    this.container.addChild(mask)
    this.container.addChild(this.sprite)
  }

  get crownX(): number { return this.container.x }
  get crownY(): number { return this.container.y - FACE_SIZE / 2 }

  getBounds() {
    return {
      x: this.container.x - FACE_SIZE / 2,
      y: this.container.y - FACE_SIZE / 2,
      width: FACE_SIZE,
      height: FACE_SIZE,
    }
  }

  update(_faceDetected: boolean): void {}

  destroy(): void {
    this.container.destroy({ children: true })
  }
}
