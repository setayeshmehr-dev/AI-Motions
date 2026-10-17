import type { HandLandmarker } from "@mediapipe/tasks-vision"
import { silenceWasmInfoLogs } from "@/lib/silence-wasm-logs"

silenceWasmInfoLogs()

let cached: Promise<HandLandmarker> | null = null

const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"

/** Loads the HandLandmarker once per page and reuses it everywhere. */
export function getHandLandmarker(): Promise<HandLandmarker> {
  if (!cached) {
    cached = (async () => {
      const vision = await import("@mediapipe/tasks-vision")
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM_BASE)
      const options = (delegate: "GPU" | "CPU") => ({
        baseOptions: { modelAssetPath: MODEL_URL, delegate },
        runningMode: "VIDEO" as const,
        numHands: 1,
      })
      try {
        return await vision.HandLandmarker.createFromOptions(fileset, options("GPU"))
      } catch {
        return await vision.HandLandmarker.createFromOptions(fileset, options("CPU"))
      }
    })().catch((err) => {
      cached = null // allow a retry on the next attempt
      throw err
    })
  }
  return cached
}