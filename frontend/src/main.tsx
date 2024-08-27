import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import GameScreen from './screens/GameScreen.tsx';
import { GenshinApi, StarRailApi } from './data/dataapi.ts';
import { createHashRouter, RouterProvider, useRouteError } from 'react-router-dom';
import ModBrowseScreen from './screens/ModBrowseScreen.tsx';

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
        path: "browse",
        element: <ModBrowseScreen />
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

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <h1>Oops!</h1>
      <p>Sorry, an unexpected error has occurred.</p>
      <p>
        <i>{error.statusText || error.message}</i>
      </p>
    </div>
  );
}