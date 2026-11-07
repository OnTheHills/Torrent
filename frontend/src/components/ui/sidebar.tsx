"use client";

import * as React from "react";
import { Slot } from "radix-ui";

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

export const SIDEBAR_WIDTH = "220px";
/** Slim capsule width for icon-rail mode (shape ref: vertical dock pill). */
export const SIDEBAR_WIDTH_ICON = "56px";
export const SIDEBAR_WIDTH_MOBILE = "18rem";

type SidebarContextValue = {
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

function SidebarProvider({
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(true);
  const [openMobile, setOpenMobile] = React.useState(false);

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) setOpenMobile((value) => !value);
    else setOpen((value) => !value);
  }, [isMobile]);

  const value = React.useMemo<SidebarContextValue>(
    () => ({
      open,
      setOpen,
      openMobile,
      setOpenMobile,
      isMobile,
      toggleSidebar,
    }),
    [open, openMobile, isMobile, toggleSidebar],
  );

  return (
    <SidebarContext.Provider value={value}>
      <TooltipProvider delayDuration={200}>
        <div
          data-slot="sidebar-wrapper"
          data-sidebar-open={open ? "true" : "false"}
          style={
            {
              "--sidebar-width": open ? SIDEBAR_WIDTH : SIDEBAR_WIDTH_ICON,
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

function Sidebar({
  side = "left",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  side?: "left" | "right";
}) {
  const { isMobile, openMobile, setOpenMobile } = useSidebar();

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          data-slot="sidebar"
          data-mobile="true"
          side={side}
          showCloseButton={false}
          className="w-(--sidebar-width) gap-0 border-0 bg-transparent p-3 text-sidebar-foreground shadow-none"
          style={
            { "--sidebar-width": SIDEBAR_WIDTH_MOBILE } as React.CSSProperties
          }
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>TORRENT sections and shortcuts.</SheetDescription>
          </SheetHeader>
          <div className="sidebar-liquid-glass relative flex h-full w-full flex-col overflow-hidden rounded-[28px]">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      data-slot="sidebar-container"
      data-side={side}
      className={cn(
        /* Overlay the canvas — no width reservation — so page bands run behind the glass. */
        "pointer-events-none absolute inset-y-0 z-20 hidden h-full w-[calc(var(--sidebar-width)+1.5rem)] p-3 pt-[84px] transition-[width] md:flex",
        /* Collapse: snappy. Expand: longer ease-out so the open feels smoother. */
        "duration-150 ease-[cubic-bezier(0.33,1,0.68,1)] group-data-[sidebar-open=true]/sidebar-wrapper:duration-180 group-data-[sidebar-open=true]/sidebar-wrapper:ease-[cubic-bezier(0.22,1,0.36,1)]",
        side === "left" ? "left-0" : "right-0",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "sidebar-liquid-glass pointer-events-auto relative flex h-full w-full flex-col overflow-hidden text-sidebar-foreground transition-[border-radius]",
          /* Radius uses real px (not rounded-full/9999) so 28→12 interpolates visibly with width. */
          "duration-150 ease-[cubic-bezier(0.33,1,0.68,1)] group-data-[sidebar-open=true]/sidebar-wrapper:duration-150 group-data-[sidebar-open=true]/sidebar-wrapper:ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          /* Expanded sheet vs collapsed capsule (= half of SIDEBAR_WIDTH_ICON). */
          "group-data-[sidebar-open=true]/sidebar-wrapper:rounded-[12px]",
          "group-data-[sidebar-open=false]/sidebar-wrapper:rounded-[28px]",
        )}
      >
        {children}
      </div>
    </div>
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
        "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3 transition-[padding,gap] duration-150 ease-out group-data-[sidebar-open=true]/sidebar-wrapper:duration-180 group-data-[sidebar-open=true]/sidebar-wrapper:ease-[cubic-bezier(0.22,1,0.36,1)]",
        "group-data-[sidebar-open=false]/sidebar-wrapper:gap-1.5 group-data-[sidebar-open=false]/sidebar-wrapper:px-1.5 group-data-[sidebar-open=false]/sidebar-wrapper:pt-2 pb-3",
        className,
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
        "flex w-full shrink-0 flex-col gap-2 border-t border-sidebar-divider p-3 transition-[padding,border-color] duration-150 ease-out group-data-[sidebar-open=true]/sidebar-wrapper:duration-180 group-data-[sidebar-open=true]/sidebar-wrapper:ease-[cubic-bezier(0.22,1,0.36,1)]",
        "group-data-[sidebar-open=false]/sidebar-wrapper:gap-1 group-data-[sidebar-open=false]/sidebar-wrapper:border-t-transparent group-data-[sidebar-open=false]/sidebar-wrapper:px-1.5 group-data-[sidebar-open=false]/sidebar-wrapper:pb-2 group-data-[sidebar-open=false]/sidebar-wrapper:pt-0",
        className,
      )}
      {...props}
    />
  );
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  const { open } = useSidebar();

  return (
    <div
      data-slot="sidebar-group"
      className={cn(
        "relative flex w-full min-w-0 flex-col",
        open ? "gap-2 not-first:pt-2" : "gap-1",
        className,
      )}
      {...props}
    />
  );
}

function SidebarGroupLabel({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-label"
      className={cn(
        "flex h-7 shrink-0 items-center px-3 pt-4 pb-1 text-[0.65rem] font-medium uppercase tracking-[0.14em] text-sidebar-muted-foreground transition-[height,opacity,margin,padding] duration-150 ease-out group-data-[sidebar-open=true]/sidebar-wrapper:duration-180 group-data-[sidebar-open=true]/sidebar-wrapper:ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[sidebar-open=false]/sidebar-wrapper:pointer-events-none group-data-[sidebar-open=false]/sidebar-wrapper:h-0 group-data-[sidebar-open=false]/sidebar-wrapper:overflow-hidden group-data-[sidebar-open=false]/sidebar-wrapper:opacity-0 group-data-[sidebar-open=false]/sidebar-wrapper:p-0",
        className,
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
  const { open, isMobile } = useSidebar();
  const Comp = asChild ? Slot.Root : "button";

  const button = (
    <Comp
      data-slot="sidebar-menu-button"
      data-active={isActive}
      className={cn(
        "flex items-center overflow-hidden rounded-full text-left text-sm font-medium text-sidebar-foreground outline-none transition-[background-color,box-shadow,transform,color,padding,gap,width,height,justify-content] duration-150 ease-out group-data-[sidebar-open=true]/sidebar-wrapper:duration-180 group-data-[sidebar-open=true]/sidebar-wrapper:ease-[cubic-bezier(0.22,1,0.36,1)]",
        /* Selection is a lighter glass lens pill — not a solid teal slab (no glass-on-glass). */
        "hover:bg-sidebar-hover hover:shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.5)]",
        "focus-visible:ring-2 focus-visible:ring-[rgb(255_255_255_/_0.65)]",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:shadow-none data-[active=true]:ring-0",
        "[&>span:last-child]:truncate [&>svg]:shrink-0 [&>svg]:opacity-80 data-[active=true]:[&>svg]:opacity-100",
        open
          ? "h-10 w-full gap-3 px-3 [&>svg]:size-4"
          : cn(
              "mx-auto shrink-0 justify-center gap-0 px-0 [&>span]:sr-only",
              isActive
                ? "h-14 w-10 [&>svg]:size-5"
                : "h-12 w-10 [&>svg]:size-4",
            ),
        className,
      )}
      {...(asChild ? {} : { type: "button" as const })}
      {...props}
    />
  );

  if (!tooltip || open || isMobile) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right" align="center" sideOffset={10}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

/** Scroll canvas that carries page content, flush with the sidebar. */
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
        "relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-transparent",
        className,
      )}
      {...props}
    >
      <main
        data-slot="main-content-canvas"
        className={cn(
          "h-full min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-background pt-[72px]",
          contentClassName,
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
  useSidebar,
};
