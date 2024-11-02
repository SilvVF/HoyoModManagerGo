import { sortModPref } from "@/data/prefs";
import { useEffect } from "react";
import { create } from "zustand";
import { useShallow } from "zustand/shallow";

function hasOtherChanges(
  prevState: ModSearchState,
  newState: ModSearchState
): boolean {
  return (
    prevState.name !== newState.name ||
    prevState.sort !== newState.sort ||
    prevState.nameFilter !== newState.nameFilter ||
    prevState.featured !== newState.featured ||
    prevState.hasWip !== newState.hasWip ||
    prevState.hasProject !== newState.hasProject ||
    prevState.releaseType !== newState.releaseType ||
    prevState.contentRating !== newState.contentRating
  );
}

export enum Sort {
  None = "",
  MostLiked = "MostLiked",
  MostDownloaded = "MostDownloaded",
  MostViewed = "MostViewed",
  Newest = "Newest",
  Oldest = "Oldest",
  LatestModified = "LatestModified",
  NewAndUpdated = "NewAndUpdated",
  LatestUpdated = "LatestUpdated",
  Alphabetically = "Alphabetically",
  ReverseAlphabetically = "ReverseAlphabetically",
  MostCommented = "MostCommented",
  LatestComment = "LatestComment",
}

export enum NameFilter {
  None = "",
  Contains = "contains",
  ExactlyEqual = "equals",
  StartsWith = "starts_with",
  EndsWith = "ends_with",
}

export enum ContentRating {
  None = "",
  Unrated = "-",
  CrudeOrProfane = "cp",
  SexualThemes = "st",
  SexualContent = "sc",
  BloodAndGore = "bg",
  AlcoholUse = "au",
  TobaccoUse = "tu",
  DrugUse = "du",
  FlashingLights = "ps",
  SkimpyAttire = "sa",
  PartialNudity = "pn",
  FullNudity = "nu",
  IntenseViolence = "iv",
  Fetishistic = "ft",
  RatingPending = "rp",
}

export enum ReleaseType {
  None = "",
  Any = "any",
  Studio = "studio",
  Indie = "indie",
  Redistribution = "redistribution",
}

export interface ModSearchState {
  name: string;
  page: number;
  sort: Sort | undefined;
  nameFilter: NameFilter;
  featured: boolean;
  hasWip: boolean;
  hasProject: boolean;
  releaseType: ReleaseType;
  contentRating: ContentRating;
  update: (block: (state: ModSearchState) => ModSearchState) => void;
}

export const useModSearchStateInitializer = () => {
  const updateState = useModSearchStateStore((state) => state.update);
  const sort = useModSearchStateStore(useShallow((state) => state.sort));

  useEffect(() => {
    sortModPref.Get().then((s) =>
      updateState((state) => {
        return {
          ...state,
          sort: (s as Sort) ?? Sort.None,
        };
      })
    );

    return () => {
      if (sort) {
        sortModPref.Set(sort);
      }
    };
  }, []);
};

export const useModSearchStateStore = create<ModSearchState>((set) => ({
  name: "",
  sort: undefined,
  page: 1,
  nameFilter: NameFilter.None,
  featured: false,
  hasWip: false,
  hasProject: false,
  releaseType: ReleaseType.None,
  contentRating: ContentRating.None,
  update: (block) => {
    set((state) => {
      const newState = block(state);
      if (hasOtherChanges(state, newState)) {
        newState.page = 1;
      }
      return newState;
    });
  },
}));
