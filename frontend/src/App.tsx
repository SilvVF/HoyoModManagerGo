
import { Outlet, useNavigate } from "react-router-dom";
import { ScrollArea } from "./components/ui/scroll-area";
import { useEffect } from "react";
import { ThemeProvider } from "./components/theme-provider";
import { useStateProducer } from "./lib/utils";
import { SelectPlaylistWithModsAndTags } from "../wailsjs/go/core/DbHelper"
import { types } from "../wailsjs/go/models";
import { Sidebar } from "./components/sidebar";

function App() {

  const navigate = useNavigate()
  useEffect(() => navigate('/genshin'), []) 

  const playlists = useStateProducer<types.PlaylistWithModsAndTags[]>([], async (update) => {
    const playlistList = await Promise.all(
      [
        SelectPlaylistWithModsAndTags(1),
        SelectPlaylistWithModsAndTags(2),
        SelectPlaylistWithModsAndTags(3),
        SelectPlaylistWithModsAndTags(4)
      ]
    )
    update(playlistList.flatMap((it) => it))
  }, [])

  return (
    <ThemeProvider defaultTheme="dark">
      <div className="bg-background max-h-screen overflow-hidden">
        <div className="grid lg:grid-cols-5">
          <Sidebar 
              playlists={playlists} 
              className="hidden lg:block max-h-screen overflow-hidden">
          </Sidebar>
          <div className="col-span-3 lg:col-span-4 lg:border-l">
              <ScrollArea className={`h-full scroll-mt- max-h-screen`}>
                <Outlet />
              </ScrollArea>
            </div>
          </div>
      </div>
    </ThemeProvider>
  )
}

export default App

