
import { Outlet, useNavigate } from "react-router-dom";
import { ScrollArea } from "./components/ui/scroll-area";
import { useEffect, useState } from "react";
import { ThemeProvider } from "./components/theme-provider";
import { useStateProducer } from "./lib/utils";
import { SelectPlaylistWithModsAndTags, DeletePlaylistById } from "../wailsjs/go/core/DbHelper"
import { types } from "../wailsjs/go/models";
import { Sidebar } from "./components/sidebar";

function App() {

  const navigate = useNavigate()
  useEffect(() => navigate('/genshin'), []) 

  const [playlistTrigger, setPlaylistTrigger] = useState(0);

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
  }, [playlistTrigger])

  const deletePlaylist = (id: number) => {
    DeletePlaylistById(id).then(() => setPlaylistTrigger(prev => prev + 1))
  }

  return (
    <ThemeProvider defaultTheme="dark">
      <div className="bg-background max-h-screen overflow-hidden">
        <div className="grid lg:grid-cols-5">
          <Sidebar 
              refreshPlaylist={() => setPlaylistTrigger(prev => prev + 1)}
              playlists={playlists} 
              onDeletePlaylist={deletePlaylist}
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

