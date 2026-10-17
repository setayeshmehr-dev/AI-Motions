const FLOATING = ["✊", "✋", "🤟", "✌️", "👍", "🤙"]

export function AuroraBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div
        className="absolute -top-40 -left-32 h-[32rem] w-[32rem] animate-aurora-1 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle at center, oklch(0.55 0.22 300 / 0.4), transparent 65%)",
        }}
      />
      <div
        className="absolute -right-24 -bottom-48 h-[36rem] w-[36rem] animate-aurora-2 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle at center, oklch(0.55 0.2 250 / 0.35), transparent 65%)",
        }}
      />
      <div
        className="absolute top-[30%] left-[35%] h-[24rem] w-[24rem] animate-aurora-3 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle at center, oklch(0.6 0.18 200 / 0.2), transparent 65%)",
        }}
      />
      {FLOATING.map((emoji, i) => (
        <span
          key={i}
          className="absolute animate-float-slow text-6xl opacity-[0.05] select-none"
          style={{
            left: `${6 + i * 16}%`,
            top: `${10 + (i % 3) * 30}%`,
            animationDelay: `${i * 1.8}s`,
          }}
        >
          {emoji}
        </span>
      ))}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, oklch(0.08 0.01 285 / 0.65) 100%)",
        }}
      />
    </div>
  )
}