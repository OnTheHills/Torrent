"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  AlarmClockIcon,
  Alert02Icon,
  Cancel01Icon,
  GuestHouseIcon,
  Notification03Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";

import { useLocale } from "@/components/providers/locale-provider";
import { useSession } from "@/components/providers/session-provider";
import { chromeFrostBar, liquidGlassDim } from "@/components/ui/appbar";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import {
  formatDate,
} from "@/data/mock";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AppNotification, NotificationKind } from "@/types/tor";

const frostNotiCard =
  "border-0 bg-[rgb(255_255_255_/_0.22)] text-foreground shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.7),0_8px_28px_rgb(0_0_0_/_0.05)] ring-1 ring-[rgb(255_255_255_/_0.48)] backdrop-blur-xl backdrop-saturate-150";

const KIND_META: Record<
  NotificationKind,
  {
    title: { en: string; th: string };
    icon: IconSvgElement;
    iconFg: string;
    circle: string;
  }
> = {
  match: {
    title: { en: "New match", th: "จับคู่ใหม่" },
    icon: SparklesIcon,
    iconFg: "text-[var(--palette-green-800)]",
    circle:
      "bg-[color-mix(in_srgb,var(--palette-green-300)_42%,transparent)] shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.85)] ring-1 ring-[color-mix(in_srgb,var(--palette-green-400)_48%,transparent)]",
  },
  risk: {
    title: { en: "Integrity alert", th: "แจ้งเตือนความน่าเชื่อถือ" },
    icon: Alert02Icon,
    iconFg: "text-[var(--palette-yellow-800)]",
    circle:
      "bg-[color-mix(in_srgb,var(--palette-yellow-300)_48%,transparent)] shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.85)] ring-1 ring-[color-mix(in_srgb,var(--palette-yellow-500)_45%,transparent)]",
  },
  deadline: {
    title: { en: "Closing soon", th: "ใกล้ปิดรับ" },
    icon: AlarmClockIcon,
    iconFg: "text-[var(--palette-orange-800)]",
    circle:
      "bg-[color-mix(in_srgb,var(--palette-orange-300)_42%,transparent)] shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.85)] ring-1 ring-[color-mix(in_srgb,var(--palette-orange-400)_48%,transparent)]",
  },
};

function notificationHref(item: AppNotification) {
  if (item.kind === "match") return routes.app.home;
  if (item.kind === "deadline") return routes.app.tors;
  return routes.app.tor(item.torId);
}

type StoredNotification = Pick<
  AppNotification,
  "kind" | "body" | "bodyTh" | "createdAt" | "read"
> & {
  _id: string;
  torId: string | { _id?: string };
};

export function AlertsPopover({
  tone = "default",
}: {
  tone?: "default" | "chrome";
}) {
  const { locale, t } = useLocale();
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [itemsForUser, setItemsForUser] = useState<string | null>(null);
  const [coords, setCoords] = useState({ top: 0, right: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const currentItems = user?._id === itemsForUser ? items : [];
  const unread = currentItems.filter((item) => !item.read).length;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMounted(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!user?._id) return;
    const userId = user._id;
    let active = true;
    const refresh = () =>
      api<StoredNotification[]>("/notifications/mine", { cache: "no-store" })
        .then((next) => {
          if (!active) return;
          setItems(
            next.map((item) => ({
              id: item._id,
              kind: item.kind,
              torId: typeof item.torId === "string" ? item.torId : item.torId?._id || "",
              title: KIND_META[item.kind].title.en,
              titleTh: KIND_META[item.kind].title.th,
              body: item.body,
              bodyTh: item.bodyTh,
              createdAt: item.createdAt,
              read: item.read,
              skills: [],
            })),
          );
          setItemsForUser(userId);
        })
        .catch(() => {});
    void refresh();
    const timer = window.setInterval(refresh, 60_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [user?._id]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setCoords({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function markAllRead() {
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
    void api("/notifications/mine/read-all", { method: "PATCH" }).catch(() => {});
  }

  function markRead(id: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
    void api(`/notifications/mine/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ read: true }),
    }).catch(() => {});
  }

  function dismiss(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
    void api(`/notifications/mine/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ dismissed: true }),
    }).catch(() => {});
  }

  const panel =
    open && mounted
      ? createPortal(
          <div
            ref={panelRef}
            className="liquid-glass-card liquid-glass-card-clear fixed z-[100] flex w-[min(24rem,calc(100vw-2rem))] origin-top-right flex-col overflow-hidden rounded-2xl text-foreground animate-in fade-in-0 zoom-in-95"
            style={{ top: coords.top, right: coords.right, maxHeight: "min(70vh, 32rem)" }}
            role="dialog"
            aria-label={t("notificationsTitle")}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[color-mix(in_srgb,var(--palette-gray-300)_38%,transparent)] px-4 py-3">
              <div className="min-w-0 space-y-0.5">
                <p className="font-heading text-sm font-semibold">
                  {t("notificationsTitle")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {unread} {t("unreadItems")}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  chromeFrostBar,
                  "h-8 shrink-0 rounded-full px-3 text-xs font-medium hover:brightness-[1.02]",
                )}
                onClick={markAllRead}
              >
                {t("markAllRead")}
              </Button>
            </div>

            <div className="grid min-h-0 flex-1 auto-rows-max grid-cols-1 gap-2 overflow-y-auto p-3">
              {currentItems.map((item) => (
                <AlertCard
                  key={item.id}
                  item={item}
                  locale={locale}
                  onDismiss={() => dismiss(item.id)}
                  onNavigate={() => {
                    markRead(item.id);
                    setOpen(false);
                  }}
                />
              ))}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        size={tone === "chrome" ? "icon-lg" : "lg"}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t("navNotifications")}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          tone === "chrome" &&
            cn(
              "relative hover:brightness-[1.02]",
              chromeFrostBar,
              "aria-expanded:bg-[color-mix(in_srgb,var(--palette-teal-400)_32%,transparent)] aria-expanded:text-[var(--palette-teal-800)] aria-expanded:ring-[color-mix(in_srgb,var(--palette-teal-400)_48%,transparent)]",
            )
        )}
      >
        {tone === "chrome" ? (
          <HugeiconsIcon
            icon={Notification03Icon}
            strokeWidth={1.75}
            aria-hidden
          />
        ) : null}
        <span className={cn(tone === "chrome" && "sr-only")}>
          {t("navNotifications")}
        </span>
        {unread > 0 ? (
          <span
            className={cn(
              "inline-flex min-w-4 justify-center rounded-full bg-[var(--palette-red-500)] px-1 text-[0.6rem] font-semibold text-white",
              tone === "chrome"
                ? "absolute -top-0.5 -right-0.5 ml-0"
                : "ml-1"
            )}
          >
            {unread}
          </span>
        ) : null}
      </Button>
      {panel}
    </>
  );
}

function AlertCard({
  item,
  locale,
  onDismiss,
  onNavigate,
}: {
  item: AppNotification;
  locale: "en" | "th";
  onDismiss: () => void;
  onNavigate: () => void;
}) {
  const { t } = useLocale();
  const meta = KIND_META[item.kind];
  const title = meta.title[locale];
  const [projectName = "", department = ""] = (
    locale === "th" ? item.bodyTh : item.body
  ).split(" · ");
  const href = notificationHref(item);

  return (
    <article
      className={cn(
        frostNotiCard,
        "relative overflow-hidden rounded-sm transition-[transform,background-color,box-shadow] duration-200 ease-out",
        "hover:bg-[rgb(255_255_255_/_0.34)] hover:shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.82),0_12px_32px_rgb(0_0_0_/_0.07)]",
      )}
    >
      <Link
        href={href}
        onClick={onNavigate}
        className="absolute inset-0 z-0 rounded-sm"
        aria-label={`${title}: ${projectName}${department ? ` · ${department}` : ""}`}
      />
      <div className="relative z-10 pointer-events-none flex gap-3 px-3 pt-3">
        <span
          aria-hidden
          className={cn(
            "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full backdrop-blur-md backdrop-saturate-150",
            meta.circle,
          )}
        >
          <HugeiconsIcon
            icon={meta.icon}
            strokeWidth={1.75}
            className={cn("size-4", meta.iconFg)}
          />
        </span>
        <div className="min-w-0 flex-1 pb-3">
          <div className="space-y-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-semibold leading-snug tracking-tight text-foreground">
                {title}
              </p>
              <time
                dateTime={item.createdAt}
                className="shrink-0 text-xs tabular-nums text-muted-foreground"
              >
                {formatDate(item.createdAt, locale)}
              </time>
            </div>
            <p
              title={projectName}
              className="truncate text-xs font-semibold leading-snug text-foreground"
            >
              {projectName}
            </p>
            {department ? (
              <p
                className={cn(
                  "flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground",
                  "pr-8",
                )}
              >
                <HugeiconsIcon
                  icon={GuestHouseIcon}
                  strokeWidth={1.75}
                  className="size-3.5 shrink-0"
                />
                <span className="truncate" title={department}>
                  {department}
                </span>
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t("dismiss")}
        title={t("dismiss")}
        className={cn(
          liquidGlassDim,
          "absolute right-2.5 bottom-2.5 z-10 size-7 rounded-full text-muted-foreground hover:text-foreground",
        )}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onDismiss();
        }}
      >
        <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-3.5" />
      </Button>
    </article>
  );
}
