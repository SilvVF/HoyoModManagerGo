import { Button } from "./ui/button";
import { useLocation } from "react-router-dom";
import { GenshinApi } from "@/data/dataapi";
import { types } from "../../wailsjs/go/models";
import {
  BananaIcon,
  CheckCheckIcon,
  EllipsisVertical,
  GlobeIcon,
  LibraryIcon,
  ListMusic,
  LucideIcon,
  Moon,
  PaletteIcon,
  PencilIcon,
  RefreshCwIcon,
  SearchIcon,
  SettingsIcon,
  SparkleIcon,
  Sun,
  TrainIcon,
  Trash,
  WavesIcon,
} from "lucide-react";
import { Schemes, useTheme } from "./theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Card } from "./ui/card";
import { discoverGamePref } from "@/data/prefs";
import { usePlaylistStore } from "@/state/playlistStore";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "./ui/sidebar";
import { cn } from "@/lib/utils";
import useTransitionNavigate from "@/hooks/useCrossfadeNavigate";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { useState } from "react";
import { Dialog } from "./ui/dialog";
import { NameDialogContent } from "./NameDialog";
import { useShallow } from "zustand/react/shallow";

function SidebarItem(props: {
  name: string;
  icon: LucideIcon;
  onClick?: () => void;
  selected?: boolean;
}) {
  const { open } = useSidebar();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        variant={props.selected ? "outline" : "default"}
        onClick={props.onClick}
        className="h-full w-full"
      >
        <props.icon />
        <text
          className={cn(open ? "fade-in" : "fade-out", "text-md line-clamp-1")}
        >
          {props.name}
        </text>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

const games = [
  { game: "Genshin Impact", path: "genshin", icon: SparkleIcon },
  { game: "Honkai Star Rail", path: "starrail", icon: TrainIcon },
  { game: "Zenless Zone Zero", path: "zenless", icon: GlobeIcon },
  { game: "Wuthering Waves", path: "wuwa", icon: WavesIcon },
  //  { game: "League of Legends", path: "league", icon: SwordIcon },
];

function ThemeKeyToggle() {
  const { setScheme, scheme, setPreview, clearPreview } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="h-full w-full justify-start">
        <SidebarItem name="Change Color Scheme" icon={PaletteIcon} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Schemes.map((key) => {
          return (
            <DropdownMenuItem
              onFocus={() => setPreview(key)}
              onBlur={() => clearPreview(key)}
              onMouseEnter={() => setPreview(key)}
              onMouseLeave={() => clearPreview(key)}
              key={key}
              className={cn(key === scheme ? "bg-primary" : "")}
              onClick={() => setScheme(key)}
            >
              {key}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ModeToggle() {
  const { setTheme, isDark } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="h-full w-full justify-start">
        <SidebarItem name="Toggle Theme" icon={isDark ? Moon : Sun} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PlaylistOptionsDropDown({
  playlist,
}: {
  playlist: types.Playlist;
}) {
  const [isOpen, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const enablePlaylist = usePlaylistStore((state) => state.enable);
  const deletePlaylist = usePlaylistStore((state) => state.delete);
  const renamePlaylist = usePlaylistStore((state) => state.renamePlaylist);

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(open) => {
        if (open) {
          setOpen(false);
        }
        setDialogOpen(open);
      }}
    >
      <NameDialogContent
        title="rename playlist"
        description={`renames the playlist from ${playlist.name} to provided value`}
        onSuccess={(name) => renamePlaylist(playlist, name)}
      />
      <DropdownMenu open={isOpen} onOpenChange={setOpen}>
        <DropdownMenuTrigger>
          <Button className="col-span-1" variant={"ghost"} size="icon">
            <EllipsisVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => deletePlaylist(playlist.id)}>
            <Trash className="mr-2 h-4 w-4" />
            <span className="w-full">Delete</span>
            <DropdownMenuShortcut>⇧d</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DialogTrigger
            onPointerDown={() => {
              setOpen(false);
              setDialogOpen(true);
            }}
          >
            <DropdownMenuItem>
              <PencilIcon className="mr-2 h-4 w-4" />
              <span className="w-full">Rename</span>
              <DropdownMenuShortcut>⇧r</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DialogTrigger>
          <DropdownMenuItem
            onClick={() => enablePlaylist(playlist.game, playlist.id)}
          >
            <CheckCheckIcon className="mr-2 h-4 w-4" />
            <span className="w-full">Toggle</span>
            <DropdownMenuShortcut>⇧t</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Dialog>
  );
}

export function AppSidebar() {
  const location = useLocation();
  const navigate = useTransitionNavigate();
  const { open } = useSidebar();

  const playlists = usePlaylistStore(
    useShallow((state) => Object.values(state.playlists).flatMap((it) => it)),
  );
  const refreshAllPlaylists = usePlaylistStore((state) => state.init);
  const enablePlaylist = usePlaylistStore((state) => state.enable);

  const navigateToLastDiscoverCat = async () => {
    try {
      const defaultPath = await GenshinApi.skinId();
      if (await discoverGamePref.IsSet()) {
        const path = (await discoverGamePref.Get()).ifEmpty(
          () => `cats/${defaultPath}`,
        );
        navigate(`/mods/${path}`);
      } else {
        navigate(`/mods/cats/${defaultPath}`);
      }
    } catch {}
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem className="flex w-full flex-row justify-between py-4">
              {open ? (
                <SidebarGroupLabel className="text-md font-semibold tracking-tight text-foreground">
                  App
                </SidebarGroupLabel>
              ) : undefined}
              <SidebarTrigger className={cn(open ? "" : "w-full")} />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <ModeToggle />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <ThemeKeyToggle />
            </SidebarMenuItem>
            <SidebarItem
              onClick={() => navigate("settings")}
              name="Settings"
              selected={location.pathname.includes("settings")}
              icon={SettingsIcon}
            />
            <SidebarItem
              onClick={() => navigate("search")}
              name="Search"
              selected={location.pathname.includes("search")}
              icon={SearchIcon}
            />

            <SidebarGroupLabel className="text-md font-semibold tracking-tight text-foreground">
              Discover
            </SidebarGroupLabel>
            <SidebarItem
              onClick={navigateToLastDiscoverCat}
              name="Game Bannana"
              selected={location.pathname.includes("mods")}
              icon={BananaIcon}
            />
            <SidebarItem
              onClick={() => navigate("browser")}
              name="HSR Optimizer"
              selected={location.pathname.includes("browser")}
              icon={GlobeIcon}
            />
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="text-md font-semibold tracking-tight text-foreground">
            Library
          </SidebarGroupLabel>
          <SidebarMenu>
            <SidebarItem
              onClick={() => navigate("/playlist")}
              name="Playlists"
              selected={location.pathname === "/playlist"}
              icon={LibraryIcon}
            />
            {games.map(({ game, path, icon }) => {
              return (
                <SidebarItem
                  key={path}
                  name={game}
                  onClick={() => navigate(path)}
                  selected={location.pathname.includes(path)}
                  icon={icon}
                />
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter
        className={cn(
          open ? "opacity-100" : "opacity-0",
          "transition-all duration-300 ease-in-out",
          "animate-fade-in animate-fade-out",
          "text-md line-clamp-1 text-ellipsis",
        )}
      >
        <div className="flex w-full flex-row items-baseline justify-between">
          <SidebarGroupLabel>Playlists</SidebarGroupLabel>
          <Button
            onPointerDown={refreshAllPlaylists}
            size={"icon"}
            variant={"ghost"}
          >
            <RefreshCwIcon className="h-4" />
          </Button>
        </div>
        <Card className="max-h-[calc(30vh)] overflow-x-clip overflow-y-auto py-2">
          <div className="flex flex-col space-y-1 p-2">
            {playlists.map((playlist, i) => (
              <div className="flex flex-row">
                <Button
                  key={`${playlist}-${i}`}
                  variant="ghost"
                  className="w-full max-w-3/4 justify-start overflow-clip font-normal"
                  onClick={() =>
                    enablePlaylist(playlist.playlist.game, playlist.playlist.id)
                  }
                >
                  <ListMusic />
                  {playlist.playlist.name}
                </Button>
                <PlaylistOptionsDropDown playlist={playlist.playlist} />
              </div>
            ))}
          </div>
        </Card>
      </SidebarFooter>
    </Sidebar>
  );
}
