import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react'

// =====================================================================
//  Audio partagé au niveau racine (au-dessus des routes) : un unique
//  <audio> qui persiste lors des changements de page (Enter -> register),
//  pour que la musique lancée au clic sur VERSUS continue de jouer.
//  L'état (muted / volume) est la source de vérité ; useEffect le
//  réplique sur l'élément <audio> (pas d'effet de bord dans les setters).
// =====================================================================

const AudioCtx = createContext(null)

const SRC = '/audio/versus-theme.mp3'

export function AudioProvider({ children }) {
  const ref = useRef(null)
  const [started, setStarted] = useState(false)
  const [muted, setMuted] = useState(false)
  const [volume, setVolumeState] = useState(0.5)

  // Réplique l'état sur l'élément audio.
  useEffect(() => { if (ref.current) ref.current.volume = volume }, [volume])
  useEffect(() => { if (ref.current) ref.current.muted = muted }, [muted])

  // Lance la lecture (doit être appelé depuis un geste utilisateur : clic).
  const play = useCallback(() => {
    const el = ref.current
    if (!el) return
    const p = el.play()
    if (p && p.catch) p.catch(() => {})
    setStarted(true)
  }, [])

  // Bascule le son. Si on ré-active alors que la piste est en pause (ex. accès
  // direct à /register), on la démarre — le clic est un geste utilisateur valide.
  const toggleMute = useCallback(() => {
    const willUnmute = muted
    setMuted((m) => !m)
    if (willUnmute && ref.current && ref.current.paused) {
      const p = ref.current.play()
      if (p && p.catch) p.catch(() => {})
      setStarted(true)
    }
  }, [muted])

  const setVolume = useCallback((v) => {
    const vol = Math.min(1, Math.max(0, v))
    setVolumeState(vol)
    if (vol > 0) setMuted(false)
  }, [])

  return (
    <AudioCtx.Provider value={{ started, play, muted, toggleMute, volume, setVolume }}>
      <audio ref={ref} src={SRC} loop preload="auto" />
      {children}
    </AudioCtx.Provider>
  )
}

export function useAudio() {
  const ctx = useContext(AudioCtx)
  if (!ctx) throw new Error('useAudio must be used within <AudioProvider>')
  return ctx
}
