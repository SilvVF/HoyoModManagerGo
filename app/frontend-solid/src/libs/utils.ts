import type { JSX } from "solid-js";
import { twMerge } from "tailwind-merge";
import { defineConfig } from "cva";

// Function assertions
export const isFunction = (value: unknown): value is Function =>
  typeof value === "function";

export const { cva, cx, compose } = defineConfig({
  hooks: {
    onComplete: (className) => twMerge(className),
  },
});

/** Call a JSX.EventHandlerUnion with the event. */
export const callHandler = <T, E extends Event>(
  event: E & { currentTarget: T; target: Element },
  handler: JSX.EventHandlerUnion<T, E> | undefined
) => {
  if (handler) {
    if (isFunction(handler)) {
      handler(event);
    } else {
      handler[0](handler[1], event);
    }
  }

  return event.defaultPrevented;
};
