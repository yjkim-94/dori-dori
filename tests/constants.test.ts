import { describe, it, expect } from 'vitest'
import { GAME, SCORE, ENEMY_HP } from '../src/constants'

describe('constants', () => {
  it('spawn interval min is less than start', () => {
    expect(GAME.SPAWN_INTERVAL_MIN_MS).toBeLessThan(GAME.SPAWN_INTERVAL_START_MS)
  })
  it('fever multiplier is 3', () => {
    expect(GAME.FEVER_SCORE_MULTIPLIER).toBe(3)
  })
  it('boss has highest HP', () => {
    expect(ENEMY_HP.BOSS).toBeGreaterThan(ENEMY_HP.HEAVY)
    expect(ENEMY_HP.HEAVY).toBeGreaterThan(ENEMY_HP.NORMAL)
  })
})
