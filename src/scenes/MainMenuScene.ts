import * as PIXI from 'pixi.js'
import type { Scene } from '../SceneManager'

export class MainMenuScene implements Scene {
  readonly container: PIXI.Container

  constructor(
    app: PIXI.Application,
    onStart: () => void,
    onQuit: () => void,
    cameraReady: boolean
  ) {
    const W = app.screen.width
    const H = app.screen.height
    this.container = new PIXI.Container()

    const bg = new PIXI.Graphics()
    bg.rect(0, 0, W, H).fill({ color: 0x0a0a0f })
    this.container.addChild(bg)

    const title = new PIXI.Text({
      text: 'DORI DORI',
      style: {
        fill: 0xffffff,
        fontSize: Math.min(W * 0.14, 96),
        fontWeight: 'bold',
        letterSpacing: 8,
        dropShadow: { color: 0x6644ff, blur: 20, distance: 0, alpha: 0.8 },
      },
    })
    title.anchor.set(0.5, 0)
    title.x = W / 2
    title.y = H * 0.15

    const startBtn = this.makeButton(
      cameraReady ? '게임 시작' : '로딩 중...',
      W / 2,
      H * 0.55,
      cameraReady ? 0x4433cc : 0x333333,
      cameraReady ? onStart : () => {}
    )

    const quitBtn = this.makeButton('종료', W / 2, H * 0.68, 0x222233, onQuit)

    const camMsg = new PIXI.Text({
      text: cameraReady ? '' : '카메라 권한이 필요합니다',
      style: { fill: 0xff4444, fontSize: 18 },
    })
    camMsg.anchor.set(0.5)
    camMsg.x = W / 2
    camMsg.y = H * 0.78

    this.container.addChild(title, startBtn, quitBtn, camMsg)
  }

  private makeButton(
    label: string,
    x: number,
    y: number,
    color: number,
    onClick: () => void
  ): PIXI.Container {
    const btn = new PIXI.Container()
    const BW = 220, BH = 54
    const bg = new PIXI.Graphics()
    bg.roundRect(-BW / 2, -BH / 2, BW, BH, 12).fill({ color })
    const text = new PIXI.Text({
      text: label,
      style: { fill: 0xffffff, fontSize: 22, fontWeight: 'bold' },
    })
    text.anchor.set(0.5)
    btn.addChild(bg, text)
    btn.x = x
    btn.y = y
    btn.interactive = true
    btn.cursor = 'pointer'
    btn.on('pointerdown', onClick)
    btn.on('pointerover', () => { bg.tint = 0xaaaaff })
    btn.on('pointerout', () => { bg.tint = 0xffffff })
    return btn
  }

  destroy(): void {
    this.container.destroy({ children: true })
  }
}
