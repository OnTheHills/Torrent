"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { Notification03Icon } from "@hugeicons/core-free-icons";

import { useLocale } from "@/components/providers/locale-provider";
import { MatchBadge } from "@/components/tor/match-badge";
import { SkillTags } from "@/components/tor/skill-tags";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { routes } from "@/config/routes";
import { formatDate, MOCK_NOTIFICATIONS } from "@/data/mock";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/types/tor";

const KIND_LABEL: Record<AppNotification["kind"], { en: string; th: string }> = {
  match: { en: "Match", th: "จับคู่" },
  risk: { en: "Integrity", th: "ความน่าเชื่อถือ" },
  deadline: { en: "Deadline", th: "กำหนดปิดรับ" },
};

export function AlertsPopover({
  tone = "default",
}: {
  tone?: "default" | "chrome";
}) {
  const { locale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState(MOCK_NOTIFICATIONS);
  const [coords, setCoords] = useState({ top: 0, right: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = useMemo(
    () => items.filter((item) => !item.read).length,
    [items]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMounted(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

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
  }

  function markRead(id: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  }

  const panel =
    open && mounted
      ? createPortal(
          <div
            ref={panelRef}
            className="fixed z-[100] flex w-[min(24rem,calc(100vw-2rem))] origin-top-right flex-col overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10 animate-in fade-in-0 zoom-in-95"
            style={{ top: coords.top, right: coords.right, maxHeight: "min(70vh, 32rem)" }}
            role="dialog"
            aria-label={t("notificationsTitle")}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border px-3 py-3">
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
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={markAllRead}
              >
                {t("markAllRead")}
              </Button>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-2 overflow-y-auto p-2">
              {items.map((item) => (
                <AlertCard
                  key={item.id}
                  item={item}
                  locale={locale}
                  onMarkRead={() => markRead(item.id)}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </div>

            <div className="border-t border-border px-3 py-2">
              <Button asChild variant="ghost" size="sm" className="w-full justify-start">
                <Link
                  href={routes.settings.notifications}
                  onClick={() => setOpen(false)}
                >
                  {t("navNotificationSettings")}
                </Link>
              </Button>
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
            "relative text-appbar-muted-foreground hover:bg-appbar-hover hover:text-appbar-foreground aria-expanded:bg-appbar-active aria-expanded:text-appbar-foreground"
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
              "inline-flex min-w-4 justify-center rounded-sm bg-accent px-1 text-[0.6rem] font-semibold text-accent-foreground",
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
  onMarkRead,
  onNavigate,
}: {
  item: AppNotification;
  locale: "en" | "th";
  onMarkRead: () => void;
  onNavigate: () => void;
}) {
  const { t } = useLocale();
  const title = locale === "th" ? item.titleTh : item.title;
  const body = locale === "th" ? item.bodyTh : item.body;
  const kindLabel = KIND_LABEL[item.kind][locale];

  return (
    <Card
      size="sm"
      className="relative transition-colors hover:bg-muted/40"
    >
      <Link
        href={routes.app.tor(item.torId)}
        onClick={onNavigate}
        className="absolute inset-0 z-0 rounded-lg"
        aria-label={`${t("viewTor")}: ${title}`}
      />
      <CardHeader className="relative z-10 pointer-events-none">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={
              item.kind === "risk"
                ? "border-transparent bg-warning text-warning-foreground"
                : item.kind === "deadline"
                  ? "border-transparent bg-accent text-accent-foreground"
                  : "border-transparent bg-lifecycle-published text-lifecycle-published-foreground"
            }
          >
            {kindLabel}
          </Badge>
          {!item.read ? <Badge variant="secondary">New</Badge> : null}
        </div>
        <CardTitle className="text-sm leading-snug">{title}</CardTitle>
        <CardDescription className="line-clamp-2">{body}</CardDescription>
      </CardHeader>
      <CardContent className="relative z-10 space-y-2 pointer-events-none">
        <SkillTags skills={item.skills} limit={4} />
        <div className="flex flex-wrap items-end justify-between gap-2 border-t border-border pt-2">
          <p className="text-xs tabular-nums text-muted-foreground">
            {formatDate(item.createdAt, locale)}
          </p>
          {typeof item.matchScore === "number" ? (
            <MatchBadge score={item.matchScore} />
          ) : null}
        </div>
      </CardContent>
      {!item.read ? (
        <CardFooter className="relative z-10">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onMarkRead();
            }}
          >
            {t("markRead")}
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
