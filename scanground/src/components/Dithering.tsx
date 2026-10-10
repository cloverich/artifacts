interface DitheringProps {
  type: 'none' | 'atkinson' | 'bayer'
}

export function Dithering({ type }: DitheringProps) {
  if (type === 'none') return null

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {type === 'bayer' && (
          <pattern
            id="bayer"
            patternUnits="userSpaceOnUse"
            width="8"
            height="8"
          >
            <rect x="0" y="0" width="1" height="1" fill="black" opacity="0.0625" />
            <rect x="4" y="0" width="1" height="1" fill="black" opacity="0.5" />
            <rect x="2" y="1" width="1" height="1" fill="black" opacity="0.1875" />
            <rect x="6" y="1" width="1" height="1" fill="black" opacity="0.6875" />
            <rect x="0" y="2" width="1" height="1" fill="black" opacity="0.125" />
            <rect x="4" y="2" width="1" height="1" fill="black" opacity="0.5625" />
            <rect x="2" y="3" width="1" height="1" fill="black" opacity="0.25" />
            <rect x="6" y="3" width="1" height="1" fill="black" opacity="0.75" />
            <rect x="1" y="4" width="1" height="1" fill="black" opacity="0.03125" />
            <rect x="5" y="4" width="1" height="1" fill="black" opacity="0.53125" />
            <rect x="3" y="5" width="1" height="1" fill="black" opacity="0.21875" />
            <rect x="7" y="5" width="1" height="1" fill="black" opacity="0.71875" />
            <rect x="1" y="6" width="1" height="1" fill="black" opacity="0.15625" />
            <rect x="5" y="6" width="1" height="1" fill="black" opacity="0.59375" />
            <rect x="3" y="7" width="1" height="1" fill="black" opacity="0.28125" />
            <rect x="7" y="7" width="1" height="1" fill="black" opacity="0.78125" />
          </pattern>
        )}
        {type === 'atkinson' && (
          <pattern
            id="atkinson"
            patternUnits="userSpaceOnUse"
            width="4"
            height="4"
          >
            <rect x="0" y="0" width="1" height="1" fill="black" opacity="0.15" />
            <rect x="1" y="0" width="1" height="1" fill="black" opacity="0.45" />
            <rect x="2" y="0" width="1" height="1" fill="black" opacity="0.3" />
            <rect x="0" y="1" width="1" height="1" fill="black" opacity="0.35" />
            <rect x="1" y="1" width="1" height="1" fill="black" opacity="0.2" />
            <rect x="2" y="1" width="1" height="1" fill="black" opacity="0.5" />
            <rect x="0" y="2" width="1" height="1" fill="black" opacity="0.25" />
            <rect x="1" y="2" width="1" height="1" fill="black" opacity="0.4" />
          </pattern>
        )}
      </defs>
      <rect width="100%" height="100%" fill={`url(#${type})`} />
    </svg>
  )
}
