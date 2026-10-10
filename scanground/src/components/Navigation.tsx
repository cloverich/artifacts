import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function Navigation() {
  const location = useLocation()
  const currentPath = location.pathname === '/' ? '/playground' : location.pathname

  const tabs = [
    { path: '/playground', label: 'PLAYGROUND' },
    { path: '/gallery', label: 'GALLERY' },
    { path: '/settings', label: 'SETTINGS' },
  ]

  return (
    <nav className="mb-8 flex gap-4">
      {tabs.map((tab) => (
        <Link
          key={tab.path}
          to={tab.path}
          className={cn(
            'border-4 border-white bg-black text-white px-8 py-4',
            'font-bold text-lg tracking-wider uppercase',
            'hover:bg-cyan-500/20 transition-all duration-150',
            currentPath === tab.path &&
              'bg-cyan-500 text-black shadow-[inset_4px_4px_0px_0px_rgba(0,0,0,0.3)]'
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}
