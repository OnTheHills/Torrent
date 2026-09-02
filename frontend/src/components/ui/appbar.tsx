import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Compound App Bar layout — slots only. Product controls (search, toggles,
 * account) are composed in by the shell, matching the Mint / Omise pattern.
 */

export const appBarRootStyles =
  "absolute inset-x-0 top-0 z-30 flex h-[72px] w-full items-center border-b border-appbar-border/40 bg-appbar text-appbar-foreground backdrop-blur-xl backdrop-saturate-150";

export const appBarPrimaryStyles =
  "flex h-full w-full items-center justify-between gap-3 px-4 md:gap-4";

export const appBarClusterStyles = "flex items-center gap-3";

export const appBarCenterStyles =
  "hidden min-w-0 flex-1 items-center justify-center md:flex";

export const appBarBrandLockupStyles = "flex items-center gap-2";

export const appBarLogoStyles =
  "inline-flex h-[18px] shrink-0 items-center rounded-sm bg-sidebar-primary px-1.5 font-heading text-[9px] font-semibold tracking-[0.1em] text-sidebar-primary-foreground md:h-5 md:px-2 md:text-[11px] md:tracking-[0.12em]";

export const appBarWorkspaceNameStyles =
  "mt-0.5 flex h-12 items-center font-heading text-lg uppercase leading-none tracking-wide text-appbar-accent-foreground md:h-16 md:text-3xl";

export const appBarMobileDividerStyles =
  "h-8 w-px shrink-0 bg-appbar-border md:hidden";

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
