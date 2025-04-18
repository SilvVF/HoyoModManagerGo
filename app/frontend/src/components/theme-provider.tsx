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
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: (localStorage.getItem("last_theme") ?? "system") as Theme,
  isDark: localStorage.getItem("last_dark") === "true",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = usePrefrenceAsState(darkThemePref)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    if (theme === undefined) return
    const root = window.document.documentElement
    localStorage.setItem("last_theme", theme)
    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      localStorage.setItem("last_dark", systemTheme === "dark" ? "true" : "false")
      setIsDark(systemTheme === "dark")
      root.classList.add(systemTheme)
      return
    }
    setIsDark(theme === "dark")
    root.classList.add(theme)
  }, [theme])

  const value = {
    theme: (theme ?? defaultTheme) as Theme,
    setTheme: (theme: Theme) => setTheme(theme),
    isDark: isDark
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}