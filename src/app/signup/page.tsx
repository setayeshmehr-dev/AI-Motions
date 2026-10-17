"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowRight, WandSparkles } from "lucide-react"
import { toast } from "sonner"
 

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuroraBackground } from "@/components/aurora-background"
import { BrandLogo } from "@/components/brand-logo"
import { FaceCaptureModal } from "@/components/face-capture-modal"
import { FaceIdField } from "@/components/face-id-field"
import { GesturePasswordField } from "@/components/gesture-password-field"
import { GesturePasswordModal } from "@/components/gesture-password-modal"
import { DEMO_USER, PASSWORD_LENGTH } from "@/lib/gestures"
import { getUser, saveUser } from "@/lib/storage"

type SignupErrors = {
  firstName?: string
  lastName?: string
  email?: string
  password?: string
  face?: string
}

export default function SignupPage() {
  const router = useRouter()

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [pattern, setPattern] = useState<string[]>([])
  const [faceVector, setFaceVector] = useState<number[] | null>(null)
  const [gestureModalOpen, setGestureModalOpen] = useState(false)
  const [faceModalOpen, setFaceModalOpen] = useState(false)
  const [errors, setErrors] = useState<SignupErrors>({})
  const [hasAccount, setHasAccount] = useState(false)

  useEffect(() => {
    setHasAccount(!!getUser())
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

  // Fills everything EXCEPT the password and Face ID
  const autoFill = () => {
    setFirstName(DEMO_USER.firstName)
    setLastName(DEMO_USER.lastName)
    setEmail(DEMO_USER.email)
    setErrors((e) => ({
      ...e,
      firstName: undefined,
      lastName: undefined,
      email: undefined,
    }))
    toast.success("Details auto-filled ✨", {
      description: "Now add your gesture password and Face ID.",
    })
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()

    const errs: SignupErrors = {}
    if (firstName.trim().length < 2) errs.firstName = "Please enter your first name."
    if (lastName.trim().length < 2) errs.lastName = "Please enter your last name."
    if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email.trim()))
      errs.email = "Enter a valid email address."
    if (pattern.length !== PASSWORD_LENGTH)
      errs.password = "Create your 6-gesture password first."
    if (!faceVector) errs.face = "Set up Face ID first."
    setErrors(errs)

    if (Object.keys(errs).length > 0) {
      toast.error("Almost there!", { description: "Please fix the highlighted fields." })
      return
    }

    saveUser({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      gestures: pattern,
      faceVector: faceVector!,
    })
    toast.success("Account created 🎉", {
      description: "Redirecting you to sign in…",
    })
    window.setTimeout(() => router.push("/signin"), 900)
  }

  return (
    <main className="relative flex min-h-svh items-center justify-center px-4 py-16 sm:py-14">
      <AuroraBackground />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <BrandLogo />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Two keys: a 6-gesture password and your face.
            </p>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          noValidate
          className="glass-card rounded-2xl border border-border/60 p-5 sm:p-7"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                placeholder="Amirali"
                className="h-11"
                autoComplete="off"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                aria-invalid={!!errors.firstName}
              />
              {errors.firstName && (
                <p className="text-xs font-medium text-destructive">{errors.firstName}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                placeholder="setayeshmehr"
                className="h-11"
                autoComplete="off"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                aria-invalid={!!errors.lastName}
              />
              {errors.lastName && (
                <p className="text-xs font-medium text-destructive">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="setayeshmehr@gmail.com"
              autoComplete="off"
              className="h-11"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-xs font-medium text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="mt-4 space-y-1.5">
            <Label htmlFor="gesture-password">Gesture password</Label>
            <GesturePasswordField
              id="gesture-password"
              value={pattern}
              mode="create"
              error={errors.password}
              onOpen={() => setGestureModalOpen(true)}
            />
          </div>

          <div className="mt-4 space-y-1.5">
            <Label htmlFor="face-id">Face ID</Label>
            <FaceIdField
              id="face-id"
              mode="enroll"
              done={!!faceVector}
              error={errors.face}
              onOpen={() => {
                setErrors((e) => ({ ...e, face: undefined }))
                setFaceModalOpen(true)
              }}
            />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" className="h-11" onClick={autoFill}>
              <WandSparkles /> Auto fill
            </Button>
            <Button type="submit" className="btn-glow h-11">
              Sign up <ArrowRight />
            </Button>
          </div>

          {hasAccount && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              An account already exists on this device — signing up will replace it.
            </p>
          )}

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/signin"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </form>
      </motion.div>

      <GesturePasswordModal
        open={gestureModalOpen}
        onOpenChange={setGestureModalOpen}
        mode="create"
        onComplete={(p) => {
          setPattern(p)
          setGestureModalOpen(false)
          setErrors((e) => ({ ...e, password: undefined }))
          toast.success("Pattern saved 🤟", {
            description: "Now set up your Face ID.",
          })
        }}
      />

      <FaceCaptureModal
        open={faceModalOpen}
        onOpenChange={setFaceModalOpen}
        mode="enroll"
        onComplete={(v) => {
          setFaceVector(v)
          setFaceModalOpen(false)
          setErrors((e) => ({ ...e, face: undefined }))
          toast.success("Face enrolled ✅", {
            description: "You're all set — sign up when ready.",
          })
        }}
      />
    </main>
  )
}