
import { Outlet, useNavigate } from "react-router-dom";
import { Sidebar } from "./components/sidebar";
import { ScrollArea } from "./components/ui/scroll-area";
import { useEffect } from "react";
import { ThemeProvider } from "./components/theme-provider";
import { ModeToggle } from "./components/theme-mode-toggle";
import { Button } from "./components/ui/button";
import { Reload } from "../wailsjs/go/core/Generator"
import { LogPrint } from "../wailsjs/runtime/runtime";

function App() {

  const navigate = useNavigate()
  useEffect(() => navigate('/genshin'), []) 

  const reload = async () => {
    Reload(1).then(() => {}).catch((e) => LogPrint(e))
  }

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="flex flex-col bg-background max-h-screen overflow-hidden">
        <div className="flex flex-row h-16 justify-end bg-secondary items-center sticky top-0 z-10">
          <ModeToggle></ModeToggle>
          <Button className="mx-2" onPointerDown={reload}>Reload</Button>
          <Button className="mx-2"variant="default" size="icon" onPointerDown={() => navigate("settings")}>
            <svg 
            xmlns="http://www.w3.org/2000/svg" 
            height="24px" 
            viewBox="0 -960 960 960" 
            width="24px">
              <path d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm70-80h79l14-106q31-8 57.5-23.5T639-327l99 41 39-68-86-65q5-14 7-29.5t2-31.5q0-16-2-31.5t-7-29.5l86-65-39-68-99 42q-22-23-48.5-38.5T533-694l-13-106h-79l-14 106q-31 8-57.5 23.5T321-633l-99-41-39 68 86 64q-5 15-7 30t-2 32q0 16 2 31t7 30l-86 65 39 68 99-42q22 23 48.5 38.5T427-266l13 106Zm42-180q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Zm-2-140Z"/></svg>
          </Button>
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

