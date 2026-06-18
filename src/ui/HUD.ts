import * as PIXI from 'pixi.js'

// 피버 색상 순환 팔레트 (금→주황→빨강→마젠타)
const FEVER_PALETTE = [0xffd700, 0xff8800, 0xff2200, 0xff00aa, 0xffd700]

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)
  return (r << 16) | (g << 8) | bl
}

export class HUD {
  readonly container: PIXI.Container
  private scoreText: PIXI.Text
  private comboText: PIXI.Text
  private faceWarning: PIXI.Container
  private warningText: PIXI.Text
  private countdownText: PIXI.Text
  private readonly W: number
  private readonly H: number

  // 피버 이펙트
  private feverLayer: PIXI.Container
  private feverBorders: PIXI.Graphics[] = []
  private feverText: PIXI.Text
  private feverActive = false
  private feverTime = 0

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

    // ── 피버 레이어: 안쪽으로 번지는 글로우 테두리 3겹 + 텍스트 ──
    this.feverLayer = new PIXI.Container()
    this.feverLayer.visible = false
    const blurStrengths = [2, 8, 22]
    for (const strength of blurStrengths) {
      const g = new PIXI.Graphics()
      g.filters = [new PIXI.BlurFilter({ strength, quality: 3 })]
      this.feverBorders.push(g)
      this.feverLayer.addChild(g)
    }
    this.feverText = new PIXI.Text({
      text: 'FEVER TIME!',
      style: {
        fill: 0xffffff,
        fontSize: 40,
        fontWeight: 'bold',
        letterSpacing: 4,
        stroke: { color: 0x000000, width: 4 },
      },
    })
    this.feverText.anchor.set(0.5)
    this.feverText.x = this.W / 2
    this.feverText.y = 70
    this.feverLayer.addChild(this.feverText)

    this.faceWarning = new PIXI.Container()
    const bg = new PIXI.Graphics()
    bg.rect(0, 0, this.W, this.H).fill({ color: 0x000000, alpha: 0.6 })
    this.warningText = new PIXI.Text({
      text: '얼굴이 인식되지 않습니다',
      style: { fill: 0xffffff, fontSize: 28, fontWeight: 'bold', align: 'center' },
    })
    this.warningText.anchor.set(0.5)
    this.warningText.x = this.W / 2
    this.warningText.y = this.H / 2
    this.faceWarning.addChild(bg, this.warningText)
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
      this.feverLayer,
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

  showFaceNotDetected(visible: boolean, message = '얼굴이 인식되지 않습니다'): void {
    this.faceWarning.visible = visible
    if (visible) this.warningText.text = message
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
    this.feverActive = active
    this.feverLayer.visible = active
    this.feverTime = 0
    if (!active) {
      for (const g of this.feverBorders) g.clear()
    }
  }

  // 매 프레임 호출 — 피버 테두리/텍스트 번쩍임 애니메이션
  updateFever(deltaMs: number): void {
    if (!this.feverActive) return
    this.feverTime += deltaMs
    const t = this.feverTime / 1000

    const fastPulse = 0.5 + 0.5 * Math.sin(t * 14)  // 빠른 번쩍임 (~2.2Hz)
    const slowPulse = 0.5 + 0.5 * Math.sin(t * 4)

    // 색상 순환
    const seg = (t * 1.6) % (FEVER_PALETTE.length - 1)
    const i = Math.floor(seg)
    const color = lerpColor(FEVER_PALETTE[i], FEVER_PALETTE[i + 1], seg - i)

    const layerSpec = [
      { width: 8 + fastPulse * 8, alpha: 0.6 + 0.4 * fastPulse },
      { width: 28, alpha: 0.35 + 0.3 * slowPulse },
      { width: 70, alpha: 0.15 + 0.2 * fastPulse },
    ]
    this.feverBorders.forEach((g, idx) => {
      const spec = layerSpec[idx]
      g.clear()
      g.rect(0, 0, this.W, this.H).stroke({ color, width: spec.width, alpha: spec.alpha })
    })

    // 텍스트 펄스 + 색상
    this.feverText.tint = color
    const textScale = 1 + 0.18 * fastPulse
    this.feverText.scale.set(textScale)
    this.feverText.alpha = 0.7 + 0.3 * fastPulse
  }

  destroy(): void {
    this.container.destroy({ children: true })
  }
}
