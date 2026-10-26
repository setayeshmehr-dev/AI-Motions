"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { BookOpen, X } from "lucide-react"

import { DOC_CONTENT } from "@/lib/avatar-docs"

type DocLang = "fa" | "en"

type DocBlock =
  | { type: "p"; text: string }
  | { type: "list"; items: string[] }
  | { type: "table"; head: string[]; rows: string[][] }

interface DocSection {
  heading: string
  blocks: DocBlock[]
}

interface DocContent {
  title: string
  intro: string
  sections: DocSection[]
}

const CONTENT = DOC_CONTENT as Record<DocLang, DocContent>

export function DocumentationModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const [lang, setLang] = useState<DocLang>("fa")
  const scrollRef = useRef<HTMLDivElement>(null)
  const doc = CONTENT[lang]
  const rtl = lang === "fa"

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(false)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onOpenChange])

  const changeLang = (next: DocLang) => {
    if (next !== lang) {
      setLang(next)
      scrollRef.current?.scrollTo({ top: 0 })
    }
  }

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
            className="glass-card relative h-[85dvh] w-full max-w-2xl overflow-hidden rounded-2xl"
          >
            <div
              ref={scrollRef}
              dir="ltr"
              className="absolute inset-0 overflow-y-auto overscroll-contain px-4 pt-24 pb-8 sm:px-7"
            >
              <div
                dir={rtl ? "rtl" : "ltr"}
                style={rtl ? { fontFamily: "var(--font-vazirmatn), var(--font-geist-sans), sans-serif" } : undefined}
              >
                <h2 className="text-gradient text-xl font-bold sm:text-2xl">{doc.title}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:leading-8">{doc.intro}</p>

                {doc.sections.map((section, si) => (
                  <section key={si} className="mt-7">
                    <h3 className="text-base font-semibold text-foreground/95 sm:text-lg">{section.heading}</h3>
                    {section.blocks.map((block, bi) => {
                      if (block.type === "p")
                        return (
                          <p key={bi} className="mt-3 text-sm leading-7 text-muted-foreground sm:leading-8">
                            {block.text}
                          </p>
                        )
                      if (block.type === "list")
                        return (
                          <ul key={bi} className="mt-3 space-y-2">
                            {block.items.map((item, ii) => (
                              <li key={ii} className="flex gap-2.5 text-sm leading-7 text-muted-foreground sm:leading-8">
                                <span aria-hidden className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        )
                      return (
                        <div key={bi} className="mt-4 overflow-x-auto rounded-xl border border-border/60">
                          <table className="w-full min-w-[30rem] text-xs sm:text-sm">
                            <thead>
                              <tr className="border-b border-border/60 bg-secondary/40">
                                {block.head.map((h, hi) => (
                                  <th key={hi} className="px-3 py-2.5 text-start font-semibold">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {block.rows.map((row, ri) => (
                                <tr key={ri} className="border-b border-border/40 last:border-0">
                                  {row.map((cell, ci) => (
                                    <td key={ci} className="px-3 py-2.5 text-muted-foreground">{cell}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    })}
                  </section>
                ))}

                <p className="mt-8 border-t border-border/50 pt-4 text-center text-xs text-muted-foreground">
                  AI-Motions — models &amp; technologies
                </p>
              </div>
            </div>

            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-24 bg-gradient-to-b from-card/95 via-card/55 to-transparent"
            />

            <div className="absolute inset-x-0 top-0 z-10 border-b border-border/50 bg-card/75 px-4 py-3.5 pr-12 backdrop-blur-xl sm:px-6 sm:pr-14">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
                  <BookOpen className="h-4 w-4 text-primary" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold tracking-tight sm:text-base">Documentation</p>
                  <p className="hidden text-[11px] text-muted-foreground sm:block">Models &amp; technologies</p>
                </div>
                <div className="ms-auto flex shrink-0 items-center gap-1 rounded-full border border-border/70 bg-muted/40 p-1" role="group" aria-label="Documentation language">
                  <button
                    onClick={() => changeLang("fa")}
                    aria-pressed={lang === "fa"}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                      lang === "fa" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    فا
                  </button>
                  <button
                    onClick={() => changeLang("en")}
                    aria-pressed={lang === "en"}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                      lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    EN
                  </button>
                </div>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                aria-label="Close documentation"
                className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}