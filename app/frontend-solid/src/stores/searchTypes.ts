export const releaseTypeValues = [
  "",
  "any",
  "studio",
  "indie",
  "redistribution",
] as const;

export type ReleaseType = (typeof releaseTypeValues)[number];

export const releaseTypeLabels: Record<ReleaseType, string> = {
  "": "None",
  any: "Any",
  studio: "Studio",
  indie: "Indie",
  redistribution: "Redistribution",
};

export const contentRatingValues = [
  "",
  "-",
  "cp",
  "st",
  "sc",
  "bg",
  "au",
  "tu",
  "du",
  "ps",
  "sa",
  "pn",
  "nu",
  "iv",
  "ft",
  "rp",
] as const;

export type ContentRating = (typeof contentRatingValues)[number];

export const contentRatingLabels: Record<ContentRating, string> = {
  "": "None",
  "-": "Unrated",
  cp: "Crude or Profane",
  st: "Sexual Themes",
  sc: "Sexual Content",
  bg: "Blood and Gore",
  au: "Alcohol Use",
  tu: "Tobacco Use",
  du: "Drug Use",
  ps: "Flashing Lights",
  sa: "Skimpy Attire",
  pn: "Partial Nudity",
  nu: "Full Nudity",
  iv: "Intense Violence",
  ft: "Fetishistic",
  rp: "Rating Pending",
};

export const nameFilterValues = [
  "",
  "contains",
  "equals",
  "starts_with",
  "ends_with",
] as const;

export type NameFilter = (typeof nameFilterValues)[number];

export const nameFilterLabels: Record<NameFilter, string> = {
  "": "None",
  contains: "Contains",
  equals: "Exactly Equal",
  starts_with: "Starts With",
  ends_with: "Ends With",
};

export const sortValues = [
  "",
  "MostLiked",
  "MostDownloaded",
  "MostViewed",
  "Newest",
  "Oldest",
  "LatestModified",
  "NewAndUpdated",
  "LatestUpdated",
  "Alphabetically",
  "ReverseAlphabetically",
  "MostCommented",
  "LatestComment",
] as const;

export type Sort = (typeof sortValues)[number];

export const sortLabels: Record<Sort, string> = {
  "": "None",
  MostLiked: "Most Liked",
  MostDownloaded: "Most Downloaded",
  MostViewed: "Most Viewed",
  Newest: "Newest",
  Oldest: "Oldest",
  LatestModified: "Latest Modified",
  NewAndUpdated: "New and Updated",
  LatestUpdated: "Latest Updated",
  Alphabetically: "Alphabetically",
  ReverseAlphabetically: "Reverse Alphabetically",
  MostCommented: "Most Commented",
  LatestComment: "Latest Comment",
};
