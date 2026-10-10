import { cn } from "@/lib/utils"
import { Dithering } from "./Dithering"

interface ImageDisplayProps {
  src: string
  scanlinesEnabled: boolean
  sweepEnabled: boolean
  saturation: number
  dithering: 'none' | 'atkinson' | 'bayer'
}

export function ImageDisplay({
  src,
  scanlinesEnabled,
  sweepEnabled,
  saturation,
  dithering,
}: ImageDisplayProps) {
  const filterStyle = {
    filter: `saturate(${saturation}%)`
  }

  const className = cn(
    "relative inline-block border-4 border-white effects-container",
    scanlinesEnabled && "scanlines",
    sweepEnabled && "sweep",
    dithering !== 'none' && "dithering-enabled",
  )

  return (
    <div className={className}>
      <div className="relative">
        <img
          src={src}
          alt="Filtered"
          className="max-w-full h-auto block"
          style={filterStyle}
        />
        <Dithering type={dithering} />
      </div>
    </div>
  )
}
