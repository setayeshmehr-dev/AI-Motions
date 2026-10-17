"use client"

import { useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check, Users, X } from "lucide-react"

export interface AvatarEntry {
  id: string
  name: string
  emoji: string
}

export const AVATARS: AvatarEntry[] = [
  { id: "avatar", name: "Original", emoji: "🎭" },
  { id: "avatar1", name: "Avatar 1", emoji: "🧑" },
  { id: "avatar2", name: "Avatar 2", emoji: "👩" },
  { id: "avatar3", name: "Avatar 3", emoji: "🧔" },
  { id: "avatar4", name: "Avatar 4", emoji: "👱" },
  { id: "avatar5", name: "Avatar 5", emoji: "👩‍🦰" },
  { id: "avatar6", name: "Avatar 6", emoji: "🧑‍🦱" },
  { id: "avatar7", name: "Avatar 7", emoji: "👨‍🦳" },
  { id: "avatar8", name: "Avatar 8", emoji: "👩‍🦱" },
  { id: "avatar9", name: "Avatar 9", emoji: "🧑‍🎤" },
  { id: "avatar10", name: "Avatar 10", emoji: "🥷" },
  { id: "avatar11", name: "Avatar 11", emoji: "🌟" },
]

export const DEFAULT_AVATAR = "avatar11"
const STORAGE_KEY = "avatarpuppet:avatar"

export function getSavedAvatar(): string {
  if (typeof window === "undefined") return DEFAULT_AVATAR
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_AVATAR
  } catch {
    return DEFAULT_AVATAR
  }
}

export function saveAvatar(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {}
}

export function avatarUrl(id: string) {
  return `/${id}.vrm`
}

export function AvatarPicker({
  open,
  onOpenChange,
  current,
  available,
  thumbs,
  onSelect,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  current: string
  available: string[]
  thumbs: Record<string, string>
  onSelect: (id: string) => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(false)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onOpenChange])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card relative flex h-[85dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl"
          >
            {/* fixed header */}
            <div className="border-b border-border/50 bg-card/75 px-5 py-3.5 pr-12 backdrop-blur-xl">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
                  <Users className="h-4 w-4 text-primary" />
                </span>
                <div>
                  <p className="text-sm font-semibold tracking-tight sm:text-base">Choose your actor</p>
                  <p className="text-[11px] text-muted-foreground">
                    {available.length} of {AVATARS.length} avatars available
                  </p>
                </div>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                aria-label="Close avatar picker"
                className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* scrollable grid */}
            <div dir="ltr" className="flex-1 overflow-y-auto overscroll-contain p-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {AVATARS.map((a) => {
                  const isAvailable = available.includes(a.id)
                  const isCurrent = current === a.id
                  const thumb = isAvailable ? thumbs?.[a.id] : null
                  return (
                    <button
                      key={a.id}
                      disabled={!isAvailable}
                      onClick={() => onSelect(a.id)}
                      className={`group relative flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all ${
                        !isAvailable
                          ? "cursor-not-allowed border-border/40 bg-muted/20 opacity-40"
                          : isCurrent
                            ? "border-primary/60 bg-primary/15 ring-1 ring-primary/50 shadow-[0_0_24px_-8px] shadow-primary/50"
                            : "border-border/70 bg-secondary/40 hover:border-primary/40 hover:bg-primary/10"
                      }`}
                    >
                      {isCurrent && (
                        <span className="absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      )}

                      {thumb ? (
                        <img
                          src={thumb}
                          alt={a.name}
                          draggable={false}
                          className={`h-36 w-full rounded-xl border object-cover transition-transform duration-200 group-hover:scale-[1.03] ${
                            isCurrent ? "border-primary/50" : "border-border/60"
                          }`}
                        />
                      ) : (
                        <div className="flex h-36 w-full items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/30">
                          <span className="text-4xl opacity-60 transition-transform duration-200 group-hover:scale-110">
                            {a.emoji}
                          </span>
                        </div>
                      )}

                      <span className={`text-sm font-semibold ${isCurrent ? "text-primary" : "text-foreground"}`}>
                        {a.name}
                      </span>
                      {!isAvailable && (
                        <span className="text-[10px] text-muted-foreground">file not found</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* footer */}
            <div className="border-t border-border/50 bg-card/75 px-5 py-3 text-center text-xs text-muted-foreground backdrop-blur-xl">
              Your choice is remembered on this device. Default:{" "}
              <b className="text-foreground">Avatar 11</b>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}