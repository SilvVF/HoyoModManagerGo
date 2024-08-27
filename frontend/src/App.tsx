import { Button } from "@/components/ui/button"
import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";


const routes = ["/genshin", "/starrail", "/browse"]

function App() {

  const location = useLocation();
  const navigate = useNavigate()

  useEffect(() => {
    if (location.pathname === '/') {
      navigate('/genshin')
    }
  }, [location.pathname])

  return (
    <>
      <div className="flex flex-row">
          <div className="flex flex-col min-h-screen bg-primary-foreground">
            {
              routes.map((route) => {
                return (
                  <Button 
                  onClick={() => {
                    navigate(route) 
                  }
                  }>
                    {route}
                  </Button>
                )
              })
            }
          </div>
          <div className="flex-auto align-top justify-start bg-slate-500 max-h-screen overflow-y-scroll">
            <Outlet />
          </div>
      </div>
    </>
  )
}

export default App

