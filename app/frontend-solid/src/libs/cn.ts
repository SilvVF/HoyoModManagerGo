import { cx } from "./utils";
import { ClassValue } from "cva";

export const cn = (...classLists: ClassValue[]) => cx(classLists);
