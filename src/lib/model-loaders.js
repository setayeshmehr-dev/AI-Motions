// Singleton model loaders + a filter that hides MediaPipe's benign WASM
// "INFO:" lines (they arrive via console.error and trip Next's dev overlay).

if (typeof window !== "undefined" && !window.__apWasmLogsSilenced) {
  window.__apWasmLogsSilenced = true
  const original = console.error.bind(console)
  console.error = (...args) => {
    const first = args[0]
    if (typeof first === "string" && (/^INFO:/.test(first) || /XNNPACK delegate/i.test(first))) return
    original(...args)
  }
}

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"

const MODEL_SOURCES = {
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

async function createModel(kind, preferred) {
  const vision = await import("@mediapipe/tasks-vision")
  const fileset = await vision.FilesetResolver.forVisionTasks(WASM)
  const urls = MODEL_SOURCES[kind]
  let lastError = null

  for (const url of urls) {
    const build = (delegate) => {
      const options = {
        baseOptions: { modelAssetPath: url, delegate },
        runningMode: "VIDEO",
      }
      if (kind === "hand") options.numHands = 1
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
      console.warn(`[AvatarPuppet] model source failed (${kind}): ${url}`, err?.message || err)
    }
  }
  throw lastError || new Error(`All model sources failed for "${kind}"`)
}

let handPromise = null
let facePromise = null
let posePromise = null

export function getHandLandmarker() {
  if (!handPromise)
    handPromise = createModel("hand", "GPU").catch((e) => { handPromise = null; throw e })
  return handPromise
}

export function getFaceLandmarker() {
  if (!facePromise)
    facePromise = createModel("face", "GPU").catch((e) => { facePromise = null; throw e })
  return facePromise
}

export function getPoseLandmarker() {
  if (!posePromise)
    posePromise = createModel("pose", "GPU").catch((e) => { posePromise = null; throw e })
  return posePromise
}

// detectForVideo needs strictly increasing timestamps per model instance
let handTs = 0
let faceTs = 0
let poseTs = 0
export const nextHandTs = () => (handTs = Math.max(performance.now(), handTs + 1))
export const nextFaceTs = () => (faceTs = Math.max(performance.now(), faceTs + 1))
export const nextPoseTs = () => (poseTs = Math.max(performance.now(), poseTs + 1))

/* Separate hand landmarker for the gesture PASSWORD (single hand). */
let passwordHandPromise = null
let passwordHandTs = 0

export function getPasswordHandLandmarker() {
  if (!passwordHandPromise) {
    passwordHandPromise = (async () => {
      const vision = await import("@mediapipe/tasks-vision")
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM)
      const urls = MODEL_SOURCES.hand
      const build = (delegate) =>
        vision.HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: urls[0], delegate },
          runningMode: "VIDEO",
          numHands: 1,
        })
      try {
        return await build("GPU")
      } catch {
        return await build("CPU")
      }
    })().catch((e) => {
      passwordHandPromise = null
      throw e
    })
  }
  return passwordHandPromise
}

export const nextPasswordHandTs = () =>
  (passwordHandTs = Math.max(performance.now(), passwordHandTs + 1))