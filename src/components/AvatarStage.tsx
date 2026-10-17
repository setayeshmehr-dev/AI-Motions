"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { Canvas, useFrame } from "@react-three/fiber"
import { ContactShadows, OrbitControls } from "@react-three/drei"
import { GLTFLoader } from "three-stdlib"
import { VRMUtils, VRMLoaderPlugin } from "@pixiv/three-vrm"
import { store } from "@/lib/tracking-store"
import { solveBody, HANG_ARM_R, HANG_ARM_L, SEATED_LEG_R, SEATED_LEG_L } from "@/lib/body-solver"
import { GESTURE_MOODS } from "@/lib/hand-gestures"

const D = THREE.MathUtils.degToRad
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const HEAD = { yawGain: 26, pitchGain: 14 }
const Q_ID = new THREE.Quaternion()

function loadVRM(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader()
    // three-stdlib and @pixiv/three-vrm ship different GLTF typings — bridge.
    ;(loader as any).register((parser: any) => new VRMLoaderPlugin(parser))
    loader.load(
      url,
      (gltf: any) => {
        const vrm = gltf?.userData?.vrm
        if (!vrm) return reject(new Error("No VRM found in " + url))
        VRMUtils.removeUnnecessaryVertices(gltf.scene)
        resolve(vrm)
      },
      undefined,
      reject
    )
  })
}

/** RAW-skeleton generation detection:
   - VRM 0.x: LEFT arm bone at -X → needs the 180° flip.
   - VRM 1.0: LEFT arm at +X → already faces the camera. */
function applyFacing(vrm: any) {
  let needsFlip = false
  try {
    const hb = vrm.humanoid?.humanBones
    const lArm = hb?.leftUpperArm
    const rArm = hb?.rightUpperArm
    if (lArm && rArm) {
      vrm.scene.updateMatrixWorld(true)
      const l = lArm.getWorldPosition(new THREE.Vector3())
      const r = rArm.getWorldPosition(new THREE.Vector3())
      needsFlip = l.x < r.x
    }
  } catch {}
  vrm.scene.rotation.y = needsFlip ? Math.PI : 0
  return !needsFlip
}

function buildExprMap(em: any) {
  const names = new Set<string>()
  if (em.expressionMap) Object.keys(em.expressionMap).forEach((n: string) => names.add(n))
  if (Array.isArray(em.expressions)) em.expressions.forEach((e: any) => names.add(e.expressionName))
  const pick = (...c: string[]) => c.find((x) => names.has(x)) ?? null
  return {
    blink: pick("blink"),
    blinkLeft: pick("blinkLeft", "blink_l"),
    blinkRight: pick("blinkRight", "blink_r"),
    happy: pick("happy"), angry: pick("angry"), sad: pick("sad"), surprised: pick("surprised"),
    neutral: pick("neutral"), aa: pick("aa", "A"), available: [...names],
  }
}

function PuppetVRM({ avatarUrl, onInfo }: { avatarUrl: string; onInfo?: (i: any) => void }) {
  const [vrm, setVrm] = useState<any>(null)
  const exprMapRef = useRef<any>(null)

  useEffect(() => {
    let cancelled = false
    loadVRM(avatarUrl)
      .then((v: any) => {
        if (cancelled) {
          VRMUtils.deepDispose(v.scene)
          return
        }
        applyFacing(v)
        setVrm((prev: any) => {
          if (prev) {
            try {
              VRMUtils.deepDispose(prev.scene)
            } catch {}
          }
          return v
        })
        const em = v.expressionManager
        const M = em ? buildExprMap(em) : null
        if (em && M) for (const n of M.available) em.setValue(n, 0)
        exprMapRef.current = M
        const boneCount = v.humanoid?.humanBones ? Object.keys(v.humanoid.humanBones).length : 55
        onInfo?.({ morphs: M ? M.available.length : 0, bones: boneCount, avatar: avatarUrl })
      })
      .catch((err: any) => {
        console.error("VRM load failed:", avatarUrl, err)
        onInfo?.({ morphs: 0, bones: 0, error: String(err?.message || err), avatar: avatarUrl })
      })
    return () => {
      cancelled = true
    }
  }, [avatarUrl, onInfo])

  const tmp = useMemo(
    () => ({ e: new THREE.Euler(), q: new THREE.Quaternion(), smooth: {} as Record<string, number> }),
    []
  )

  useFrame((state: any, rawDt: number) => {
    if (!vrm) return
    const dt = Math.min(rawDt, 0.05)
    const t = state.clock.elapsedTime
    const humanoid = vrm.humanoid
    if (humanoid?.autoUpdateHumanBones === false) humanoid.autoUpdateHumanBones = true

    const applyQ = (name: string, q: any, lambda = 12) => {
      const node = humanoid.getNormalizedBoneNode(name)
      if (!node || !q) return
      node.quaternion.slerp(q, 1 - Math.exp(-lambda * dt))
    }
    const applyEuler = (name: string, x: number, y: number, z: number, lambda = 8) => {
      const node = humanoid.getNormalizedBoneNode(name)
      if (!node) return
      tmp.e.set(x, y, z, "XYZ")
      tmp.q.setFromEuler(tmp.e)
      node.quaternion.slerp(tmp.q, 1 - Math.exp(-lambda * dt))
    }

    const mode = store.bodyMode
    const body = mode !== "off" && store.bodyPresent ? solveBody(store.bodyWorld, mode) : null
    const seated = body ? body.seated : mode === "seated"

    const moodId = store.handMode ? store.gestureMood : null
    const mood = moodId ? GESTURE_MOODS[moodId] : null
    const moodAge = mood ? (performance.now() - store.gestureMoodAt) / 1000 : 0

    if (body) {
      const hasChest = !!humanoid.getNormalizedBoneNode("chest")
      if (hasChest) {
        applyQ("spine", body.spine, 8)
        applyQ("chest", body.chest, 8)
      } else applyQ("spine", body.total, 8)

      if (body.armR) {
        applyQ("rightUpperArm", body.armR.upper, 14)
        applyQ("rightLowerArm", body.armR.lower, 14)
      } else {
        applyQ("rightUpperArm", HANG_ARM_R.upper, 4)
        applyQ("rightLowerArm", HANG_ARM_R.lower, 4)
      }
      if (body.armL) {
        applyQ("leftUpperArm", body.armL.upper, 14)
        applyQ("leftLowerArm", body.armL.lower, 14)
      } else {
        applyQ("leftUpperArm", HANG_ARM_L.upper, 4)
        applyQ("leftLowerArm", HANG_ARM_L.lower, 4)
      }

      if (seated) {
        applyQ("rightUpperLeg", SEATED_LEG_R.upper, 5)
        applyQ("rightLowerLeg", SEATED_LEG_R.lower, 5)
        applyQ("leftUpperLeg", SEATED_LEG_L.upper, 5)
        applyQ("leftLowerLeg", SEATED_LEG_L.lower, 5)
        if (hasChest) applyEuler("chest", Math.sin(t * 1.7) * D(1.5), 0, 0, 6)
      } else {
        if (body.legR) {
          applyQ("rightUpperLeg", body.legR.upper, 10)
          applyQ("rightLowerLeg", body.legR.lower, 10)
        } else {
          applyQ("rightUpperLeg", Q_ID, 3)
          applyQ("rightLowerLeg", Q_ID, 3)
        }
        if (body.legL) {
          applyQ("leftUpperLeg", body.legL.upper, 10)
          applyQ("leftLowerLeg", body.legL.lower, 10)
        } else {
          applyQ("leftUpperLeg", Q_ID, 3)
          applyQ("leftLowerLeg", Q_ID, 3)
        }
      }
      applyQ("hips", Q_ID, 3)
    } else {
      const seatedIdle = mode === "seated"
      applyQ("rightUpperArm", HANG_ARM_R.upper, 4)
      applyQ("rightLowerArm", HANG_ARM_R.lower, 4)
      applyQ("leftUpperArm", HANG_ARM_L.upper, 4)
      applyQ("leftLowerArm", HANG_ARM_L.lower, 4)
      if (seatedIdle) {
        applyQ("rightUpperLeg", SEATED_LEG_R.upper, 5)
        applyQ("rightLowerLeg", SEATED_LEG_R.lower, 5)
        applyQ("leftUpperLeg", SEATED_LEG_L.upper, 5)
        applyQ("leftLowerLeg", SEATED_LEG_L.lower, 5)
      } else {
        applyQ("rightUpperLeg", Q_ID, 3)
        applyQ("rightLowerLeg", Q_ID, 3)
        applyQ("leftUpperLeg", Q_ID, 3)
        applyQ("leftLowerLeg", Q_ID, 3)
      }
      applyEuler("spine", Math.sin(t * 1.7) * D(2), 0, 0, 6)
      applyEuler("chest", Math.sin(t * 1.7 + 0.4) * D(1.5), 0, 0, 6)
      applyEuler("hips", 0, Math.sin(t * 0.5) * D(2), 0, 4)
    }

    /* head */
    let headNod = store.speaking ? Math.sin(t * 6) * D(2) : 0
    const moodHead = mood?.head ?? [0, 0, 0]
    if (mood && (mood.reaction === "nod" || mood.reaction === "joy") && moodAge < 0.5) {
      headNod += Math.sin((moodAge / 0.5) * Math.PI) * D(6)
    }
    if (mood && mood.reaction === "droop" && moodAge < 0.8) {
      headNod += Math.sin((moodAge / 0.8) * Math.PI) * D(8)
    }
    const yaw = clamp(store.headYaw, -1, 1) * D(HEAD.yawGain)
    const pitch = clamp(store.headPitch, -1, 1) * D(HEAD.pitchGain)
    applyEuler("head", pitch + headNod + D(moodHead[0]), yaw + D(moodHead[1]), D(moodHead[2]), 10)

    /* mood hop */
    let y = 0
    if (mood) {
      if (mood.reaction === "joy" && moodAge < 0.5) y += Math.sin((moodAge / 0.5) * Math.PI) * 0.09
      if (mood.reaction === "bounce") y += Math.abs(Math.sin(t * 5)) * 0.03
      if (mood.reaction === "droop" && moodAge < 0.8) y -= Math.sin((moodAge / 0.8) * Math.PI) * 0.04
    }
    vrm.scene.position.y = y

    humanoid.update()

    /* FACE */
    const em = vrm.expressionManager
    const M = exprMapRef.current
    if (em && M) {
      const bs = (store.blendshapes || {}) as Record<string, number>
      const lerp = (k: string, target: number, rate = 16) => {
        const cur = tmp.smooth[k] ?? 0
        tmp.smooth[k] = THREE.MathUtils.damp(cur, target, rate, dt)
        return tmp.smooth[k]
      }
      const set = (key: string, v: number) => {
        if (M[key] != null) em.setValue(M[key], v)
      }

      const remapBlink = (raw: number) => {
        if (raw < 0.25) return 0
        if (raw > 0.85) return 1
        return (raw - 0.25) / 0.6
      }
      let lBlink = remapBlink(bs.eyeBlinkLeft ?? 0)
      let rBlink = remapBlink(bs.eyeBlinkRight ?? 0)
      if (mood?.reaction === "wink") {
        lBlink = Math.max(lBlink, 0.98)
        rBlink = Math.min(rBlink, 0.05)
      }
      set("blinkLeft", lBlink)
      set("blinkRight", rBlink)
      if (M.blinkLeft && M.blinkRight) set("blink", 0)
      else set("blink", Math.max(lBlink, rBlink))

      set("happy", lerp("happy", Math.max(bs.mouthSmileLeft ?? 0, bs.mouthSmileRight ?? 0)))
      set(
        "angry",
        lerp(
          "angry",
          (bs.browDownLeft ?? 0) * 0.5 +
            (bs.browDownRight ?? 0) * 0.5 +
            (bs.mouthFrownLeft ?? 0) * 0.25 +
            (bs.mouthFrownRight ?? 0) * 0.25
        )
      )
      set(
        "sad",
        lerp(
          "sad",
          (bs.browInnerUp ?? 0) * 0.6 +
            (bs.mouthFrownLeft ?? 0) * 0.3 +
            (bs.mouthFrownRight ?? 0) * 0.3
        )
      )
      set(
        "surprised",
        lerp(
          "surprised",
          (bs.browInnerUp ?? 0) * 0.4 +
            (bs.browOuterUpLeft ?? 0) * 0.3 +
            (bs.browOuterUpRight ?? 0) * 0.3 +
            (bs.jawOpen ?? 0) * 0.3
        )
      )
      set("aa", lerp("aa", clamp(bs.jawOpen ?? 0, 0, 1)))

      if (mood?.expr) {
        for (const [k, v] of Object.entries(mood.expr)) {
          if (M[k] == null) continue
          const cur = em.getValue?.(M[k]) ?? 0
          em.setValue(M[k], Math.max(cur, v as number))
        }
      }
    }

    vrm.update(dt)
  })

  if (!vrm) return null
  return <primitive object={vrm.scene} />
}

export function AvatarStage({ avatarUrl, onInfo }: { avatarUrl: string; onInfo?: (i: any) => void }) {
  return (
    <Canvas
      camera={{ position: [0, 1.35, 3.4], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
    >
      <fog attach="fog" args={["#0a0d1f", 6, 16]} />
      <ambientLight intensity={0.65} />
      <directionalLight position={[2.5, 4, 3]} intensity={1.4} />
      <pointLight position={[-3, 2, -3]} intensity={22} distance={12} color="#8b5cf6" />
      <pointLight position={[3, 1.2, 2.5]} intensity={10} distance={9} color="#38bdf8" />

      <Suspense fallback={null}>
        <PuppetVRM key={avatarUrl} avatarUrl={avatarUrl} onInfo={onInfo} />
      </Suspense>

      <mesh rotation-x={-Math.PI / 2} position-y={0.002}>
        <circleGeometry args={[1.2, 64]} />
        <meshStandardMaterial color="#0e1126" roughness={0.85} metalness={0.25} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.004}>
        <ringGeometry args={[1.16, 1.22, 64]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.75} />
      </mesh>

      <ContactShadows position={[0, 0.006, 0]} opacity={0.55} scale={4} blur={2.4} far={2} />

      <OrbitControls
        target={[0, 1.02, 0]}
        enablePan={false}
        minDistance={1.8}
        maxDistance={6}
        minPolarAngle={0.7}
        maxPolarAngle={1.55}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  )
}