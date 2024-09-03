import { type ClassValue, clsx } from "clsx"
import { useEffect, useState } from "react"
import { twMerge } from "tailwind-merge"
import { LogError } from "../../wailsjs/runtime/runtime"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function useStateProducer<T extends any>(
  defaultValue: T,
  producer: (update: (value: T) => void) => Promise<void>,
  keys: any[]
): T {
  
  const [value, setValue] = useState(defaultValue)
  
  useEffect(() => { 
     producer(setValue).catch(e => LogError(e))
  }, [...keys])

  return value
}

export function CSSstring(string: string | undefined) {

  if (string === undefined) return 
  try {
    const styleObject: React.CSSProperties = {};
    string.split(';').forEach((rule) => {
      const [property, value] = rule.split(':').map(item => item.trim());
      if (property && value) {
        const camelCasedProperty = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        // @ts-ignore
        styleObject[camelCasedProperty] = value;
      }
    });
    return styleObject;
  } catch {
    return {}
  }
}

export function dropLastWhile(string: string , predicate: (string: string) => boolean): string {
  for (let i = (string.length - 1); i > 0; i--)
      if (!predicate(string[i]))
          return string.substring(0, i + 1)
  return ""
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
  if (date === undefined) return ""
  // Allow dates or times to be passed
  const timeMs = typeof date === "number" ? date : date.getTime();

  // Get the amount of seconds between the given date and now
  const deltaSeconds = Math.round((timeMs - Date.now()) / 1000);

  // Array reprsenting one minute, hour, day, week, month, etc in seconds
  const cutoffs = [60, 3600, 86400, 86400 * 7, 86400 * 30, 86400 * 365, Infinity];

  // Array equivalent to the above but in the string representation of the units
  const units: Intl.RelativeTimeFormatUnit[] = ["second", "minute", "hour", "day", "week", "month", "year"];

  // Grab the ideal cutoff unit
  const unitIndex = cutoffs.findIndex(cutoff => cutoff > Math.abs(deltaSeconds));

  // Get the divisor to divide from the seconds. E.g. if our unit is "day" our divisor
  // is one day in seconds, so we can divide our seconds by this to get the # of days
  const divisor = unitIndex ? cutoffs[unitIndex - 1] : 1;

  // Intl.RelativeTimeFormat do its magic
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  return rtf.format(Math.floor(deltaSeconds / divisor), units[unitIndex]);
}