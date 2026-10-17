"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { FaceLandmarker } from "@mediapipe/tasks-vision"
import { motion } from "framer-motion"
import { CameraOff, Loader2, RefreshCw, ScanFace, ShieldCheck, ShieldX } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  FACE_MATCH_THRESHOLD,
  averageDescriptors,
  descriptorDistance,
  detectFaceDescriptor,
  getFaceApi,
  getFaceLandmarker,
  nextFaceTimestamp,
  readFaceFrame,
  rebuildFaceLandmarkerOnCPU,
} from "@/lib/face-models"
import { cn } from "@/lib/utils"

/* eslint-disable @typescript-eslint/no-explicit-any */

type Mode = "enroll" | "verify"
type Phase = "loading" | "ready" | "capturing" | "success" | "nomatch" | "error"

type ChallengeKind = "blink" | "turn" | "smile"
interface ChallengeDef {
  kind: ChallengeKind
  label: string
  emoji: string
}

const CHALLENGE_POOL: ChallengeDef[] = [
  { kind: "blink", label: "Blink twice", emoji: "👁️" },
  { kind: "turn", label: "Turn your head to a side", emoji: "↔️" },
  { kind: "smile", label: "Smile", emoji: "😊" },
]

// Liveness thresholds
const BLINK_CLOSED = 0.5
const BLINK_OPEN = 0.3
const TURN_YAW = 0.25
const SMILE_SCORE = 0.5
const HOLD_FRAMES = 5

// Signature capture
const SAMPLES = 4
const SAMPLE_GAP = 260
const CAPTURE_TIMEOUT = 9000

/* Simplified neon face-mesh loops (MediaPipe landmark indices) */
const FACE_OVAL = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109]
const LEFT_EYE = [33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246]
const RIGHT_EYE = [362,382,381,380,374,373,390,249,263,466,388,387,386,385,384,398]
const LIPS_OUTER = [61,40,37,0,267,270,409,291,375,321,405,314,17,84,181,91,146]
const LIPS_INNER = [78,191,80,81,82,13,312,311,310,415,308]
const BROW_L = [70,63,105,66,107]
const BROW_R = [300,293,334,296,336]
const MESH_LOOPS = [FACE_OVAL, LEFT_EYE, RIGHT_EYE, LIPS_OUTER, LIPS_INNER, BROW_L, BROW_R]

function drawFaceMesh(
  ctx: CanvasRenderingContext2D,
  lm: any[] | null,
  w: number,
  h: number
) {
  ctx.clearRect(0, 0, w, h)
  if (!lm) return
  const px = (p: any) => (1 - p.x) * w // mirrored to match the video
  const py = (p: any) => p.y * h

  ctx.save()
  ctx.lineWidth = Math.max(1.5, w * 0.004)
  ctx.strokeStyle = "rgba(167, 139, 250, 0.9)"
  ctx.shadowColor = "rgba(167, 139, 250, 0.8)"
  ctx.shadowBlur = 8
  ctx.lineJoin = "round"
  for (const loop of MESH_LOOPS) {
    ctx.beginPath()
    loop.forEach((idx, i) => {
      const p = lm[idx]
      if (!p) return
      if (i === 0) ctx.moveTo(px(p), py(p))
      else ctx.lineTo(px(p), py(p))
    })
    ctx.closePath()
    ctx.stroke()
  }
  ctx.shadowBlur = 0
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)"
  for (let i = 0; i < lm.length; i += 3) {
    const p = lm[i]
    ctx.beginPath()
    ctx.arc(px(p), py(p), Math.max(1, w * 0.0022), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

interface FaceCaptureModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: Mode
  expected?: number[] | null
  onComplete: (descriptor: number[]) => void
}

export function FaceCaptureModal({
  open,
  onOpenChange,
  mode,
  expected,
  onComplete,
}: FaceCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const workCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef(0)
  const streamRef = useRef<MediaStream | null>(null)
  const landmarkerRef = useRef<FaceLandmarker | null>(null)
  const lastVideoTimeRef = useRef(-1)
  const phaseRef = useRef<Phase>("loading")
  const challengesRef = useRef<ChallengeDef[]>([])
  const challengeIdxRef = useRef(0)
  const blinkRef = useRef({ closed: false, count: 0 })
  const holdRef = useRef(0)
  const samplesRef = useRef<Float32Array[]>([])
  const captureStartRef = useRef(0)
  const lastSampleAtRef = useRef(0)
  const busyRef = useRef(false)
  const failCountRef = useRef(0)
  const cpuRetryRef = useRef(false)
  const lastErrMsgRef = useRef("")
  const onCompleteRef = useRef(onComplete)
  const expectedRef = useRef(expected)

  const [phase, setPhase] = useState<Phase>("loading")
  const [loadingMsg, setLoadingMsg] = useState("Loading face models…")
  const [errorMsg, setErrorMsg] = useState("")
  const [facePresent, setFacePresent] = useState(false)
  const [challenges, setChallenges] = useState<ChallengeDef[]>([])
  const [challengeIdx, setChallengeIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [similarity, setSimilarity] = useState<number | null>(null)
  const [aspect, setAspect] = useState(16 / 9)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])
  useEffect(() => {
    expectedRef.current = expected
  }, [expected])
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  const go = useCallback((p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }, [])

  const resetChallenges = useCallback(() => {
    const pool = [...CHALLENGE_POOL]
    const picked: ChallengeDef[] = []
    while (picked.length < 2 && pool.length) {
      picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
    }
    challengesRef.current = picked
    challengeIdxRef.current = 0
    blinkRef.current = { closed: false, count: 0 }
    holdRef.current = 0
    setChallenges(picked)
    setChallengeIdx(0)
    setProgress(0)
  }, [])

  const startCapture = useCallback(() => {
    samplesRef.current = []
    captureStartRef.current = performance.now()
    lastSampleAtRef.current = 0
    go("capturing")
  }, [go])

  useEffect(() => {
    if (!open) return
    let cancelled = false

    const cleanup = () => {
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
      workCanvasRef.current = null
    }

    const finishCapture = (avg: Float32Array) => {
      if (cancelled) return
      if (mode === "enroll") {
        go("success")
        window.setTimeout(() => {
          if (!cancelled) onCompleteRef.current(Array.from(avg))
        }, 950)
        return
      }
      const exp = expectedRef.current
      if (!exp || exp.length !== avg.length) {
        setErrorMsg("No Face ID is enrolled for this account.")
        go("error")
        return
      }
      const dist = descriptorDistance(avg, exp)
      setSimilarity(Math.max(0, Math.min(100, Math.round((1 - dist / 1.2) * 100))))
      if (dist < FACE_MATCH_THRESHOLD) {
        go("success")
        window.setTimeout(() => {
          if (!cancelled) onCompleteRef.current(Array.from(avg))
        }, 950)
      } else {
        go("nomatch")
        toast.error("Face didn't match", {
          description: "Check the lighting and try again.",
        })
      }
    }

    /**
     * Surface the REAL error message (first occurrence) in a toast so it can
     * be read off-screen, then silently retry; after a few consecutive
     * failures, rebuild the model on the CPU delegate.
     */
    const handleDetectFailure = (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err)
      lastErrMsgRef.current = msg
      failCountRef.current++
      if (failCountRef.current === 1) {
        toast.error("Face model error — retrying", {
          description: msg,
          duration: 8000,
        })
      }
      if (failCountRef.current >= 3 && !cpuRetryRef.current) {
        cpuRetryRef.current = true
        rebuildFaceLandmarkerOnCPU()
          .then((fresh) => {
            if (cancelled) return
            landmarkerRef.current = fresh
            failCountRef.current = 0
          })
          .catch(() => {
            if (cancelled) return
            setErrorMsg("The face model failed to run: " + msg)
            go("error")
          })
      } else if (failCountRef.current > 90 && cpuRetryRef.current) {
        setErrorMsg("The face model keeps failing: " + msg)
        go("error")
      }
    }

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop)
      const video = videoRef.current
      const canvas = canvasRef.current
      const landmarker = landmarkerRef.current
      if (!video || !canvas || !landmarker) return
      if (video.readyState < 2) return
      if (video.videoWidth === 0 || video.videoHeight === 0) return
      if (video.currentTime === lastVideoTimeRef.current) return
      lastVideoTimeRef.current = video.currentTime

      // Copy the video frame to a working canvas and detect on THAT.
      // This bypasses video-element quirks inside dialogs (dimensions, texture
      // upload, GPU switching) that can make detectForVideo throw on some Macs.
      let work = workCanvasRef.current
      if (!work) {
        work = document.createElement("canvas")
        workCanvasRef.current = work
      }
      if (work.width !== video.videoWidth || work.height !== video.videoHeight) {
        work.width = video.videoWidth
        work.height = video.videoHeight
      }
      const wctx = work.getContext("2d")
      if (!wctx) return
      wctx.drawImage(video, 0, 0)

      let result: any
      try {
        result = landmarker.detectForVideo(work, nextFaceTimestamp())
        failCountRef.current = 0
      } catch (err) {
        handleDetectFailure(err)
        return
      }

      const frame = readFaceFrame(result)
      const mesh = result?.faceLandmarks?.[0] ?? null
      const ctx = canvas.getContext("2d")
      if (ctx) drawFaceMesh(ctx, mesh, canvas.width, canvas.height)
      setFacePresent(frame.present)

      const ph = phaseRef.current
      if (ph !== "ready" && ph !== "capturing") return

      if (!frame.present) {
        holdRef.current = 0
        setProgress(0)
        return
      }

      if (ph === "ready") {
        const current = challengesRef.current[challengeIdxRef.current]
        if (!current) {
          startCapture()
          return
        }
        let done = false
        let prog = 0
        if (current.kind === "blink") {
          const b = blinkRef.current
          if (!b.closed && frame.blink > BLINK_CLOSED) b.closed = true
          else if (b.closed && frame.blink < BLINK_OPEN) {
            b.closed = false
            b.count++
          }
          prog = b.count / 2
          done = b.count >= 2
        } else if (current.kind === "turn") {
          holdRef.current =
            Math.abs(frame.yaw) > TURN_YAW ? holdRef.current + 1 : 0
          prog = holdRef.current / HOLD_FRAMES
          done = holdRef.current >= HOLD_FRAMES
        } else {
          holdRef.current = frame.smile > SMILE_SCORE ? holdRef.current + 1 : 0
          prog = holdRef.current / HOLD_FRAMES
          done = holdRef.current >= HOLD_FRAMES
        }
        setProgress(Math.min(1, prog))
        if (done) {
          holdRef.current = 0
          blinkRef.current = { closed: false, count: 0 }
          const nextIdx = challengeIdxRef.current + 1
          if (nextIdx >= challengesRef.current.length) {
            startCapture()
          } else {
            challengeIdxRef.current = nextIdx
            setChallengeIdx(nextIdx)
            setProgress(0)
          }
        }
        return
      }

      // ph === "capturing" — collect descriptor samples
      const now = performance.now()
      if (now - captureStartRef.current > CAPTURE_TIMEOUT) {
        toast.error("Couldn't read your face", {
          description: "Hold still in good, even lighting.",
        })
        resetChallenges()
        go("ready")
        return
      }
      if (now - lastSampleAtRef.current >= SAMPLE_GAP && !busyRef.current) {
        lastSampleAtRef.current = now
        busyRef.current = true
        detectFaceDescriptor(video)
          .then((d) => {
            if (d && !cancelled) samplesRef.current.push(d)
          })
          .catch(() => {})
          .finally(() => {
            busyRef.current = false
          })
      }
      setProgress(Math.min(1, samplesRef.current.length / SAMPLES))
      if (samplesRef.current.length >= SAMPLES && !busyRef.current) {
        const avg = averageDescriptors(samplesRef.current)
        samplesRef.current = []
        finishCapture(avg)
      }
    }

    ;(async () => {
      try {
        go("loading")
        setErrorMsg("")
        setSimilarity(null)
        setFacePresent(false)
        failCountRef.current = 0
        cpuRetryRef.current = false
        lastErrMsgRef.current = ""
        setLoadingMsg("Loading the face-tracking model…")
        const landmarker = await getFaceLandmarker()
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

        // Warm up the recognition net in the background
        void getFaceApi().catch(() => {})

        resetChallenges()
        go("ready")
        rafRef.current = requestAnimationFrame(loop)
      } catch (err) {
        if (cancelled) return
        const message =
          err instanceof Error && err.name === "NotAllowedError"
            ? "Camera permission was denied."
            : err instanceof Error && err.name === "NotFoundError"
              ? "No camera was found on this device."
              : "Couldn't start the face models."
        setErrorMsg(message)
        go("error")
      }
    })()

    return () => {
      cancelled = true
      cleanup()
    }
  }, [open, mode, go, resetChallenges, startCapture])

  const currentChallenge = challenges[challengeIdx]

  const title =
    mode === "enroll"
      ? phase === "success"
        ? "Face enrolled!"
        : "Set up Face ID"
      : phase === "success"
        ? "Face verified!"
        : phase === "nomatch"
          ? "No match"
          : "Verify with Face ID"

  const description =
    phase === "loading"
      ? "Preparing the camera and models…"
      : phase === "error"
        ? errorMsg
        : phase === "success"
          ? mode === "enroll"
            ? "Your 128-d face signature is ready."
            : "Identity confirmed. Welcome back!"
          : phase === "nomatch"
            ? "This face doesn't match the enrolled one."
            : phase === "capturing"
              ? "Hold still — capturing your face signature…"
              : "Pass the liveness checks so we know it's really you."

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-h-[calc(100dvh-2rem)] max-w-md gap-0 overflow-y-auto rounded-2xl border-0 p-0 sm:rounded-2xl">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />

        <DialogHeader className="relative items-center gap-2 px-6 pt-8 text-center sm:text-center">
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-2xl ring-1",
              phase === "nomatch"
                ? "bg-destructive/15 ring-destructive/30"
                : "bg-primary/15 ring-primary/30"
            )}
          >
            {phase === "success" ? (
              <ShieldCheck className="h-6 w-6 text-primary" />
            ) : phase === "nomatch" ? (
              <ShieldX className="h-6 w-6 text-destructive" />
            ) : (
              <ScanFace className="h-6 w-6 text-primary" />
            )}
          </div>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription className="text-balance">{description}</DialogDescription>
        </DialogHeader>

        <div className="px-4 pt-6 sm:px-6">
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

            {(phase === "ready" || phase === "capturing") && (
              <>
                <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-background/70 px-3 py-1.5 backdrop-blur">
                  <span className="text-xs font-medium">
                    {phase === "capturing"
                      ? "Capturing signature…"
                      : facePresent
                        ? "Face detected ✅"
                        : "Show your face 👤"}
                  </span>
                </div>
                {phase === "capturing" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="rounded-full bg-background/70 px-4 py-1.5 text-xs font-medium text-primary backdrop-blur">
                      Hold still ✨
                    </span>
                  </div>
                )}
                <div className="absolute inset-x-3 bottom-3 h-1.5 overflow-hidden rounded-full bg-background/60">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-100"
                    style={{
                      width: `${progress * 100}%`,
                      boxShadow: "0 0 8px rgba(167, 139, 250, 0.9)",
                    }}
                  />
                </div>
              </>
            )}

            {phase === "loading" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/75 p-6 text-center backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div>
                  <p className="text-sm font-medium">{loadingMsg}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Everything runs on-device — nothing is uploaded.
                  </p>
                </div>
              </div>
            )}

            {phase === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/75 p-6 text-center backdrop-blur-sm">
                <CameraOff className="h-8 w-8 text-destructive" />
                <p className="text-sm font-medium">{errorMsg}</p>
              </div>
            )}

            {phase === "success" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 16 }}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40"
                >
                  <ShieldCheck className="h-8 w-8" />
                </motion.div>
              </motion.div>
            )}

            {phase === "nomatch" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/75 p-6 text-center backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 16 }}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/20 text-destructive ring-1 ring-destructive/40"
                >
                  <ShieldX className="h-7 w-7" />
                </motion.div>
                {similarity !== null && (
                  <p className="text-xs text-muted-foreground">Best similarity: {similarity}%</p>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* liveness challenge chips */}
        {challenges.length > 0 && (phase === "ready" || phase === "capturing") && (
          <div className="flex flex-wrap items-center justify-center gap-2 px-6 pt-4">
            {challenges.map((c, i) => {
              const done = i < challengeIdx || phase === "capturing"
              const active = i === challengeIdx && phase === "ready"
              return (
                <div
                  key={c.kind}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
                    done
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : active
                        ? "animate-pulse border-primary/40 bg-secondary/50"
                        : "border-border/70 bg-muted/30 text-muted-foreground opacity-70"
                  )}
                >
                  <span className="text-sm leading-none">{done ? "✅" : c.emoji}</span>
                  {c.label}
                </div>
              )
            })}
          </div>
        )}

        <p className="min-h-4 px-6 pt-4 text-center text-xs text-muted-foreground">
          {phase === "loading"
            ? loadingMsg
            : phase === "error"
              ? "You can close this and use another method."
              : phase === "success"
                ? "All set!"
                : phase === "nomatch"
                  ? similarity !== null
                    ? `Best similarity: ${similarity}%`
                    : "This face doesn't match."
                  : !facePresent
                    ? "Center your face in the frame"
                    : phase === "capturing"
                      ? "Hold still while your face signature is captured…"
                      : `Now: ${currentChallenge?.label ?? ""}`}
        </p>

        <div className="flex items-center justify-center gap-2 px-6 py-5">
          {phase === "nomatch" ? (
            <Button
              type="button"
              className="btn-glow"
              onClick={() => {
                resetChallenges()
                go("ready")
              }}
            >
              <RefreshCw /> Try again
            </Button>
          ) : phase === "error" ? (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          ) : (
            (phase === "ready" || phase === "capturing") && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}