/* @refresh reload */
import "./index.css";

import { render } from "solid-js/web";

import App from "./app";
import { Navigate, Route, Router } from "@solidjs/router";
import {
  GenshinScreen,
  StarRailScreen,
  WuWaScreen,
  ZZZScreen,
} from "./pages/GameScreen";
import { SettingsScreen } from "./pages/SettingsScreen";
import { ModIndexPage } from "./pages/Mod/ModIndexScreen";
import { ModViewScreen } from "./pages/Mod/ModViewScreen";
import { ModBrowseScreen } from "./pages/Mod/ModBrowseScreen";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    "Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?"
  );
}

render(
  () => (
    <Router root={App}>
      <Route path={"/"} component={() => <Navigate href={"/genshin"} />} />
      <Route path={"/genshin"} component={GenshinScreen} />
      <Route path={"/starrail"} component={StarRailScreen} />
      <Route path={"/zenless"} component={ZZZScreen} />
      <Route path={"/wuwa"} component={WuWaScreen} />
      <Route path={"/settings"} component={SettingsScreen} />
      <Route path="mods" component={ModIndexPage}>
        <Route path=":id" component={ModViewScreen} />
        <Route path="cats/:id" component={ModBrowseScreen} />
      </Route>
    </Router>
  ),
  root!
);
