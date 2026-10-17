"use client"

import { ScanFace } from "lucide-react"

import { cn } from "@/lib/utils"

interface FaceIdFieldProps {
  id?: string
  mode: "enroll" | "verify"
  done: boolean
  onOpen: () => void
  error?: string
}

export function FaceIdField({
  id = "face-id",
  mode,
  done,
  onOpen,
  error,
}: FaceIdFieldProps) {
  const text =
    mode === "enroll"
      ? done
        ? "Face enrolled ✓ — tap to redo"
        : "Tap to set up Face ID"
      : done
        ? "Face verified ✓"
        : "Tap to verify with Face ID"

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        id={id}
        onClick={onOpen}
        aria-invalid={!!error}
        className={cn(
          "flex h-11 w-full items-center gap-2.5 rounded-md border border-input bg-transparent px-3 text-left text-sm shadow-sm transition-colors",
          "hover:border-primary/40 hover:bg-secondary/30",
          "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
          done && "border-primary/50 bg-primary/10",
          error && "border-destructive"
        )}
      >
        <ScanFace
          className={cn("h-4 w-4 shrink-0", done ? "text-primary" : "text-muted-foreground")}
        />
        <span className={cn("truncate", done ? "font-medium text-foreground" : "text-muted-foreground")}>
          {text}
        </span>
      </button>
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  )
}