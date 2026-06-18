import * as PIXI from 'pixi.js'
import type { Scene } from '../SceneManager'

export class GameOverScene implements Scene {
  readonly container: PIXI.Container

  constructor(
    app: PIXI.Application,
    score: number,
    onRetry: () => void,
    onMenu: () => void
  ) {
    const W = app.screen.width
    const H = app.screen.height
    this.container = new PIXI.Container()

    const bg = new PIXI.Graphics()
    bg.rect(0, 0, W, H).fill({ color: 0x050508 })
    this.container.addChild(bg)

    const best = parseInt(localStorage.getItem('doridori_best') ?? '0', 10)
    if (score > best) localStorage.setItem('doridori_best', String(score))
    const displayBest = Math.max(score, best)

    const overText = new PIXI.Text({
      text: 'GAME OVER',
      style: { fill: 0xff4444, fontSize: 56, fontWeight: 'bold' },
    })
    overText.anchor.set(0.5)
    overText.x = W / 2
    overText.y = H * 0.22

    const scoreText = new PIXI.Text({
      text: `점수: ${score}`,
      style: { fill: 0xffffff, fontSize: 32 },
    })
    scoreText.anchor.set(0.5)
    scoreText.x = W / 2
    scoreText.y = H * 0.38

    const bestText = new PIXI.Text({
      text: `최고 점수: ${displayBest}`,
      style: { fill: 0xffdd44, fontSize: 24 },
    })
    bestText.anchor.set(0.5)
    bestText.x = W / 2
    bestText.y = H * 0.48

    const retryBtn = this.makeButton('재도전', W / 2, H * 0.62, 0x3344cc, onRetry)
    const menuBtn = this.makeButton('메인으로', W / 2, H * 0.74, 0x222233, onMenu)

    this.container.addChild(overText, scoreText, bestText, retryBtn, menuBtn)
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
