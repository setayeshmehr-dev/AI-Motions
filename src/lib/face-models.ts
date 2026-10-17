// Two face models:
// 1) MediaPipe FaceLandmarker — 478 landmarks + 52 blendshapes (liveness checks)
// 2) face-api FaceRecognitionNet — 128-d identity embedding

import type { FaceLandmarker } from "@mediapipe/tasks-vision"
import { silenceWasmInfoLogs } from "@/lib/silence-wasm-logs"

silenceWasmInfoLogs()

/* ---------- MediaPipe FaceLandmarker ---------- */

const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
const FACE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"

let landmarkerPromise: Promise<FaceLandmarker> | null = null
let currentLandmarker: FaceLandmarker | null = null

async function createLandmarker(preferred: "GPU" | "CPU") {
  const vision = await import("@mediapipe/tasks-vision")
  const fileset = await vision.FilesetResolver.forVisionTasks(WASM_BASE)
  const build = (delegate: "GPU" | "CPU") =>
    vision.FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate },
      runningMode: "VIDEO" as const,
      numFaces: 1,
      outputFaceBlendshapes: true,
      // NOTE: outputFacialTransformationMatrixes removed — we don't use the
      // matrix (yaw comes from landmarks) and it's a known trouble spot.
    })
  if (preferred === "GPU") {
    try {
      return await build("GPU")
    } catch {
      return await build("CPU")
    }
  }
  return build("CPU")
}

export function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = createLandmarker("GPU")
      .then((lm) => {
        currentLandmarker = lm
        return lm
      })
      .catch((err) => {
        landmarkerPromise = null
        throw err
      })
  }
  return landmarkerPromise
}

/** Rebuilds the landmarker on the CPU delegate if the GPU one misbehaves. */
export async function rebuildFaceLandmarkerOnCPU(): Promise<FaceLandmarker> {
  const old = currentLandmarker
  landmarkerPromise = createLandmarker("CPU")
    .then((lm) => {
      currentLandmarker = lm
      return lm
    })
    .catch((err) => {
      landmarkerPromise = null
      throw err
    })
  const fresh = await landmarkerPromise
  try {
    old?.close()
  } catch {}
  return fresh
}

/** detectForVideo needs strictly increasing timestamps */
let faceTs = 0
export function nextFaceTimestamp() {
  faceTs = Math.max(performance.now(), faceTs + 1)
  return faceTs
}

/* ---------- face-api (UMD build from CDN, cached) ---------- */
/* eslint-disable @typescript-eslint/no-explicit-any */

type FaceApi = any

let faceApiPromise: Promise<FaceApi> | null = null

const FACEAPI_SOURCES = [
  {
    script: "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/dist/face-api.js",
    models: "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model",
  },
  {
    script: "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.js",
    models: "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model",
  },
]

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) return resolve()
    const s = document.createElement("script")
    s.src = src
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(s)
  })
}

export function getFaceApi(): Promise<FaceApi> {
  if (!faceApiPromise) {
    faceApiPromise = (async () => {
      let lastError: unknown = null
      for (const source of FACEAPI_SOURCES) {
        try {
          await loadScript(source.script)
          const f = (window as any).faceapi
          if (!f) throw new Error("face-api didn't initialise")
          if (f.tf?.ready) await f.tf.ready()
          await Promise.all([
            f.nets.tinyFaceDetector.loadFromUri(source.models),
            f.nets.faceLandmark68Net.loadFromUri(source.models),
            f.nets.faceRecognitionNet.loadFromUri(source.models),
          ])
          return f
        } catch (err) {
          lastError = err
        }
      }
      throw lastError ?? new Error("Couldn't load face-api")
    })().catch((err) => {
      faceApiPromise = null
      throw err
    })
  }
  return faceApiPromise
}

/** Runs the full face-api pipeline on a video element → 128-d descriptor */
export async function detectFaceDescriptor(
  video: HTMLVideoElement
): Promise<Float32Array | null> {
  const f = await getFaceApi()
  const options = new f.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
  const result = await f
    .detectSingleFace(video, options)
    .withFaceLandmarks()
    .withFaceDescriptor()
  return result ? (result.descriptor as Float32Array) : null
}

/* ---------- embedding helpers ---------- */

export function averageDescriptors(list: Float32Array[]): Float32Array {
  const out = new Float32Array(list[0].length)
  for (const d of list) for (let i = 0; i < out.length; i++) out[i] += d[i]
  for (let i = 0; i < out.length; i++) out[i] /= list.length
  return out
}

export function descriptorDistance(
  a: number[] | Float32Array,
  b: number[] | Float32Array
): number {
  let sum = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) {
    const d = a[i] - b[i]
    sum += d * d
  }
  return Math.sqrt(sum)
}

/** face-api's standard euclidean threshold (lower = stricter) */
export const FACE_MATCH_THRESHOLD = 0.6

/* ---------- per-frame face metrics (for liveness) ---------- */

export interface FaceFrame {
  present: boolean
  blink: number // 0..1 — max of both eyes
  smile: number // 0..1 — average of both mouth corners
  yaw: number // -1..1 — 0 when facing the camera
}

export function readFaceFrame(result: any): FaceFrame {
  const lm = result?.faceLandmarks?.[0]
  if (!lm || lm.length < 468) return { present: false, blink: 0, smile: 0, yaw: 0 }

  const cats = result?.faceBlendshapes?.[0]?.categories as
    | { categoryName: string; score: number }[]
    | undefined
  const scores = new Map<string, number>()
  if (cats) for (const c of cats) scores.set(c.categoryName, c.score)

  const blink = Math.max(
    scores.get("eyeBlinkLeft") ?? 0,
    scores.get("eyeBlinkRight") ?? 0
  )
  const smile =
    ((scores.get("mouthSmileLeft") ?? 0) + (scores.get("mouthSmileRight") ?? 0)) / 2

  // Head-turn proxy: nose tip drifting between the two cheeks
  const nose = lm[1]
  const left = lm[234]
  const right = lm[454]
  const dl = Math.hypot(nose.x - left.x, nose.y - left.y)
  const dr = Math.hypot(nose.x - right.x, nose.y - right.y)
  const yaw = (dr - dl) / (dl + dr + 1e-6)

  return { present: true, blink, smile, yaw }
}