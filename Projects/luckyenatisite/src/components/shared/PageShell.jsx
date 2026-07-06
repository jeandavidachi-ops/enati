import React from 'react'
import { Link } from 'react-router-dom'
import VsSearch from '../VsSearch.jsx'
import AuthCorner from '../AuthCorner.jsx'
import useGlobalZoom from '../../hooks/useGlobalZoom.js'

// Chrome commun (header + footer) repris des pages Explore/Home.
// Enveloppe le contenu propre a chaque page (children).
export default function PageShell({ children }) {
  useGlobalZoom()
  return (
    <div className="min-h-screen flex flex-col bg-[#0b0b0c] font-mono text-white">
      <div className="flex flex-col flex-1 bg-[#0b0b0c]">
        <header className="pl-6 pr-4 sm:pr-6 lg:pr-10 xl:pr-16 2xl:pr-24 py-5">
          <div className="w-full flex items-center gap-6">
            <Link to="/" style={{ fontFamily: "Arial, Helvetica, sans-serif" }} className="text-2xl font-semibold tracking-[0.15em] italic select-none text-zinc-300">VERSUS</Link>
            <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-300">
              <Link className="hover:text-white" to="/ticker">Tickers</Link>
              <Link className="hover:text-white" to="/group">Groups</Link>
              <Link className="hover:text-white" to="/leaderboard">Leaderboard</Link>
              <span className="flex items-center gap-2">
                <span className="text-zinc-300">Duels</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded border border-lime-400/60 text-lime-400 font-semibold">SOON</span>
              </span>
            </nav>
            <div className="flex-1 max-w-xl mx-auto hidden sm:block">
              <VsSearch />
            </div>
            <AuthCorner />
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 py-8">
          <div className="w-full flex flex-col md:flex-row gap-4 md:items-end md:justify-between text-xs text-zinc-500">
            <div>
              <div className="text-white font-black text-xl tracking-[0.15em] italic mb-3">Versus</div>
              <p className="max-w-2xl leading-relaxed">
                All token references, logos, and project names displayed on Versus are for informational purposes only and
                remain the property of their respective owners. Versus is not affiliated with or endorsed by any of the
                projects featured on the platform.
              </p>
            </div>
            <p className="shrink-0">© 2026 Versus. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
