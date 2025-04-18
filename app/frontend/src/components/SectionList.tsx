import { ReactNode } from "react"
import { Button } from "./ui/button"
import { Card } from "./ui/card"
import { cn } from "@/lib/utils"

export type SectionAction = {
    title: string,
    onClick: () => void
}

export function PlusIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            height="24px"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2 h-4 w-4 fill-foreground"
            viewBox="0 -960 960 960"
            width="24px"
        >
            <path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z" />
        </svg>
    )
}

export function SectionList<T>(
    { className, actions, title, items, itemContent, createKey }: {
        className?: string | undefined,
        actions?: SectionAction[],
        title?: string,
        items: T[] | undefined
        createKey: (item: T) => React.Key | null | undefined
        itemContent: (value: T, i: number, arr: T[]) => ReactNode
    }
) {
    return (
        <div className={cn(className, "flex flex-col space-y-2")}>
            <h2 className="text-lg font-semibold tracking-tight">
                {title}
            </h2>
            <div>
                <div className="flex flex-row">
                    {actions?.map((action) => (
                        <Button
                            className="w-full justify-start"
                            variant="ghost"
                            onPointerDown={action.onClick}
                        >
                            <PlusIcon />
                            {action.title}
                        </Button>
                    ))}
                </div>
                <Card>
                    <div className="space-y-1 p-2 overflow-y-auto max-h-[300px]">
                        {items?.map((item, i, arr) => {
                            return (
                                <div
                                    key={createKey(item)}
                                    className="flex flex-row justify-between items-center p-2 rounded-lg hover:bg-primary-foreground"
                                >
                                    {itemContent(item, i, arr)}
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>
        </div>
    )
}