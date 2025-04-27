import { useViewTransitionsPref } from "@/data/prefs";
import { NavigateOptions, To, useLocation, useNavigate } from "react-router-dom";
import { LogDebug } from "wailsjs/runtime/runtime";
import { create } from "zustand";
import { useShallow } from "zustand/shallow";

export interface ViewTransitionStore {
    useTransitions: boolean,
    setTransition: (value: boolean) => void;
    init: () => Promise<void>
    initialized: boolean
}

const useViewTransitionsStoreInternal = create<ViewTransitionStore>((set, get) => ({
    useTransitions: false,
    setTransition: (value: boolean) => {
        useViewTransitionsPref.Set(value).then(() => {
            set({
                useTransitions: value
            })
        })
    },
    initialized: false,
    init: async () => {

        if (get().initialized) {
            return
        }

        set({
            useTransitions: await useViewTransitionsPref.Get()
        })
    }
}))

export const useViewTransitionsStore = useViewTransitionsStoreInternal

export default function useTransitionNavigate() {

    const useTransitions = useViewTransitionsStore(
        useShallow(state => state.useTransitions)
    )
    const navigate = useNavigate();
    const location = useLocation();

    return (to: To, options?: NavigateOptions) => {
        const isSameRoute = location.pathname.includes(to.toString())

        LogDebug(location.pathname + " --- " + to)

        if (!isSameRoute && useTransitions) {
            if (document.startViewTransition) {
                document.startViewTransition(() => navigate(to, options));
            } else {
                navigate(to, options);
            }
        } else {
            navigate(to, options);
        }
    };
}

export function useTransitionNavigateDelta() {
    const useTransitions = useViewTransitionsStore(
        useShallow(state => state.useTransitions)
    )

    const navigate = useNavigate();

    return (delta: number) => {
        if (delta !== 0 && useTransitions) {
            if (document.startViewTransition) {
                document.startViewTransition(() => navigate(delta));
            } else {
                navigate(delta);
            }
        } else {
            navigate(delta);
        }
    };
}

