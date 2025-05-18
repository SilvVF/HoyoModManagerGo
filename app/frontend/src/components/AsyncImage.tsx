import { useLayoutEffect, useRef } from "react"
import { ReadImageFile } from "wailsjs/go/main/App"

type AsyncImageProps = React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>

export default function AsyncImage(props: AsyncImageProps) {

    const ref = useRef<HTMLImageElement>(null)

    useLayoutEffect(() => {
        const uri = ref?.current?.src
        if (!uri) return
        if (uri.startsWith("file://")) {
            ReadImageFile(uri).then((base64) => {
                const dotIdx = uri.lastIndexOf(".")
                if (ref.current) {
                    ref.current.src = `data:image/${uri.slice(dotIdx, uri.length)};base64,${base64}`
                }
            })
        }
    }, [props.src, ref])

    return <img {...props} />
}