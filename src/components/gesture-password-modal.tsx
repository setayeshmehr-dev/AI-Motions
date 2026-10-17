"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Delete, Eraser, Keyboard, ShieldCheck, Video } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { GestureCamera } from "@/components/gesture-camera"
import { GESTURES, PASSWORD_LENGTH, getGesture } from "@/lib/gestures"
import { cn } from "@/lib/utils"

type Mode = "create" | "verify"

interface GesturePasswordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: Mode
  onComplete: (pattern: string[]) => void
}

export function GesturePasswordModal({
  open,
  onOpenChange,
  mode,
  onComplete,
}: GesturePasswordModalProps) {
  const [pattern, setPattern] = useState<string[]>([])
  const [saved, setSaved] = useState(false)
  const [inputMode, setInputMode] = useState<"camera" | "manual">("camera")

  // Restart every time the modal opens
  useEffect(() => {
    if (open) {
      setPattern([])
      setSaved(false)
      setInputMode("camera")
    }
  }, [open])

  const locked = saved

  const title = saved
    ? "Pattern saved!"
    : mode === "verify"
      ? "Enter your pattern"
      : "Create your pattern"

  const description = saved
    ? "Your gesture password is ready."
    : mode === "verify"
      ? "Reproduce the 6-gesture sequence you created."
      : "Hold six hand gestures up to your camera, in order — they become your password."

  const pick = (id: string) => {
    if (locked || pattern.length >= PASSWORD_LENGTH) return
    const next = [...pattern, id]
    setPattern(next)
    if (next.length < PASSWORD_LENGTH) return

    if (mode === "verify") {
      window.setTimeout(() => onComplete(next), 420)
    } else {
      // Single pass — no confirmation step anymore
      window.setTimeout(() => {
        setSaved(true)
        window.setTimeout(() => onComplete(next), 950)
      }, 420)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-h-[calc(100dvh-2rem)] max-w-md gap-0 overflow-y-auto rounded-2xl border-0 p-0 sm:rounded-2xl">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />

        <DialogHeader className="relative items-center gap-2 px-6 pt-8 text-center sm:text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/30">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription className="text-balance">{description}</DialogDescription>
        </DialogHeader>

        {/* The six slots */}
        <div className="relative px-4 pt-6 sm:px-6">
          <div className="flex items-center justify-center gap-1.5 sm:gap-2.5">
            {Array.from({ length: PASSWORD_LENGTH }).map((_, i) => {
              const id = pattern[i]
              return (
                <div
                  key={i}
                  className={cn(
                    "flex h-12 min-w-0 flex-1 items-center justify-center rounded-xl border transition-colors",
                    id
                      ? "border-primary/50 bg-primary/10"
                      : cn(
                          "border-dashed border-border bg-muted/30",
                          i === pattern.length && !locked && "animate-pulse border-primary/50"
                        )
                  )}
                >
                  {id ? (
                    <motion.span
                      key={`${id}-${i}`}
                      initial={{ scale: 0, opacity: 0, rotate: -25 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 22 }}
                      className="text-2xl leading-none"
                    >
                      {getGesture(id)?.emoji}
                    </motion.span>
                  ) : (
                    <span className="text-xs text-muted-foreground/50">{i + 1}</span>
                  )}
                </div>
              )
            })}
          </div>

          {saved && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 -m-2 flex items-center justify-center rounded-2xl bg-background/70 backdrop-blur-sm"
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
        </div>

        {/* Camera capture (primary) or emoji grid (fallback) */}
        <div className="px-4 pt-5 sm:px-6">
          {inputMode === "camera" ? (
            <GestureCamera
              active={!locked}
              onCapture={pick}
              onUnavailable={(reason) => {
                setInputMode("manual")
                toastFallback(reason)
              }}
            />
          ) : (
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5 sm:gap-2">
              {GESTURES.map((g) => (
                <motion.button
                  key={g.id}
                  type="button"
                  aria-label={g.label}
                  disabled={locked}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  onClick={() => pick(g.id)}
                  className="group flex flex-col items-center gap-1 rounded-xl border border-border/70 bg-secondary/40 px-1 py-2.5 transition-colors duration-150 hover:border-primary/50 hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
                >
                  <span className="text-2xl transition-transform duration-200 group-hover:scale-110 sm:text-3xl">
                    {g.emoji}
                  </span>
                  <span className="text-[10px] leading-tight font-medium text-muted-foreground group-hover:text-foreground">
                    {g.label}
                  </span>
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Mode toggle */}
        <div className="px-6 pt-3 text-center">
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs text-muted-foreground"
            onClick={() => setInputMode(inputMode === "camera" ? "manual" : "camera")}
          >
            {inputMode === "camera" ? (
              <>
                <Keyboard className="h-3.5 w-3.5" /> No camera? Use the emoji picker
              </>
            ) : (
              <>
                <Video className="h-3.5 w-3.5" /> Use the camera instead
              </>
            )}
          </Button>
        </div>

        {/* Edit controls */}
        <div className="flex items-center justify-center gap-2 px-6 py-5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={locked || pattern.length === 0}
            onClick={() => setPattern(pattern.slice(0, -1))}
          >
            <Delete /> Undo
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={locked || pattern.length === 0}
            onClick={() => setPattern([])}
          >
            <Eraser /> Clear
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function toastFallback(reason: string) {
  // tiny helper so we don't need the sonner import at module top of this file
  import("sonner").then(({ toast }) =>
    toast.error("Camera unavailable", {
      description: `${reason} Switched to the emoji picker.`,
    })
  )
}