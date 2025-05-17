import { useEffect, useMemo, useRef } from "react"
import { ReadImageFile } from "wailsjs/go/main/App"

type AsyncImageProps = React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>

export default function AsyncImage(props: AsyncImageProps) {

    const ref = useRef<HTMLImageElement>(null)
    const url = useMemo(() => props.src?.trim() ?? "", [props.src])

    useEffect(() => {
        if (url.startsWith("file://") && ref.current) {
            ReadImageFile(url).then((base64) => {
                const dotIdx = url.lastIndexOf(".")
                if (ref.current) {
                    ref.current.src = `data:image/${url.slice(dotIdx, url.length)};base64,${base64}`
                }
            })
        }
    }, [url, ref])

    return <img {...props} />
}