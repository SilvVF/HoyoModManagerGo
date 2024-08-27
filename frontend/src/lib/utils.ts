import { type ClassValue, clsx } from "clsx"
import { useEffect, useState } from "react"
import { twMerge } from "tailwind-merge"
import { LogError } from "../../wailsjs/runtime/runtime"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function useStateProducer<T extends any>(
  defaultValue: T,
  producer: (update: (value: T) => void) => Promise<void>,
  keys: any[]
): T {
  
  const [value, setValue] = useState(defaultValue)
  
  useEffect(() => { 
     setValue(defaultValue)
     producer(setValue).catch(e => LogError(e))
  }, [...keys])

  return value
}