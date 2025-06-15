import {
  cn,
  useStateProducer,
  useStateProducerT,
} from "@/lib/utils";
import * as GbApi from "../../../wailsjs/go/api/GbApi";
import { api } from "../../../wailsjs/go/models";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useEffect, useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CrossfadeImage } from "@/components/crossfade-image";
import { useScrollContext } from "@/ScrollContext";
import { useShallow } from "zustand/shallow";
import { useModSearchStateStore } from "@/state/modSearchStore";
import { CSSstring, range } from "@/lib/tsutils";
import useTransitionNavigate from "@/hooks/useCrossfadeNavigate";

export default function ModBrowseScreen() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useTransitionNavigate();

  const { toTop } = useScrollContext();

  const categories = useStateProducer<api.CategoryListResponseItem[]>(
    [],
    async (update) => {
      update(await GbApi.Categories(Number(id)));
    },
    [id]
  );
  const state = useModSearchStateStore(useShallow((state) => state));

  const { loading, value, error } = useStateProducerT<
    api.CategoryResponse | undefined
  >(
    undefined,
    async (update) => {
      if (state.sort !== undefined) {
        /*
          id,
          perPage,
          page int,
          sort Sort,
          name string,
          nameFilter NameFilter,
          featured,
          hasWip,
          hasProject bool,
          releaseType ReleaseType,
          contentRating ContentRating,
        */
        update(
          await GbApi.CategoryContent(
            Number(id),
            30,
            state.page,
            state.sort,
            state.name,
            state.nameFilter,
            state.featured,
            state.hasWip,
            state.hasProject,
            state.releaseType,
            state.contentRating
          )
        );
      }
    },
    [id, state]
  );

  useEffect(() => {
    toTop();
  }, [value]);

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
      <CategoryItemsList res={value} error={error} loading={loading} />
      <div className="flex flex-col w-fit me-2 overflow-clip">
        {categories.map((c) => {
          return (
            <Button
              key={c._sName}
              onClick={() => navigate("/mods/cats/" + c._idRow)}
              variant={
                c._idRow !== undefined &&
                  location.pathname.includes(c._idRow?.toString() ?? "")
                  ? "secondary"
                  : "ghost"
              }
              className="justify-start font-normal rounded-full"
            >
              {c._sName}
            </Button>
          );
        })}
      </div>
      <div className="absolute z-30 bottom-4 start-1/2 -translate-x-1/2 bg-primary/30 backdrop-blur-lg rounded-full">
        <Paginator
          page={state.page}
          lastPage={lastPage}
          goToPage={(page) => {
            state.update((s) => {
              return {
                ...s,
                page: Math.max(1, Math.min(lastPage, page)),
              };
            });
          }}
        />
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
  const navigate = useTransitionNavigate();

  if (error) {
    return (
      <div>
        <b>error loading content</b>
      </div>
    );
  }

  if (loading || res === undefined) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        {range(0, 15, 1).map(() => {
          return (
            <div className="col-span-1 aspect-video m-2 space-y-3">
              <Skeleton className="h-96 w-full object-cover rounded-lg object-top fade-in" />
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {res._aRecords?.map((record) => {
        const image = record._aPreviewMedia._aImages[0];

        return (
          <div className="col-span-1 aspect-video m-2">
            <CrossfadeImage
              onClick={() => navigate("/mods/" + record._idRow)}
              className="h-96 w-full object-cover rounded-lg object-top bg-black/40 fade-in"
              src={`${image._sBaseUrl}/${image._sFile}`}
              alt={record._sName}
            />
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

function Paginator(props: {
  page: number;
  lastPage: number;
  goToPage: (page: number) => void;
}) {
  const list = useMemo(() => {
    const minPage = Math.max(1, props.page - 4);
    const mp = props.page + 9 - (props.page - minPage);
    const maxPage = Math.min(Math.max(1, props.lastPage), Math.max(1, mp));

    return range(minPage, maxPage);
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
