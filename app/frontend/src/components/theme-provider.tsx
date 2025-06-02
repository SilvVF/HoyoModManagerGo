import { darkThemePref, usePrefrenceAsState } from "@/data/prefs"
import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  isDark: boolean
  themeKey: ThemeKey
  setTheme: (theme: Theme) => void
  setThemeKey: (themeKey: ThemeKey) => void
}

const sKey = "THEME_KEY"

type ThemeKey = "catapuccin" | "mono" | "doom" | "bubblegum" | "kodama"

export const ThemeKeys: ThemeKey[] = ["catapuccin", "mono", "doom", "bubblegum", "kodama"]

const initialTheme = (): ThemeKey => {
  const item = localStorage.getItem(sKey)
  if (item && ThemeKeys.map(it => String(it)).includes(item)) {
    return item as ThemeKey
  } else {
    return "catapuccin"
  }
}

const initialState: ThemeProviderState = {
  theme: (localStorage.getItem("last_theme") ?? "system") as Theme,
  isDark: localStorage.getItem("last_dark") === "true",
  themeKey: initialTheme(),
  setTheme: () => null,
  setThemeKey: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = usePrefrenceAsState(darkThemePref)
  const [isDark, setIsDark] = useState(false)
  const [themeKey, setThemeKey] = useState<ThemeKey>(initialTheme())

  useEffect(() => {
    if (theme === undefined) return
    const root = window.document.documentElement
    localStorage.setItem(sKey, themeKey)

    for (const key of ThemeKeys) {
      root.classList.remove(key + "-" + "dark", key + "-" + "light")
    }

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      setIsDark(systemTheme === "dark")
      root.classList.add(themeKey + "-" + systemTheme)
    } else {
      setIsDark(theme === "dark")
      root.classList.add(themeKey + "-" + theme)
    }
  }, [theme, themeKey])

  const value = {
    theme: (theme ?? "system") as Theme,
    setTheme: (theme: Theme) => setTheme(theme),
    themeKey: themeKey,
    isDark: isDark,
    setThemeKey: setThemeKey
  }

  return (
    <div className={themeKey + "-" + (theme ?? "dark")}>
      <ThemeProviderContext.Provider {...props} value={value}>
        {children}
      </ThemeProviderContext.Provider>
    </div>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}