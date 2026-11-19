"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { MessageCircle } from "lucide-react";

import { HeroTitle } from "@/components/layout/hero-title";
import { ShellContent } from "@/components/layout/shell-content";
import { useLocale } from "@/components/providers/locale-provider";

const RIPPLES = 10;
const RIPPLE_SECONDS = 15;

const maroonField = {
  backgroundColor: "color-mix(in srgb, var(--palette-red-200) 78%, var(--palette-red-700))",
  backgroundImage: [
    "radial-gradient(ellipse 42% 85% at 100% 0%, color-mix(in srgb, var(--palette-red-600) 28%, transparent), transparent)",
    "radial-gradient(ellipse 40% 70% at 6% 80%, color-mix(in srgb, var(--palette-red-400) 22%, transparent), transparent)",
    "radial-gradient(ellipse 34% 60% at 38% 30%, color-mix(in srgb, var(--palette-red-100) 55%, transparent), transparent)",
  ].join(","),
} as CSSProperties;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return reduced;
}

function WaterRipples() {
  const reduced = usePrefersReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const [maxRadius, setMaxRadius] = useState(0);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const measure = () =>
      setMaxRadius(Math.round(svg.getBoundingClientRect().width * 0.4));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  return (
    <svg
      ref={svgRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 size-full"
    >
      {maxRadius > 0 && Array.from({ length: RIPPLES }, (_, index) => {
        const begin = `${-(index * RIPPLE_SECONDS) / RIPPLES}s`;
        const restRadius = ((index + 1) / RIPPLES) * maxRadius;
        const restOpacity = 1 - index / RIPPLES;

        return (
          <g key={`${index}-${maxRadius}`} opacity={reduced ? restOpacity : 0}>
            {reduced ? null : (
              <animate
                attributeName="opacity"
                values="0;1;0.9;0"
                keyTimes="0;0.06;0.8;1"
                dur={`${RIPPLE_SECONDS}s`}
                begin={begin}
                repeatCount="indefinite"
              />
            )}
            <circle
              cx="100%"
              cy="40"
              r={reduced ? restRadius : 0}
              fill="none"
              style={{ stroke: "color-mix(in srgb, var(--palette-red-700) 50%, transparent)" }}
              strokeWidth={1.5}
            >
              {reduced ? null : (
                <animate
                  attributeName="r"
                  from="0"
                  to={maxRadius}
                  dur={`${RIPPLE_SECONDS}s`}
                  begin={begin}
                  repeatCount="indefinite"
                />
              )}
            </circle>
          </g>
        );
      })}
    </svg>
  );
}

export function AlertsHero() {
  const { t } = useLocale();

  return (
    <section className="relative -mt-[144px] overflow-hidden text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0" style={maroonField}>
        <WaterRipples />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[4.25rem] bg-[linear-gradient(180deg,transparent_0%,color-mix(in_srgb,var(--background)_12%,transparent)_25%,color-mix(in_srgb,var(--background)_45%,transparent)_50%,color-mix(in_srgb,var(--background)_78%,transparent)_75%,var(--background)_100%)] md:h-[6.25rem]"
      />
      <ShellContent className="relative z-10">
        <div className="relative mx-auto flex min-h-[22rem] max-w-6xl flex-col justify-center px-4 pb-14 pt-[144px] sm:px-6 md:min-h-[26rem] md:pb-16">
          <div className="w-full max-w-3xl md:max-w-4xl lg:max-w-5xl">
            <HeroTitle icon={<MessageCircle strokeWidth={1.75} />}>
              {t("settingsTitle")}
            </HeroTitle>
            <p className="mt-5 text-base leading-[1.7] text-[color-mix(in_srgb,var(--palette-red-900)_78%,transparent)] md:text-lg">
              {t("settingsDescription")}
            </p>
          </div>
        </div>
      </ShellContent>
    </section>
  );
}
