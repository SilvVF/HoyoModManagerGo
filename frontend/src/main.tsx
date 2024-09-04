import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import GameScreen from './screens/GameScreen.tsx';
import { GenshinApi, StarRailApi } from './data/dataapi.ts';
import { createHashRouter, RouterProvider, useNavigate, useRouteError } from 'react-router-dom';
import ModBrowseScreen from './screens/ModBrowseScreen.tsx';
import { ModViewScreen } from './screens/ModViewScreen.tsx';
import { Button } from './components/ui/button.tsx';
import { ModIndexPage } from './screens/ModIndexPage.tsx';
import SettingsScreen from './screens/SettingsScreen.tsx';
import { PlaylistScreen } from './screens/PlaylistScreen.tsx';
const router = createHashRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "genshin",
        element: <GameScreen dataApi={GenshinApi}/>,
      },
      {
        path: "starrail",
        element: <GameScreen dataApi={StarRailApi}/>,
      },
      {
        path: "zenless",
        element: <GameScreen dataApi={StarRailApi}/>,
      },
      {
        path: "wuwa",
        element: <GameScreen dataApi={StarRailApi}/>,
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
        path: "mods",
        element: <ModIndexPage />,
        children: [
          {
            path: ":id",
            element:  <ModViewScreen />
          },
          {
            path: "cats/:id",
            element: <ModBrowseScreen />
          },
        ]
      }
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