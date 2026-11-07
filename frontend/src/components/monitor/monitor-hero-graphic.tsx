import { cn } from "@/lib/utils";

/** Center pulled right so the sweep lives in the hero’s open side. */
const CX = 1020;
const CY = 340;
/** Outer radius past the hero corners so rings fill the full band. */
const R_MAX = 900;
const RINGS = [
  60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660, 720, 780, 840, 900,
];

/** Same mark for every blip: filled core + soft halo. */
const BLIPS: { x: number; y: number; delay: string }[] = [
  { x: 760, y: 180, delay: "0s" },
  { x: 880, y: 240, delay: "0.35s" },
  { x: 1120, y: 200, delay: "0.7s" },
  { x: 1240, y: 300, delay: "1.05s" },
  { x: 1180, y: 420, delay: "1.4s" },
  { x: 980, y: 480, delay: "0.2s" },
  { x: 860, y: 420, delay: "1.75s" },
  { x: 700, y: 360, delay: "0.9s" },
  { x: 640, y: 260, delay: "1.55s" },
  { x: 1080, y: 320, delay: "2.1s" },
  { x: 920, y: 140, delay: "0.55s" },
  { x: 1320, y: 380, delay: "1.9s" },
  { x: 780, y: 500, delay: "1.2s" },
  { x: 1040, y: 540, delay: "0.15s" },
];

/**
 * Orange radar wash for the Procurement monitor hero — full-bleed background.
 */
export function MonitorHeroGraphic({ className }: { className?: string }) {
  return (
    <div
      className={cn("pointer-events-none select-none", className)}
      aria-hidden
    >
      <svg
        viewBox="0 0 1440 680"
        className="h-full w-full"
        role="img"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <title>Procurement monitor radar</title>
        <desc>Concentric orange radar rings spanning the hero.</desc>

        <defs>
          <radialGradient
            id="mhg-radar-fade"
            cx={CX}
            cy={CY}
            r={R_MAX}
            gradientUnits="userSpaceOnUse"
          >
            <stop
              offset="0%"
              stopColor="var(--palette-orange-300)"
              stopOpacity="0.78"
            />
            <stop
              offset="32%"
              stopColor="var(--palette-orange-400)"
              stopOpacity="0.52"
            />
            <stop
              offset="62%"
              stopColor="var(--palette-orange-500)"
              stopOpacity="0.28"
            />
            <stop
              offset="100%"
              stopColor="var(--palette-orange-500)"
              stopOpacity="0.12"
            />
          </radialGradient>
          <linearGradient id="mhg-sweep" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop
              offset="0%"
              stopColor="var(--palette-orange-400)"
              stopOpacity="0"
            />
            <stop
              offset="45%"
              stopColor="var(--palette-orange-400)"
              stopOpacity="0.18"
            />
            <stop
              offset="100%"
              stopColor="var(--palette-orange-200)"
              stopOpacity="0.55"
            />
          </linearGradient>
          <clipPath id="mhg-radar-clip">
            <circle cx={CX} cy={CY} r={R_MAX} />
          </clipPath>
        </defs>

        <rect width="1440" height="680" fill="url(#mhg-radar-fade)" />

        {RINGS.map((r) => (
          <circle
            key={r}
            cx={CX}
            cy={CY}
            r={r}
            fill="none"
            stroke="color-mix(in srgb, var(--palette-orange-600) 55%, transparent)"
            strokeWidth="1.15"
          />
        ))}

        <line
          x1={CX - R_MAX}
          y1={CY}
          x2={CX + R_MAX}
          y2={CY}
          stroke="color-mix(in srgb, var(--palette-orange-700) 32%, transparent)"
          strokeWidth="1"
        />
        <line
          x1={CX}
          y1={CY - R_MAX}
          x2={CX}
          y2={CY + R_MAX}
          stroke="color-mix(in srgb, var(--palette-orange-700) 32%, transparent)"
          strokeWidth="1"
        />

        <g transform={`translate(${CX} ${CY})`}>
          <g className="motion-safe:animate-[mhg-radar-spin_8s_linear_infinite]">
            <g transform={`translate(${-CX} ${-CY})`}>
              <path
                d={`M${CX} ${CY} L${CX} ${CY - R_MAX} A${R_MAX} ${R_MAX} 0 0 1 ${CX + R_MAX * 0.72} ${CY - R_MAX * 0.7} Z`}
                fill="url(#mhg-sweep)"
                clipPath="url(#mhg-radar-clip)"
              />
              <line
                x1={CX}
                y1={CY}
                x2={CX + R_MAX * 0.72}
                y2={CY - R_MAX * 0.7}
                stroke="var(--palette-orange-500)"
                strokeWidth="1.75"
                strokeLinecap="round"
                opacity="0.6"
              />
            </g>
          </g>
        </g>

        {BLIPS.map((blip) => (
          <g
            key={`${blip.x}-${blip.y}`}
            className="motion-safe:animate-[mhg-blip_2.6s_ease-in-out_infinite]"
            style={{
              transformOrigin: `${blip.x}px ${blip.y}px`,
              animationDelay: blip.delay,
            }}
          >
            <circle
              cx={blip.x}
              cy={blip.y}
              r="4"
              fill="var(--palette-orange-600)"
            />
            <circle
              cx={blip.x}
              cy={blip.y}
              r="10"
              fill="none"
              stroke="var(--palette-orange-400)"
              strokeWidth="1"
              opacity="0.5"
            />
          </g>
        ))}

        <circle
          cx={CX}
          cy={CY}
          r="8"
          fill="color-mix(in srgb, var(--palette-white) 55%, transparent)"
          stroke="var(--palette-orange-600)"
          strokeWidth="1"
        />
        <circle cx={CX} cy={CY} r="3.5" fill="var(--palette-orange-600)" />
      </svg>
    </div>
  );
}
