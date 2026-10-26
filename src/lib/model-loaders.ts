// Singleton model loaders.
// getHandLandmarker — MIRROR (welcome): numHands 2, emotional gestures.

if (typeof window !== "undefined" && !(window as any).__apWasmLogsSilenced) {
  ;(window as any).__apWasmLogsSilenced = true
  const original = console.error.bind(console)
  console.error = (...args: unknown[]) => {
    const first = args[0]
    if (typeof first === "string" && (/^INFO:/.test(first) || /XNNPACK delegate/i.test(first))) return
    original(...args)
  }
}

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"

const MODEL_SOURCES: Record<string, string[]> = {
  hand: [
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
    "https://cdn.jsdelivr.net/gh/googlesamples/mediapipe@main/examples/hand_landmarker/web/hand_landmarker.task",
  ],
  face: [
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
    "https://cdn.jsdelivr.net/gh/googlesamples/mediapipe@main/examples/face_landmarker/web/face_landmarker.task",
  ],
  pose: [
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
  ],
}

async function createModel(kind: string, preferred: "GPU" | "CPU") {
  const vision = await import("@mediapipe/tasks-vision")
  const fileset = await vision.FilesetResolver.forVisionTasks(WASM)
  const urls = MODEL_SOURCES[kind]
  let lastError: unknown = null

  for (const url of urls) {
    const build = (delegate: "GPU" | "CPU") => {
      const options: any = {
        baseOptions: { modelAssetPath: url, delegate },
        runningMode: "VIDEO",
      }
      if (kind === "hand") options.numHands = 2
      else if (kind === "face") {
        options.numFaces = 1
        options.outputFaceBlendshapes = true
      } else options.numPoses = 1
      const Ctor =
        kind === "hand" ? vision.HandLandmarker
        : kind === "face" ? vision.FaceLandmarker
        : vision.PoseLandmarker
      return Ctor.createFromOptions(fileset, options)
    }
    try {
      try {
        return await build(preferred)
      } catch {
        return await build("CPU")
      }
    } catch (err) {
      lastError = err
      console.warn(`[AI-Motions] model source failed (${kind}): ${url}`, err)
    }
  }
  throw lastError || new Error(`All model sources failed for "${kind}"`)
}

let handPromise: Promise<any> | null = null
let facePromise: Promise<any> | null = null
let posePromise: Promise<any> | null = null

export function getHandLandmarker() {
  if (!handPromise)
    handPromise = createModel("hand", "GPU").catch((e) => {
      handPromise = null
      throw e
    })
  return handPromise
}

export function getFaceLandmarker() {
  if (!facePromise)
    facePromise = createModel("face", "GPU").catch((e) => {
      facePromise = null
      throw e
    })
  return facePromise
}

export function getPoseLandmarker() {
  if (!posePromise)
    posePromise = createModel("pose", "GPU").catch((e) => {
      posePromise = null
      throw e
    })
  return posePromise
}

// strictly-increasing timestamps
let handTs = 0
let faceTs = 0
let poseTs = 0
export const nextHandTs = () => (handTs = Math.max(performance.now(), handTs + 1))
export const nextFaceTs = () => (faceTs = Math.max(performance.now(), faceTs + 1))
export const nextPoseTs = () => (poseTs = Math.max(performance.now(), poseTs + 1))