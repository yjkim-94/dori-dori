import { GAME } from '../constants'

export class FeverSystem {
  private _combo = 0
  private _isFever = false

  get combo(): number { return this._combo }
  get isFever(): boolean { return this._isFever }
  get scoreMultiplier(): number { return this._isFever ? GAME.FEVER_SCORE_MULTIPLIER : 1 }

  addKill(): void {
    this._combo++
    if (!this._isFever && this._combo >= GAME.FEVER_COMBO_THRESHOLD) {
      this._isFever = true
    }
  }

  onEnemyEscaped(): void {
    this._combo = 0
    this._isFever = false
  }

  endFever(): void {
    this._isFever = false
    this._combo = 0
  }

  reset(): void {
    this._combo = 0
    this._isFever = false
  }
}
