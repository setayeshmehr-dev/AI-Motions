// Shared mutable store — written by the tracking loop (rAF), read inside
// useFrame. NOT React state: 60fps writes must not re-render.

type Blendshapes = Record<string, number>

export const store = {
  facePresent: false,
  blendshapes: {} as Blendshapes,
  headYaw: 0,
  headPitch: 0,
  speaking: false,
  faceMode: true,
  handMode: true,
  bodyMode: "auto" as string, // "auto" | "standing" | "seated" | "off"
  bodyPresent: false,
  seated: false,
  bodyWorld: null as any,
  gestureMood: null as string | null,
  gestureMoodAt: 0,
  handPresent: false,
  handX: 0.5,
  guide: "",
}

const listeners = new Set<(g: string) => void>()

export function setGuide(g: string) {
  if (store.guide === g) return
  store.guide = g
  for (const fn of listeners) fn(g)
}

export function onGuideChange(fn: (g: string) => void) {
  listeners.add(fn)
  // must return void (React Destructor) — NOT a boolean
  return () => {
    listeners.delete(fn)
  }
}

export function setGestureMood(id: string | null) {
  if (store.gestureMood === id) return
  store.gestureMood = id
  store.gestureMoodAt = performance.now()
}

export function resetStore() {
  store.facePresent = false
  store.blendshapes = {} as Blendshapes
  store.headYaw = 0
  store.headPitch = 0
  store.speaking = false
  store.bodyPresent = false
  store.seated = false
  store.bodyWorld = null
  store.gestureMood = null
  store.handPresent = false
  store.handX = 0.5
  setGuide("")
}