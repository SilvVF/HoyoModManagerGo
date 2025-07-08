import { DataApi } from "@/data/dataapi";
import { createContext, ParentProps } from "solid-js";

const DataApiContext = createContext<DataApi>();

const DataApiProvider = (props: ParentProps & { dataApi: DataApi }) => (
  <DataApiContext.Provider value={props.dataApi}>
    {props.children}
  </DataApiContext.Provider>
);
