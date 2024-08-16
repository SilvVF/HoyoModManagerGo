import { type ClassValue, clsx } from "clsx"
import { useEffect, useState } from "react"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function produceState<T extends any>(
  defaultValue: T,
  producer: (update: (value: T) => void) => Promise<void>
): T {
  
  const [value, setValue] = useState(defaultValue)
  
  useEffect(() => { 
     producer(setValue).catch(e => console.log(e))
  }, [])

  return value
}