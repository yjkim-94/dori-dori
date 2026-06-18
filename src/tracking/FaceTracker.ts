import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from '@mediapipe/tasks-vision'

export type FaceResult = {
  detected: boolean
  yaw: number
  pitch: number
  facingForward: boolean
}

// 정면 응시 판정 임계값 (도). 조준은 raw yaw ±20°에서 최대 편향되므로
// 그보다 큰 35°를 넘어가야(=화면 밖으로 고개 돌림) 정면 이탈로 본다.
const YAW_FORWARD_LIMIT = 35
const PITCH_FORWARD_LIMIT = 25

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
      return { detected: false, yaw: 0, pitch: 0, facingForward: false }
    }
    const result: FaceLandmarkerResult = this.landmarker.detectForVideo(
      this.video,
      timestampMs
    )
    if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
      return { detected: false, yaw: 0, pitch: 0, facingForward: false }
    }
    const matrix = result.facialTransformationMatrixes?.[0]?.data
    // 머리 로컬 Z축(전방 벡터)을 카메라 공간에서 읽어 회전 추출
    // yaw  = X-Z 평면 기울기, pitch = Y-Z 평면 기울기
    const yaw = matrix ? Math.atan2(matrix[8], matrix[10]) * (180 / Math.PI) : 0
    const pitch = matrix ? Math.atan2(matrix[9], matrix[10]) * (180 / Math.PI) : 0
    // 임계값은 부호 무관하게 절댓값으로 판정
    const facingForward =
      Math.abs(yaw) < YAW_FORWARD_LIMIT && Math.abs(pitch) < PITCH_FORWARD_LIMIT
    return { detected: true, yaw, pitch, facingForward }
  }
}
