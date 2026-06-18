import { describe, it, expect, beforeEach } from 'vitest'
import { FeverSystem } from '../src/game/FeverSystem'

describe('FeverSystem', () => {
  let fever: FeverSystem

  beforeEach(() => {
    fever = new FeverSystem()
  })

  it('starts with no fever and combo 0', () => {
    expect(fever.isFever).toBe(false)
    expect(fever.combo).toBe(0)
    expect(fever.scoreMultiplier).toBe(1)
  })

  it('increments combo on kill', () => {
    fever.addKill()
    expect(fever.combo).toBe(1)
  })

  it('activates fever at threshold', () => {
    for (let i = 0; i < 10; i++) fever.addKill()
    expect(fever.isFever).toBe(true)
    expect(fever.scoreMultiplier).toBe(3)
  })

  it('resets combo on enemy escaped', () => {
    fever.addKill()
    fever.addKill()
    fever.onEnemyEscaped()
    expect(fever.combo).toBe(0)
    expect(fever.isFever).toBe(false)
  })

  it('resets after endFever', () => {
    for (let i = 0; i < 10; i++) fever.addKill()
    fever.endFever()
    expect(fever.isFever).toBe(false)
    expect(fever.scoreMultiplier).toBe(1)
    expect(fever.combo).toBe(0)
  })

  it('reset clears everything', () => {
    for (let i = 0; i < 5; i++) fever.addKill()
    fever.reset()
    expect(fever.combo).toBe(0)
    expect(fever.isFever).toBe(false)
  })

  it('continues incrementing combo during fever', () => {
    for (let i = 0; i < 10; i++) fever.addKill()
    for (let i = 0; i < 10; i++) fever.addKill()
    expect(fever.isFever).toBe(true)
    expect(fever.combo).toBe(20)
  })
})
