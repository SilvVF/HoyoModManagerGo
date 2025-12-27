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
import {
  useDownloadStoreListener,
  useStoreInitializers,
} from "./state/useStoreInitializers";
import AppDialogHost from "./components/appdialog";
import { useAppUpdateChecker } from "./state/useAppUpdateChecker";
import { ToastProvider } from "./state/toastStore";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDbEventListener } from "./data/database";
const queryClient = new QueryClient();

function App() {
  useStoreInitializers();
  useAppUpdateChecker();
  useDbEventListener();

  const { expanded, queued } = useDownloadStoreListener();

  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <DevModeOverlay>
          <ToastProvider>
            <div className="flex max-h-screen flex-col overflow-hidden bg-background">
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
                          "overflow-x-hidden overflow-y-auto",
                        )}
                      >
                        <Outlet />
                      </div>
                    </ScrollProvider>
                  </AppDialogHost>
                </SidebarInset>
              </SidebarProvider>
            </div>
          </ToastProvider>
        </DevModeOverlay>
      </ThemeProvider>
    </QueryClientProvider>
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
      <div className="absolute top-0 z-99 flex flex-row">
        <Button size={"icon"} onClick={() => setCollapsed((c) => !c)}>
          <ExpandIcon />
        </Button>
        {collapsed ? undefined : (
          <div className="space-y-2 space-x-2">
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
