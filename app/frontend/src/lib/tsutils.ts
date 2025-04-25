
export type CancelFn = () => void;

export type Pair<X, Y> = {
  x: X;
  y: Y;
};

declare global {
  interface String {
    ifEmpty(block: () => string): string;
    isBlank(): boolean;
  }
  interface Array<T> {
    isEmpty(): boolean;
    firstNotNullOf<R>(
      transfrom: (value: T, index: number, array: T[]) => R | undefined
    ): R;
    firstNotNullOfOrNull<R>(
      transfrom: (value: T, index: number, array: T[]) => R | undefined
    ): R | undefined;
    groupBy<R>(
      keySelector: (value: T) => R
    ): [R, T[]][];
    any(predicate: (value: T, index: number, array: T[]) => boolean): boolean;
  }
  interface Set<T> {
    isEmpty(): boolean;
    map<R>(block: (value: T, index: number, set: Set<T>) => R): Array<R>;
  }
}

Set.prototype.map = setMap;
Set.prototype.isEmpty = isEmptySet;
Array.prototype.isEmpty = isEmptyArray;
Array.prototype.firstNotNullOf = firstNotNullOf;
Array.prototype.firstNotNullOfOrNull = firstNotNullOfOrNull;
Array.prototype.groupBy = groupBy;
Array.prototype.any = arrayAny;
String.prototype.ifEmpty = ifEmpty;
String.prototype.isBlank = isBlank;

function arrayAny<T>(this: Array<T>, predicate: (value: T, index: number, array: T[]) => boolean): boolean {
  for (const [i, item] of this.entries()) {
    if (predicate(item, i, this)) {
      return true
    }
  }
  return false
}

export function getEnumNames<T>(enumType: T): string[] {
  // @ts-ignore
  return Object.keys(enumType).filter((key) => isNaN(Number(key)));
}

export function getEnumValues<T>(enumType: T): T[keyof T][] {
  // @ts-ignore
  return Object.values(enumType).filter(
    (value) => typeof value === "string"
  ) as T[keyof T][];
}

export const objString = (obj: any) => JSON.stringify(obj, null, 2);

function isBlank(this: string): boolean {
  return this.trim().length === 0
}

function ifEmpty(this: string, block: () => string): string {
  if (this === "") {
    return block();
  }
  return this;
}

function isEmptySet<T>(this: Set<T>): boolean {
  return !((this?.size ?? 0) > 0);
}

function isEmptyArray<T>(this: Array<T>): boolean {
  return !((this?.length ?? 0) > 0);
}

function iterableMap<T, R>(
  iter: IterableIterator<T>,
  block: (item: T, index: number) => R
): Array<R> {
  const ret = new Array<R>();
  let i = 0;
  for (let item of iter) {
    ret.push(block(item, i));
    i += 1;
  }
  return ret;
}

function setMap<T, R>(
  this: Set<T>,
  block: (value: T, index: number, set: Set<T>) => R
): Array<R> {
  return iterableMap(this.values(), (item, index) => block(item, index, this));
}

function firstNotNullOf<T, R>(
  this: Array<T>,
  transform: (value: T, index: number, array: T[]) => R | undefined
): R {
  for (const [i, value] of this.entries()) {
    const result = transform(value, i, this);
    if (result != undefined) {
      return result;
    }
  }
  throw Error("No element of the array was transformed to a non-null value.");
}

function groupBy<T, R>(
  this: Array<T>,
  keySelector: (value: T) => R
): [R, T[]][] {

  if (this.isEmpty()) {
    return []
  }

  const map = new Map<R, Array<T>>();

  for (const [_, value] of this.entries()) {
    const key = keySelector(value);
    if (!key) {
      continue
    }

    if (!map.has(key)) {
      map.set(key, [value]);
    } else {
      map.get(key)?.push(value);
    }
  }

  return Array.from(map)
}

function firstNotNullOfOrNull<T, R>(
  this: Array<T>,
  transform: (value: T, index: number, array: T[]) => R | undefined
): R | undefined {
  for (const [i, value] of this.entries()) {
    const result = transform(value, i, this);
    if (result != undefined) {
      return result;
    }
  }
  return undefined;
}

export const range = (start: number, stop: number, step: number = 1) =>
  Array.from({ length: (stop - start) / step + 1 }, (_, i) => start + i * step);

export function CSSstring(string: string | undefined) {
  if (string === undefined) return;
  try {
    const styleObject: React.CSSProperties = {};
    string.split(";").forEach((rule) => {
      const [property, value] = rule.split(":").map((item) => item.trim());
      if (property && value) {
        const camelCasedProperty = property.replace(/-([a-z])/g, (g) =>
          g[1].toUpperCase()
        );
        // @ts-ignore
        styleObject[camelCasedProperty] = value;
      }
    });
    return styleObject;
  } catch {
    return {};
  }
}

export function dropLastWhile(
  string: string,
  predicate: (string: string) => boolean
): string {
  for (let i = string.length - 1; i > 0; i--)
    if (!predicate(string[i])) return string.substring(0, i + 1);
  return "";
}

/**
 * @param date date object or number in epoch milliseconds
 * @param lang
 * @returns
 */
export function getRelativeTimeString(
  date: Date | number | undefined,
  lang = navigator.language
): string {
  if (date === undefined) return "";
  // Allow dates or times to be passed
  const timeMs = typeof date === "number" ? date : date.getTime();

  // Get the amount of seconds between the given date and now
  const deltaSeconds = Math.round((timeMs - Date.now()) / 1000);

  // Array reprsenting one minute, hour, day, week, month, etc in seconds
  const cutoffs = [
    60,
    3600,
    86400,
    86400 * 7,
    86400 * 30,
    86400 * 365,
    Infinity,
  ];

  // Array equivalent to the above but in the string representation of the units
  const units: Intl.RelativeTimeFormatUnit[] = [
    "second",
    "minute",
    "hour",
    "day",
    "week",
    "month",
    "year",
  ];

  // Grab the ideal cutoff unit
  const unitIndex = cutoffs.findIndex(
    (cutoff) => cutoff > Math.abs(deltaSeconds)
  );

  // Get the divisor to divide from the seconds. E.g. if our unit is "day" our divisor
  // is one day in seconds, so we can divide our seconds by this to get the # of days
  const divisor = unitIndex ? cutoffs[unitIndex - 1] : 1;

  // Intl.RelativeTimeFormat do its magic
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  return rtf.format(Math.floor(deltaSeconds / divisor), units[unitIndex]);
}

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = [
    "Bytes",
    "KiB",
    "MiB",
    "GiB",
    "TiB",
    "PiB",
    "EiB",
    "ZiB",
    "YiB",
  ];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}


export const imageFileExtensions = [
  "*.jpg",
  "*.jpeg",
  "*.png",
  "*.gif",
  "*.bmp",
  "*.webp",
  "*.tiff",
  "*.tif",
  "*.ico",
  "*.svg"
];

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
