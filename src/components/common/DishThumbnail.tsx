import { useState } from "react"
import { Utensils } from "lucide-react"

export function DishThumbnail({ imageUrl }: { imageUrl?: string | null }) {
  const src = imageUrl?.trim()
  const [failedSrc, setFailedSrc] = useState<string>()

  return (
    <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-muted text-text-tertiary md:size-10">
      {src && failedSrc !== src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <Utensils aria-hidden="true" className="size-4 md:size-5" />
      )}
    </span>
  )
}
