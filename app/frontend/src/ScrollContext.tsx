import { createContext, useCallback, useContext } from "react";

export const ScrollContext = createContext<{
    ref: React.RefObject<HTMLDivElement | null>,
    toTop: () => void
} | null>(null);

export const useScrollContext = () => {
    const context = useContext(ScrollContext);
    if (!context) {
        throw new Error('useScrollContext must be used within a ScrollProvider');
    }
    return context;
};

export const ScrollProvider: React.FC<{ provideRef: React.RefObject<HTMLDivElement | null>, children: React.ReactNode }> = ({ children, provideRef }) => {


    const scrollToTop = useCallback((duration: number) => {
        const scrollArea = provideRef.current; // Access the current scroll area ref
        if (!scrollArea) return;

        const start = scrollArea.scrollTop; // Get the current scroll position
        const startTime = performance.now(); // Get the current time

        const scrollAnimation = (currentTime: number) => {
            const timeElapsed = currentTime - startTime; // Calculate elapsed time
            const progress = Math.min(timeElapsed / duration, 1); // Normalize progress

            // Easing function (optional): easeInOutQuad
            const easeInOutQuad = (t: number) => {
                return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            };

            const easeProgress = easeInOutQuad(progress); // Apply easing function
            scrollArea.scrollTop = start * (1 - easeProgress); // Scroll to the new position

            if (progress < 1) {
                requestAnimationFrame(scrollAnimation); // Continue the animation
            }
        };

        requestAnimationFrame(scrollAnimation); // Start the animation
    }, [provideRef]);

    return (
        <ScrollContext.Provider value={
            {
                ref: provideRef,
                toTop: () => scrollToTop(400)
            }
        }>
            {children}
        </ScrollContext.Provider>
    );
};