import { Button } from "@/components/ui/button"
import React, { useEffect } from "react"
import { syncCharacters } from "./data/sync"

function App() {
  const [count, setCount] = React.useState(0)

  useEffect(() => {
    syncCharacters()
  }, [])

  return (
    <div className="min-h-screen bg-white grid place-items-center mx-auto py-8">
      <div className="text-blue-900 text-2xl font-bold flex flex-col items-center space-y-4">
        <h1>Vite + React + TS + Tailwind + shadcn/ui</h1>
        <Button onClick={() => setCount(count + 1)}>Count up ({count})</Button>
      </div>
    </div>
  )
}

export default App
