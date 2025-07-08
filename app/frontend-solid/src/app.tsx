import { ParentProps, Suspense, type Component } from "solid-js";
import { SidebarProvider } from "./components/ui/sidebar";
import HmmSidebar from "./components/hmm/HmmSidebar";
import { PlaylistProvider } from "./stores/usePlaylistStore";

const App: Component<ParentProps> = (props) => {
  return (
    <>
      <PlaylistProvider>
        <SidebarProvider>
          <HmmSidebar />
          <main class="bg-background flex flex-1">
            <Suspense>{props.children}</Suspense>
          </main>
        </SidebarProvider>
      </PlaylistProvider>
    </>
  );
};

export default App;
