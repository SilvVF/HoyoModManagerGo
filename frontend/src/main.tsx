import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import GameScreen from './screens/GameScreen.tsx';
import { Game, GenshinApi, LeagueApi, StarRailApi, WutheringWavesApi, ZenlessApi } from './data/dataapi.ts';
import { createHashRouter, Navigate, RouterProvider, useNavigate, useRouteError } from 'react-router-dom';
import ModBrowseScreen from './screens/mod/ModBrowseScreen.tsx';
import { ModViewScreen } from './screens/mod/ModViewScreen.tsx';
import { Button } from './components/ui/button.tsx';
import { ModIndexPage } from './screens/mod/ModIndexPage.tsx';
import SettingsScreen from './screens/SettingsScreen.tsx';
import { PlaylistScreen } from './screens/PlaylistScreen.tsx';
import { SearchScreen } from './screens/SearchScreen.tsx';
import { KeymappingScreen } from './screens/EditScreen.tsx';
import { syncCharacters, SyncType } from './data/sync.ts';
import BrowserScreen from './screens/BrowserScreen.tsx';
import ImportScreen from './screens/ImportScreen.tsx';

const router = createHashRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <Navigate to="/genshin" replace />,
      },
      {
        path: "genshin",
        loader: async () => {
          await syncCharacters(GenshinApi, SyncType.StartupRequest);
          return null
        },
        element: <GameScreen dataApi={GenshinApi} game={Game.Genshin} />,
      },
      {
        path: "league",
        loader: async () => {
          await syncCharacters(LeagueApi, SyncType.StartupRequest);
          return null
        },
        element: <GameScreen dataApi={LeagueApi} game={Game.League} />,
      },
      {
        path: "starrail",
        loader: async () => {
          await syncCharacters(StarRailApi, SyncType.StartupRequest);
          return null
        },
        element: <GameScreen dataApi={StarRailApi} game={Game.StarRail} />,
      },
      {
        path: "zenless",
        loader: async () => {
          await syncCharacters(ZenlessApi, SyncType.StartupRequest);
          return null
        },
        element: <GameScreen dataApi={ZenlessApi} game={Game.ZZZ} />,
      },
      {
        path: "wuwa",
        loader: async () => {
          await syncCharacters(WutheringWavesApi, SyncType.StartupRequest);
          return null
        },
        element: <GameScreen dataApi={WutheringWavesApi} game={Game.WuWa} />,
      },
      {
        path: "playlist",
        element: <PlaylistScreen />,
      },
      {
        path: "settings",
        element: <SettingsScreen />
      },
      {
        path: "search",
        element: <SearchScreen />
      },
      {
        path: "keymap/:modId",
        element: <KeymappingScreen />,
      },
      {
        path: "import",
        element: <ImportScreen />
      },
      {
        path: "mods",
        element: <ModIndexPage />,
        children: [
          {
            path: ":id",
            element: <ModViewScreen />
          },
          {
            path: "cats/:id",
            element: <ModBrowseScreen />
          },
        ]
      },
      {
        path: "browser",
        element: <BrowserScreen src="https://fribbels.github.io/hsr-optimizer/" />,
      },
    ],
    errorElement: <ErrorPage />,
  },
]);


ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)

export default function ErrorPage() {

  const error: any = useRouteError();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <h1>Oops!</h1>
      <p>Sorry, an unexpected error has occurred.</p>
      <p>
        <i>{error.statusText || error.message}</i>
      </p>
      <Button onClick={() => navigate("/genshin")}>Home</Button>
    </div>
  );
}