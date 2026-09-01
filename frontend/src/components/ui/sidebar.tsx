"use client";

import * as React from "react";
import { Slot } from "radix-ui";
import { HugeiconsIcon } from "@hugeicons/react";
import { SidebarLeft01Icon, SidebarRight01Icon } from "@hugeicons/core-free-icons";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const SIDEBAR_STORAGE_KEY = "torrent-sidebar";
const SIDEBAR_STORAGE_EVENT = "torrent-sidebar-change";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

export const SIDEBAR_WIDTH = "240px";
export const SIDEBAR_WIDTH_ICON = "3rem";
export const SIDEBAR_WIDTH_MOBILE = "18rem";

type SidebarContextValue = {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return context;
}

function subscribeToStoredOpen(onChange: () => void) {
  window.addEventListener(SIDEBAR_STORAGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(SIDEBAR_STORAGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function SidebarProvider({
  defaultOpen = true,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & { defaultOpen?: boolean }) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);

  // The collapsed preference lives in localStorage, which the server can't read.
  // Treating it as an external store lets React render `defaultOpen` for
  // hydration and then settle on the stored value without a state-syncing effect.
  const open = React.useSyncExternalStore(
    subscribeToStoredOpen,
    React.useCallback(() => {
      const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (stored === "collapsed") return false;
      if (stored === "expanded") return true;
      return defaultOpen;
    }, [defaultOpen]),
    React.useCallback(() => defaultOpen, [defaultOpen])
  );

  const setOpen = React.useCallback((value: boolean) => {
    window.localStorage.setItem(
      SIDEBAR_STORAGE_KEY,
      value ? "expanded" : "collapsed"
    );
    window.dispatchEvent(new Event(SIDEBAR_STORAGE_EVENT));
  }, []);

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile((value) => !value);
      return;
    }
    setOpen(!open);
  }, [isMobile, open, setOpen]);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        toggleSidebar();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleSidebar]);

  const value = React.useMemo<SidebarContextValue>(
    () => ({
      state: open ? "expanded" : "collapsed",
      open,
      setOpen,
      openMobile,
      setOpenMobile,
      isMobile,
      toggleSidebar,
    }),
    [open, setOpen, openMobile, isMobile, toggleSidebar]
  );

  return (
    <SidebarContext.Provider value={value}>
      <TooltipProvider>
        <div
          data-slot="sidebar-wrapper"
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH,
              "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
              ...style,
            } as React.CSSProperties
          }
          className={cn("group/sidebar-wrapper flex w-full", className)}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}

/**
 * The desktop sidebar is absolutely positioned next to a sibling "gap" element
 * that reserves its width. Animating the gap instead of the flex basis keeps the
 * content canvas from reflowing its children mid-transition.
 */
function Sidebar({
  side = "left",
  collapsible = "icon",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  side?: "left" | "right";
  collapsible?: "offcanvas" | "icon" | "none";
}) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

  if (collapsible === "none") {
    return (
      <div
        data-slot="sidebar"
        className={cn(
          "flex h-full w-(--sidebar-width) flex-col overflow-hidden bg-sidebar text-sidebar-foreground",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          data-slot="sidebar"
          data-mobile="true"
          side={side}
          showCloseButton={false}
          className="w-(--sidebar-width) gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
          style={
            { "--sidebar-width": SIDEBAR_WIDTH_MOBILE } as React.CSSProperties
          }
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>TORRENT sections and shortcuts.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      className="group peer hidden h-full text-sidebar-foreground md:block"
      data-slot="sidebar"
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-side={side}
    >
      <div
        data-slot="sidebar-gap"
        className={cn(
          "relative h-full w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear",
          "group-data-[collapsible=offcanvas]:w-0",
          "group-data-[collapsible=icon]:w-(--sidebar-width-icon)"
        )}
      />
      <div
        data-slot="sidebar-container"
        className={cn(
          "absolute inset-y-0 z-20 hidden h-full w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex",
          side === "left"
            ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
            : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
          "group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
          className
        )}
        {...props}
      >
        <div className="flex h-full w-full flex-col overflow-hidden bg-sidebar">
          {children}
        </div>
      </div>
    </div>
  );
}

function SidebarTrigger({
  className,
  onClick,
  labels,
  ...props
}: React.ComponentProps<"button"> & {
  labels?: { expanded: string; collapsed: string };
}) {
  const { toggleSidebar, state } = useSidebar();
  const collapsed = state === "collapsed";
  const label = collapsed
    ? (labels?.collapsed ?? "Expand menu")
    : (labels?.expanded ?? "Collapse menu");

  return (
    <button
      type="button"
      data-slot="sidebar-trigger"
      aria-label={label}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      className={cn(
        "flex min-h-8 w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-sidebar-foreground outline-none transition-colors hover:bg-sidebar-hover focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        "group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2!",
        className
      )}
      {...props}
    >
      <HugeiconsIcon
        icon={collapsed ? SidebarRight01Icon : SidebarLeft01Icon}
        className="size-4 shrink-0"
        strokeWidth={1.75}
      />
      <span className="truncate group-data-[collapsible=icon]:sr-only">
        {label}
      </span>
    </button>
  );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn("flex shrink-0 flex-col gap-2 p-3", className)}
      {...props}
    />
  );
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-4",
        "group-data-[collapsible=icon]:overflow-hidden group-data-[collapsible=icon]:p-2",
        className
      )}
      {...props}
    />
  );
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn(
        "flex w-full shrink-0 flex-col gap-2 border-t border-sidebar-divider bg-sidebar p-4",
        "group-data-[collapsible=icon]:p-2",
        className
      )}
      {...props}
    />
  );
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group"
      className={cn("relative flex w-full min-w-0 flex-col gap-2", className)}
      {...props}
    />
  );
}

function SidebarGroupLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-label"
      className={cn(
        "flex shrink-0 items-center px-3 pt-2 pb-1 text-[0.65rem] font-medium uppercase tracking-[0.16em] text-sidebar-muted-foreground transition-[margin,opacity] duration-200 ease-linear",
        "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
        className
      )}
      {...props}
    />
  );
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu"
      className={cn("flex w-full min-w-0 flex-col gap-1", className)}
      {...props}
    />
  );
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-item"
      className={cn("group/menu-item relative", className)}
      {...props}
    />
  );
}

function SidebarMenuButton({
  asChild = false,
  isActive = false,
  tooltip,
  className,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean;
  isActive?: boolean;
  tooltip?: string;
}) {
  const Comp = asChild ? Slot.Root : "button";
  const { state, isMobile } = useSidebar();

  const button = (
    <Comp
      data-slot="sidebar-menu-button"
      data-active={isActive}
      className={cn(
        "flex h-10 w-full items-center gap-3 overflow-hidden rounded-md px-3 text-left text-sm text-sidebar-foreground outline-none transition-colors",
        "hover:bg-sidebar-hover focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground",
        "group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2!",
        "[&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
        className
      )}
      {...(asChild ? {} : { type: "button" as const })}
      {...props}
    />
  );

  if (!tooltip) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent
        side="right"
        align="center"
        hidden={state !== "collapsed" || isMobile}
        className="bg-sidebar-popup text-sidebar-popup-foreground"
      >
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

/** Gutter + rounded scroll canvas that carries page content. */
function MainContent({
  className,
  contentClassName,
  children,
  ...props
}: React.ComponentProps<"div"> & { contentClassName?: string }) {
  return (
    <div
      data-slot="main-content-gutter"
      className={cn(
        "flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background-body pl-2",
        className
      )}
      {...props}
    >
      <main
        data-slot="main-content-canvas"
        className={cn(
          "h-full min-h-0 flex-1 overflow-x-hidden overflow-y-auto rounded-tl-xl bg-background",
          contentClassName
        )}
      >
        {children}
      </main>
    </div>
  );
}

export {
  MainContent,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
};
