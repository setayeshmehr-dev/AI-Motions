// PhotoStudio — invisible offscreen three.js stage that photographs every
// avatar once at app start. Cached in localStorage (thumb5 prefix).

import * as THREE from "three"
import { GLTFLoader } from "three-stdlib"
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm"
import { HANG_ARM_R, HANG_ARM_L } from "./body-solver"

const THUMB_PREFIX = "avatarpuppet:thumb5:"
export const thumbKey = (id: string) => THUMB_PREFIX + id

export function loadThumbs(): Record<string, string> {
  const out: Record<string, string> = {}
  if (typeof window === "undefined") return out
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(THUMB_PREFIX)) out[k.slice(THUMB_PREFIX.length)] = localStorage.getItem(k) || ""
    }
  } catch {}
  return out
}

export function getCachedThumb(id: string): string | null {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem(thumbKey(id))
  } catch {
    return null
  }
}

function storeThumb(id: string, dataUrl: string) {
  try {
    localStorage.setItem(thumbKey(id), dataUrl)
  } catch {}
}

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

function relaxAvatar(vrm: any) {
  const humanoid = vrm.humanoid
  if (!humanoid) return

  const rUp = humanoid.getNormalizedBoneNode("rightUpperArm")
  const rLo = humanoid.getNormalizedBoneNode("rightLowerArm")
  const lUp = humanoid.getNormalizedBoneNode("leftUpperArm")
  const lLo = humanoid.getNormalizedBoneNode("leftLowerArm")
  if (rUp && HANG_ARM_R?.upper) rUp.quaternion.copy(HANG_ARM_R.upper)
  if (rLo && HANG_ARM_R?.lower) rLo.quaternion.copy(HANG_ARM_R.lower)
  if (lUp && HANG_ARM_L?.upper) lUp.quaternion.copy(HANG_ARM_L.upper)
  if (lLo && HANG_ARM_L?.lower) lLo.quaternion.copy(HANG_ARM_L.lower)

  const em = vrm.expressionManager
  if (em) {
    try {
      em.setValue("happy", 0.3)
    } catch {}
  }

  humanoid.update?.()
  vrm.update(0)
}

export async function shootMissingThumbnails({
  avatars,
  urls,
  width = 224,
  height = 320,
  onProgress,
}: {
  avatars: string[]
  urls: Record<string, string>
  width?: number
  height?: number
  onProgress?: (done: number, total: number, currentId: string | null) => void
}): Promise<Record<string, string>> {
  const photographed: Record<string, string> = {}

  const todo = avatars.filter((id) => !getCachedThumb(id))
  const total = todo.length
  if (total === 0) {
    onProgress?.(0, 0, null)
    return photographed
  }

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  })
  renderer.setSize(width, height, false)
  renderer.setPixelRatio(1)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color("#0e1126")

  const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 50)
  camera.position.set(0, 2, 2.1)
  camera.lookAt(0, 1.5, 0)

  
  scene.add(new THREE.AmbientLight(0xffffff, 0.85))
  const key = new THREE.DirectionalLight(0xffffff, 1.6)
  key.position.set(2.5, 4, 3)
  scene.add(key)
  const rim = new THREE.PointLight(0x8b5cf6, 14, 14)
  rim.position.set(-3, 2, -2.5)
  scene.add(rim)

  const loader = new GLTFLoader()
  ;(loader as any).register((parser: any) => new VRMLoaderPlugin(parser))

  let done = 0
  for (const id of todo) {
    const url = urls[id]
    if (!url) {
      done++
      onProgress?.(done, total, id)
      continue
    }

    const gltf: any = await new Promise((resolve) => {
      loader.load(url, resolve as any, undefined, () => resolve(null))
    })
    const vrm = gltf?.userData?.vrm
    if (!vrm) {
      done++
      onProgress?.(done, total, id)
      continue
    }

    applyFacing(vrm)
    relaxAvatar(vrm)
    scene.add(vrm.scene)

    renderer.render(scene, camera)
    await new Promise((r) => setTimeout(r, 60))
    renderer.render(scene, camera)
    await new Promise((r) => setTimeout(r, 60))
    renderer.render(scene, camera)

    try {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.78)
      storeThumb(id, dataUrl)
      photographed[id] = dataUrl
    } catch (e: any) {
      console.warn("[PhotoStudio] capture failed for", id, e?.message || e)
    }

    scene.remove(vrm.scene)
    try {
      VRMUtils.deepDispose(vrm.scene)
    } catch {}

    done++
    onProgress?.(done, total, id)
  }

  renderer.dispose()
  return photographed
}