import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Compound App Bar layout — slots only. Product controls (search, toggles,
 * account) are composed in by the shell. Same full-bleed 72px chrome as before,
 * with the liquid-glass material shared with the sidebar.
 */

export const appBarRootStyles =
  "liquid-glass absolute inset-x-0 top-0 z-30 flex h-[72px] w-full items-center overflow-hidden rounded-none border-x-0 border-t-0 text-appbar-foreground shadow-[inset_0_-1px_0_0_rgb(255_255_255_/_0.28),0_8px_24px_var(--sidebar-glass-shadow)]";

/** Neutral frost control on the light liquid-glass app bar. */
export const chromeFrostBar =
  "border-0 bg-[linear-gradient(180deg,var(--palette-gray-200),var(--palette-gray-100))] text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-1 ring-[color-mix(in_srgb,var(--palette-gray-300)_80%,transparent)] backdrop-blur-md backdrop-saturate-150";

/** Selected / primary frost on the light glass chrome. */
export const chromeFrostTeal =
  "border-0 bg-[color-mix(in_srgb,var(--palette-teal-400)_32%,transparent)] text-[var(--palette-teal-800)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,white_80%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--palette-teal-400)_48%,transparent)] backdrop-blur-md backdrop-saturate-150";

export const appBarPrimaryStyles =
  "relative flex h-full w-full items-center justify-between gap-3 px-4 md:gap-4";

export const appBarClusterStyles = "flex items-center gap-3";

export const appBarCenterStyles =
  "hidden min-w-0 flex-1 items-center justify-center md:flex";

export const appBarBrandLockupStyles = "flex items-center gap-2";

export const appBarLogoStyles =
  "inline-flex h-[18px] shrink-0 items-center rounded-sm bg-sidebar-primary px-1.5 font-heading text-[9px] font-semibold tracking-[0.1em] text-sidebar-primary-foreground md:h-5 md:px-2 md:text-[11px] md:tracking-[0.12em]";

export const appBarWorkspaceNameStyles =
  "inline-flex h-7 items-center rounded-full px-3.5 text-sm font-medium leading-none tracking-tight md:h-8 md:px-4 md:text-base";

export const appBarWorkspaceTone = {
  public:
    "bg-[color-mix(in_srgb,var(--palette-teal-400)_32%,transparent)] text-[var(--palette-teal-800)]",
  vendor:
    "bg-[color-mix(in_srgb,var(--palette-orange-400)_32%,transparent)] text-[var(--palette-orange-800)]",
  admin:
    "bg-[color-mix(in_srgb,var(--palette-red-400)_32%,transparent)] text-[var(--palette-red-800)]",
} as const;

export const appBarMobileDividerStyles =
  "h-8 w-px shrink-0 bg-[color-mix(in_srgb,var(--palette-gray-400)_45%,transparent)] md:hidden";

const AppBarRoot = React.forwardRef<
  HTMLElement,
  React.ComponentProps<"header">
>(function AppBarRoot({ className, ...props }, ref) {
  return (
    <header
      ref={ref}
      data-slot="app-bar"
      className={cn(appBarRootStyles, className)}
      {...props}
    />
  );
});

const AppBarPrimary = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(function AppBarPrimary({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      data-slot="app-bar-primary"
      className={cn(appBarPrimaryStyles, className)}
      {...props}
    />
  );
});

const AppBarLeft = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(function AppBarLeft({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      data-slot="app-bar-left"
      className={cn(appBarClusterStyles, className)}
      {...props}
    />
  );
});

const AppBarCenter = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(function AppBarCenter({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      data-slot="app-bar-center"
      className={cn(appBarCenterStyles, className)}
      {...props}
    />
  );
});

const AppBarRight = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(function AppBarRight({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      data-slot="app-bar-right"
      className={cn(appBarClusterStyles, "justify-end", className)}
      {...props}
    />
  );
});

const AppBarBrandLockup = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(function AppBarBrandLockup({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      data-slot="app-bar-brand-lockup"
      className={cn(appBarBrandLockupStyles, className)}
      {...props}
    />
  );
});

const AppBarLogo = React.forwardRef<
  HTMLSpanElement,
  React.ComponentProps<"span">
>(function AppBarLogo({ className, ...props }, ref) {
  return (
    <span
      ref={ref}
      data-slot="app-bar-logo"
      className={cn(appBarLogoStyles, className)}
      {...props}
    />
  );
});

const AppBarWorkspaceName = React.forwardRef<
  HTMLSpanElement,
  React.ComponentProps<"span">
>(function AppBarWorkspaceName({ className, ...props }, ref) {
  return (
    <span
      ref={ref}
      data-slot="app-bar-workspace-name"
      className={cn(appBarWorkspaceNameStyles, className)}
      {...props}
    />
  );
});

const AppBarMobileDivider = React.forwardRef<
  HTMLSpanElement,
  React.ComponentProps<"span">
>(function AppBarMobileDivider({ className, ...props }, ref) {
  return (
    <span
      ref={ref}
      data-slot="app-bar-mobile-divider"
      className={cn(appBarMobileDividerStyles, className)}
      aria-hidden
      {...props}
    />
  );
});

type AppBarComponent = typeof AppBarRoot & {
  Root: typeof AppBarRoot;
  Primary: typeof AppBarPrimary;
  Left: typeof AppBarLeft;
  Center: typeof AppBarCenter;
  Right: typeof AppBarRight;
  BrandLockup: typeof AppBarBrandLockup;
  Logo: typeof AppBarLogo;
  WorkspaceName: typeof AppBarWorkspaceName;
  MobileDivider: typeof AppBarMobileDivider;
};

const AppBar = Object.assign(AppBarRoot, {
  Root: AppBarRoot,
  Primary: AppBarPrimary,
  Left: AppBarLeft,
  Center: AppBarCenter,
  Right: AppBarRight,
  BrandLockup: AppBarBrandLockup,
  Logo: AppBarLogo,
  WorkspaceName: AppBarWorkspaceName,
  MobileDivider: AppBarMobileDivider,
}) as AppBarComponent;

export {
  AppBar,
  AppBarRoot,
  AppBarPrimary,
  AppBarLeft,
  AppBarCenter,
  AppBarRight,
  AppBarBrandLockup,
  AppBarLogo,
  AppBarWorkspaceName,
  AppBarMobileDivider,
};
