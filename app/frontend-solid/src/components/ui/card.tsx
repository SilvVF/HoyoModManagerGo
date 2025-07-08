import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";

import { cx } from "@/libs/utils";

export type CardProps = ComponentProps<"div">;

export const Card = (props: CardProps) => {
  const [local, rest] = splitProps(props, ["class"]);

  return (
    <div
      data-slot="card"
      class={cx(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
        local.class
      )}
      {...rest}
    />
  );
};

export type CardHeaderProps = ComponentProps<"div">;

export const CardHeader = (props: CardHeaderProps) => {
  const [local, rest] = splitProps(props, ["class"]);

  return (
    <div
      data-slot="card-header"
      class={cx(
        "@container/card-header has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6 grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6",
        local.class
      )}
      {...rest}
    />
  );
};

export type CardTitleProps = ComponentProps<"div">;

export const CardTitle = (props: CardTitleProps) => {
  const [local, rest] = splitProps(props, ["class"]);

  return (
    <div
      data-slot="card-title"
      class={cx("font-semibold leading-none", local.class)}
      {...rest}
    />
  );
};

export type CardDescriptionProps = ComponentProps<"div">;

export const CardDescription = (props: CardDescriptionProps) => {
  const [local, rest] = splitProps(props, ["class"]);

  return (
    <div
      data-slot="card-description"
      class={cx("text-muted-foreground text-sm", local.class)}
      {...rest}
    />
  );
};

export type CardActionProps = ComponentProps<"div">;

export const CardAction = (props: CardActionProps) => {
  const [local, rest] = splitProps(props, ["class"]);

  return (
    <div
      data-slot="card-action"
      class={cx(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        local.class
      )}
      {...rest}
    />
  );
};

export type CardContentProps = ComponentProps<"div">;

export const CardContent = (props: CardContentProps) => {
  const [local, rest] = splitProps(props, ["class"]);

  return (
    <div data-slot="card-content" class={cx("px-6", local.class)} {...rest} />
  );
};

export type CardFooterProps = ComponentProps<"div">;

export const CardFooter = (props: CardFooterProps) => {
  const [local, rest] = splitProps(props, ["class"]);

  return (
    <div
      data-slot="card-footer"
      class={cx("[.border-t]:pt-6 flex items-center px-6", local.class)}
      {...rest}
    />
  );
};
