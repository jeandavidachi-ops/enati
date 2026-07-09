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
  const prevIds = useRef(null)          // Set des ids du passage precedent
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

    // Ensemble des ids presents ce passage.
    const curIds = new Set(Array.from(els).map((el) => el.getAttribute('data-flip-id')))
    // On n'anime QUE si l'ensemble des items est identique au passage precedent
    // (= vrai reclassement). Au 1er passage / peuplement / pagination, on ne fait
    // que memoriser les positions, sans transform ni flash (evite le glitch d'apparition).
    const prev = prevIds.current
    const sameSet = prev && prev.size === curIds.size &&
      Array.from(curIds).every((id) => prev.has(id))

    els.forEach((el) => {
      const id = el.getAttribute('data-flip-id')
      const rect = el.getBoundingClientRect()
      const prevRect = prevRects.current.get(id)

      if (sameSet && prevRect && !reduce) {
        const dx = prevRect.left - rect.left
        const dy = prevRect.top - rect.top
        if (dx || dy) {
          // FLIP : on part de l'ancienne position...
          el.style.transition = 'none'
          el.style.transform = `translate(${dx}px, ${dy}px)`
          // ...puis on rejoint la nouvelle au frame suivant.
          requestAnimationFrame(() => {
            el.style.transition = 'transform .6s cubic-bezier(.34,1.2,.4,1)'
            el.style.transform = ''
            // Nettoie les styles inline apres l'anim pour ne pas ralentir le hover
            // .elevate-card (qui utilise aussi transform).
            setTimeout(() => { el.style.transition = ''; el.style.transform = '' }, 640)
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

    // Memorise les index de rang + l'ensemble des ids pour le prochain passage.
    prevIndex.current = curIndex
    prevIds.current = curIds

    // Purge les ids disparus.
    const alive = new Set(Array.from(els).map((el) => el.getAttribute('data-flip-id')))
    prevRects.current.forEach((_, id) => { if (!alive.has(id)) prevRects.current.delete(id) })
  })

  useLayoutEffect(() => {
    const timers = flashTimers.current
    return () => { timers.forEach((t) => clearTimeout(t)) }
  }, [])
}
