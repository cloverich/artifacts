import { Toggle } from '@/components/ui/toggle'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface FilterPanelProps {
  scanlinesEnabled: boolean
  sweepEnabled: boolean
  saturation: number
  dithering: 'none' | 'atkinson' | 'bayer'
  onScanlinesToggle: (enabled: boolean) => void
  onSweepToggle: (enabled: boolean) => void
  onSaturationChange: (value: number) => void
  onDitheringChange: (value: 'none' | 'atkinson' | 'bayer') => void
}

export function FilterPanel({
  scanlinesEnabled,
  sweepEnabled,
  saturation,
  dithering,
  onScanlinesToggle,
  onSweepToggle,
  onSaturationChange,
  onDitheringChange,
}: FilterPanelProps) {
  return (
    <div className="border-4 border-white bg-black p-6 space-y-6 min-w-[320px]">
      <h2 className="text-2xl font-bold text-white tracking-tight">FILTERS</h2>

      <div className="space-y-6">
        {/* Scanlines */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-white uppercase tracking-wider">
              Scanlines
            </label>
            <Toggle
              pressed={scanlinesEnabled}
              onPressedChange={onScanlinesToggle}
              className="border-2 border-cyan-500 data-[state=on]:bg-cyan-500 data-[state=on]:text-black"
            >
              {scanlinesEnabled ? 'ON' : 'OFF'}
            </Toggle>
          </div>
        </div>

        {/* Sweep */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-white uppercase tracking-wider">
              Sweep
            </label>
            <Toggle
              pressed={sweepEnabled}
              onPressedChange={onSweepToggle}
              className="border-2 border-cyan-500 data-[state=on]:bg-cyan-500 data-[state=on]:text-black"
            >
              {sweepEnabled ? 'ON' : 'OFF'}
            </Toggle>
          </div>
        </div>

        {/* Saturation */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-cyan-500 uppercase">
            <span>Saturation</span>
            <span>{saturation}%</span>
          </div>
          <Slider
            value={[saturation]}
            onValueChange={([value]) => onSaturationChange(value)}
            min={0}
            max={200}
            step={5}
            className="w-full"
          />
        </div>

        {/* Dithering */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white uppercase tracking-wider block">
            Dithering
          </label>
          <Select value={dithering} onValueChange={onDitheringChange}>
            <SelectTrigger className="w-full border-2 border-cyan-500 bg-black text-white uppercase">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-black border-2 border-cyan-500">
              <SelectItem value="none" className="text-white uppercase hover:bg-cyan-500 hover:text-black">None</SelectItem>
              <SelectItem value="atkinson" className="text-white uppercase hover:bg-cyan-500 hover:text-black">Atkinson</SelectItem>
              <SelectItem value="bayer" className="text-white uppercase hover:bg-cyan-500 hover:text-black">Bayer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
