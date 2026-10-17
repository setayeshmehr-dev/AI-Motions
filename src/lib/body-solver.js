import * as THREE from "three"

/* MediaPipe Pose world-landmark indices */
const L = {
  NOSE: 0,
  LEYE: 2, REYE: 5,
  LS: 11, RS: 12, LE: 13, RE: 14, LW: 15, RW: 16,
  LH: 23, RH: 24, LK: 25, RK: 26, LA: 27, RA: 28,
}

export const BODY_CONFIG = {
  maxTwistDeg: 26,
  leanScale: 0.55,
  shoulderVis: 0.35,
  hipsVis: 0.45,
  thighVis: 0.4,
  armVis: 0.3,
  legVis: 0.45,
}

/* Avatar-local rest directions in the VRM normalized rig (T-pose):
   the avatar's RIGHT arm rests toward -x, LEFT toward +x. */
const V_UP = new THREE.Vector3(0, 1, 0)
const V_DOWN = new THREE.Vector3(0, -1, 0)
const V_RIGHT = new THREE.Vector3(-1, 0, 0) // avatar's right arm rest
const V_LEFT = new THREE.Vector3(1, 0, 0)   // avatar's left arm rest
const Q_ID = new THREE.Quaternion()

export function aimFromDirs(upperDir, foreDir, rest) {
  const u = upperDir.clone().normalize()
  const f = foreDir.clone().normalize()
  const upper = new THREE.Quaternion().setFromUnitVectors(rest, u)
  f.applyQuaternion(upper.clone().invert())
  const lower = new THREE.Quaternion().setFromUnitVectors(rest, f)
  return { upper, lower }
}

/* ---------- Relaxed arm pose (HANG) ----------
   ⚠️ اگه خودت این دو تا عدد رو تیون کرده بودی، از فایل قبلی‌ت همون دو خط
   HANG_U و HANG_F رو کپی کن جایگزین این‌ها کن — بقیه‌ی فایل فرقی نداره. */
const HANG_U = new THREE.Vector3(-5, -30, 0).normalize()
const HANG_F = new THREE.Vector3(-5, -30, 10).normalize()
export const HANG_ARM_R = aimFromDirs(HANG_U, HANG_F, V_RIGHT)
export const HANG_ARM_L = aimFromDirs(
  HANG_U.clone().setX(-HANG_U.x), HANG_F.clone().setX(-HANG_F.x), V_LEFT
)

/* Seated leg pose */
const SEAT_THIGH = new THREE.Vector3(0, -0.5, 0.86).normalize()
const SEAT_SHIN = new THREE.Vector3(0, -0.96, 0.28).normalize()
export const SEATED_LEG_R = aimFromDirs(SEAT_THIGH, SEAT_SHIN, V_DOWN)
export const SEATED_LEG_L = aimFromDirs(
  SEAT_THIGH.clone().setX(-SEAT_THIGH.x), SEAT_SHIN.clone().setX(-SEAT_SHIN.x), V_DOWN
)

/** Raw visibility diagnostics — powers the on-screen guidance. */
export function readBodyDiagnostics(lm) {
  if (!lm) return { hasAny: false, face: 0, shoulders: 0, arms: 0, hips: 0, thighs: 0 }
  const vis = (i) => lm[i]?.visibility ?? 0
  return {
    hasAny: true,
    face: Math.max(vis(L.NOSE), vis(L.LEYE), vis(L.REYE)),
    shoulders: Math.min(vis(L.LS), vis(L.RS)),
    arms: Math.min(vis(L.LE), vis(L.LW), vis(L.RE), vis(L.RW)),
    hips: Math.min(vis(L.LH), vis(L.RH)),
    thighs: Math.min(vis(L.LK), vis(L.RK)),
  }
}

export function hipsVisibleDetect(lm) {
  if (!lm) return false
  const vis = (i) => lm[i]?.visibility ?? 0
  return vis(L.LH) > BODY_CONFIG.hipsVis && vis(L.RH) > BODY_CONFIG.hipsVis
}

/**
 * solveBody — MediaPipe world landmarks → VRM normalized-rig bone targets.
 * The proven coordinate mapping (works for both VRM generations since the
 * normalized rig is shared): x/z mirrored, y flipped, twist negated.
 */
export function solveBody(lm, mode = "auto") {
  if (!lm || lm.length < 29) return null
  const C = BODY_CONFIG

  const av = (i) => new THREE.Vector3(-lm[i].x, -lm[i].y, -lm[i].z)
  const vis = (i) => lm[i]?.visibility ?? 0

  const gate = mode === "auto" ? C.shoulderVis : 0.2
  if (vis(L.LS) < gate || vis(L.RS) < gate) return null

  const LS = av(L.LS), RS = av(L.RS)
  const LE = av(L.LE), RE = av(L.RE)
  const LW = av(L.LW), RW = av(L.RW)
  const LH = av(L.LH), RH = av(L.RH)
  const LK = av(L.LK), RK = av(L.RK)
  const LA = av(L.LA), RA = av(L.RA)

  const shoulderW = LS.distanceTo(RS)
  if (shoulderW < 0.06 || shoulderW > 1.0) return null

  const hipsVisible = hipsVisibleDetect(lm)

  const seated =
    mode === "seated" ? true :
    mode === "standing" ? false :
    (!hipsVisible && vis(L.LK) > C.thighVis && vis(L.RK) > C.thighVis)

  /* torso lean/twist (only with visible hips) */
  let total = new THREE.Quaternion()
  if (hipsVisible) {
    const hipW = LH.distanceTo(RH)
    if (hipW > 0.04 && hipW < 0.8) {
      const sMid = LS.clone().add(RS).multiplyScalar(0.5)
      const hMid = LH.clone().add(RH).multiplyScalar(0.5)
      const up = sMid.sub(hMid)
      if (up.lengthSq() > 1e-6) {
        up.normalize()
        const lean = new THREE.Quaternion().setFromUnitVectors(V_UP, up)
        lean.slerp(Q_ID, 1 - C.leanScale)
        const sh = LS.clone().sub(RS)
        const hp = LH.clone().sub(RH)
        let twist = 0
        if (Math.hypot(sh.x, sh.z) > 1e-4) {
          const a = Math.atan2(sh.z, sh.x)
          const b = Math.hypot(hp.x, hp.z) > 1e-4 ? Math.atan2(hp.z, hp.x) : 0
          const maxT = THREE.MathUtils.degToRad(C.maxTwistDeg)
          twist = THREE.MathUtils.clamp(-(a - b), -maxT, maxT)
        }
        const twistQ = new THREE.Quaternion().setFromAxisAngle(V_UP, twist)
        total = lean.multiply(twistQ)
      }
    }
  }
  const spineQ = Q_ID.clone().slerp(total, 0.45)
  const chestQ = spineQ.clone().invert().multiply(total)
  const invTorso = total.clone().invert()

  /* arms — mirror: user's LEFT arm drives the avatar's right arm */
  const aimChain = (S, E, W, rest) => {
    const upDir = E.clone().sub(S)
    const loDir = W.clone().sub(E)
    if (upDir.lengthSq() < 1e-6 || loDir.lengthSq() < 1e-6) return null
    upDir.normalize()
    loDir.normalize()
    upDir.applyQuaternion(invTorso)
    loDir.applyQuaternion(invTorso)
    return aimFromDirs(upDir, loDir, rest)
  }
  const armR = vis(L.LE) > C.armVis && vis(L.LW) > C.armVis ? aimChain(LS, LE, LW, V_RIGHT) : null
  const armL = vis(L.RE) > C.armVis && vis(L.RW) > C.armVis ? aimChain(RS, RE, RW, V_LEFT) : null

  /* legs */
  const legOk = (h, k, a) => vis(h) > C.legVis && vis(k) > C.legVis && vis(a) > C.legVis
  const legR = !seated && legOk(L.LH, L.LK, L.LA) ? aimChain(LH, LK, LA, V_DOWN) : null
  const legL = !seated && legOk(L.RH, L.RK, L.RA) ? aimChain(RH, RK, RA, V_DOWN) : null

  return { spine: spineQ, chest: chestQ, total, armR, armL, legR, legL, hipsVisible, seated }
}