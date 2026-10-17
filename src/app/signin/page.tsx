"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowRight, Hand, Lightbulb, ScanFace, WandSparkles } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuroraBackground } from "@/components/aurora-background"
import { BrandLogo } from "@/components/brand-logo"
import { FaceCaptureModal } from "@/components/face-capture-modal"
import { FaceIdField } from "@/components/face-id-field"
import { GestureHintDialog } from "@/components/gesture-hint-dialog"
import { GesturePasswordField } from "@/components/gesture-password-field"
import { GesturePasswordModal } from "@/components/gesture-password-modal"
import { PASSWORD_LENGTH, gesturesEqual } from "@/lib/gestures"
import { getUser, startWelcomeSession, type StoredUser } from "@/lib/storage"
import { cn } from "@/lib/utils"

type Method = "gesture" | "face"
type SigninErrors = { email?: string; password?: string; face?: string }

export default function SigninPage() {
  const router = useRouter()

  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<StoredUser | null>(null)
  const [email, setEmail] = useState("")
  const [method, setMethod] = useState<Method>("gesture")
  const [pattern, setPattern] = useState<string[]>([])
  const [faceVerified, setFaceVerified] = useState(false)
  const [gestureModalOpen, setGestureModalOpen] = useState(false)
  const [faceModalOpen, setFaceModalOpen] = useState(false)
  const [hintOpen, setHintOpen] = useState(false)
  const [errors, setErrors] = useState<SigninErrors>({})
  const [shake, setShake] = useState(false)

  useEffect(() => {
    setUser(getUser())
    setReady(true)
  }, [])

    // If the browser restores this page from bfcache (back/forward buttons),
  // reload so the form is always fresh and empty.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload()
    }
    window.addEventListener("pageshow", onPageShow)
    return () => window.removeEventListener("pageshow", onPageShow)
  }, [])

  const switchMethod = (m: Method) => {
    if (m === method) return
    setMethod(m)
    setPattern([])
    setFaceVerified(false)
    setErrors({})
  }

  const autoFillEmail = () => {
    if (!user) {
      toast.error("No saved account found", {
        description: "Create an account on the sign-up page first.",
      })
      return
    }
    setEmail(user.email)
    setErrors((e) => ({ ...e, email: undefined }))
    toast.success("Email auto-filled ✨", {
      description: "Now sign in with gestures or Face ID.",
    })
  }

  const finishSignIn = (account: StoredUser) => {
    // The account stays in localStorage for future sign-ins —
    // only the form fields are cleared after passing this stage.
    startWelcomeSession(account)
    setEmail("")
    setPattern([])
    setFaceVerified(false)
    setErrors({})
    toast.success("Welcome back 👋", { description: "Signing you in…" })
    window.setTimeout(() => router.push("/welcome"), 850)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast.error("No account yet", {
        description: "Sign up first to create a gesture password and Face ID.",
      })
      return
    }

    const errs: SigninErrors = {}
    if (email.trim().toLowerCase() !== user.email)
      errs.email = "This email doesn't match your account."
    if (method === "gesture" && pattern.length !== PASSWORD_LENGTH)
      errs.password = "Enter your 6-gesture password."
    if (method === "face" && !faceVerified) errs.face = "Verify with Face ID first."
    setErrors(errs)

    if (Object.keys(errs).length > 0) {
      toast.error("Check the highlighted fields")
      return
    }

    if (method === "gesture") {
      if (!gesturesEqual(pattern, user.gestures)) {
        setShake(true)
        window.setTimeout(() => setShake(false), 600)
        setPattern([])
        setErrors({ password: "Incorrect gesture sequence — try again." })
        toast.error("Wrong pattern", {
          description: "Use the hint if you forgot it.",
        })
        return
      }
    }

    finishSignIn(user)
  }

  if (!ready) return null

  return (
    <main className="relative flex min-h-svh items-center justify-center px-4 py-16 sm:py-14">
      <AuroraBackground />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <BrandLogo />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sign in with your gesture password or your face.
            </p>
          </div>
        </div>

        {!user && (
          <Alert className="mb-4 rounded-xl border-amber-500/30 bg-amber-500/10">
            <Lightbulb className="h-4 w-4 text-amber-400" />
            <AlertTitle>No account on this device</AlertTitle>
            <AlertDescription>
              Create one first to set up your gesture password and Face ID.{" "}
              <Link
                href="/signup"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Go to sign up
              </Link>
            </AlertDescription>
          </Alert>
        )}

        <motion.form
          onSubmit={onSubmit}
          noValidate
          animate={shake ? { x: [0, -10, 10, -6, 6, -2, 0] } : { x: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-card rounded-2xl border border-border/60 p-5 sm:p-7"
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                autoComplete="off"
                placeholder="setayeshmehr@gmail.com"
                className="h-11 flex-1"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (faceVerified) setFaceVerified(false)
                }}
                aria-invalid={!!errors.email}
              />
              <Button
                type="button"
                variant="outline"
                className="h-11 shrink-0"
                onClick={autoFillEmail}
              >
                <WandSparkles />
                <span className="hidden sm:inline">Auto fill</span>
              </Button>
            </div>
            {errors.email && (
              <p className="text-xs font-medium text-destructive">{errors.email}</p>
            )}
          </div>

          {/* Sign-in method switch */}
          <div className="mt-4 space-y-1.5">
            <Label>Sign-in method</Label>
            <div
              className="grid grid-cols-2 gap-1.5 rounded-xl border border-border/70 bg-muted/30 p-1.5"
              role="group"
              aria-label="Sign-in method"
            >
              <button
                type="button"
                aria-pressed={method === "gesture"}
                onClick={() => switchMethod("gesture")}
                className={cn(
                  "flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                  method === "gesture"
                    ? "bg-primary/15 text-foreground ring-1 ring-primary/50 shadow-[0_0_18px_-6px] shadow-primary/50"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <Hand className="h-4 w-4" /> Gestures
              </button>
              <button
                type="button"
                aria-pressed={method === "face"}
                onClick={() => switchMethod("face")}
                className={cn(
                  "flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                  method === "face"
                    ? "bg-primary/15 text-foreground ring-1 ring-primary/50 shadow-[0_0_18px_-6px] shadow-primary/50"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <ScanFace className="h-4 w-4" /> Face ID
              </button>
            </div>
          </div>

          {method === "gesture" ? (
            <>
              <div className="mt-4 space-y-1.5">
                <Label htmlFor="gesture-password">Gesture password</Label>
                <GesturePasswordField
                  id="gesture-password"
                  value={pattern}
                  mode="verify"
                  error={errors.password}
                  onOpen={() => {
                    setPattern([])
                    setErrors((e) => ({ ...e, password: undefined }))
                    setGestureModalOpen(true)
                  }}
                />
              </div>

              <div className="mt-3 flex justify-center">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() =>
                    user
                      ? setHintOpen(true)
                      : toast.error("Nothing to show", {
                          description: "Create an account first.",
                        })
                  }
                >
                  <Lightbulb className="h-4 w-4" />
                  Forgot your pattern? Get a hint
                </Button>
              </div>
            </>
          ) : (
            <div className="mt-4 space-y-1.5">
              <Label htmlFor="face-id">Face ID</Label>
              <FaceIdField
                id="face-id"
                mode="verify"
                done={faceVerified}
                error={errors.face}
                onOpen={() => {
                  if (!user?.faceVector?.length) {
                    toast.error("No Face ID on this account", {
                      description:
                        "Sign in with gestures, or sign up again to enroll your face.",
                    })
                    return
                  }
                  setFaceVerified(false)
                  setErrors((e) => ({ ...e, face: undefined }))
                  setFaceModalOpen(true)
                }}
              />
              <p className="text-xs text-muted-foreground">
                You&apos;ll pass two quick liveness checks (blink / turn / smile) before your
                face is matched.
              </p>
            </div>
          )}

          <Button type="submit" className="btn-glow mt-5 h-11 w-full">
            Sign in <ArrowRight />
          </Button>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link
              href="/signup"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </motion.form>
      </motion.div>

      <GesturePasswordModal
        open={gestureModalOpen}
        onOpenChange={setGestureModalOpen}
        mode="verify"
        onComplete={(p) => {
          setPattern(p)
          setGestureModalOpen(false)
          setErrors((e) => ({ ...e, password: undefined }))
        }}
      />

      <FaceCaptureModal
        open={faceModalOpen}
        onOpenChange={setFaceModalOpen}
        mode="verify"
        expected={user?.faceVector ?? null}
        onComplete={() => {
          setFaceVerified(true)
          setFaceModalOpen(false)
          setErrors((e) => ({ ...e, face: undefined }))
          toast.success("Face verified ✅", { description: "Press Sign in to continue." })
        }}
      />

      {user && (
        <GestureHintDialog open={hintOpen} onOpenChange={setHintOpen} pattern={user.gestures} />
      )}
    </main>
  )
}