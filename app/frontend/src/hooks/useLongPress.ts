import { useMemo, useRef } from "react";

export type LongPressEvent = React.MouseEvent | React.TouchEvent;

export type UseLongPressOptions = {
    threshold?: number;
    onStart?: (event: LongPressEvent) => void;
    onFinish?: (event: LongPressEvent) => void;
    onCancel?: (event: LongPressEvent) => void;
};

export function useLongPress(
    callback: (event: LongPressEvent) => void,
    options: UseLongPressOptions = {}
) {
    const { threshold = 400, onStart, onFinish, onCancel } = options;

    const isLongPressActive = useRef(false);
    const isPressed = useRef(false);
    const timerId = useRef<number | null>(null);

    const isMouseEvent = (e: any): e is React.MouseEvent => 'button' in e;
    const isTouchEvent = (e: any): e is React.TouchEvent => 'touches' in e;

    return useMemo(() => {
        if (typeof callback !== "function") return {};

        const start = (event: LongPressEvent) => {
            if (!isMouseEvent(event) && !isTouchEvent(event)) return;

            onStart?.(event);
            isPressed.current = true;

            timerId.current = window.setTimeout(() => {
                callback(event);
                isLongPressActive.current = true;
            }, threshold);
        };

        const cancel = (event: LongPressEvent) => {
            if (!isMouseEvent(event) && !isTouchEvent(event)) return;

            if (isLongPressActive.current) {
                onFinish?.(event);
            } else if (isPressed.current) {
                onCancel?.(event);
            }

            isLongPressActive.current = false;
            isPressed.current = false;

            if (timerId.current !== null) {
                clearTimeout(timerId.current);
                timerId.current = null;
            }
        };

        return {
            onMouseDown: start,
            onMouseUp: cancel,
            onMouseLeave: cancel,
            onTouchStart: start,
            onTouchEnd: cancel,
        };
    }, [callback, threshold, onStart, onFinish, onCancel]);
}
