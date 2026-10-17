"use client"

import { motion } from "framer-motion"
import { Lightbulb } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getGesture } from "@/lib/gestures"

interface GestureHintDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pattern: string[]
}

export function GestureHintDialog({ open, onOpenChange, pattern }: GestureHintDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-w-sm gap-0 rounded-2xl border-0 p-0 sm:rounded-2xl">
        <DialogHeader className="items-center gap-2 px-6 pt-7 text-center sm:text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/15 ring-1 ring-amber-400/30">
            <Lightbulb className="h-6 w-6 text-amber-400" />
          </div>
          <DialogTitle>Your pattern hint</DialogTitle>
          <DialogDescription>
            This is the 6-gesture sequence you created.
          </DialogDescription>
        </DialogHeader>

        <ol className="grid grid-cols-3 gap-2 px-6 py-6">
          {pattern.map((id, i) => {
            const gesture = getGesture(id)
            return (
              <motion.li
                key={`${id}-${i}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.1, type: "spring", stiffness: 350, damping: 20 }}
                className="flex flex-col items-center gap-1 rounded-xl border border-border/70 bg-secondary/40 px-1 py-2.5"
              >
                <span className="text-2xl leading-none">{gesture?.emoji}</span>
                <span className="text-[10px] leading-tight font-medium text-muted-foreground">
                  {i + 1}. {gesture?.label}
                </span>
              </motion.li>
            )
          })}
        </ol>

        <p className="border-t border-border/60 px-6 py-4 text-center text-xs text-muted-foreground">
          🔒 Never share your gesture pattern with anyone.
        </p>
      </DialogContent>
    </Dialog>
  )
}