import { createSignal, For, Show } from "solid-js";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { GenshinApi } from "@/data/dataapi";
import { useLocation, useNavigate } from "@solidjs/router";
import {
  BananaIcon,
  CheckCheckIcon,
  EllipsisVertical,
  GlobeIcon,
  ListMusic,
  PencilIcon,
  RefreshCwIcon,
  SearchIcon,
  SettingsIcon,
  SparkleIcon,
  TrainIcon,
  Trash,
  WavesIcon,
} from "lucide-solid";
import { discoverGamePref } from "@/data/prefs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { types } from "wailsjs/go/models";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NameDialogContent } from "@/components/hmm/RenameDialog";
import { PlaylistState, usePlaylistStore } from "@/stores/usePlaylistStore";

const LibraryRoutes = {
  Genshin: {
    id: 1,
    path: "genshin",
    display: "Genshin Impact",
    icon: SparkleIcon,
  },
  StarRail: {
    id: 2,
    path: "starrail",
    display: "Honkai Star Rail",
    icon: TrainIcon,
  },
  ZZZ: {
    id: 3,
    path: "zenless",
    display: "Zenless Zone Zero",
    icon: GlobeIcon,
  },
  WuWa: {
    id: 4,
    path: "wuwa",
    display: "Wuthering Waves",
    icon: WavesIcon,
  },
} as const;

const ApplicationRoutes = {
  Settings: {
    display: "Settings",
    path: "settings",
    icon: SettingsIcon,
  },
  Search: {
    display: "Search",
    path: "search",
    icon: SearchIcon,
  },
} as const;

export default function HmmSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

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
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <For each={Object.values(ApplicationRoutes)}>
                {(item) => (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      variant={
                        location.pathname.endsWith(item.path)
                          ? "outline"
                          : "default"
                      }
                      class="w-full"
                      on:click={() => navigate(item.path)}
                    >
                      <item.icon />
                      <a href={item.path}>
                        <span>{item.display}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </For>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Library</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  variant={
                    location.pathname.startsWith("/mods")
                      ? "outline"
                      : "default"
                  }
                  class="w-full"
                  on:click={navigateToLastDiscoverCat}
                >
                  <BananaIcon />
                  <a onClick={navigateToLastDiscoverCat}>
                    <span>{"Game Bannana"}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Library</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <For each={Object.values(LibraryRoutes)}>
                {(item) => (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      variant={
                        location.pathname.endsWith(item.path)
                          ? "outline"
                          : "default"
                      }
                      class="w-full"
                      on:click={() => navigate(item.path)}
                    >
                      <item.icon />
                      <a href={item.path}>
                        <span>{item.display}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </For>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <PlaylistFooter />
    </Sidebar>
  );
}

function PlaylistFooter() {
  const playlistStore = usePlaylistStore();
  const { open } = useSidebar();

  return (
    <Show when={open()}>
      <SidebarFooter>
        <div class="flex w-full flex-row items-baseline justify-between">
          <SidebarGroupLabel>Playlists</SidebarGroupLabel>
          <Button onPointerDown={() => {}} size={"icon"} variant={"ghost"}>
            <RefreshCwIcon />
          </Button>
        </div>
        <Card class="max-h-[calc(30vh)] overflow-x-clip overflow-y-auto py-2">
          <div class="flex flex-col space-y-1 p-2">
            <For each={playlistStore.playlists}>
              {(playlist) => (
                <div class="flex flex-row">
                  <Button
                    variant="ghost"
                    class="w-full max-w-3/4 justify-start overflow-clip font-normal"
                    onClick={() => {}}
                  >
                    <ListMusic />
                    {playlist.name}
                  </Button>
                  <PlaylistOptionsDropDown
                    playlist={playlist}
                    events={playlistStore.events}
                  />
                </div>
              )}
            </For>
          </div>
        </Card>
      </SidebarFooter>
    </Show>
  );
}

function PlaylistOptionsDropDown({
  playlist,
  events,
}: {
  playlist: types.Playlist;
  events: PlaylistState["events"];
}) {
  const [isOpen, setOpen] = createSignal(false);
  const [dialogOpen, setDialogOpen] = createSignal(false);

  return (
    <Dialog
      open={dialogOpen()}
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
        onSuccess={(name) => events.rename(playlist.id, name)}
      />
      <DropdownMenu open={isOpen()} onOpenChange={setOpen}>
        <DropdownMenuTrigger>
          <Button class="col-span-1" variant={"ghost"} size="icon">
            <EllipsisVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => events.delete(playlist.id)}>
            <Trash class="mr-2 h-4 w-4" />
            <span class="w-full">Delete</span>
            <DropdownMenuShortcut>⇧d</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DialogTrigger
            onPointerDown={() => {
              setOpen(false);
              setDialogOpen(true);
            }}
          >
            <DropdownMenuItem>
              <PencilIcon class="mr-2 h-4 w-4" />
              <span class="w-full">Rename</span>
              <DropdownMenuShortcut>⇧r</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DialogTrigger>
          <DropdownMenuItem
            onClick={() => events.enable(playlist.id, playlist.game)}
          >
            <CheckCheckIcon class="mr-2 h-4 w-4" />
            <span class="w-full">Toggle</span>
            <DropdownMenuShortcut>⇧t</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Dialog>
  );
}
