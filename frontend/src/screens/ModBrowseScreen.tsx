import {
  cn,
  CSSstring,
  useStateProducer,
  useStateProducerT,
} from "@/lib/utils";
import * as GbApi from "../../wailsjs/go/api/GbApi";
import { api } from "../../wailsjs/go/models";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DropdownMenuItem } from "@radix-ui/react-dropdown-menu";
import { ChevronDownIcon } from "lucide-react";
import { usePrefrenceAsState, sortModPref } from "@/data/prefs";

type Sorts = "MostLiked" | "MostDownloaded" | "MostViewed" | "";
const sortName = (s: string | undefined) => {
  switch(s) {
    case "": return "Default"
    case "MostLiked": return "Most liked"
    case "MostDownloaded": return "Most downloaded"
    case "MostViewed": return "Most view"
    default: return ""
  }
}

const sortOptions: Sorts[] = ["MostLiked", "MostDownloaded", "MostViewed", ""];

export default function ModBrowseScreen() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const categories = useStateProducer<api.CategoryListResponseItem[]>(
    [],
    async (update) => {
      update(await GbApi.Categories(Number(id)));
    },
    [id]
  );
  const [sort, setSort] = usePrefrenceAsState<string>(sortModPref);
  const [page, setPage] = useState(1);

  useEffect(() => setPage(1), [id]);

  const { loading, value, error } = useStateProducerT<
    api.CategoryResponse | undefined
  >(
    undefined,
    async (update) => {
      if (sort !== undefined) {
        update(await GbApi.CategoryContent(Number(id), 30, page, sort));
      }
    },
    [page, id, sort]
  );

  const lastPage = useMemo<number>(() => {
    const records = value?._aMetadata._nRecordCount;
    const perPage = value?._aMetadata._nPerpage;
    if (records != undefined && perPage != undefined) {
      return records / perPage;
    }
    return 1;
  }, [value?._aMetadata]);

  return (
    <div className="flex flex-row justify-end items-start max-w-full h-full min-w-full">
      <div className="absolute top-4">
        <DropdownMenu>
          <DropdownMenuTrigger 
          className="flex items-center gap-1 w-fit rounded-full backdrop-blur-lg backdrop-brightness-75 bg-primary/30 z-30 p-2 me-12 font-semibold text-foreground">
            {sortName(sort)}
            <ChevronDownIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {sortOptions.map((s) => {
              return (
                <DropdownMenuItem onPointerDown={() => setSort(s)}>
                  <Button variant={'ghost'} className="w-full">{sortName(s)}</Button>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <CategoryItemsList res={value} error={error} loading={loading} />
      <div className="absolute bottom-4 -translate-y-1 start-1/2 -translate-x-1/2 bg-primary/30 backdrop-blur-lg rounded-full">
        <Paginator
          page={page}
          lastPage={lastPage}
          goToPage={(page) => setPage(Math.min(Math.max(1, page), lastPage))}
        />
      </div>
      <div className="flex flex-col w-fit me-2 overflow-clip">
        {categories.map((c) => {
          return (
            <Button
              key={c._sName}
              onClick={() => navigate("/mods/cats/" + c._idRow)}
              variant={
                c._idRow !== undefined &&
                location.pathname.includes(c._idRow.toString())
                  ? "secondary"
                  : "ghost"
              }
              className="min-w-max justify-start font-normal rounded-full"
            >
              {c._sName}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function CategoryItemsList({
  res,
  loading,
  error,
}: {
  res: api.CategoryResponse | undefined;
  loading: boolean;
  error: any;
}) {
  const navigate = useNavigate();

  if (error) {
    return (
      <div>
        <b>error loading content</b>
      </div>
    );
  }

  if (loading || res === undefined) {
    return (
      <div className="grid grid-cols-3">
        {range(0, 15, 1).map(() => {
          return (
            <div className="col-span-1 aspect-video m-2 space-y-3">
              <Skeleton className="h-96 w-full object-cover  rounded-lg object-top fade-in" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3">
      {res._aRecords?.map((record) => {
        const image = record._aPreviewMedia._aImages[0];

        return (
          <div className="col-span-1 aspect-video m-2">
            <img
              onClick={() => navigate("/mods/" + record._idRow)}
              className="h-96 w-full object-cover  rounded-lg object-top fade-in"
              src={`${image._sBaseUrl}/${image._sFile}`}
              alt={record._sName}
            ></img>
            <div
              className="font-normal text-lg"
              style={CSSstring(record._aSubmitter?._sSubjectShaperCssCode)}
            >
              {record._sName}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const range = (start: number, stop: number, step: number) =>
  Array.from({ length: (stop - start) / step + 1 }, (_, i) => start + i * step);

function Paginator(props: {
  page: number;
  lastPage: number;
  goToPage: (page: number) => void;
}) {
  const list = useMemo(() => {
    const minPage = Math.max(1, props.page - 4);
    const mp = props.page + 9 - (props.page - minPage);
    const maxPage = Math.min(Math.max(1, props.lastPage), Math.max(1, mp));

    return range(minPage, maxPage, 1);
  }, [props.page, props.lastPage]);

  return (
    <Pagination className="overflow-hidden">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            className={cn("rounded-full  hover:bg-primary/50")}
            onClick={() => props.goToPage(props.page - 1)}
          />
        </PaginationItem>

        {list.map((page) => {
          return (
            <PaginationItem>
              <PaginationLink
                className={cn(
                  page === props.page ? "bg-primary/50 border-0" : "",
                  "rounded-lg hover:bg-primary/50"
                )}
                isActive={page === props.page}
                onClick={() => props.goToPage(page)}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          );
        })}
        <PaginationItem className={cn("rounded-full hover:bg-primary/50")}>
          <PaginationNext
            className={cn("rounded-full  hover:bg-primary/50")}
            onClick={() => props.goToPage(props.page + 1)}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
