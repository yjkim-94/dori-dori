import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from '@mediapipe/tasks-vision'

export type FaceResult = { detected: boolean; yaw: number }

export class FaceTracker {
  private landmarker!: FaceLandmarker
  private video!: HTMLVideoElement

  private constructor() {}

  static async create(): Promise<FaceTracker> {
    const tracker = new FaceTracker()
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    )
    tracker.landmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFacialTransformationMatrixes: true,
    })
    return tracker
  }

  async start(video: HTMLVideoElement): Promise<void> {
    this.video = video
  }

  stop(): void {
    this.landmarker.close()
  }

  detect(timestampMs: number): FaceResult {
    if (!this.video || this.video.readyState < 2) {
      return { detected: false, yaw: 0 }
    }
    const result: FaceLandmarkerResult = this.landmarker.detectForVideo(
      this.video,
      timestampMs
    )
    if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
      return { detected: false, yaw: 0 }
    }
    const matrix = result.facialTransformationMatrixes?.[0]?.data
    // 4x4 row-major 행렬에서 yaw(Y축 회전) 추출
    const yaw = matrix ? Math.atan2(matrix[8], matrix[10]) * (180 / Math.PI) : 0
    return { detected: true, yaw }
  }
}
