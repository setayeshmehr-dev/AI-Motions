// Shared mutable store — written by the tracking loop (rAF), read inside
// useFrame. Deliberately NOT React state: 60fps writes must not re-render.

export const store = {
  // face
  facePresent: false,
  blendshapes: {},
  headYaw: 0,
  headPitch: 0,
  speaking: false,
  // toggles
  faceMode: true,
  handMode: true, // gesture moods (hand tracking)
  bodyMode: "auto", // "auto" | "standing" | "seated" | "off"
  // body mirror
  bodyPresent: false,
  seated: false,
  bodyWorld: null,
  // gesture mood (null | gesture id) — drives face reactions + hops
  gestureMood: null,
  gestureMoodAt: 0,
  // hand presence
  handPresent: false,
  handX: 0.5,
  // live guidance
  guide: "",
}

const listeners = new Set()

export function setGuide(g) {
  if (store.guide === g) return
  store.guide = g
  for (const fn of listeners) fn(g)
}

export function onGuideChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Set (or clear with null) the active gesture mood. */
export function setGestureMood(id) {
  if (store.gestureMood === id) return
  store.gestureMood = id
  store.gestureMoodAt = performance.now()
}

export function resetStore() {
  store.facePresent = false
  store.blendshapes = {}
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