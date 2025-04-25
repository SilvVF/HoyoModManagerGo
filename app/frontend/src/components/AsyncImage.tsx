import { HTMLAttributes, useEffect, useRef } from "react"
import { ReadImageFile } from "wailsjs/go/main/App"

interface AsyncImageProps extends HTMLAttributes<HTMLImageElement> {
    uri: string
}

export default function AsyncImage({ uri, ...rest }: AsyncImageProps) {
    const ref = useRef<HTMLImageElement>(null)

    useEffect(() => {
        if (uri.startsWith("file://") && ref.current) {
            ReadImageFile(uri).then((base64) => {
                const dotIdx = uri.lastIndexOf(".")
                if (ref.current) {
                    ref.current.src = `data:image/${uri.slice(dotIdx, uri.length)};base64,${base64}`
                }
            })
        }
    }, [uri, ref])

    return (<img ref={ref} src={uri} alt={uri} {...rest} />)
}