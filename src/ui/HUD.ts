import * as PIXI from 'pixi.js'

export class HUD {
  readonly container: PIXI.Container
  private scoreText: PIXI.Text
  private comboText: PIXI.Text
  private faceWarning: PIXI.Container
  private feverBorder: PIXI.Graphics
  private countdownText: PIXI.Text
  private readonly W: number
  private readonly H: number

  constructor(app: PIXI.Application) {
    this.W = app.screen.width
    this.H = app.screen.height
    this.container = new PIXI.Container()
    this.container.zIndex = 100

    this.scoreText = new PIXI.Text({
      text: 'SCORE: 0',
      style: { fill: 0xffffff, fontSize: 24, fontWeight: 'bold' },
    })
    this.scoreText.x = 16
    this.scoreText.y = 16

    this.comboText = new PIXI.Text({
      text: '',
      style: { fill: 0xffdd44, fontSize: 20, fontWeight: 'bold' },
    })
    this.comboText.x = 16
    this.comboText.y = 50

    this.feverBorder = new PIXI.Graphics()
    this.feverBorder.visible = false

    this.faceWarning = new PIXI.Container()
    const bg = new PIXI.Graphics()
    bg.rect(0, 0, this.W, this.H).fill({ color: 0x000000, alpha: 0.6 })
    const warningText = new PIXI.Text({
      text: '얼굴이 인식되지 않습니다',
      style: { fill: 0xffffff, fontSize: 28, fontWeight: 'bold', align: 'center' },
    })
    warningText.anchor.set(0.5)
    warningText.x = this.W / 2
    warningText.y = this.H / 2
    this.faceWarning.addChild(bg, warningText)
    this.faceWarning.visible = false

    this.countdownText = new PIXI.Text({
      text: '',
      style: { fill: 0x44ffaa, fontSize: 64, fontWeight: 'bold' },
    })
    this.countdownText.anchor.set(0.5)
    this.countdownText.x = this.W / 2
    this.countdownText.y = this.H / 2
    this.countdownText.visible = false

    this.container.addChild(
      this.feverBorder,
      this.scoreText,
      this.comboText,
      this.faceWarning,
      this.countdownText
    )
  }

  updateScore(score: number): void {
    this.scoreText.text = `SCORE: ${score}`
  }

  updateCombo(combo: number): void {
    this.comboText.text = combo >= 2 ? `COMBO x${combo}` : ''
  }

  showFaceNotDetected(visible: boolean): void {
    this.faceWarning.visible = visible
  }

  showCountdown(remainSec: number): void {
    if (remainSec <= 0) {
      this.countdownText.visible = false
      return
    }
    this.countdownText.visible = true
    this.countdownText.text = Math.ceil(remainSec).toString()
  }

  setFeverBorder(active: boolean): void {
    this.feverBorder.visible = active
    if (active) this.drawFeverBorder()
  }

  private drawFeverBorder(): void {
    this.feverBorder.clear()
    this.feverBorder
      .rect(0, 0, this.W, this.H)
      .stroke({ color: 0xffcc00, width: 12, alpha: 0.85 })
  }

  destroy(): void {
    this.container.destroy({ children: true })
  }
}
