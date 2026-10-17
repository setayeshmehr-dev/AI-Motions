"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  getHandLandmarker, getFaceLandmarker, getPoseLandmarker,
  nextHandTs, nextFaceTs, nextPoseTs,
} from "./model-loaders"
import { store, resetStore, setGuide, setGestureMood } from "./tracking-store"
import { readBodyDiagnostics, hipsVisibleDetect } from "./body-solver"
import { classifyGesture } from "./hand-gestures"

const VOTE_FRAMES = 5
const HOLD_MS = 600
const LOSE_MS = 1100
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

export function useTracking(enabled: boolean) {
  const [status, setStatus] = useState<"idle" | "loading" | "running" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const [facePresent, setFacePresent] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [bodyPresent, setBodyPresent] = useState(false)
  const [seated, setSeated] = useState(false)
  const [gesture, setGesture] = useState<string | null>(null)
  const stopRef = useRef<(() => void) | null>(null)

  const start = useCallback(async () => {
    if (stopRef.current) return
    let raf = 0
    let stream: MediaStream | null = null
    let video: HTMLVideoElement | null = null
    let cancelled = false
    let lastVideoTime = -1

    let hand: any = null
    let face: any = null
    let pose: any = null
    const pending: Record<string, Promise<void> | null> = {}
    const ensureModel = (kind: string) => {
      if (pending[kind]) return
      const load =
        kind === "hand" ? getHandLandmarker()
        : kind === "face" ? getFaceLandmarker()
        : getPoseLandmarker()
      pending[kind] = load
        .then((m: any) => {
          if (kind === "hand") hand = m
          else if (kind === "face") face = m
          else pose = m
        })
        .catch((e: unknown) => console.warn(`[ai-avatar] "${kind}" unavailable:`, e))
        .finally(() => {
          pending[kind] = null
        })
    }
    if (store.faceMode) ensureModel("face")
    if (store.handMode) ensureModel("hand")
    if (store.bodyMode !== "off") ensureModel("pose")

    const stop = () => {
      cancelled = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
      if (video?.parentNode) video.parentNode.removeChild(video)
      video = null
      resetStore()
      stopRef.current = null
    }
    stopRef.current = stop

    try {
      setStatus("loading")
      setErrorMsg("")

      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      })
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }

      video = document.createElement("video")
      Object.assign(video.style, {
        position: "fixed",
        left: "-10px",
        top: "-10px",
        width: "2px",
        height: "2px",
        opacity: "0",
        pointerEvents: "none",
      })
      video.muted = true
      video.playsInline = true
      document.body.appendChild(video)
      video.srcObject = stream
      await video.play()
      lastVideoTime = -1

      let uiFace: boolean | null = null
      let uiSpeaking: boolean | null = null
      let uiBody: boolean | null = null
      let uiSeated: boolean | null = null
      let uiGesture: string | null = null
      let guideTimer = 0

      let votes: (string | null)[] = []
      let candidate: string | null = null
      let candidateSince = 0
      let stable: string | null = null
      let wavePts: { t: number; x: number }[] = []

      const processFace = (res: any) => {
        const lm = res?.faceLandmarks?.[0]
        const present = !!lm
        store.facePresent = present
        if (present !== uiFace) {
          uiFace = present
          setFacePresent(present)
        }

        const cats = res?.faceBlendshapes?.[0]?.categories
        const shapes: Record<string, number> = {}
        if (cats) for (const c of cats) shapes[c.categoryName] = c.score
        store.blendshapes = shapes

        if (lm) {
          const nose = lm[1]
          const Le = lm[234]
          const R = lm[454]
          const dl = Math.hypot(nose.x - Le.x, nose.y - Le.y)
          const dr = Math.hypot(nose.x - R.x, nose.y - R.y)
          store.headYaw = clamp(((dr - dl) / (dl + dr + 1e-6)) * 2.2, -1, 1)
          const brow = lm[168]
          const fore = lm[10]
          const chin = lm[152]
          const fh = Math.hypot(fore.x - chin.x, fore.y - chin.y) || 1e-6
          store.headPitch = clamp(((nose.y - brow.y) / fh) * 2.6 - 0.62, -1, 1)
          const jaw = shapes.jawOpen ?? 0
          if (!store.speaking && jaw > 0.22) store.speaking = true
          else if (store.speaking && jaw < 0.08) store.speaking = false
        } else {
          store.headYaw = 0
          store.headPitch = 0
          store.speaking = false
        }
        if (store.speaking !== uiSpeaking) {
          uiSpeaking = store.speaking
          setSpeaking(store.speaking)
        }
      }

      const processHand = (res: any, now: number) => {
        const lm = res?.landmarks?.[0]
        store.handPresent = !!lm

        if (!lm) {
          votes.push(null)
          if (votes.length > VOTE_FRAMES) votes.shift()
          if (stable && now - candidateSince > LOSE_MS) {
            stable = null
            setGestureMood(null)
            if (uiGesture !== null) {
              uiGesture = null
              setGesture(null)
            }
          }
          return
        }

        store.handX = 1 - lm[8].x
        votes.push(classifyGesture(lm))
        if (votes.length > VOTE_FRAMES) votes.shift()

        const counts: Record<string, number> = {}
        let best: string | null = null
        let bestN = 0
        for (const v of votes)
          if (v) {
            counts[v] = (counts[v] || 0) + 1
            if (counts[v] > bestN) {
              best = v
              bestN = counts[v]
            }
          }
        const voted = bestN >= 3 ? best : null

        if (voted !== candidate) {
          candidate = voted
          candidateSince = now
        }
        if (voted && now - candidateSince >= HOLD_MS && voted !== stable) {
          stable = voted
          wavePts = []
        }
        if (!voted && stable && now - candidateSince > LOSE_MS) {
          stable = null
          wavePts = []
        }

        let waving = false
        if (stable === "palm") {
          wavePts.push({ t: now, x: store.handX })
          wavePts = wavePts.filter((p) => now - p.t < 1400)
          let changes = 0
          let lastDir = 0
          for (let i = 1; i < wavePts.length; i++) {
            const dx = wavePts[i].x - wavePts[i - 1].x
            if (Math.abs(dx) < 0.012) continue
            const dir = Math.sign(dx)
            if (lastDir !== 0 && dir !== lastDir) changes++
            lastDir = dir
          }
          waving = changes >= 2
        }

        const moodId = waving ? "wave" : stable
        if (moodId !== uiGesture) {
          uiGesture = moodId
          setGesture(moodId)
        }
        setGestureMood(moodId)
      }

      const processBody = (res: any) => {
        const lm = res?.worldLandmarks?.[0]
        const d = readBodyDiagnostics(lm)

        const ok = !!lm && d.shoulders > 0.35
        store.bodyPresent = ok
        store.bodyWorld = ok ? lm : null
        store.seated = ok && !hipsVisibleDetect(lm) && d.thighs > 0.4

        if (store.bodyPresent !== uiBody) {
          uiBody = store.bodyPresent
          setBodyPresent(store.bodyPresent)
        }
        if (store.seated !== uiSeated) {
          uiSeated = store.seated
          setSeated(store.seated)
        }

        const now = performance.now()
        if (now - guideTimer > 500) {
          guideTimer = now
          let g = ""
          if (!d.hasAny) g = "step-back"
          else if (d.face < 0.35 && d.shoulders < 0.35) g = "step-back"
          else if (d.shoulders <= 0.35) g = "shoulders"
          else if (store.seated) g = "seated-ok"
          else if (d.hips < 0.45) g = "seated-ok"
          else g = "ok"
          setGuide(g)
        }
      }

      const resetFaceState = () => {
        store.facePresent = false
        store.blendshapes = {} as Record<string, number>
        store.headYaw = 0
        store.headPitch = 0
        store.speaking = false
        if (uiFace !== false) {
          uiFace = false
          setFacePresent(false)
        }
        if (uiSpeaking !== false) {
          uiSpeaking = false
          setSpeaking(false)
        }
      }
      const resetHandState = () => {
        votes.length = 0
        candidate = null
        stable = null
        wavePts.length = 0
        store.handPresent = false
        store.handX = 0.5
        setGestureMood(null)
        if (uiGesture !== null) {
          uiGesture = null
          setGesture(null)
        }
      }
      const resetBodyState = () => {
        store.bodyPresent = false
        store.seated = false
        store.bodyWorld = null
        if (uiBody !== false) {
          uiBody = false
          setBodyPresent(false)
        }
        if (uiSeated !== false) {
          uiSeated = false
          setSeated(false)
        }
        setGuide("")
      }

      setStatus("running")

      const loop = () => {
        raf = requestAnimationFrame(loop)
        if (cancelled || !video || video.readyState < 2) return
        if (video.videoWidth === 0) return
        if (video.currentTime === lastVideoTime) return
        lastVideoTime = video.currentTime

        if (store.faceMode) {
          if (!face) ensureModel("face")
          else {
            try {
              processFace(face.detectForVideo(video, nextFaceTs()))
            } catch {}
          }
        } else resetFaceState()

        if (store.handMode) {
          if (!hand) ensureModel("hand")
          else {
            try {
              processHand(hand.detectForVideo(video, nextHandTs()), performance.now())
            } catch {}
          }
        } else resetHandState()

        if (store.bodyMode !== "off") {
          if (!pose) ensureModel("pose")
          else {
            try {
              processBody(pose.detectForVideo(video, nextPoseTs()))
            } catch {}
          }
        } else resetBodyState()
      }
      raf = requestAnimationFrame(loop)
    } catch (err: any) {
      if (cancelled) return
      const message =
        err?.name === "NotAllowedError"
          ? "Camera permission was denied."
          : err?.name === "NotFoundError"
            ? "No camera was found on this device."
            : "Couldn't start tracking: " + (err?.message || err)
      setErrorMsg(message)
      setStatus("error")
      stopRef.current = null
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
      if (video?.parentNode) video.parentNode.removeChild(video)
    }
  }, [])

  useEffect(() => {
    if (enabled) start()
    return () => stopRef.current?.()
  }, [enabled, start])

  const restart = useCallback(() => {
    stopRef.current?.()
    start()
  }, [start])

  return { status, errorMsg, facePresent, speaking, bodyPresent, seated, gesture, restart }
}