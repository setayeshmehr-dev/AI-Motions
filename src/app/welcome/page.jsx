"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import {
  Armchair, BookOpen, ChevronDown, Hand, Loader2, LogOut,
  PersonStanding, RefreshCw, ScanFace, Sparkles, Users,
} from "lucide-react"
import { toast } from "sonner"

import { AuroraBackground } from "@/components/AuroraBackground"
import { AvatarStage } from "@/components/AvatarStage"
import { AvatarPicker, AVATARS, DEFAULT_AVATAR, avatarUrl, getSavedAvatar, saveAvatar } from "@/components/AvatarPicker"
import { DocumentationModal } from "@/components/DocumentationModal"
import { shootMissingThumbnails, loadThumbs } from "@/lib/PhotoStudio"
import { endWelcomeSession, getWelcomeSession } from "@/lib/storage"
import { onGuideChange, store } from "@/lib/tracking-store"
import { useTracking } from "@/lib/use-tracking"

const GUIDES = {
  "step-back": { emoji: "↩️", text: "Step back a little — I can barely see you" },
  shoulders: { emoji: "🤷", text: "Bring your shoulders into the frame" },
  arms: { emoji: "🙌", text: "Bring your hands in front of the camera" },
  "seated-ok": { emoji: "🪑", text: "Seated — arms, hands & face are live" },
  ok: { emoji: "✨", text: "Full-body mirror active" },
}

const BODY_MODES = [
  { id: "auto", label: "Auto", icon: Sparkles },
  { id: "standing", label: "Standing", icon: PersonStanding },
  { id: "seated", label: "Seated", icon: Armchair },
  { id: "off", label: "Off", icon: null },
]

const FACE_EFFECTS = [
  { emoji: "😊", name: "Smile", desc: "Avatar smiles with you" },
  { emoji: "😠", name: "Frown", desc: "Brows down → avatar gets angry" },
  { emoji: "😟", name: "Sad brows", desc: "Inner brows up → avatar looks sad" },
  { emoji: "😲", name: "Surprise", desc: "Brows up + jaw open → surprised" },
  { emoji: "👁️", name: "Blink / Wink", desc: "Each eye blinks independently" },
  { emoji: "🗣️", name: "Talk", desc: "Mouth syncs with your speech" },
  { emoji: "🙆", name: "Turn head", desc: "Avatar's head follows yours" },
]

const GESTURE_EFFECTS = [
  { emoji: "👍", name: "Thumbs up", desc: "Big smile + joyful hop" },
  { emoji: "👎", name: "Thumbs down", desc: "Sad face + head droops" },
  { emoji: "✌️", name: "Peace", desc: "Wink + smile + head tilt" },
  { emoji: "🤟", name: "Love you", desc: "Big smile + rhythmic bounce" },
  { emoji: "🤘", name: "Rock on", desc: "Happy + bounce" },
  { emoji: "✊", name: "Fist", desc: "Determined angry face + nod" },
  { emoji: "👌", name: "OK", desc: "Thoughtful nod" },
  { emoji: "🤙", name: "Call me", desc: "Smile + head tilt" },
  { emoji: "☝️", name: "Point up", desc: "Slightly surprised" },
  { emoji: "👋", name: "Wave (palm + shake)", desc: "Your arm waves in the mirror + smile" },
]

const GESTURE_EMOJI = {
  "thumbs-up": "👍", "thumbs-down": "👎", peace: "✌️", love: "🤟", rock: "🤘",
  fist: "✊", ok: "👌", call: "🤙", point: "☝️", palm: "✋", wave: "👋",
}

function Chip({ ok, icon, label, highlight }) {
  return (
    <div
      className={`glass-card flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-medium ${
        ok ? "text-foreground" : "text-muted-foreground"
      } ${highlight ? "ring-1 ring-primary/50" : ""}`}
    >
      {icon}
      <span>{label}</span>
    </div>
  )
}

export default function WelcomePage() {
  const router = useRouter()

  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(false)
  const [info, setInfo] = useState(null)
  const [docsOpen, setDocsOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [askOpen, setAskOpen] = useState(null)
  const [faceMode, setFaceMode] = useState(true)
  const [handMode, setHandMode] = useState(true)
  const [bodyMode, setBodyModeState] = useState("auto")
  const [guide, setGuideState] = useState("")

  const [avatarId, setAvatarId] = useState(DEFAULT_AVATAR)
  const [available, setAvailable] = useState([])
  const [thumbs, setThumbs] = useState({})
  const [photoProgress, setPhotoProgress] = useState({ done: 0, total: 0 })

  const { status, errorMsg, facePresent, bodyPresent, seated, gesture, restart } = useTracking(ready)

  /* session guard — the mirror lives behind the sign-in */
  useEffect(() => {
    const s = getWelcomeSession()
    if (!s) {
      router.replace("/signin")
      return
    }
    setSession(s)
  }, [router])

  /* avatar files + cached photos + shoot missing */
  useEffect(() => {
    const saved = getSavedAvatar()
    setThumbs(loadThumbs())

    Promise.all(
      AVATARS.map((a) =>
        fetch(avatarUrl(a.id), { method: "HEAD" })
          .then((r) => (r.ok ? a.id : null))
          .catch(() => null)
      )
    ).then(async (results) => {
      const found = results.filter(Boolean)
      setAvailable(found)
      if (found.includes(saved)) setAvatarId(saved)
      else if (found.includes(DEFAULT_AVATAR)) setAvatarId(DEFAULT_AVATAR)
      else if (found.length) setAvatarId(found[0])

      const urls = {}
      for (const id of found) urls[id] = avatarUrl(id)
      try {
        const shot = await shootMissingThumbnails({
          avatars: found,
          urls,
          onProgress: (done, total) => setPhotoProgress({ done, total }),
        })
        if (Object.keys(shot).length) setThumbs((t) => ({ ...t, ...shot }))
      } catch (e) {
        console.warn("[PhotoStudio] shoot failed:", e?.message || e)
      }

      setReady(found.length > 0)
      if (found.length > 0) setAskOpen("asking")
    })
  }, [])

  useEffect(() => onGuideChange(setGuideState), [])

  useEffect(() => { store.faceMode = faceMode }, [faceMode])
  useEffect(() => { store.handMode = handMode }, [handMode])
  useEffect(() => { store.bodyMode = bodyMode }, [bodyMode])

  useEffect(() => {
    if (status === "running" && session)
      toast.success(`Welcome, ${session.firstName}! 🪞`, {
        description: "You're the puppeteer now — check the Guide below.",
      })
  }, [status, session])

  const handleInfo = useCallback((i) => setInfo(i), [])

  const signOut = () => {
    endWelcomeSession()
    toast("Signed out", { description: "See you soon 👋" })
    router.push("/signin")
  }

  const setBodyMode = (id) => {
    setBodyModeState(id)
    setAskOpen("done")
    if (id === "seated")
      toast("Seated mode 🪑", { description: "Desk-friendly — legs hold a natural sitting pose." })
    if (id === "standing")
      toast("Standing mode 🧍", { description: "Best when the camera sees your whole body." })
  }

  const selectAvatar = (id) => {
    if (!available.includes(id) || id === avatarId) {
      setPickerOpen(false)
      return
    }
    setAvatarId(id)
    saveAvatar(id)
    setPickerOpen(false)
    const name = AVATARS.find((a) => a.id === id)?.name ?? id
    toast.success(`Switched to ${name} 🎭`, { description: "Same tracking, new actor." })
  }

  /* still checking the session → spinner */
  if (!session) {
    return (
      <main className="relative flex h-svh items-center justify-center">
        <AuroraBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    )
  }

  const guideInfo = GUIDES[guide]
  const mirrorOn = bodyMode !== "off" && bodyPresent
  const currentName = AVATARS.find((a) => a.id === avatarId)?.name ?? "—"
  const shooting = photoProgress.total > 0 && photoProgress.done < photoProgress.total

  return (
    <main className="relative h-svh overflow-hidden">
      <AuroraBackground />

      {/* top bar */}
      <div className="absolute inset-x-0 top-0 z-20 flex flex-col gap-2 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex gap-2">
            {/* sign out — replaces Home */}
            <button
              onClick={signOut}
              aria-label="Sign out"
              className="glass-card flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDocsOpen(true)}
              className="glass-card flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <BookOpen className="h-4 w-4" /> Docs
            </button>
            <button
              onClick={() => setPickerOpen(true)}
              className="glass-card flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">{currentName}</span>
              <span className="sm:hidden">Actor</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              onClick={() => setFaceMode((v) => !v)}
              aria-pressed={faceMode}
              className={`glass-card flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-colors ${
                faceMode ? "text-primary ring-1 ring-primary/50" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ScanFace className="h-4 w-4" /> Face {faceMode ? "ON" : "OFF"}
            </button>

            <button
              onClick={() => setHandMode((v) => !v)}
              aria-pressed={handMode}
              className={`glass-card flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-colors ${
                handMode ? "text-primary ring-1 ring-primary/50" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Hand className="h-4 w-4" /> Gestures {handMode ? "ON" : "OFF"}
            </button>

            <div
              className="glass-card flex items-center gap-1 rounded-xl p-1"
              role="group"
              aria-label="Body mode"
            >
              {BODY_MODES.map((m) => {
                const Icon = m.icon
                return (
                  <button
                    key={m.id}
                    onClick={() => setBodyMode(m.id)}
                    aria-pressed={bodyMode === m.id}
                    className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors ${
                      bodyMode === m.id
                        ? "bg-primary/15 text-primary ring-1 ring-primary/50"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {Icon && <Icon className="h-3.5 w-3.5" />}
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* status chips */}
        <div className="flex flex-wrap justify-end gap-2">
          <div className="glass-card flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-foreground">
            <span>👋</span>
            <span>{session.firstName}</span>
          </div>
          {bodyMode !== "off" && (
            <>
              <Chip ok={mirrorOn} icon={<PersonStanding className={`h-4 w-4 ${mirrorOn ? "text-primary" : ""}`} />}
                label={mirrorOn ? "Body mirror" : "No body"} />
              {seated && (
                <Chip ok icon={<Armchair className="h-4 w-4 text-primary" />} label="Seated" />
              )}
            </>
          )}
          {handMode && gesture && (
            <Chip ok highlight
              icon={<Hand className="h-4 w-4 text-primary" />}
              label={`${GESTURE_EMOJI[gesture] ?? "✋"} ${gesture}`} />
          )}
          {faceMode && (
            <Chip ok={facePresent} icon={<ScanFace className={`h-4 w-4 ${facePresent ? "text-primary" : ""}`} />}
              label={facePresent ? "Face" : "No face"} />
          )}
        </div>
      </div>

      {/* 3D stage */}
      <div className="absolute inset-0 z-10">
        {ready && <AvatarStage avatarUrl={avatarUrl(avatarId)} onInfo={handleInfo} />}
      </div>

      {/* avatar picker */}
      <AvatarPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        current={avatarId}
        available={available}
        thumbs={thumbs}
        onSelect={selectAvatar}
      />

      {/* photo-shoot progress */}
      {shooting && (
        <div className="glass-card absolute top-1/2 left-1/2 z-30 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 rounded-2xl px-6 py-4">
          <div>
            <p className="text-sm font-medium">Photographing the cast…</p>
            <div className="mt-2 h-1.5 w-48 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(photoProgress.done / Math.max(1, photoProgress.total)) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {photoProgress.done} / {photoProgress.total} — first visit only
            </p>
          </div>
        </div>
      )}

      {/* seated question */}
      <AnimatePresence>
        {askOpen === "asking" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.94, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 12 }}
              className="glass-card w-full max-w-sm rounded-2xl p-7 text-center"
            >
              <span className="text-5xl">🪑</span>
              <h2 className="mt-4 text-lg font-bold">Are you sitting at a desk?</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This sets the best tracking mode. You can change it anytime from the top bar.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setBodyMode("seated")}
                  className="btn-glow inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
                >
                  <Armchair className="h-4 w-4" /> Yes, seated
                </button>
                <button
                  onClick={() => setBodyMode("standing")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card/60 px-4 text-sm font-semibold backdrop-blur transition-colors hover:bg-secondary/60"
                >
                  <PersonStanding className="h-4 w-4" /> No, standing
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* live guidance */}
      <AnimatePresence>
        {guideInfo && status === "running" && bodyMode !== "off" && askOpen !== "asking" && !guideOpen && (
          <motion.div
            key={guide}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            className={`glass-card absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2.5 rounded-full px-5 py-2.5 text-sm ${
              guide === "ok" ? "text-primary" : "text-foreground"
            }`}
          >
            <span className="text-lg leading-none">{guideInfo.emoji}</span>
            <span className="font-medium">{guideInfo.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* guide panel */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center">
        <AnimatePresence>
          {guideOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="glass-card mb-2 max-h-[46vh] w-[min(96vw,720px)] overflow-y-auto rounded-2xl p-4"
            >
              <p className="mb-2 text-xs font-bold tracking-wide text-primary uppercase">
                😊 Face — your expressions
              </p>
              <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
                {FACE_EFFECTS.map((f) => (
                  <div key={f.name} className="flex items-center gap-2 text-xs">
                    <span className="w-5 text-base leading-none">{f.emoji}</span>
                    <span className="font-semibold">{f.name}</span>
                    <span className="text-muted-foreground">— {f.desc}</span>
                  </div>
                ))}
              </div>

              <p className="mt-4 mb-2 text-xs font-bold tracking-wide text-primary uppercase">
                ✋ Hand gestures — reactions
              </p>
              <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
                {GESTURE_EFFECTS.map((g) => (
                  <div key={g.name} className="flex items-center gap-2 text-xs">
                    <span className="w-5 text-base leading-none">{g.emoji}</span>
                    <span className="font-semibold">{g.name}</span>
                    <span className="text-muted-foreground">— {g.desc}</span>
                  </div>
                ))}
              </div>

              {info && (
                <p className="mt-3 border-t border-border/50 pt-2 text-center text-[11px] text-muted-foreground">
                  {currentName} — expressions: {info.morphs} · bones: {info.bones}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setGuideOpen((v) => !v)}
          className="glass-card mb-3 flex h-9 items-center gap-1.5 rounded-full px-4 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Guide
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${guideOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {!ready && !shooting && (
        <div className="absolute inset-0 z-30 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {ready && status === "loading" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="glass-card flex flex-col items-center gap-3 rounded-2xl px-8 py-7 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Loading models &amp; camera…</p>
            <p className="text-xs text-muted-foreground">
              Face + hands + body models. Everything runs on-device.
            </p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm rounded-2xl p-7 text-center">
            <span className="text-4xl">📷</span>
            <h2 className="mt-3 text-lg font-bold">Tracking failed</h2>
            <p className="mt-2 text-sm text-muted-foreground">{errorMsg}</p>
            <button
              onClick={restart}
              className="btn-glow mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground"
            >
              <RefreshCw className="h-4 w-4" /> Try again
            </button>
          </div>
        </div>
      )}

      <DocumentationModal open={docsOpen} onOpenChange={setDocsOpen} />
    </main>
  )
}