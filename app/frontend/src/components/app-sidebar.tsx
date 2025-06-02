import { Button } from "./ui/button";
import { useLocation } from "react-router-dom";
import { GenshinApi } from "@/data/dataapi";
import { types } from "../../wailsjs/go/models";
import {
  BananaIcon,
  CheckCheckIcon,
  GlobeIcon,
  LibraryIcon,
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
import { ThemeKeys, useTheme } from "./theme-provider";
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
        className="w-full h-full"
      >
        <props.icon />
        <text
          className={cn(
            open ? "fade-in" : "fade-out",
            "text-md line-clamp-1"
          )}
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
  const { setThemeKey, themeKey } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full h-full justify-start">
        <SidebarItem name="Change Color Scheme" icon={PaletteIcon} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {ThemeKeys.map((key) => {
          return (
            <DropdownMenuItem className={cn(key === themeKey ? "bg-primary" : "")} onClick={() => setThemeKey(key)}>
              {key}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


function ModeToggle() {
  const { setTheme, isDark } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full h-full justify-start">
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

export function PlaylistOptionsDropDown(
  { playlist }: {
    playlist: types.Playlist
  }
) {

  const [isOpen, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const enablePlaylist = usePlaylistStore((state) => state.enable);
  const deletePlaylist = usePlaylistStore((state) => state.delete);
  const renamePlaylist = usePlaylistStore((state) => state.renamePlaylist);


  return (
    <Dialog open={dialogOpen} onOpenChange={(open) => {
      if (open) {
        setOpen(false)
      }
      setDialogOpen(open)
    }}>
      <NameDialogContent
        title="rename playlist"
        description={`renames the playlist from ${playlist.name} to provided value`}
        onSuccess={(name) => renamePlaylist(playlist, name)}
      />
      <DropdownMenu open={isOpen} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button className="col-span-1" variant={"ghost"} size="icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
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
          <DropdownMenuItem onClick={() => enablePlaylist(playlist.game, playlist.id)}>
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
    useShallow((state) => Object.values(state.playlists).flatMap((it) => it))
  );
  const refreshAllPlaylists = usePlaylistStore((state) => state.init);
  const enablePlaylist = usePlaylistStore(state => state.enable)

  const navigateToLastDiscoverCat = async () => {
    try {
      const defaultPath = await GenshinApi.skinId();
      if (await discoverGamePref.IsSet()) {
        const path = (await discoverGamePref.Get()).ifEmpty(
          () => `cats/${defaultPath}`
        );
        navigate(`/mods/${path}`);
      } else {
        navigate(`/mods/cats/${defaultPath}`);
      }
    } catch { }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem className="w-full flex flex-row justify-between py-4">
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
          "text-md line-clamp-1 text-ellipsis"
        )}
      >
        <div className="flex flex-row justify-between items-baseline w-full">
          <SidebarGroupLabel>Playlists</SidebarGroupLabel>
          <Button
            onPointerDown={refreshAllPlaylists}
            size={"icon"}
            variant={"ghost"}
          >
            <RefreshCwIcon className="h-4" />
          </Button>
        </div>
        <Card className="max-h-[calc(30vh)] py-2 overflow-y-auto overflow-x-clip">
          <div className="space-y-1 p-2 flex flex-col">
            {playlists.map((playlist, i) => (
              <div className="flex flex-row">
                <Button
                  key={`${playlist}-${i}`}
                  variant="ghost"
                  className="w-full justify-start font-normal overflow-clip max-w-3/4"
                  onClick={() =>
                    enablePlaylist(playlist.playlist.game, playlist.playlist.id)
                  }
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2 h-4 w-4"
                  >
                    <path d="M21 15V6" />
                    <path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                    <path d="M12 12H3" />
                    <path d="M16 6H3" />
                    <path d="M12 18H3" />
                  </svg>
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
