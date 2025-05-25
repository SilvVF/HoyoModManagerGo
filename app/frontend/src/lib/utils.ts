import { type ClassValue, clsx } from "clsx";
import React from "react";
import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";
import { LogError } from "wailsjs/runtime/runtime";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

export type ProducedState<T, E> = {
  loading: boolean;
  error: E | undefined;
  value: T;
};

export function useStateProducerT<T extends any, E = Error>(
  defaultValue: T,
  producer: (update: (value: T) => void) => Promise<void>,
  keys: ReadonlyArray<unknown> = [],
  debounce: number = 0
): ProducedState<T, E> {
  const [value, setValue] = useState(defaultValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any | undefined>(undefined);

  useEffect(() => {
    let aborted = false;
    const debounced = setTimeout(() => {
      setLoading(true);
      producer((v) => {
        if (!aborted) {
          setValue(v);
        }
      })
        .then(() => setError(undefined))
        .catch((e) => setError(e))
        .finally(() => setLoading(false));
    }, debounce);

    return () => {
      aborted = true;
      setLoading(false);
      clearTimeout(debounced);
    };
  }, keys);

  return {
    loading: loading,
    error: error,
    value: value,
  };
}

export function useStateProducer<T extends any>(
  defaultValue: T,
  producer: (
    update: (value: T) => void,
    onDispose: (dipose: () => void) => void,
  ) => void,
  keys: ReadonlyArray<unknown> = []
): T {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    let aborted = false
    let disposed = false
    let disposeFn: ((() => void) | null) = null

    const disposeIfAborted = () => {
      if (aborted && !disposed && disposeFn) {
        disposeFn()
        disposed = true
      }
    }

    try {
      producer(
        (v) => {
          if (!aborted) {
            setValue(v)
          } else {
            disposeIfAborted()
          }
        },
        (dispose) => {
          disposeFn = dispose
          disposeIfAborted()
        }
      );
    } catch (e: any) {
      LogError(e);
    }

    return () => {
      aborted = true
      disposeIfAborted()
    }
  }, keys);

  return value;
}
