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
    this.sprite.anchor.set(0.5)

    // 비율 유지 (object-fit: cover) — 짧은 쪽을 FACE_SIZE에 맞추고 긴 쪽은 마스크로 잘림
    const vw = video.videoWidth || 640
    const vh = video.videoHeight || 480
    const coverScale = FACE_SIZE / Math.min(vw, vh)
    // scale.x 음수로 미러링 적용
    this.sprite.scale.set(coverScale)
    this.sprite.scale.x = -coverScale

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
