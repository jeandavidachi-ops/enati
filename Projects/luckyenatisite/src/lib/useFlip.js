import { useLayoutEffect, useRef } from 'react'

// Hook FLIP generique : anime le reclassement des enfants portant [data-flip-id].
// - Mesure la position de chaque enfant avant/apres render (getBoundingClientRect).
// - Applique le delta en transform sans transition, puis le remet a 0 avec une
//   transition -> glissement fluide 2D (marche en grille ET en liste).
// - Pose une classe .is-rising / .is-falling (~1.1s) selon le changement d'index
//   de rang (orderedIds), pour le flash vert/rouge + badge (CSS global.css).
//
// containerRef : ref sur le conteneur direct des elements flip.
// orderedIds   : tableau des ids (memes valeurs que data-flip-id) dans l'ordre courant.
export default function useFlip(containerRef, orderedIds) {
  const prevRects = useRef(new Map())   // id -> DOMRect precedent
  const prevIndex = useRef(new Map())   // id -> index de rang precedent
  const flashTimers = useRef(new Map()) // id -> timeout de nettoyage de classe

  const reduce = typeof window !== 'undefined' &&
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const els = container.querySelectorAll('[data-flip-id]')

    // Index de rang courant (position dans orderedIds).
    const curIndex = new Map()
    ;(orderedIds || []).forEach((id, i) => curIndex.set(String(id), i))

    els.forEach((el) => {
      const id = el.getAttribute('data-flip-id')
      const rect = el.getBoundingClientRect()
      const prev = prevRects.current.get(id)

      if (prev && !reduce) {
        const dx = prev.left - rect.left
        const dy = prev.top - rect.top
        if (dx || dy) {
          // FLIP : on part de l'ancienne position...
          el.style.transition = 'none'
          el.style.transform = `translate(${dx}px, ${dy}px)`
          // ...puis on rejoint la nouvelle au frame suivant.
          requestAnimationFrame(() => {
            el.style.transition = 'transform .6s cubic-bezier(.34,1.2,.4,1)'
            el.style.transform = ''
          })

          // Flash selon le changement de rang (plus juste que dy en grille).
          const pi = prevIndex.current.get(id)
          const ci = curIndex.get(id)
          if (pi != null && ci != null && pi !== ci) {
            const cls = ci < pi ? 'is-rising' : 'is-falling'
            el.classList.remove('is-rising', 'is-falling')
            // reflow pour rejouer l'anim si deja flashee
            void el.offsetWidth
            el.classList.add(cls)
            const t0 = flashTimers.current.get(id)
            if (t0) clearTimeout(t0)
            const t = setTimeout(() => {
              el.classList.remove('is-rising', 'is-falling')
              flashTimers.current.delete(id)
            }, 1100)
            flashTimers.current.set(id, t)
          }
        }
      }
      prevRects.current.set(id, rect)
    })

    // Memorise les index de rang pour le prochain passage.
    prevIndex.current = curIndex

    // Purge les ids disparus.
    const alive = new Set(Array.from(els).map((el) => el.getAttribute('data-flip-id')))
    prevRects.current.forEach((_, id) => { if (!alive.has(id)) prevRects.current.delete(id) })
  })

  useLayoutEffect(() => {
    const timers = flashTimers.current
    return () => { timers.forEach((t) => clearTimeout(t)) }
  }, [])
}
