import { Button } from "./ui/button";
import { useLocation, useNavigate } from "react-router-dom";
import { GenshinApi } from "@/data/dataapi";
import { types } from "../../wailsjs/go/models";
import {
  BananaIcon,
  GlobeIcon,
  LibraryIcon,
  LucideIcon,
  Moon,
  RefreshCwIcon,
  SearchIcon,
  SettingsIcon,
  SparkleIcon,
  Sun,
  TrainIcon,
  TrashIcon,
  WavesIcon,
} from "lucide-react";
import { useTheme } from "./theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

interface AppSidebarProps {
  refreshPlaylist: () => void;
  onDeletePlaylist: (id: number) => void;
  playlists: types.PlaylistWithModsAndTags[];
}

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
            open ? "opacity-100" : "opacity-0",
            "fade-in fade-out transition-all duration-350 ease-in-out",
            "text-md line-clamp-1 overflow-ellipsis"
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
];

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

export function AppSidebar({
  playlists,
  onDeletePlaylist,
  refreshPlaylist,
}: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const enablePlaylist = usePlaylistStore((state) => state.enable);
  const { open } = useSidebar();

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
    } catch {}
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
          "fade-in fade-out transition-all duration-350 ease-in-out",
          "text-md line-clamp-1 overflow-ellipsis"
        )}
      >
        <div className="flex flex-row justify-between items-baseline w-full">
          <SidebarGroupLabel>Playlists</SidebarGroupLabel>
          <Button
            onPointerDown={refreshPlaylist}
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
                  className="w-full justify-start font-normal overflow-clip max-w-[3/4]"
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
                <Button
                  onPointerDown={() => onDeletePlaylist(playlist.playlist.id)}
                  variant={"ghost"}
                  size={"icon"}
                >
                  <TrashIcon></TrashIcon>
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </SidebarFooter>
    </Sidebar>
  );
}
