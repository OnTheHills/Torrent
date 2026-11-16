"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/** Logical width the feed is laid out in; scaled to the real pixel width. */
const WIDTH = 1200;
/** Write head. New samples are drawn here; history sits to the left. */
const HEAD_X = WIDTH / 2;
const HISTORY = 56;
const STEP = HEAD_X / HISTORY;
const STEP_MS = 110;
/** Square size in CSS pixels. Same step on both axes, so every cell is 1:1. */
const CELL = 12;
/** Trace centre and swing, in pixels from the top of the grid. */
const TRACE_MID = 75;
const AMP = 51;
/** Original 150px grid plus five more rows. */
const GRID_HEIGHT = 150 + CELL * 5;
/** Last rows dissolve instead of ending on a hard edge. */
const GRID_FADE = CELL * 3;

/** One pulse, as a fraction of AMP, played as it is written. */
const BEAT = [0, 0.16, 0, -0.28, 1, -0.42, 0.08, 0.22, 0];

function createFeed() {
  const pending: number[] = [];

  return function next(): number {
    if (pending.length === 0) {
      const scale = 0.78 + Math.random() * 0.22;
      const direction = Math.random() < 0.8 ? 1 : -1;
      for (const value of BEAT) pending.push(AMP * value * scale * direction);
      const waves = 2 + Math.floor(Math.random() * 3);
      const swing = AMP * (0.28 + Math.random() * 0.25);
      const phase = Math.random() * Math.PI * 2;
      for (let i = 0; i < waves; i += 1) {
        pending.push(Math.sin(phase + i * 1.15) * swing);
      }
    }
    return Math.max(-AMP, Math.min(AMP, pending.shift() ?? 0));
  };
}

function tracePath(
  history: number[],
  penY: number,
  drift: number,
  width: number,
) {
  const xOf = (logicalX: number) => (logicalX / WIDTH) * width;
  const commands: string[] = [];

  history.forEach((value, index) => {
    const x = xOf(HEAD_X - (history.length - index) * STEP - drift);
    if (x < -CELL) return;
    commands.push(
      `${commands.length === 0 ? "M" : "L"}${x.toFixed(2)},${(TRACE_MID - value).toFixed(2)}`,
    );
  });

  commands.push(
    `L${xOf(HEAD_X).toFixed(2)},${(TRACE_MID - penY).toFixed(2)}`,
  );
  return commands.join(" ");
}

function gridLines(span: number, origin: number) {
  const lines: number[] = [];
  for (let position = origin; position <= span + 0.5; position += CELL) {
    lines.push(position);
  }
  for (let position = origin - CELL; position >= -0.5; position -= CELL) {
    lines.push(position);
  }
  return lines;
}

export function EcgTrace() {
  const color = "#1d6654";
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const penRef = useRef<SVGCircleElement>(null);
  const widthRef = useRef(0);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const measure = () => {
      const next = Math.max(1, Math.round(svg.getBoundingClientRect().width));
      widthRef.current = next;
      setWidth((current) => (current === next ? current : next));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const path = pathRef.current;
    const pen = penRef.current;
    if (!path || !pen) return;

    const next = createFeed();
    const history = Array.from({ length: HISTORY }, () => next());
    let penFrom = history[history.length - 1] ?? 0;
    let penTo = next();
    let drift = 0;
    let last = performance.now();

    const draw = (penY: number) => {
      const w = widthRef.current;
      if (w < 1) return;
      path.setAttribute("d", tracePath(history, penY, drift, w));
      pen.setAttribute("cx", (w / 2).toFixed(2));
      pen.setAttribute("cy", (TRACE_MID - penY).toFixed(2));
    };

    draw(penFrom);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;

    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      drift += (dt / STEP_MS) * STEP;

      while (drift >= STEP) {
        drift -= STEP;
        history.shift();
        history.push(penTo);
        penFrom = penTo;
        penTo = next();
      }

      const progress = drift / STEP;
      draw(penFrom + (penTo - penFrom) * progress);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const vertical = width > 0 ? gridLines(width, width / 2) : [];
  const horizontal = gridLines(GRID_HEIGHT, TRACE_MID);
  const fadeStart = `${GRID_HEIGHT - GRID_FADE}px`;

  return (
    <svg
      ref={svgRef}
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-[144px] block w-full"
      height={GRID_HEIGHT}
      viewBox={width > 0 ? `0 0 ${width} ${GRID_HEIGHT}` : undefined}
      style={{
        height: GRID_HEIGHT,
        maskImage: `linear-gradient(to bottom, #000 ${fadeStart}, transparent)`,
        WebkitMaskImage: `linear-gradient(to bottom, #000 ${fadeStart}, transparent)`,
      }}
    >
      <g aria-hidden>
        {vertical.map((x) => {
          const major = Math.round((x - width / 2) / CELL) % 4 === 0;
          return (
            <line
              key={`vx-${x.toFixed(2)}`}
              x1={x}
              y1={0}
              x2={x}
              y2={GRID_HEIGHT}
              stroke={color}
              strokeOpacity={major ? 0.32 : 0.14}
              strokeWidth="1"
            />
          );
        })}
        {horizontal.map((y) => {
          const major = Math.round((y - TRACE_MID) / CELL) % 4 === 0;
          return (
            <line
              key={`hy-${y.toFixed(2)}`}
              x1={0}
              y1={y}
              x2={width}
              y2={y}
              stroke={color}
              strokeOpacity={major ? 0.32 : 0.14}
              strokeWidth="1"
            />
          );
        })}
      </g>
      <path
        ref={pathRef}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle ref={penRef} cx={width / 2} cy={TRACE_MID} r="4" fill={color} />
    </svg>
  );
}
