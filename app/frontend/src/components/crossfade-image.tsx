import { cn } from "@/lib/utils";
import { ImgHTMLAttributes, useEffect, useState } from "react";

export interface CrossfadeImageProps extends ImgHTMLAttributes<HTMLImageElement> { }

export const CrossfadeImage = ({ src, alt, className, onClick, ...imgProps }: CrossfadeImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = src ?? "";
    img.onload = () => setIsLoaded(true);
  }, [src]);

  return (
    <div className="relative" onClick={onClick}>
      {/* Placeholder */}
      <div className={cn(className, "absolute inset-0", isLoaded ? 'fade-out hidden' : 'fade-in visible')} />

      {/* Image */}
      <img
        {...imgProps}
        src={src}
        alt={alt}
        className={cn(className, `${isLoaded ? 'fade-in' : 'fade-out'}`)}
      />
    </div>
  );
};