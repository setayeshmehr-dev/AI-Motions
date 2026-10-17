"use client"

import { useState } from "react"
import { BookOpen } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DocumentationModal } from "@/components/documentation-modal"

export function DocumentationButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-11"
        onClick={() => setOpen(true)}
      >
        <BookOpen /> Documentation
      </Button>
      <DocumentationModal open={open} onOpenChange={setOpen} />
    </>
  )
}