
import { Outlet, useNavigate } from "react-router-dom";
import { Sidebar } from "./components/sidebar";
import { ScrollArea } from "./components/ui/scroll-area";
import { useEffect } from "react";
import { testPref } from "./data/prefs";


function App() {

  const navigate = useNavigate()
  useEffect(() => navigate('/genshin') ,[]) 
  useEffect(() => { testPref().catch() }, [])

  return (
      <div className="bg-background">
        <div className="grid lg:grid-cols-5 max-h-screen overflow-clip">
          <Sidebar playlists={[]} className="hidden lg:block fade-in-10"></Sidebar>
          <div className="col-span-3 lg:col-span-4 lg:border-l">
            <ScrollArea className="h-full max-h-screen">
              <Outlet />
            </ScrollArea>
          </div>
        </div>
      </div>
  )
}

export default App

