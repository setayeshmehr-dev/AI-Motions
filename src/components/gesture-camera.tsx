"use client"

import { useEffect, useRef, useState } from "react"
import type { HandLandmarker } from "@mediapipe/tasks-vision"
import { motion } from "framer-motion"
import { CameraOff, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { getGesture } from "@/lib/gestures"
import { classifyGesture, type Landmark } from "@/lib/hand-gestures"
import { getPasswordHandLandmarker, nextPasswordHandTs } from "@/lib/model-loaders"

const HOLD_MS = 700
const VOTE_FRAMES = 5

const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
]

function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  lm: Landmark[] | null,
  w: number,
  h: number
) {
  ctx.clearRect(0, 0, w, h)
  if (!lm) return
  const px = (p: Landmark) => (1 - p.x) * w
  const py = (p: Landmark) => p.y * h

  ctx.save()
  ctx.lineWidth = Math.max(2, w * 0.005)
  ctx.strokeStyle = "rgba(167, 139, 250, 0.9)"
  ctx.shadowColor = "rgba(167, 139, 250, 0.8)"
  ctx.shadowBlur = 10
  ctx.lineCap = "round"
  ctx.beginPath()
  for (const [a, b] of HAND_CONNECTIONS) {
    ctx.moveTo(px(lm[a]), py(lm[a]))
    ctx.lineTo(px(lm[b]), py(lm[b]))
  }
  ctx.stroke()

  ctx.shadowBlur = 0
  for (let i = 0; i < 21; i++) {
    ctx.beginPath()
    ctx.arc(px(lm[i]), py(lm[i]), i % 4 === 0 ? w * 0.008 : w * 0.005, 0, Math.PI * 2)
    ctx.fillStyle = "rgba(255, 255, 255, 0.92)"
    ctx.fill()
  }
  ctx.restore()
}

type Phase = "loading" | "running" | "error"

interface GestureCameraProps {
  active: boolean
  onCapture: (id: string) => void
  onUnavailable?: (reason: string) => void
}

export function GestureCamera({ active, onCapture, onUnavailable }: GestureCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const streamRef = useRef<MediaStream | null>(null)
  const landmarkerRef = useRef<HandLandmarker | null>(null)
  const lastVideoTimeRef = useRef(-1)
  const voteRef = useRef<(string | null)[]>([])
  const stableRef = useRef<{ id: string; since: number } | null>(null)
  const lastCapturedRef = useRef<string | null>(null)
  const armedRef = useRef(true)
  const activeRef = useRef(active)
  const onCaptureRef = useRef(onCapture)

  const [phase, setPhase] = useState<Phase>("loading")
  const [loadingMsg, setLoadingMsg] = useState("Loading the hand-tracking model…")
  const [errorMsg, setErrorMsg] = useState("")
  const [detected, setDetected] = useState<string | null>(null)
  const [hold, setHold] = useState(0)
  const [captured, setCaptured] = useState<string | null>(null)
  const [flashT, setFlashT] = useState(0)
  const [aspect, setAspect] = useState(16 / 9)

  useEffect(() => {
    activeRef.current = active
    if (!active) {
      stableRef.current = null
      setHold(0)
    }
  }, [active])

  useEffect(() => {
    onCaptureRef.current = onCapture
  }, [onCapture])

  useEffect(() => {
    let cancelled = false

    const cleanup = () => {
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
    }

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop)
      const video = videoRef.current
      const canvas = canvasRef.current
      const landmarker = landmarkerRef.current
      if (!video || !canvas || !landmarker || video.readyState < 2) return
      if (video.currentTime === lastVideoTimeRef.current) return
      lastVideoTimeRef.current = video.currentTime

      let landmarks: Landmark[] | null = null
      try {
        const result = landmarker.detectForVideo(video, nextPasswordHandTs())
        landmarks = (result.landmarks?.[0] as Landmark[] | undefined) ?? null
      } catch {
        return
      }

      const ctx = canvas.getContext("2d")
      if (ctx) drawSkeleton(ctx, landmarks, canvas.width, canvas.height)

      const vote = voteRef.current
      vote.push(landmarks ? classifyGesture(landmarks) : null)
      if (vote.length > VOTE_FRAMES) vote.shift()
      const counts = new Map<string, number>()
      for (const v of vote) if (v) counts.set(v, (counts.get(v) ?? 0) + 1)
      let best: string | null = null
      let bestCount = 0
      for (const [id, n] of counts) {
        if (n > bestCount) {
          best = id
          bestCount = n
        }
      }
      const id = bestCount >= 3 ? best : null

      const now = performance.now()

      if (!activeRef.current) {
        stableRef.current = null
        setDetected(null)
        setHold(0)
        return
      }

      setDetected(id)

      if (id === null) {
        stableRef.current = null
        setHold(0)
        armedRef.current = true
        return
      }

      if (id === lastCapturedRef.current && !armedRef.current) {
        stableRef.current = null
        setHold(0)
        return
      }
      if (id !== lastCapturedRef.current) armedRef.current = true

      const stable = stableRef.current
      if (!stable || stable.id !== id) {
        stableRef.current = { id, since: now }
        setHold(0)
        return
      }

      const progress = Math.min(1, (now - stable.since) / HOLD_MS)
      setHold(progress)

      if (progress >= 1 && armedRef.current) {
        lastCapturedRef.current = id
        armedRef.current = false
        stableRef.current = null
        setHold(0)
        setCaptured(id)
        setFlashT(Date.now())
        onCaptureRef.current(id)
      }
    }

    ;(async () => {
      try {
        const landmarker = await getPasswordHandLandmarker()
        if (cancelled) return
        landmarkerRef.current = landmarker

        setLoadingMsg("Starting the camera…")
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream

        const video = videoRef.current
        if (!video) return
        video.onloadedmetadata = () => {
          const canvas = canvasRef.current
          if (canvas && video.videoWidth) {
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            setAspect(video.videoWidth / video.videoHeight)
          }
        }
        video.srcObject = stream
        await video.play().catch(() => {})

        setPhase("running")
        rafRef.current = requestAnimationFrame(loop)
      } catch (err: any) {
        if (cancelled) return
        setPhase("error")
        const message =
          err?.name === "NotAllowedError"
            ? "Camera permission was denied."
            : err?.name === "NotFoundError"
              ? "No camera was found on this device."
              : "Couldn't start the camera."
        setErrorMsg(message)
        onUnavailable?.(message)
      }
    })()

    return () => {
      cancelled = true
      cleanup()
    }
  }, [])

  const detectedGesture = detected ? getGesture(detected) : null
  const justCaptured = detected !== null && detected === captured

  return (
    <div className="space-y-2.5">
      <div
        className="relative overflow-hidden rounded-xl border border-border/70 bg-black"
        style={{ aspectRatio: aspect }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

        {flashT > 0 && (
          <motion.div
            key={flashT}
            className="pointer-events-none absolute inset-0 bg-primary/25"
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
          />
        )}

        {phase !== "running" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/75 p-6 text-center backdrop-blur-sm">
            {phase === "loading" ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div>
                  <p className="text-sm font-medium">{loadingMsg}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    First time downloads ~8 MB, then it&apos;s cached.
                  </p>
                </div>
              </>
            ) : (
              <>
                <CameraOff className="h-8 w-8 text-destructive" />
                <p className="text-sm font-medium">{errorMsg}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onUnavailable?.(errorMsg)}
                >
                  Use the emoji picker instead
                </Button>
              </>
            )}
          </div>
        )}

        {phase === "running" && (
          <>
            <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-background/70 px-3 py-1.5 backdrop-blur">
              {detectedGesture ? (
                <>
                  <span className="text-lg leading-none">{detectedGesture.emoji}</span>
                  <span className="text-xs font-medium">{detectedGesture.label}</span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">Show a hand gesture 👋</span>
              )}
            </div>

            <div className="absolute inset-x-3 bottom-3 h-1.5 overflow-hidden rounded-full bg-background/60">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${hold * 100}%`,
                  boxShadow: "0 0 8px rgba(167, 139, 250, 0.9)",
                }}
              />
            </div>
          </>
        )}
      </div>

      <p className="min-h-4 text-center text-xs text-muted-foreground">
        {phase === "error"
          ? "The emoji picker below is ready while the camera is unavailable."
          : !detected
            ? "Hold a gesture inside the frame — keep it steady to lock it in."
            : justCaptured
              ? "Locked in ✅ — lower your hand or switch gestures for the next slot."
              : `Hold "${detectedGesture?.label}" steady to confirm…`}
      </p>
    </div>
  )
}