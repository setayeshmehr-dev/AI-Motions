/**
 * MediaPipe's WASM module prints benign INFO lines (e.g. delegate creation)
 * through emscripten's stderr, which lands in console.error — and Next.js's
 * dev overlay surfaces every console.error as an app error.
 * This filters exactly those lines and lets everything real through.
 */

export function silenceWasmInfoLogs() {
  if (typeof window === "undefined") return
  const w = window as unknown as { __gpWasmLogsSilenced?: boolean }
  if (w.__gpWasmLogsSilenced) return
  w.__gpWasmLogsSilenced = true

  const original = console.error.bind(console)
  console.error = (...args: unknown[]) => {
    const first = args[0]
    if (
      typeof first === "string" &&
      (/^INFO:/.test(first) || /XNNPACK delegate/i.test(first))
    ) {
      return // benign WASM/TFLite log — swallow it
    }
    original(...args)
  }
}