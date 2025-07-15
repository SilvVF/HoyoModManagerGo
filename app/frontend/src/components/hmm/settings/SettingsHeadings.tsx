import { ReactNode } from "react";

export const SettingsHeading = (props: { children: ReactNode }) => {
  return (
    <div className="text-2xl font-bold text-foreground hover:underline">
      {props.children}
    </div>
  );
};

export const SettingsSubheading = (props: { children: ReactNode }) => {
  return (
    <div className="flex flex-row text-xl font-semibold text-foreground/75 hover:underline">
      {props.children}
    </div>
  );
};
