import { HashRouter, Routes, Route, Outlet } from 'react-router-dom'
import { Navigation } from '@/components/Navigation'
import { PlaygroundPage } from '@/pages/PlaygroundPage'
import { GalleryPage } from '@/pages/GalleryPage'
import { SettingsPage } from '@/pages/SettingsPage'

function Layout() {
  return (
    <div className="min-h-screen bg-black p-8">
      <header className="mb-8">
        <div className="relative inline-block">
          <h1 className="scanlines text-6xl font-black tracking-tighter text-white border-4 border-white px-8 py-4 shadow-[6px_6px_0px_0px_rgba(0,255,255,0.5)]">
            SCANGROUND
          </h1>
          <div className="absolute -bottom-3 -right-3 w-full h-full border-2 border-cyan-500 -z-10"></div>
        </div>
      </header>

      <Navigation />

      <Outlet />
    </div>
  )
}

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<PlaygroundPage />} />
          <Route path="playground" element={<PlaygroundPage />} />
          <Route path="gallery" element={<GalleryPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
