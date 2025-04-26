import { useViewTransitionsPref } from "@/data/prefs";
import { NavigateOptions, To, useLocation, useNavigate } from "react-router-dom";
import { LogDebug } from "wailsjs/runtime/runtime";


export default function useTransitionNavigate() {

    const navigate = useNavigate();
    const location = useLocation();

    return (to: To, options?: NavigateOptions) => {
        const isSameRoute = location.pathname.includes(to.toString())

        LogDebug(location.pathname + " --- " + to)

        if (!isSameRoute) {
            useViewTransitionsPref.Get().then((transition) => {
                if (transition && document.startViewTransition) {
                    document.startViewTransition(() => navigate(to, options));
                } else {
                    navigate(to, options);
                }
            })
        } else {
            navigate(to, options);
        }
    };
}

export function useTransitionNavigateDelta() {
    const navigate = useNavigate();

    return (delta: number) => {
        if (delta !== 0) {
            useViewTransitionsPref.Get().then((transition) => {
                if (transition && document.startViewTransition) {
                    document.startViewTransition(() => navigate(delta));
                } else {
                    navigate(delta);
                }
            })
        } else {
            navigate(delta);
        }
    };
}

