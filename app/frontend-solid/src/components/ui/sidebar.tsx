import type {
  Accessor,
  ComponentProps,
  JSX,
  Setter,
  ValidComponent,
} from "solid-js";
import {
  Match,
  Show,
  Switch,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  mergeProps,
  onCleanup,
  splitProps,
  useContext,
} from "solid-js";
import type { ElementOf } from "@kobalte/core";
import { Polymorphic } from "@kobalte/core";
import { Badge } from "@kobalte/core/badge";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { combineStyle } from "@solid-primitives/props";
import type { VariantProps } from "cva";

import { useIsMobile } from "@/hooks/use-mobile";
import { callHandler } from "@/libs/utils";
import { cva, cx } from "@/libs/utils";

import { Button } from "./button";
import { Drawer, DrawerContent } from "./drawer";
import { Separator } from "./separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";
import { Skeleton } from "./skeleton";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

interface SidebarContextProps {
  state: Accessor<"expanded" | "collapsed">;
  open: Accessor<boolean>;
  setOpen: Setter<boolean>;
  openMobile: Accessor<boolean>;
  setOpenMobile: Setter<boolean>;
  isMobile: Accessor<boolean>;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextProps | null>(null);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }

  return context;
};

export type SidebarProviderProps = ComponentProps<"div"> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export const SidebarProvider = (props: SidebarProviderProps) => {
  const merge = mergeProps<SidebarProviderProps[]>(
    {
      defaultOpen: true,
    },
    props
  );
  const [local, rest] = splitProps(merge, [
    "defaultOpen",
    "open",
    "onOpenChange",
    "class",
    "style",
    "children",
  ]);

  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = createSignal(false);

  // This is the internal state of the sidebar.
  // We use openProp and setOpenProp for control from outside the component.
  const [_open, _setOpen] = createSignal(local.defaultOpen);
  const open = createMemo(() => local.open ?? _open()!);
  const setOpen = (value: boolean | ((value: boolean) => boolean)) => {
    const openState = typeof value === "function" ? value(open()) : value;
    if (local.onOpenChange) {
      local.onOpenChange(openState);
    } else {
      _setOpen(openState);
    }

    // This sets the cookie to keep the sidebar state.
    document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
  };

  // Helper to toggle the sidebar.
  const toggleSidebar = () => {
    if (isMobile()) {
      setOpenMobile((prev) => !prev);
    } else {
      setOpen((prev) => !prev);
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (
      event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
      (event.metaKey || event.ctrlKey)
    ) {
      event.preventDefault();
      toggleSidebar();
    }
  };

  createEffect(() => {
    window.addEventListener("keydown", handleKeyDown);

    onCleanup(() => {
      window.removeEventListener("keydown", handleKeyDown);
    });
  });

  const state = createMemo(() => (open() ? "expanded" : "collapsed"));

  const contextValue: SidebarContextProps = {
    state,
    open,
    setOpen,
    isMobile,
    openMobile,
    setOpenMobile,
    toggleSidebar,
  };

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        data-slot="sidebar-wrapper"
        style={combineStyle(
          {
            "--sidebar-width": SIDEBAR_WIDTH,
            "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
          },
          local.style
        )}
        class={cx(
          "group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full",
          local.class
        )}
        {...rest}
      >
        {local.children}
      </div>
    </SidebarContext.Provider>
  );
};

export type SidebarProps = ComponentProps<"div"> & {
  side?: "left" | "right";
  variant?: "sidebar" | "floating" | "inset";
  collapsible?: "offcanvas" | "icon" | "none";
};

export const Sidebar = (props: SidebarProps) => {
  const merge = mergeProps<SidebarProps[]>(
    {
      side: "left",
      variant: "sidebar",
      collapsible: "offcanvas",
    },
    props
  );
  const [local, rest] = splitProps(merge, [
    "side",
    "variant",
    "collapsible",
    "class",
    "children",
  ]);

  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

  return (
    <Switch
      fallback={
        <div
          class="text-sidebar-foreground group peer hidden md:block"
          data-state={state()}
          data-collapsible={state() === "collapsed" ? local.collapsible : ""}
          data-variant={local.variant}
          data-side={local.side}
          data-slot="sidebar"
        >
          {/* This is what handles the sidebar gap on desktop */}
          <div
            data-slot="sidebar-gap"
            class={cx(
              "w-(--sidebar-width) relative bg-transparent transition-[width] duration-200 ease-linear",
              "group-data-[collapsible=offcanvas]:w-0",
              "group-data-[side=right]:rotate-180",
              local.variant === "floating" || local.variant === "inset"
                ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]"
                : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)"
            )}
          />
          <div
            data-slot="sidebar-container"
            class={cx(
              "w-(--sidebar-width) fixed inset-y-0 z-10 hidden h-svh transition-[left,right,width] duration-200 ease-linear md:flex",
              local.side === "left"
                ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
                : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
              // Adjust the padding for floating and inset variants.
              local.variant === "floating" || local.variant === "inset"
                ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]"
                : "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l",
              local.class
            )}
            {...rest}
          >
            <div
              data-sidebar="sidebar"
              data-slot="sidebar-inner"
              class="bg-sidebar group-data-[variant=floating]:border-sidebar-border flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:shadow-sm"
            >
              {local.children}
            </div>
          </div>
        </div>
      }
    >
      <Match when={local.collapsible === "none"}>
        <div
          data-slot="sidebar"
          class={cx(
            "bg-sidebar text-sidebar-foreground w-(--sidebar-width) flex h-full flex-col",
            local.class
          )}
          {...rest}
        >
          {local.children}
        </div>
      </Match>
      <Match when={isMobile()}>
        <Drawer
          open={openMobile()}
          onOpenChange={setOpenMobile}
          side={local.side}
        >
          <DrawerContent
            data-sidebar="sidebar"
            data-slot="sidebar"
            data-mobile="true"
            class="bg-sidebar text-sidebar-foreground w-(--sidebar-width) p-0 [&>button]:hidden"
            style={{
              "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
            }}
          >
            <div class="flex h-full w-full flex-col">{local.children}</div>
          </DrawerContent>
        </Drawer>
      </Match>
    </Switch>
  );
};

export type SidebarTriggerProps<T extends ValidComponent = "button"> =
  ComponentProps<typeof Button<T>>;

export const SidebarTrigger = <T extends ValidComponent = "button">(
  props: SidebarTriggerProps<T>
) => {
  const [local, rest] = splitProps(props as SidebarTriggerProps, [
    "class",
    "onClick",
  ]);
  const { toggleSidebar, open } = useSidebar();

  const handleOnclick: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent> = (
    event
  ) => {
    callHandler(event, local.onClick);
    toggleSidebar();
  };

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      class={cx("size-7", local.class)}
      onClick={handleOnclick}
      {...rest}
    >
      <Show
        when={!open()}
        fallback={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="size-4"
            viewBox="0 0 24 24"
          >
            <g
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M9 3v18m7-6l-3-3l3-3" />
            </g>
          </svg>
        }
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="size-4"
          viewBox="0 0 24 24"
        >
          <g
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M9 3v18m5-12l3 3l-3 3" />
          </g>
        </svg>
      </Show>
    </Button>
  );
};

export type SidebarRailProps = ComponentProps<"button">;

export const SidebarRail = (props: SidebarRailProps) => {
  const { toggleSidebar } = useSidebar();
  const [local, rest] = splitProps(props, ["class", "onClick"]);

  return (
    <button
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle Sidebar"
      class={cx(
        "hover:after:bg-sidebar-border absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex",
        "in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize",
        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
        "hover:group-data-[collapsible=offcanvas]:bg-sidebar group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full",
        "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
        "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
        local.class
      )}
      {...rest}
    />
  );
};

export type SidebarInsetProps = ComponentProps<"main">;

export const SidebarInset = (props: SidebarInsetProps) => {
  const [local, rest] = splitProps(props, ["class"]);

  return (
    <main
      data-slot="sidebar-inset"
      class={cx(
        "bg-background relative flex w-full flex-1 flex-col",
        "md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm",
        local.class
      )}
      {...rest}
    />
  );
};

export type SidebarHeaderProps = ComponentProps<"div">;

export const SidebarHeader = (props: SidebarHeaderProps) => {
  const [local, rest] = splitProps(props, ["class"]);

  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      class={cx("flex flex-col gap-2 p-2", local.class)}
      {...rest}
    />
  );
};

export type SidebarFooterProps = ComponentProps<"div">;

export const SidebarFooter = (props: SidebarFooterProps) => {
  const [local, rest] = splitProps(props, ["class"]);

  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      class={cx("flex flex-col gap-2 p-2", local.class)}
      {...rest}
    />
  );
};

export type SidebarSeparatorProps<T extends ValidComponent = "hr"> =
  ComponentProps<typeof Separator<T>>;

export const SidebarSeparator = (props: SidebarSeparatorProps) => {
  const [local, rest] = splitProps(props, ["class"]);

  return (
    <Separator
      data-slot="sidebar-separator"
      data-sidebar="header"
      class={cx("flex flex-col gap-2 p-2", local.class)}
      {...rest}
    />
  );
};

export type SidebarContentProps = ComponentProps<"div">;

export const SidebarContent = (props: SidebarContentProps) => {
  const [local, rest] = splitProps(props, ["class"]);

  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      class={cx(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
        local.class
      )}
      {...rest}
    />
  );
};

export type SidebarGroupProps = ComponentProps<"div">;

export const SidebarGroup = (props: SidebarGroupProps) => {
  const [local, rest] = splitProps(props, ["class"]);

  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      class={cx("relative flex w-full min-w-0 flex-col p-2", local.class)}
      {...rest}
    />
  );
};

export interface SidebarGroupLabelCommonProps<
  _T extends HTMLElement = HTMLElement
> {
  class?: string;
}

export type SidebarGroupLabelProps<
  T extends ValidComponent | HTMLElement = HTMLElement
> = Partial<SidebarGroupLabelCommonProps<ElementOf<T>>>;

export const SidebarGroupLabel = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, SidebarGroupLabelProps<T>>
) => {
  const merge = mergeProps(
    {
      as: "div",
    } as PolymorphicProps<T, SidebarGroupLabelProps<T>>,
    props
  );
  const [local, rest] = splitProps(merge, ["as", "class"]);

  return (
    <Polymorphic
      as={local.as}
      data-slot="sidebar-group-label"
      data-sidebar="group-label"
      class={cx(
        "text-sidebar-foreground/70 ring-sidebar-ring outline-hidden flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
        local.class
      )}
      {...rest}
    />
  );
};

export interface SidebarGroupActionCommonProps<
  _T extends HTMLElement = HTMLElement
> {
  class?: string;
}

export type SidebarGroupActionProps<
  T extends ValidComponent | HTMLElement = HTMLElement
> = Partial<SidebarGroupActionCommonProps<ElementOf<T>>>;

export const SidebarGroupAction = <T extends ValidComponent = "button">(
  props: PolymorphicProps<T, SidebarGroupActionProps<T>>
) => {
  const merge = mergeProps(
    {
      as: "button",
    } as PolymorphicProps<T, SidebarGroupActionProps<T>>,
    props
  );
  const [local, rest] = splitProps(merge, ["as", "class"]);

  return (
    <Polymorphic
      as={local.as}
      data-slot="sidebar-group-action"
      data-sidebar="group-action"
      class={cx(
        "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground outline-hidden absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 md:after:hidden",
        "group-data-[collapsible=icon]:hidden",
        local.class
      )}
      {...rest}
    />
  );
};

export type SidebarGroupContentProps = ComponentProps<"div">;

export const SidebarGroupContent = (props: SidebarGroupContentProps) => {
  const [local, rest] = splitProps(props, ["class"]);

  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      class={cx("w-full text-sm", local.class)}
      {...rest}
    />
  );
};

export type SidebarMenuProps = ComponentProps<"ul">;

export const SidebarMenu = (props: SidebarMenuProps) => {
  const [local, rest] = splitProps(props, ["class"]);

  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      class={cx("flex w-full min-w-0 flex-col gap-1", local.class)}
      {...rest}
    />
  );
};

export type SidebarMenuItemProps = ComponentProps<"li">;

export const SidebarMenuItem = (props: SidebarMenuItemProps) => {
  const [local, rest] = splitProps(props, ["class"]);

  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      class={cx("group/menu-item relative", local.class)}
      {...rest}
    />
  );
};

export const SidebarMenuButtonVariants = cva({
  base: "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
  variants: {
    variant: {
      default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      outline:
        "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
    },
    size: {
      default: "h-8 text-sm",
      sm: "h-7 text-xs",
      lg: "h-12 text-sm group-data-[collapsible=icon]:p-0!",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export type SidebarMenuButtonOptions = VariantProps<
  typeof SidebarMenuButtonVariants
> & {
  isActive?: boolean;
  tooltip?: Accessor<string | ComponentProps<typeof TooltipContent>>;
};

export interface SidebarMenuButtonCommonProps<
  _T extends HTMLElement = HTMLElement
> {
  class?: string;
}

export type SidebarMenuButtonProps<T extends ValidComponent = "button"> =
  SidebarMenuButtonOptions &
    Partial<SidebarMenuButtonCommonProps<ElementOf<T>>>;

export const SidebarMenuButton = <T extends ValidComponent = "button">(
  props: PolymorphicProps<T, SidebarMenuButtonProps<T>>
) => {
  const merge = mergeProps(
    {
      as: "button",
      isActive: false,
    } as PolymorphicProps<T, SidebarMenuButtonProps<T>>,
    props
  );
  const [local, rest] = splitProps(merge, [
    "as",
    "class",
    "isActive",
    "size",
    "variant",
    "tooltip",
  ]);
  const { isMobile, state } = useSidebar();

  return (
    <Show
      when={!local.tooltip || state() === "collapsed"}
      fallback={
        <Tooltip placement="right" openDelay={0} closeDelay={0}>
          <TooltipTrigger
            as={local.as}
            data-slot="sidebar-menu-button"
            data-sidebar="menu-button"
            data-size={local.size}
            data-active={local.isActive}
            class={SidebarMenuButtonVariants({
              size: local.size,
              variant: local.variant,
              class: local.class,
            })}
            {...rest}
          />
          <TooltipContent
            hidden={state() !== "collapsed" || isMobile()}
            {...(typeof local.tooltip === "string"
              ? { children: local.tooltip }
              : local.tooltip)}
          />
        </Tooltip>
      }
    >
      <Polymorphic
        as={local.as}
        data-slot="sidebar-menu-button"
        data-sidebar="menu-button"
        data-size={local.size}
        data-active={local.isActive}
        class={SidebarMenuButtonVariants({
          size: local.size,
          variant: local.variant,
          class: local.class,
        })}
        {...rest}
      />
    </Show>
  );
};

export interface SidebarMenuActionOptions {
  showOnHover?: boolean;
}

export interface SidebarMenuActionCommonProps<
  _T extends HTMLElement = HTMLElement
> {
  class?: string;
}

export type SidebarMenuActionProps<T extends ValidComponent = "button"> =
  SidebarMenuActionOptions &
    Partial<SidebarMenuActionCommonProps<ElementOf<T>>>;

export const SidebarMenuAction = <T extends ValidComponent = "button">(
  props: PolymorphicProps<T, SidebarMenuActionProps<T>>
) => {
  const merge = mergeProps(
    {
      as: "button",
      showOnHover: false,
    } as PolymorphicProps<T, SidebarMenuActionProps<T>>,
    props
  );
  const [local, rest] = splitProps(merge, ["as", "class", "showOnHover"]);

  return (
    <Polymorphic
      as={local.as}
      data-slot="sidebar-menu-action"
      data-sidebar="menu-action"
      class={cx(
        "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground peer-hover/menu-button:text-sidebar-accent-foreground outline-hidden absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 md:after:hidden",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        local.showOnHover &&
          "peer-data-[active=true]/menu-button:text-sidebar-accent-foreground group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 md:opacity-0",
        local.class
      )}
      {...rest}
    />
  );
};

export type SidebarMenuBadgeProps<T extends ValidComponent = "span"> =
  ComponentProps<typeof Badge<T>>;

export const SidebarMenuBadge = <T extends ValidComponent = "span">(
  props: SidebarMenuBadgeProps<T>
) => {
  const [local, rest] = splitProps(props, ["class"]);

  return (
    <Badge
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      class={cx(
        "text-sidebar-foreground pointer-events-none absolute right-1 flex h-5 min-w-5 select-none items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums",
        "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        local.class
      )}
      {...rest}
    />
  );
};

export type SidebarMenuSkeletonProps = ComponentProps<"div"> & {
  showIcon?: boolean;
};

export const SidebarMenuSkeleton = (props: SidebarMenuSkeletonProps) => {
  const merge = mergeProps(
    {
      showIcon: false,
    } as SidebarMenuSkeletonProps,
    props
  );
  const [local, rest] = splitProps(merge, ["class", "showIcon"]);

  const width = createMemo(() => `${Math.floor(Math.random() * 40) + 50}%`);

  return (
    <div
      data-slot="sidebar-menu-skeleton"
      data-sidebar="menu-skeleton"
      class={cx("flex h-8 items-center gap-2 rounded-md px-2", local.class)}
      {...rest}
    >
      <Show when={local.showIcon}>
        <Skeleton class="size-4 rounded-md" data-sidebar="menu-skeleton-icon" />
      </Show>
      <Skeleton
        class="max-w-(--skeleton-width) h-4 flex-1"
        data-sidebar="menu-skeleton-text"
        style={{
          "--skeleton-width": width(),
        }}
      />
    </div>
  );
};

export type SidebarMenuSub = ComponentProps<"ul">;

export const SidebarMenuSub = (props: SidebarMenuSub) => {
  const [local, rest] = splitProps(props, ["class"]);

  return (
    <ul
      data-slot="sidebar-menu-sub"
      data-sidebar="menu-sub"
      class={cx(
        "border-sidebar-border mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5",
        "group-data-[collapsible=icon]:hidden",
        local.class
      )}
      {...rest}
    />
  );
};

export type SidebarMenuSubItem = ComponentProps<"li">;

export const SidebarMenuSubItem = (props: SidebarMenuSubItem) => {
  const [local, rest] = splitProps(props, ["class"]);

  return (
    <li
      data-slot="sidebar-menu-sub-item"
      data-sidebar="menu-sub-item"
      class={cx("group/menu-sub-item relative", local.class)}
      {...rest}
    />
  );
};

export interface SidebarMenuSubButtonOptions {
  isActive?: boolean;
  size?: "sm" | "md";
}

export interface SidebarMenuSubButtonCommonProps<
  _T extends HTMLElement = HTMLElement
> {
  class?: string;
}

export type SidebarMenuSubButtonProps<T extends ValidComponent = "a"> =
  SidebarMenuSubButtonOptions &
    Partial<SidebarMenuSubButtonCommonProps<ElementOf<T>>>;

export const SidebarMenuSubButton = <T extends ValidComponent = "a">(
  props: PolymorphicProps<T, SidebarMenuSubButtonProps<T>>
) => {
  const merge = mergeProps(
    {
      as: "a",
      isActive: false,
      size: "md",
    } as PolymorphicProps<T, SidebarMenuSubButtonProps<T>>,
    props
  );
  const [local, rest] = splitProps(merge, ["as", "class", "isActive", "size"]);

  return (
    <Polymorphic
      as={local.as}
      data-slot="sidebar-menu-sub-button"
      data-sidebar="menu-sub-button"
      data-size={local.size}
      data-active={local.isActive}
      class={cx(
        "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground [&>svg]:text-sidebar-accent-foreground outline-hidden flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
        local.size === "sm" && "text-xs",
        local.size === "md" && "text-sm",
        "group-data-[collapsible=icon]:hidden",
        local.class
      )}
      {...rest}
    />
  );
};
