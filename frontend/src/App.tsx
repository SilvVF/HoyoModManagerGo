
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
      <div className="flex flex-col bg-background max-h-screen overflow-hidden">
        <div className="flex flex-row h-16 justify-end bg-secondary items-center sticky top-0 z-10">
          <ModeToggle></ModeToggle>
        </div>
        <div className="bg-background">
          <div className="grid lg:grid-cols-5">
            <Sidebar playlists={[]} className="hidden lg:block fade-in-10"></Sidebar>
            <div className="col-span-3 lg:col-span-4 lg:border-l">
              <ScrollArea className="h-full max-h-[calc(100vh-64px)]">
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

