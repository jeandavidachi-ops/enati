import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAudio } from '../lib/audio.jsx'

// =====================================================================
//  Page racine "Versus Enter" : ecran d'accueil avant "Register Your
//  Group". Design repris a l'identique du modele new/Versus Enter.html.
//  Clic sur VERSUS -> lance la musique (geste utilisateur) + navigue
//  vers /register (la piste continue via l'AudioProvider racine).
// =====================================================================

const LOGO = '/images/vs-noir.png'

export default function Enter() {
  const navigate = useNavigate()
  const { play } = useAudio()

  const enter = () => {
    play()
    navigate('/register')
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', width: '100%', overflow: 'hidden', background: '#050607', fontFamily: "'Manrope', -apple-system, system-ui, sans-serif" }}>
      <style>{enterCss}</style>

      {/* Background : grille + halos (comme le Guild Portal) */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '52px 52px', WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 45%, #000, transparent 78%)', maskImage: 'radial-gradient(ellipse 70% 60% at 50% 45%, #000, transparent 78%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 55% 45% at 50% 45%, rgba(255,255,255,0.08), transparent 62%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 52%, rgba(0,0,0,0.65) 100%)', pointerEvents: 'none' }} />

      {/* Particules montantes */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: '14%', bottom: '18%', width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.6)', animation: 'vs-float 9s linear infinite' }} />
        <div style={{ position: 'absolute', left: '26%', bottom: '8%', width: 2, height: 2, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', animation: 'vs-float 11s linear infinite', animationDelay: '1.5s' }} />
        <div style={{ position: 'absolute', left: '40%', bottom: '26%', width: 2, height: 2, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', animation: 'vs-float 8s linear infinite', animationDelay: '3s' }} />
        <div style={{ position: 'absolute', left: '58%', bottom: '12%', width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.55)', animation: 'vs-float 12s linear infinite', animationDelay: '0.8s' }} />
        <div style={{ position: 'absolute', left: '70%', bottom: '22%', width: 2, height: 2, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', animation: 'vs-float 10s linear infinite', animationDelay: '2.2s' }} />
        <div style={{ position: 'absolute', left: '84%', bottom: '14%', width: 2, height: 2, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', animation: 'vs-float 9.5s linear infinite', animationDelay: '4s' }} />
        <div style={{ position: 'absolute', left: '48%', bottom: '6%', width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', animation: 'vs-float 13s linear infinite', animationDelay: '1s' }} />
      </div>

      {/* Contenu */}
      <div style={{ position: 'relative', zIndex: 2, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', gap: 40 }}>

        {/* Emblème animé (VS noir) */}
        <div style={{ position: 'relative', width: 132, height: 132, animation: 'vs-fadeup 0.8s ease both' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: 200, height: 200, transform: 'translate(-50%,-50%)', background: 'radial-gradient(circle, rgba(255,255,255,0.16), transparent 62%)', animation: 'vs-pulse 3.4s ease-in-out infinite', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', inset: -6, border: '1px dashed rgba(255,255,255,0.26)', borderRadius: '50%', animation: 'vs-spin 16s linear infinite' }} />
          <div style={{ position: 'absolute', inset: 12, border: '1px solid rgba(255,255,255,0.12)', borderTopColor: 'rgba(255,255,255,0.55)', borderRadius: '50%', animation: 'vs-spin-rev 9s linear infinite' }} />
          <div style={{ position: 'absolute', inset: 24, background: '#0B0D10', border: '1px solid rgba(255,255,255,0.20)', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <img src={LOGO} alt="Versus" style={{ width: '66%', height: '66%', objectFit: 'contain', display: 'block' }} />
          </div>
        </div>

        {/* Libellé */}
        <div style={{ textAlign: 'center', animation: 'vs-fadeup 0.8s ease 0.1s both' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 4, color: '#6E7681', textTransform: 'uppercase', marginBottom: 10 }}>// ACCESS PORTAL</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: '#C7CCD4', letterSpacing: '-0.2px' }}>JOIN THE ARENA</h1>
        </div>

        {/* Bouton VERSUS glowing */}
        <button onClick={enter} style={{ position: 'relative', display: 'block', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', animation: 'vs-fadeup 0.8s ease 0.2s both' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: '130%', height: '260%', transform: 'translate(-50%,-50%)', background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255,255,255,0.16), transparent 70%)', animation: 'vs-halo 3.4s ease-in-out infinite', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', overflow: 'hidden', minWidth: 280, height: 72, padding: '0 44px', borderRadius: 14, background: 'linear-gradient(180deg, #ffffff, #E6E7EA)', color: '#050607', fontFamily: 'inherit', fontSize: 20, fontWeight: 800, letterSpacing: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'vs-glow 3s ease-in-out infinite' }}>
            <span style={{ position: 'relative', zIndex: 1 }}>VERSUS</span>
            <span style={{ position: 'absolute', top: 0, left: 0, width: '40%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.85), transparent)', animation: 'vs-shine 3.2s ease-in-out infinite', pointerEvents: 'none' }} />
          </div>
        </button>

        {/* Sous-texte */}
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 2, color: '#4A505A', textTransform: 'uppercase', animation: 'vs-fadeup 0.8s ease 0.35s both' }}>Tap to register your group</div>

      </div>
    </div>
  )
}

const enterCss = `
  @keyframes vs-spin { to { transform: rotate(360deg); } }
  @keyframes vs-spin-rev { to { transform: rotate(-360deg); } }
  @keyframes vs-pulse { 0%,100% { opacity: 0.4; transform: translate(-50%,-50%) scale(1); } 50% { opacity: 0.85; transform: translate(-50%,-50%) scale(1.16); } }
  @keyframes vs-float { 0% { transform: translateY(20px); opacity: 0; } 12% { opacity: 0.7; } 88% { opacity: 0.5; } 100% { transform: translateY(-220px); opacity: 0; } }
  @keyframes vs-shine { 0% { transform: translateX(-160%) skewX(-20deg); } 55%,100% { transform: translateX(360%) skewX(-20deg); } }
  @keyframes vs-glow { 0%,100% { box-shadow: 0 0 0 1px rgba(255,255,255,0.14), 0 0 22px rgba(255,255,255,0.10), 0 0 60px rgba(255,255,255,0.06); } 50% { box-shadow: 0 0 0 1px rgba(255,255,255,0.28), 0 0 34px rgba(255,255,255,0.22), 0 0 90px rgba(255,255,255,0.14); } }
  @keyframes vs-halo { 0%,100% { opacity: 0.5; transform: translate(-50%,-50%) scale(1); } 50% { opacity: 1; transform: translate(-50%,-50%) scale(1.12); } }
  @keyframes vs-fadeup { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
`
