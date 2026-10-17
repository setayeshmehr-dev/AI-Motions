export interface Gesture {
  id: string
  emoji: string
  label: string
}

export const PASSWORD_LENGTH = 6

// Single-hand gestures only — they must be recognizable by the camera model.
export const GESTURES: Gesture[] = [
  { id: "fist", emoji: "✊", label: "Fist" },
  { id: "palm", emoji: "✋", label: "Open Palm" },
  { id: "point", emoji: "☝️", label: "Point Up" },
  { id: "peace", emoji: "✌️", label: "Victory" },
  { id: "thumbs-up", emoji: "👍", label: "Thumbs Up" },
  { id: "thumbs-down", emoji: "👎", label: "Thumbs Down" },
  { id: "ok", emoji: "👌", label: "OK Sign" },
  { id: "rock", emoji: "🤘", label: "Rock On" },
  { id: "love", emoji: "🤟", label: "Love You" },
  { id: "call", emoji: "🤙", label: "Call Me" },
]

// Fixed demo identity for Auto fill
export const DEMO_USER = {
  firstName: "Amirali",
  lastName: "setayeshmehr",
  email: "setayeshmehr@gmail.com",
}

export function getGesture(id: string): Gesture | undefined {
  return GESTURES.find((g) => g.id === id)
}

export function gesturesEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((v, i) => v === b[i])
}