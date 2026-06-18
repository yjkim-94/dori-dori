import * as PIXI from 'pixi.js'

export interface Scene {
  container: PIXI.Container
  destroy(): void
}

export class SceneManager {
  private current: Scene | null = null

  constructor(private app: PIXI.Application) {}

  show(scene: Scene): void {
    if (this.current) {
      this.app.stage.removeChild(this.current.container)
      this.current.destroy()
    }
    this.current = scene
    this.app.stage.addChild(scene.container)
  }
}
