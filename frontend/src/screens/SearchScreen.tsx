import { create } from "zustand"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SearchIcon } from "lucide-react"
import { LogDebug } from "../../wailsjs/runtime/runtime"
import { useShallow } from "zustand/shallow"
import { useNavigate } from "react-router-dom"

interface SearchState {
    query: string,
    searching: boolean,
    results: SearchResult[],
    _cancelSearch: () => void,
    _performSearch: () => void,
    onQueryChange: (value: string) => void
    onSearch: () => void
}

type Bang = "tag" | "mod" | "character" | "game" | "g"

type BangWithQuery = {
    bang: Bang;
    query: string;
};

type SearchResult = {
    path: string
    text: string
}

function extractBangText(input: string): BangWithQuery[] {
    const regex = /!(tag|mod|character|game|g)\s+([^\!]+)/g;
    const matches = Array.from(input.matchAll(regex));

    return matches.map(match => ({
        bang: match[1] as Bang,
        query: match[2].trim()
    }));
}

function gbUrlParse(url: string): string | undefined {
    const match = url.match(/https:\/\/gamebanana\.com\/mods\/(.+)/);
    return match ? match[1] : undefined;
}

const useSearchStore = create<SearchState>((set, get) => ({
    query: "",
    results: [],
    searching: false,
    _cancelSearch: () => {},
    _performSearch: async () => {
        if (get().searching) return
        set({searching: true})

        const query = get().query
        const results = Array<SearchResult>()

        const subPath = gbUrlParse(query)
        LogDebug(`subpath: ${subPath}`)
        if (subPath !== undefined) {
            results.push({path: `/mods/${subPath}`, text: "Search for url on game bannana"})
        }

        let bangsWithQuery = extractBangText(query)
        if (bangsWithQuery.isEmpty()) {
            bangsWithQuery = [{bang: "g", query: query}]
        }

        for (let i = 0; i < bangsWithQuery.length; i++) {
            const { bang, query}  = bangsWithQuery[i]
            LogDebug(bang + " " + query)
            switch(bang) {
                case "tag":
                    break; 
                case "mod": 
                    break; 
                case "character":
                    break; 
                case "game": 
                    break; 
                case "g":
                    break;
            }
        }

        set({
            results: results,
            searching: false
        })
    },
    onQueryChange: (value) => {
        get()._cancelSearch()
        const timeout = setTimeout(get()._performSearch, 200)
        set({
            query: value,
            _cancelSearch: () => clearTimeout(timeout)
        })
    },
    onSearch: () => {
        get()._cancelSearch()
        const timeout = setTimeout(get()._performSearch, 0)
        set({
            _cancelSearch: () => clearTimeout(timeout)
        })
    }
}))

export function SearchScreen() {
    
    const navigate = useNavigate()
    const results = useSearchStore(useShallow(state => state.results))

    return (
        <div className="flex flex-col h-full w-full items-center justify-top">
            <SearchBar />
            {
                results.map((res) => (
                    <div onClick={() => navigate(res.path)}>
                        {res.text}
                    </div>
                ))
            }
        </div>
    )
}

function SearchBar() {

    const onSearchChange = useSearchStore(state => state.onQueryChange)
    const query = useSearchStore(useShallow(state => state.query))
    const onSearch = useSearchStore(state => state.onSearch)
    const handleChange = (event: any) => {
        onSearchChange(event.target.value);
    };

    return (
        <div className="flex w-3/4 items-center space-x-2">
        <Input  
            value={query}
            className="p-4 m-4"
            placeholder="Search..."
            onInput={handleChange}
            onSubmit={onSearch}
        />
        <Button size="icon" onClick={onSearch}>
            <SearchIcon />
        </Button>
        </div>
    )
}