import { useState } from 'react'
import sampleImage from '@/assets/sample.svg'
import { ImageDisplay } from '@/components/ImageDisplay'
import { FilterPanel } from '@/components/FilterPanel'

export function PlaygroundPage() {
  const [scanlinesEnabled, setScanlinesEnabled] = useState(true)
  const [sweepEnabled, setSweepEnabled] = useState(false)
  const [saturation, setSaturation] = useState(50)
  const [dithering, setDithering] = useState<'none' | 'atkinson' | 'bayer'>('none')

  return (
    <div className="flex gap-8 items-start">
      <FilterPanel
        scanlinesEnabled={scanlinesEnabled}
        sweepEnabled={sweepEnabled}
        saturation={saturation}
        dithering={dithering}
        onScanlinesToggle={setScanlinesEnabled}
        onSaturationChange={setSaturation}
        onDitheringChange={setDithering}
        onSweepToggle={setSweepEnabled}
      />

      <div className="flex-1">
        <ImageDisplay
          src={sampleImage}
          scanlinesEnabled={scanlinesEnabled}
          sweepEnabled={sweepEnabled}
          saturation={saturation}
          dithering={dithering}
        />
      </div>
    </div>
  )
}
