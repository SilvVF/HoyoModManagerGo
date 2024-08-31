
import { Outlet, useNavigate } from "react-router-dom";
import { Sidebar } from "./components/sidebar";
import { ScrollArea } from "./components/ui/scroll-area";
import { useEffect } from "react";
import { ThemeProvider } from "./components/theme-provider";
import { ModeToggle } from "./components/theme-mode-toggle";

function App() {

  const navigate = useNavigate()
  useEffect(() => navigate('/genshin'), []) 

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="max-h-screen overflow-clip bg-background">
        <div className="flex flex-row justify-end p-2 bg-secondary">
          <ModeToggle></ModeToggle>
        </div>
        <div className="bg-background">
          <div className="grid lg:grid-cols-5">
            <Sidebar playlists={[]} className="hidden lg:block fade-in-10"></Sidebar>
            <div className="col-span-3 lg:col-span-4 lg:border-l">
              <ScrollArea className="h-full max-h-screen">
                <Outlet />
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  )
}

export default App

