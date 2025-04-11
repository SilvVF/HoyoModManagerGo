import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DataApi,
  GenshinApi,
  StarRailApi,
  WutheringWavesApi,
  ZenlessApi,
} from "@/data/dataapi";
import { cn } from "@/lib/utils";
import { getEnumValues } from "@/lib/tsutils";
import { Outlet, useNavigate } from "react-router-dom";
import { createContext, useMemo, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDownIcon, ChevronRightIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { useShallow } from "zustand/shallow";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  ContentRating,
  NameFilter,
  ReleaseType,
  Sort,
  useModSearchStateInitializer,
  useModSearchStateStore,
} from "@/state/modSearchStore";
import { Crumb, useModCrumbState } from "@/state/useModCrumbState";

function getEnumName<T>(enumType: T, value: T[keyof T]): string | undefined {
  // @ts-ignore
  return (Object.keys(enumType) as Array<keyof T>).find(
    (key) => enumType[key] === value
  );
}

const nameFilterName = (nf: NameFilter) => {
  switch (nf) {
    case NameFilter.None:
      return "Default";
    default:
      return (
        getEnumName(NameFilter, nf)?.replace(/([a-z])([A-Z])/g, "$1 $2") ?? ""
      );
  }
};

const releaseTypeName = (rt: ReleaseType) => {
  switch (rt) {
    case ReleaseType.None:
      return "All";
    default:
      return (
        getEnumName(ReleaseType, rt)?.replace(/([a-z])([A-Z])/g, "$1 $2") ?? ""
      );
  }
};

const contentRatingName = (cr: ContentRating) => {
  switch (cr) {
    case ContentRating.None:
      return "All";
    default:
      return (
        getEnumName(ContentRating, cr)?.replace(/([a-z])([A-Z])/g, "$1 $2") ??
        ""
      );
  }
};

const sortName = (s: Sort) => {
  switch (s) {
    case Sort.None:
      return "Default";
    default:
      return s.valueOf().replace(/([a-z])([A-Z])/g, "$1 $2");
  }
};

export const DataApiContext = createContext<DataApi | undefined>(GenshinApi);

export function ModIndexPage() {
  const navigate = useNavigate();

  const updateState = useModSearchStateStore((state) => state.update);
  const state = useModSearchStateStore((state) => state);
  const [collapsed, setCollapased] = useState(false);

  useModSearchStateInitializer();

  const { crumbs, skinIds, topLevelCrumbs } = useModCrumbState();

  const dataApi = useMemo(() => {
    if (crumbs[0] === undefined) return undefined;
    const path = crumbs[0].path;
    const skinIdIdx = skinIds.indexOf(
      Number(path.slice(path.lastIndexOf("/") + 1, path.length))
    );
    switch (skinIdIdx) {
      case 0:
        return GenshinApi;
      case 1:
        return StarRailApi;
      case 2:
        return ZenlessApi;
      case 3:
        return WutheringWavesApi;
      default:
        return undefined;
    }
  }, [crumbs, skinIds]);

  return (
    <DataApiContext.Provider value={dataApi}>
      <div className="flex flex-col">
        <div className="flex flex-row justify-between items-center sticky top-2 end-0 m-2 z-99">
          <BreadCrumbList
            className="backdrop-blur-lg backdrop-brightness-75 bg-primary/30 z-30"
            onCrumbSelected={(path) => navigate(path)}
            crumbs={crumbs}
            topLevelCrumbs={topLevelCrumbs}
          />
          {crumbs.length !== 3 ? (
            <div className="flex flex-row items-center">
              <div
                className={cn(
                  "flex flex-row justify-center items-center gap-x-2 overflow-x-clip",
                  collapsed ? "fade-out" : "fade-in"
                )}
              >
                <SearchBar></SearchBar>
                <FilterDropDown
                  selected={state.nameFilter}
                  valueName={nameFilterName}
                  values={getEnumValues(NameFilter)}
                  onValueChange={(v) =>
                    updateState((state) => {
                      return {
                        ...state,
                        nameFilter: v,
                      };
                    })
                  }
                />
                <FilterDropDown
                  selected={state.sort ?? Sort.None}
                  valueName={sortName}
                  values={getEnumValues(Sort)}
                  onValueChange={(v) =>
                    updateState((state) => {
                      return {
                        ...state,
                        sort: v,
                      };
                    })
                  }
                />
                <FilterDropDown
                  selected={state.contentRating}
                  valueName={contentRatingName}
                  values={getEnumValues(ContentRating)}
                  onValueChange={(v) =>
                    updateState((state) => {
                      return {
                        ...state,
                        contentRating: v,
                      };
                    })
                  }
                />
                <FilterDropDown
                  selected={state.releaseType}
                  valueName={releaseTypeName}
                  values={getEnumValues(ReleaseType)}
                  onValueChange={(v) =>
                    updateState((state) => {
                      return {
                        ...state,
                        releaseType: v,
                      };
                    })
                  }
                />
              </div>
              <Button
                size="icon"
                variant="ghost"
                onPointerDown={() => setCollapased((c) => !c)}
                className={cn(
                  "backdrop-blur backdrop-brightness-50 bg-primary/30 m-2 font-semibold text-foreground rounded-full transition duration-150 ease-in-out",
                  !collapsed ? "rotate-0" : "rotate-180",
                )}
              >
                <ChevronRightIcon />
              </Button>
            </div>
          ) : undefined}
        </div>
        <Outlet />
      </div>
    </DataApiContext.Provider >
  );
}

function FilterDropDown<T>({
  values,
  valueName,
  onValueChange,
  selected,
}: {
  selected: T;
  values: T[];
  onValueChange: (v: T) => void;
  valueName: (v: T) => string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button
          className="w-fit rounded-full backdrop-blur-lg backdrop-brightness-75 bg-primary/30 z-30"
          variant={"ghost"}>
          {valueName(selected)}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <ScrollArea className="h-64 flex flex-col overflow-auto">
          {values.map((s) => {
            return (
              <DropdownMenuItem onPointerDown={() => onValueChange(s)}>
                <Button variant={"ghost"} className="w-full">
                  {valueName(s)}
                </Button>
              </DropdownMenuItem>
            );
          })}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SearchBar() {
  const query = useModSearchStateStore(useShallow((state) => state.name));
  const handleChange = useModSearchStateStore((state) => state.update);
  const [text, setText] = useState(query);

  const handleSubmit = (e: any) => {
    e.preventDefault();
    handleChange((s) => ({
      ...s,
      name: text,
    }));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-row w-fit rounded-full h-fit bg-primary/30 backdrop-blur-lg backdrop-brightness-75 items-center space-x-1 mx-2"
    >
      <Input
        value={text}
        className="font-semibold text-foreground bg-transparent border-none outline-hidden focus:outline-hidden rounded-full"
        placeholder="Search..."
        onInput={(e: any) => setText(e.target.value)}
      />
      <Separator
        orientation="vertical"
        className="h-6 bg-foreground"
      ></Separator>
      <Button
        className="bg-transparent hover:bg-transparent hover:outline-hidden pe-4"
        size="icon"
        type="submit" // Set type to "submit" to trigger form submission
        variant="link"
      >
        <SearchIcon />
      </Button>
    </form>
  );
}

interface BreadCurmbListProps extends React.HTMLAttributes<HTMLDivElement> {
  topLevelCrumbs: Crumb[];
  crumbs: Crumb[];
  onCrumbSelected: (path: string) => void;
}

function BreadCrumbList({
  className,
  topLevelCrumbs,
  crumbs,
  onCrumbSelected,
}: BreadCurmbListProps) {
  return (
    <Breadcrumb
      className={cn(
        className,
        "w-fit rounded-full"
      )}
    >
      <BreadcrumbList>
        {(crumbs.isEmpty() ? [topLevelCrumbs[0]] : crumbs).map(
          (item, i, arr) => (
            <BreadCrumbListItem
              crumbs={arr}
              item={item}
              i={i}
              topLevelCrumbs={topLevelCrumbs}
              onSelected={onCrumbSelected}
            />
          )
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

const Slash = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    className="stroke-primary"
  >
    <path d="M22 2 2 22" />
  </svg>
);

function BreadCrumbListItem({
  i,
  item,
  topLevelCrumbs,
  crumbs,
  onSelected,
}: {
  i: number;
  item: Crumb;
  crumbs: Crumb[];
  topLevelCrumbs: Crumb[];
  onSelected: (path: string) => void;
}) {
  if (i === 0) {
    return (
      <div className="flex flex-row items-center">
        <BreadcrumbItem className="font-semibold text-foreground hover:underline text-base p-2">
          <DropdownMenu>
            <text onClick={() => onSelected(item.path)}>{item.name}</text>
            <DropdownMenuTrigger className="flex items-center gap-1">
              <ChevronDownIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {topLevelCrumbs.map((crumb) => {
                return (
                  <DropdownMenuItem onClick={() => onSelected(crumb.path)}>
                    {crumb.name}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </BreadcrumbItem>
        {crumbs.length > 1 ? (
          <BreadcrumbSeparator>
            <Slash />
          </BreadcrumbSeparator>
        ) : (
          <></>
        )}
      </div>
    );
  } else {
    return (
      <div className="flex flex-row items-center">
        <BreadcrumbItem className="font-semibold text-foreground hover:underline text-base p-2">
          <BreadcrumbLink onClick={() => onSelected(item.path)}>
            {item.name}
          </BreadcrumbLink>
        </BreadcrumbItem>
        {i !== crumbs.length - 1 ? (
          <BreadcrumbSeparator>
            <Slash />
          </BreadcrumbSeparator>
        ) : (
          <></>
        )}
      </div>
    );
  }
}
