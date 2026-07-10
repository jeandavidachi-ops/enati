import React, { useState } from 'react'
import { useAudio } from '../lib/audio.jsx'

// Bouton de son flottant (bas-droite) : mute/unmute + reglage du volume.
// Controle la piste partagee de l'AudioProvider.
export default function SoundControl() {
  const { muted, toggleMute, volume, setVolume } = useAudio()
  const [open, setOpen] = useState(false)
  const off = muted || volume === 0

  return (
    <div
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 50, display: 'flex', alignItems: 'center',
        gap: open ? 12 : 0, padding: open ? '10px 16px' : 10, borderRadius: 999,
        border: '1px solid rgba(255,255,255,0.12)', transition: 'gap .25s ease, padding .25s ease',
        background: 'rgba(11,13,16,0.82)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>

      {/* Slider (apparait au survol) */}
      <input type="range" min="0" max="1" step="0.01" value={off ? 0 : volume}
        onChange={(e) => setVolume(parseFloat(e.target.value))}
        aria-label="Volume"
        style={{ width: open ? 96 : 0, opacity: open ? 1 : 0, transition: 'width .25s ease, opacity .2s ease',
          accentColor: '#ffffff', cursor: 'pointer', height: 4, margin: 0, flex: 'none' }} />

      {/* Bouton haut-parleur */}
      <button onClick={toggleMute} aria-label={off ? 'Activer le son' : 'Couper le son'}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24,
          border: 'none', background: 'transparent', color: '#ffffff', cursor: 'pointer', padding: 0 }}>
        {off ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5 6 9H2v6h4l5 4V5z" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5 6 9H2v6h4l5 4V5z" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        )}
      </button>
    </div>
  )
}
