"use client"

import { Lock } from "lucide-react"

import { PASSWORD_LENGTH, getGesture } from "@/lib/gestures"
import { cn } from "@/lib/utils"

interface GesturePasswordFieldProps {
  id?: string
  value: string[]
  mode: "create" | "verify"
  onOpen: () => void
  error?: string
}

export function GesturePasswordField({
  id = "gesture-password",
  value,
  mode,
  onOpen,
  error,
}: GesturePasswordFieldProps) {
  const filled = value.length === PASSWORD_LENGTH

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        id={id}
        onClick={onOpen}
        aria-invalid={!!error}
        className={cn(
          "flex h-11 w-full items-center gap-2.5 rounded-md border border-input bg-transparent px-3 text-left shadow-sm transition-colors",
          "hover:border-primary/40 hover:bg-secondary/30",
          "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
          error && "border-destructive"
        )}
      >
        <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
        {value.length === 0 ? (
          <span className="text-sm text-muted-foreground">
            {mode === "create"
              ? "Tap to create your gesture password"
              : "Tap to enter your gesture password"}
          </span>
        ) : (
          <span className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
            {value.map((gid, i) => (
              <span key={`${gid}-${i}`} className="text-xl leading-none">
                {getGesture(gid)?.emoji}
              </span>
            ))}
            {Array.from({ length: PASSWORD_LENGTH - value.length }).map((_, i) => (
              <span
                key={`dot-${i}`}
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40"
              />
            ))}
          </span>
        )}
        {filled && (
          <span className="ml-auto shrink-0 text-xs font-medium text-primary">
            {mode === "create" ? "Change" : "Reset"}
          </span>
        )}
      </button>
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  )
}