import { useEffect } from 'react'

// Dezoom global : sous 2000px, rendre l'interface comme un très grand écran (plus dense).
// <1024 = mobile => responsive natif, pas de zoom. (Identique à l'ancienne version MPA.)
export default function useGlobalZoom() {
  useEffect(() => {
    const REF = 2000 // largeur "grand ecran" de reference
    const applyZoom = () => {
      const w = window.innerWidth
      const z = (w >= REF) ? 1 : (w >= 1024 ? 0.64 : 1)
      document.documentElement.style.zoom = String(z)
    }
    applyZoom()
    window.addEventListener('resize', applyZoom)
    return () => window.removeEventListener('resize', applyZoom)
  }, [])
}
