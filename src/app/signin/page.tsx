"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowRight, Lightbulb, ScanFace, WandSparkles } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuroraBackground } from "@/components/aurora-background"
import { BrandLogo } from "@/components/brand-logo"
import { DocumentationButton } from "@/components/documentation-button"
import { FaceCaptureModal } from "@/components/face-capture-modal"
import { FaceIdField } from "@/components/face-id-field"
import { getUser, startWelcomeSession, type StoredUser } from "@/lib/storage"

type SigninErrors = { email?: string; face?: string }

export default function SigninPage() {
  const router = useRouter()

  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<StoredUser | null>(null)
  const [email, setEmail] = useState("")
  const [faceVerified, setFaceVerified] = useState(false)
  const [faceModalOpen, setFaceModalOpen] = useState(false)
  const [errors, setErrors] = useState<SigninErrors>({})
  const [shake, setShake] = useState(false)

  useEffect(() => {
    setUser(getUser())
    setReady(true)
  }, [])

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
      description: "Now verify with Face ID.",
    })
  }

  const finishSignIn = (account: StoredUser) => {
    startWelcomeSession(account)
    setEmail("")
    setFaceVerified(false)
    setErrors({})
    toast.success("Welcome back 👋", { description: "Signing you in…" })
    window.setTimeout(() => router.push("/welcome"), 850)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast.error("No account yet", {
        description: "Sign up first to enroll your Face ID.",
      })
      return
    }

    const errs: SigninErrors = {}
    if (email.trim().toLowerCase() !== user.email)
      errs.email = "This email doesn't match your account."
    if (!faceVerified) errs.face = "Verify with Face ID first."
    setErrors(errs)

    if (Object.keys(errs).length > 0) {
      toast.error("Check the highlighted fields")
      return
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
              Sign in with your face.
            </p>
          </div>
        </div>

        {!user && (
          <Alert className="mb-4 rounded-xl border-amber-500/30 bg-amber-500/10">
            <Lightbulb className="h-4 w-4 text-amber-400" />
            <AlertTitle>No account on this device</AlertTitle>
            <AlertDescription>
              Create one first to enroll your Face ID.{" "}
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
                placeholder="setayeshmehr@gmail.com"
                className="h-11 flex-1"
                autoComplete="off"
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
                    description: "Sign up again to enroll your face.",
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
    </main>
  )
}