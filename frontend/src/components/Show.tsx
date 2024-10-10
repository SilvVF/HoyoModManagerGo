import { useMemo } from "react";

export function Show<T>(props: {
  when: T | undefined | null | false;
  keyed?: boolean;
  fallback?: JSX.Element;
  children: JSX.Element;
}): JSX.Element {
  return useMemo(() => {
    const c = props.when;
    if (c && c !== undefined && c !== null) {
      return props.children;
    }
    return props.fallback as unknown as JSX.Element;
  }, [props.when]);
}
