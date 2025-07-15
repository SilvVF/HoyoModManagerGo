import { Component, ParentProps } from "solid-js";

export const ModIndexPage: Component = (props: ParentProps) => {
  return (
    <div class="flex flex-col">
      <div>MOD INDEX</div>
      <div>{props.children}</div>
    </div>
  );
};
