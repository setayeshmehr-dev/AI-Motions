import Link from "next/link"
import { Hand, HandMetal } from "lucide-react"

export function BrandLogo() {
  return (
    <Link
      href="/"
      aria-label="GesturePass home"
      className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform duration-200 hover:scale-105 active:scale-95"
    >
      <HandMetal className="h-6 w-6" />
    </Link>
  )
}