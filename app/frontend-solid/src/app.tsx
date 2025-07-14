import { ParentProps, Suspense, type Component } from "solid-js";
import { SidebarProvider } from "./components/ui/sidebar";
import HmmSidebar from "./components/hmm/HmmSidebar";
import { PlaylistProvider } from "./stores/usePlaylistStore";
import { DownloadProvider } from "./stores/useDownloadStore";
import { ModTransferStoreProvider } from "./stores/useModTransferStore";

const App: Component<ParentProps> = (props) => {
  return (
    <>
      <PlaylistProvider>
        <DownloadProvider>
          <ModTransferStoreProvider>
            <SidebarProvider>
              <HmmSidebar />
              <main class="bg-background flex flex-1">
                <Suspense>{props.children}</Suspense>
              </main>
            </SidebarProvider>
          </ModTransferStoreProvider>
        </DownloadProvider>
      </PlaylistProvider>
    </>
  );
};

export default App;
