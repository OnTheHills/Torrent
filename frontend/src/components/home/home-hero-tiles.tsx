"use client";

/**
 * Atmospheric TOR mosaic for the public landing hero.
 * Teal = clear / right. Orange = flagged / not right.
 * Packs 1×1 and 2×2 frost squares with no empty cells (seeded, SSR-stable).
 * Cols/rows track the hero aspect so cells stay square while filling the area.
 */

import { useEffect, useMemo, useRef, useState } from "react";

type TileTone = "teal" | "orange";

type Tile = {
  tone: TileTone;
  size: 1 | 2;
  col: number;
  row: number;
  delayMs: number;
};

/** Larger cells = fewer tiles on screen (zoom in). */
const TARGET_CELL_PX = 88;

function hash01(n: number) {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function packTiles(cols: number, rows: number): Tile[] {
  const occupied = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => false),
  );
  const tiles: Tile[] = [];
  let seed = 0;

  function canPlace(row: number, col: number, size: 1 | 2) {
    if (row + size > rows || col + size > cols) return false;
    for (let r = row; r < row + size; r += 1) {
      for (let c = col; c < col + size; c += 1) {
        if (occupied[r][c]) return false;
      }
    }
    return true;
  }

  function mark(row: number, col: number, size: 1 | 2) {
    for (let r = row; r < row + size; r += 1) {
      for (let c = col; c < col + size; c += 1) {
        occupied[r][c] = true;
      }
    }
  }

  function pushTile(row: number, col: number, size: 1 | 2) {
    seed += 1;
    mark(row, col, size);
    tiles.push({
      tone: hash01(seed + 17) < 0.68 ? "teal" : "orange",
      size,
      col: col + 1,
      row: row + 1,
      delayMs: Math.round(hash01(seed + 41) * 420),
    });
  }

  const anchors: { row: number; col: number }[] = [];
  for (let row = 0; row <= rows - 2; row += 1) {
    for (let col = 0; col <= cols - 2; col += 1) {
      anchors.push({ row, col });
    }
  }
  for (let i = anchors.length - 1; i > 0; i -= 1) {
    const j = Math.floor(hash01(i * 13 + 7) * (i + 1));
    const tmp = anchors[i];
    anchors[i] = anchors[j];
    anchors[j] = tmp;
  }

  // Dense 2×2 sprinkle — about 1/4 of cells covered by big tiles.
  const bigBudget = Math.max(12, Math.floor((cols * rows) / 8));
  let bigPlaced = 0;
  for (const anchor of anchors) {
    if (bigPlaced >= bigBudget) break;
    if (!canPlace(anchor.row, anchor.col, 2)) continue;
    if (hash01(bigPlaced * 29 + anchor.row * 5 + anchor.col) < 0.15) continue;
    pushTile(anchor.row, anchor.col, 2);
    bigPlaced += 1;
  }

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (occupied[row][col]) continue;
      pushTile(row, col, 1);
    }
  }

  return tiles;
}

function gridForSize(width: number, height: number) {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const rows = Math.max(4, Math.round(h / TARGET_CELL_PX));
  // Match container aspect so w/cols ≈ h/rows → square cells.
  const cols = Math.max(6, Math.round((w / h) * rows));
  return { cols, rows };
}

const toneClass: Record<TileTone, string> = {
  teal:
    "bg-[color-mix(in_srgb,var(--palette-teal-400)_38%,transparent)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_78%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--palette-teal-400)_52%,transparent)]",
  orange:
    "bg-[color-mix(in_srgb,var(--palette-orange-400)_36%,transparent)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_78%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--palette-orange-400)_50%,transparent)]",
};

export function HomeHeroTiles({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [grid, setGrid] = useState({ cols: 10, rows: 5 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const next = gridForSize(rect.width, rect.height);
      setGrid((prev) =>
        prev.cols === next.cols && prev.rows === next.rows ? prev : next,
      );
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const tiles = useMemo(
    () => packTiles(grid.cols, grid.rows),
    [grid.cols, grid.rows],
  );

  return (
    <div
      ref={ref}
      aria-hidden
      className={["overflow-hidden p-2.5 sm:p-3 md:p-4", className]
        .filter(Boolean)
        .join(" ")}
      style={{
        /* Soft left fade only — keep tiles readable behind copy on wide screens. */
        maskImage:
          "linear-gradient(90deg, rgb(0 0 0 / 0.55) 0%, rgb(0 0 0 / 0.78) 28%, black 48%)",
        WebkitMaskImage:
          "linear-gradient(90deg, rgb(0 0 0 / 0.55) 0%, rgb(0 0 0 / 0.78) 28%, black 48%)",
      }}
    >
      <div
        className="grid h-full w-full gap-2 sm:gap-2.5 md:gap-3"
        style={{
          gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${grid.rows}, minmax(0, 1fr))`,
        }}
      >
        {tiles.map((tile, index) => (
          <div
            key={`${grid.cols}x${grid.rows}-${index}`}
            className={[
              "min-h-0 min-w-0 rounded-lg backdrop-blur-md backdrop-saturate-150",
              "motion-safe:animate-[hero-tile-in_720ms_cubic-bezier(0.22,1,0.36,1)_both]",
              toneClass[tile.tone],
            ].join(" ")}
            style={{
              gridColumn: `${tile.col} / span ${tile.size}`,
              gridRow: `${tile.row} / span ${tile.size}`,
              animationDelay: `${tile.delayMs}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
