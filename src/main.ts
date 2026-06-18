import * as PIXI from 'pixi.js'
import { SceneManager } from './SceneManager'
import { FaceTracker } from './tracking/FaceTracker'
import { MainMenuScene } from './scenes/MainMenuScene'
import { GameScene } from './scenes/GameScene'
import { GameOverScene } from './scenes/GameOverScene'

async function bootstrap() {
  const app = new PIXI.Application()
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x050508,
    resizeTo: window,
  })
  document.body.appendChild(app.canvas)

  const sm = new SceneManager(app)
  let tracker: FaceTracker | null = null
  let video: HTMLVideoElement | null = null
  let cameraReady = false

  async function initCamera(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      video = document.createElement('video')
      video.srcObject = stream
      video.autoplay = true
      video.playsInline = true
      await new Promise<void>(resolve => { video!.onloadedmetadata = () => resolve() })
      await video.play()
      tracker = await FaceTracker.create()
      await tracker.start(video)
      cameraReady = true
    } catch {
      cameraReady = false
    }
    showMainMenu()
  }

  function showMainMenu() {
    sm.show(new MainMenuScene(app, startGame, () => window.close(), cameraReady))
  }

  function startGame() {
    if (!tracker || !video) return
    sm.show(new GameScene(app, tracker, video, (score) => showGameOver(score)))
  }

  function showGameOver(score: number) {
    sm.show(new GameOverScene(app, score, startGame, showMainMenu))
  }

  showMainMenu()
  initCamera()
}

bootstrap()
