// Geometric classifier — 21 hand landmarks → one of 10 gestures.
// Same proven logic as the original GesturePass classifier.

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

export function classifyGesture(lm) {
  if (!lm || lm.length < 21) return null
  const palm = dist(lm[0], lm[9]) || 1e-6

  const index = dist(lm[8], lm[0]) > 1.25 * palm
  const middle = dist(lm[12], lm[0]) > 1.25 * palm
  const ring = dist(lm[16], lm[0]) > 1.25 * palm
  const pinky = dist(lm[20], lm[0]) > 1.15 * palm
  const thumb = dist(lm[4], lm[17]) > 1.2 * palm
  const up = [index, middle, ring, pinky].filter(Boolean).length

  if (up === 0) {
    if (thumb) {
      const dy = lm[4].y - lm[0].y
      if (dy < -0.3 * palm) return "thumbs-up"
      if (dy > 0.3 * palm) return "thumbs-down"
      return null
    }
    return "fist"
  }
  if (middle && ring && pinky && !index && dist(lm[4], lm[8]) < 0.4 * palm) return "ok"
  if (up === 4) return "palm"
  if (index && middle && !ring && !pinky) return "peace"
  if (thumb && index && pinky && !middle && !ring) return "love"
  if (!thumb && index && pinky && !middle && !ring) return "rock"
  if (index && !middle && !ring && !pinky) return "point"
  if (thumb && pinky && !index && !middle && !ring) return "call"
  return null
}

/* Each gesture → an emotional MOOD (blendshape boosts + reaction),
   not a physical arm pose — the body mirror stays in charge of the arms.
   `wave` is detected separately from palm + side-to-side motion. */
export const GESTURE_MOODS = {
  "thumbs-up": { expr: { happy: 0.85 }, reaction: "joy", head: [-6, 0, 3] },
  "thumbs-down": { expr: { sad: 0.7 }, reaction: "droop", head: [10, 0, 0] },
  peace: { expr: { happy: 0.35 }, reaction: "wink", head: [0, -6, 5] },
  ok: { expr: { neutral: 0.4 }, reaction: "nod", head: [4, 8, -6] },
  rock: { expr: { happy: 0.45 }, reaction: "bounce", head: [0, 0, -8] },
  love: { expr: { happy: 0.9 }, reaction: "bounce", head: [2, 0, 0] },
  call: { expr: { happy: 0.3 }, reaction: "nod", head: [-4, 0, 8] },
  fist: { expr: { angry: 0.55 }, reaction: "nod", head: [0, 0, 0] },
  point: { expr: { surprised: 0.25 }, reaction: null, head: [-6, 0, 0] },
  palm: { expr: {}, reaction: null, head: [0, 0, 0] }, // wave is layered on top
  wave: { expr: { happy: 0.8 }, reaction: "bounce", head: [0, 0, -4] },
}