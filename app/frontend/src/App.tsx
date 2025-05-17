import { Outlet } from "react-router-dom";
import { ReactNode, useEffect, useRef, useState } from "react";
import { ThemeProvider } from "./components/theme-provider";
import { cn } from "./lib/utils";
import { AppSidebar } from "./components/app-sidebar";
import { ScrollProvider } from "./ScrollContext";
import { DownloadOverlay } from "./components/DownloadOverlay";
import { SidebarInset, SidebarProvider } from "./components/ui/sidebar";
import { Button } from "./components/ui/button";
import { ClosePrefsDB, DevModeEnabled, ForcePanic } from "wailsjs/go/main/App";
import { ExpandIcon } from "lucide-react";
import { useDownloadStoreListener, useStoreInitializers } from "./state/useStoreInitializers";
import AppDialogHost from "./components/appdialog";
import { useAppUpdateChecker } from "./state/useAppUpdateChecker";

function App() {

  useStoreInitializers();
  useAppUpdateChecker();

  const { expanded, queued } = useDownloadStoreListener();

  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  return (
    <ThemeProvider defaultTheme="dark">
      <DevModeOverlay>
        <div className="bg-background max-h-screen overflow-hidden flex flex-col">
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="overflow-hidden">
              <DownloadOverlay />
              <AppDialogHost>
                <ScrollProvider provideRef={scrollAreaRef}>
                  <div
                    id="main"
                    ref={scrollAreaRef}
                    className={cn(
                      !expanded && queued > 0
                        ? "max-h-[calc(100vh-30px)]"
                        : "max-h-[calc(100vh)]",
                      "overflow-y-auto overflow-x-hidden"
                    )}
                  >
                    <Outlet />
                  </div>
                </ScrollProvider>
              </AppDialogHost>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </DevModeOverlay>
    </ThemeProvider>
  );
}

function DevModeOverlay({ children }: { children: ReactNode }) {
  const [devMode, setDevMode] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    DevModeEnabled()
      .then(setDevMode)
      .catch(() => setDevMode(false));
  }, []);

  if (!devMode) {
    return <>{children}</>;
  }

  return (
    <div>
      <div className="flex flex-row z-99 absolute top-0">
        <Button size={"icon"} onClick={() => setCollapsed((c) => !c)}>
          <ExpandIcon />
        </Button>
        {collapsed ? undefined : (
          <div className="space-x-2 space-y-2">
            <Button onClick={() => ClosePrefsDB()}>Close DB</Button>
            <Button onClick={() => ForcePanic()}>Force Panic</Button>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

export default App;
