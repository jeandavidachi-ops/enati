import React, { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import VsSearch from '../components/VsSearch.jsx'
import AuthCorner from '../components/AuthCorner.jsx'
import useGlobalZoom from '../hooks/useGlobalZoom.js'

const MONO = "'Geist Pixel', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const GRADS = [
  ["#84cc16","#065f46"],["#38bdf8","#b45309"],["#34d399","#a21caf"],["#64748b","#18181b"],
  ["#9333ea","#3730a3"],["#ea580c","#991b1b"],["#db2777","#881337"],["#0891b2","#1e3a8a"],
];
const gradOf = (i) => GRADS[Math.abs(i) % GRADS.length];
const initialOf = (s) => (s && s.trim() ? s.trim()[0].toUpperCase() : "?");

// Pastille dégradée avec initiale (avatar par défaut d'un caller).
function Blob({ label, i, size }) {
  const [a, b] = gradOf(i);
  return (
    <div className="shrink-0 flex items-center justify-center font-mono font-semibold text-white"
      style={{ width: size, height: size, borderRadius: "26%", fontSize: `calc(${size} * 0.42)`,
               background: `linear-gradient(150deg, ${a}, ${b})`, boxShadow: "inset 0 2px 6px rgba(255,255,255,0.22), inset 0 -8px 14px rgba(0,0,0,0.38)" }}>
      {initialOf(label)}
    </div>
  );
}

function GroupAvatar({ src, label, size, radius }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div className="flex items-center justify-center font-mono font-bold text-white"
        style={{ width: size, height: size, borderRadius: radius, fontSize: `calc(${size} * 0.4)`,
                 background: "linear-gradient(150deg, #3f3f46, #18181b)" }}>{initialOf(label)}</div>
    );
  }
  return <img src={src} onError={() => setErr(true)} className="object-cover bg-zinc-800"
              style={{ width: size, height: size, borderRadius: radius }} />;
}

function Header() {
  return (
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
  );
}

const TABS = ["Overview", "Calls", "Members", "Duels", "Activity"];
function Tabs() {
  const [v, setV] = useState("Overview");
  return (
    <div className="flex items-center gap-6 border-b border-white/10 mt-8 overflow-x-auto no-scrollbar">
      {TABS.map((t) => {
        const soon = t === "Duels";
        const active = v === t;
        return (
          <button key={t} onClick={() => !soon && setV(t)}
            className={"relative pb-3 text-sm font-mono whitespace-nowrap transition-colors " +
              (active ? "text-white" : "text-zinc-500 hover:text-zinc-300")}>
            <span className="flex items-center gap-1.5">
              {t}
              {soon && <span className="text-[9px] px-1 py-0.5 rounded border border-lime-400/50 text-lime-400">SOON</span>}
            </span>
            {active && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-white rounded-full" />}
          </button>
        );
      })}
    </div>
  );
}

function StatCard({ s }) {
  return (
    <div className="rounded-2xl bg-[#0c0d0f] border border-white/[0.08] p-5">
      <div className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">{s.label}</div>
      <div className="font-mono font-bold mt-2" style={{ fontSize: "clamp(22px,2.2vw,30px)", color: s.color }}>{s.value}</div>
      <div className="font-mono text-xs text-zinc-500 mt-1 truncate">{s.sub}</div>
    </div>
  );
}

const CALLER_COLS = "48px minmax(120px,1.6fr) 1fr 1fr 1fr 0.8fr";
function TopCallers({ callers }) {
  return (
    <div className="rounded-2xl bg-[#0c0d0f] border border-white/[0.08] overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <span style={{ fontFamily: MONO }} className="text-lg font-semibold text-[#ededf0]">Top Callers</span>
        <span className="text-xs uppercase tracking-wider text-zinc-500">{callers.length} members</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: CALLER_COLS, gap: 12 }}
        className="px-5 py-2 text-[11px] uppercase tracking-wider text-zinc-500 font-mono border-t border-white/[0.06]">
        <span className="text-center">#</span><span>Caller</span><span>Win Rate</span>
        <span>Avg. Mult.</span><span>Highest</span><span className="text-right">Calls</span>
      </div>
      {callers.length === 0 && (
        <div className="px-5 py-8 text-center text-sm text-zinc-500 font-mono">No callers recorded yet.</div>
      )}
      {callers.map((c, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: CALLER_COLS, gap: 12 }}
          className="px-5 py-3 items-center border-t border-white/[0.06] hover:bg-white/[0.02] font-mono text-sm">
          <span className="text-center text-zinc-500">{i + 1}</span>
          <span className="flex items-center gap-2.5 min-w-0">
            <Blob label={c.name} i={i} size="34px" />
            <span className="truncate text-white">{c.name}</span>
          </span>
          <span className="text-[#3fd35f]">{c.win}</span>
          <span className="text-zinc-200">{c.avg}</span>
          <span className="text-zinc-200">{c.high}</span>
          <span className="text-right text-zinc-200">{c.calls}</span>
        </div>
      ))}
    </div>
  );
}

const OUTCOME_STYLE = {
  Win: "text-[#3fd35f] border-[#3fd35f]/40",
  Lost: "text-red-400 border-red-400/40",
  Live: "text-amber-400 border-amber-400/40",
};
function RecentCalls({ recent }) {
  const fmtMC = (v) => {
    if (v == null) return "—";
    const n = typeof v === "string" ? parseFloat(v.replace(/,/g, "")) : v;
    if (isNaN(n)) return String(v);
    if (n >= 1e9) return "$" + (n / 1e9).toFixed(1) + "B";
    if (n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
    return "$" + n;
  };
  return (
    <div className="rounded-2xl bg-[#0c0d0f] border border-white/[0.08] overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <span style={{ fontFamily: MONO }} className="text-lg font-semibold text-[#ededf0]">Recent Calls</span>
      </div>
      {recent.length === 0 && (
        <div className="px-5 py-8 text-center text-sm text-zinc-500 font-mono">No calls yet.</div>
      )}
      {recent.map((r, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-3 border-t border-white/[0.06] hover:bg-white/[0.02] font-mono text-sm">
          <Blob label={r.token} i={i + 3} size="34px" />
          <div className="min-w-0 flex-1">
            <div className="text-white truncate">{r.token}</div>
            <div className="text-xs text-zinc-500 truncate">by {r.by} · {r.at || ""}</div>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-zinc-400 text-xs">MCap</div>
            <div className="text-zinc-200">{fmtMC(r.mcapThen)}</div>
          </div>
          <div className="text-zinc-200 w-14 text-right">{r.mult}</div>
          <span className={"text-[11px] px-2 py-0.5 rounded-full border " + (OUTCOME_STYLE[r.outcome] || "text-zinc-400 border-white/20")}>
            {r.outcome}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  useGlobalZoom();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);

  // group_id = paramètre de route /group/:id
  const { id: gid } = useParams();

  useEffect(() => {
    fetch("/api/group/" + encodeURIComponent(gid))
      .then((r) => r.json())
      .then((res) => { if (res.success) setData(res.data); else setNotFound(true); })
      .catch(() => setNotFound(true));
  }, [gid]);

  const hero = data && data.hero;
  const photo = gid ? "/api/group-photo/" + gid : null;

  return (
    <div className="min-h-screen bg-[#0b0b0c] font-mono text-white">
      <Header />
      <main className="px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 py-6">
        <div className="max-w-[clamp(960px,72vw,1400px)] mx-auto w-full">
          <Link to="/group" className="text-sm text-zinc-500 hover:text-zinc-300">← Groups</Link>

          {notFound && (
            <div className="mt-16 text-center text-zinc-500">Group not found.</div>
          )}

          {!notFound && (
            <>
              {/* Hero */}
              <div className="flex items-center gap-5 mt-6">
                <GroupAvatar src={photo} label={hero ? hero.group_name : "?"} size="clamp(84px,9vw,126px)" radius="28px" />
                <div className="min-w-0">
                  <h1 className="font-bold truncate" style={{ fontSize: "clamp(24px,3vw,40px)" }}>
                    {hero ? hero.group_name : "…"}
                  </h1>
                  <div className="flex items-center gap-3 mt-2 text-sm">
                    {hero && hero.rank && (
                      <span className="px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-200">Rank #{hero.rank}</span>
                    )}
                    <span className="text-zinc-500">Group profile</span>
                  </div>
                </div>
              </div>

              <Tabs />

              {/* Hero stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mt-8">
                {(hero ? hero.stats : []).map((s, i) => <StatCard key={i} s={s} />)}
              </div>

              {/* Callers + Recent */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-6">
                <TopCallers callers={data ? data.callers : []} />
                <RecentCalls recent={data ? data.recent : []} />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
