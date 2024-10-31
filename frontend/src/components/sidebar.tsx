import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { useLocation, useNavigate } from "react-router-dom";
import { GenshinApi } from "@/data/dataapi";
import { types } from "../../wailsjs/go/models";
import {
  BananaIcon,
  GlobeIcon,
  LibraryIcon,
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
import { ReactNode } from "react";
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

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  refreshPlaylist: () => void;
  onDeletePlaylist: (id: number) => void;
  playlists: types.PlaylistWithModsAndTags[];
}

function SidebarItem(props: {
  name: string;
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Button
        variant={props.selected ? "secondary" : "ghost"}
        className="w-full justify-start"
        onClick={props.onClick}
      >
        <div className="stroke-2 fill-none me-4">{props.children}</div>
        {props.name}
      </Button>
    </div>
  );
}

const games = [
  { game: "Genshin Impact", path: "genshin", icon: <SparkleIcon/> },
  { game: "Honkai Star Rail", path: "starrail", icon: <TrainIcon/> },
  { game: "Zenless Zone Zero", path: "zenless", icon: <GlobeIcon/> },
  { game: "Wuthering Waves", path: "wuwa", icon: <WavesIcon/> },
];

function ModeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full h-full justify-start">
        <SidebarItem name={"Toggle theme"} selected={false} onClick={() => {}}>
          {
            <div className="justify-center h-full w-full">
              <Sun className="absolute rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </div>
          }
        </SidebarItem>
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

export function Sidebar({ className, playlists, onDeletePlaylist, refreshPlaylist }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const enablePlaylist = usePlaylistStore((state) => state.enable)

  const navigateToLastDiscoverCat = async () => {
    const defaultPath = await GenshinApi.skinId()
    if (await discoverGamePref.IsSet()) {
      const path = (await discoverGamePref.Get()).ifEmpty(() => `cats/${defaultPath}`)
      navigate(`/mods/${path}`);
    } else {
      navigate(`/mods/cats/${defaultPath}`);
    }
  };

  return (
    <div className={cn("pb-12", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            App
          </h2>
          <ModeToggle />
          <SidebarItem
            onClick={() => navigate("settings")}
            name="Settings"
            selected={location.pathname.includes("settings")}
          >
            {<SettingsIcon />}
          </SidebarItem>
          <SidebarItem
            onClick={() => navigate("search")}
            name="Search"
            selected={location.pathname.includes("search")}
          >
            {<SearchIcon />}
          </SidebarItem>
        </div>
      </div>

      <div className="px-3 py-2">
        <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
          Discover
        </h2>
        <SidebarItem
          onClick={navigateToLastDiscoverCat}
          name="Game Bannana"
          selected={location.pathname.includes("mods")}
        >
          {<BananaIcon />}
        </SidebarItem>
      </div>

      <div className="px-3 py-2">
        <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
          Library
        </h2>
        <SidebarItem
          onClick={() => navigate("/playlist")}
          name="Playlists"
          selected={location.pathname === "/playlist"}
        >
          {<LibraryIcon />}
        </SidebarItem>
        {games.map(({ game, path, icon }) => {
          return (
            <SidebarItem
              name={game}
              onClick={() => navigate(path)}
              selected={location.pathname.includes(path)}
            >
              {icon}
            </SidebarItem>
          );
        })}
      </div>

      <div className="px-3 py-2">
      <div className="flex flex-row justify-between items-baseline w-full">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Playlists
          </h2>
          <Button onPointerDown={refreshPlaylist} size={"icon"} variant={"ghost"}>
            <RefreshCwIcon className="h-4"/>
          </Button>
        </div>
        <Card className="max-h-[calc(30vh)] overflow-y-auto">
            <div className="space-y-1 p-2 flex flex-col">
              {playlists.map((playlist, i) => (
                <div className="flex flex-row">
                  <Button
                    key={`${playlist}-${i}`}
                    variant="ghost"
                    className="w-full justify-start font-normal"
                    onClick={() => enablePlaylist(playlist.playlist.game, playlist.playlist.id)}
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
                  <Button onPointerDown={() => onDeletePlaylist(playlist.playlist.id)} variant={"ghost"} size={"icon"}>
                    <TrashIcon></TrashIcon>
                  </Button>
                </div>
              ))}
            </div>
        </Card>
      </div>
    </div>
  );
}
