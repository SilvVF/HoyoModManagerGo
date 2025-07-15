import {
  createContext,
  createEffect,
  ParentComponent,
  useContext,
} from "solid-js";
import { createStore } from "solid-js/store";
import { ContentRating, NameFilter, ReleaseType, Sort } from "./searchTypes";
import { useNavigate } from "@solidjs/router";

const ModSearchContext = createContext<ModSearchState>();

export const useModSearchStore = () => useContext(ModSearchContext)!;

export type ModSearchState = {
  name: string;
  page: number;
  sort: Sort | undefined;
  nameFilter: NameFilter;
  featured: boolean;
  hasWip: boolean;
  hasProject: boolean;
  releaseType: ReleaseType;
  contentRating: ContentRating;
};

const defaultModSearchState: ModSearchState = {
  name: "",
  page: 1,
  sort: undefined,
  nameFilter: "",
  featured: false,
  hasWip: false,
  hasProject: false,
  releaseType: "",
  contentRating: "",
};

export function createLocalStore<T extends object = {}>(key: string, init: T) {
  let saved = localStorage.getItem(key);
  const initial = saved ? { ...init, ...JSON.parse(saved) } : init;

  const [state, setState] = createStore<T>(initial);

  createEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  });

  return [state, setState] as const;
}

export const ModSearchStoreProvider: ParentComponent = (props) => {
  const [store, setStore] = createLocalStore<ModSearchState>(
    "mod_search_store",
    defaultModSearchState
  );

  return (
    <ModSearchContext.Provider value={store}>
      {props.children}
    </ModSearchContext.Provider>
  );
};
