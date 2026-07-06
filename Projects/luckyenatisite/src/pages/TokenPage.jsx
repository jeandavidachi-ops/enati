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

const fmtUsd = (v, digits) => {
  if (v == null || isNaN(v)) return "—";
  const n = Number(v);
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
  if (n > 0 && n < 1) return "$" + n.toPrecision(digits || 4);
  return "$" + n.toLocaleString();
};

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

function TokenImage({ src, label, size, radius }) {
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

function GroupAvatar({ id, label, i, size }) {
  const [err, setErr] = useState(false);
  const src = id ? "/api/group-photo/" + id : null;
  if (!src || err) return <Blob label={label} i={i} size={size} />;
  return <img src={src} onError={() => setErr(true)} className="object-cover bg-zinc-800"
              style={{ width: size, height: size, borderRadius: "26%" }} />;
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

function Metric({ label, value, sub, color }) {
  return (
    <div className="rounded-2xl bg-[#0c0d0f] border border-white/[0.08] p-4">
      <div className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="font-mono font-bold mt-1.5" style={{ fontSize: "clamp(18px,1.7vw,23px)", color: color || "#F5F5F5" }}>{value}</div>
      {sub ? <div className="font-mono text-xs text-zinc-500 mt-0.5 truncate">{sub}</div> : null}
    </div>
  );
}

const G_COLS = "44px minmax(150px,1.8fr) 1fr 1fr 0.7fr 1fr 0.9fr";
const OUTCOME_STYLE = {
  Win: "text-[#3fd35f] border-[#3fd35f]/40",
  Lost: "text-red-400 border-red-400/40",
  Live: "text-amber-400 border-amber-400/40",
};
function GroupsTable({ groups }) {
  return (
    <div className="rounded-2xl bg-[#0c0d0f] border border-white/[0.08] overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <span style={{ fontFamily: MONO }} className="text-lg font-semibold text-[#ededf0]">Groups who called</span>
        <span className="text-xs uppercase tracking-wider text-zinc-500">{groups.length}</span>
      </div>
      <div className="overflow-x-auto">
        <div style={{ minWidth: 720 }}>
          <div style={{ display: "grid", gridTemplateColumns: G_COLS, gap: 12 }}
            className="px-5 py-2 text-[11px] uppercase tracking-wider text-zinc-500 font-mono border-t border-white/[0.06]">
            <span className="text-center">#</span><span>Group</span><span>First Scan</span>
            <span>MCap Then</span><span>Calls</span><span>MCap Now</span><span className="text-right">Multiplier</span>
          </div>
          {groups.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-zinc-500 font-mono">No groups called this token yet.</div>
          )}
          {groups.map((g, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: G_COLS, gap: 12 }}
              className="px-5 py-3 items-center border-t border-white/[0.06] hover:bg-white/[0.02] font-mono text-sm">
              <span className="text-center text-zinc-500">{i + 1}</span>
              {g.group_id ? (
                <Link to={"/group/" + g.group_id} className="flex items-center gap-2.5 min-w-0 cursor-pointer group/row">
                  <GroupAvatar id={g.group_id} label={g.group_name} i={i} size="32px" />
                  <span className="truncate text-white group-hover/row:underline">{g.group_name}</span>
                </Link>
              ) : (
                <span className="flex items-center gap-2.5 min-w-0">
                  <GroupAvatar id={g.group_id} label={g.group_name} i={i} size="32px" />
                  <span className="truncate text-white group-hover/row:underline">{g.group_name}</span>
                </span>
              )}
              <span className="text-zinc-400">{g.first_scan || "—"}</span>
              <span className="text-zinc-200">{fmtUsd(g.mcap_then)}</span>
              <span className="text-zinc-400">{g.calls}</span>
              <span className="text-zinc-200">{fmtUsd(g.mcap_now)}</span>
              <span className="text-right flex items-center justify-end gap-2">
                <span className="text-[#3fd35f]">{g.mult}</span>
                <span className={"text-[10px] px-1.5 py-0.5 rounded-full border " + (OUTCOME_STYLE[g.outcome] || "text-zinc-400 border-white/20")}>{g.outcome}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const TIMEFRAMES = ["1H", "4H", "1D", "1W", "1M", "All"];

// Chart DexScreener (embed), petite taille. Fallback Solana quand la chain n'est pas connue.
function TVChart({ chain, address, height = 340 }) {
  const c = (chain || "solana");
  const src = address
    ? `https://dexscreener.com/${c}/${encodeURIComponent(address)}?embed=1&theme=dark&info=0&trades=0`
    : null;
  if (!src) {
    return <div className="flex items-center justify-center text-zinc-500 text-sm" style={{ height }}>Chart unavailable for this token.</div>;
  }
  return <iframe src={src} loading="lazy" title="DexScreener chart"
    style={{ width: "100%", height, border: 0, display: "block" }} />;
}

export default function App() {
  useGlobalZoom();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);

  // address = paramètre de route /ticker/:address (déjà décodé par le router)
  const { address } = useParams();

  useEffect(() => {
    fetch("/api/token/" + encodeURIComponent(address))
      .then((r) => r.json())
      .then((res) => { if (res.success) setData(res.data); else setNotFound(true); })
      .catch(() => setNotFound(true));
  }, [address]);

  const token = data && data.token;
  const m = (data && data.metrics) || {};
  const shortAddr = address ? (address.slice(0, 6) + "…" + address.slice(-4)) : "";

  const changeColor = m.change_24h == null ? "#F5F5F5" : (m.change_24h >= 0 ? "#3fd35f" : "#f87171");
  const changeVal = m.change_24h == null ? "—" : (m.change_24h >= 0 ? "+" : "") + m.change_24h.toFixed(2) + "%";

  return (
    <div className="min-h-screen bg-[#0b0b0c] font-mono text-white">
      <Header />
      <main className="px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 py-6">
        <div className="max-w-[clamp(960px,72vw,1400px)] mx-auto w-full">
          <Link to="/ticker" className="text-sm text-zinc-500 hover:text-zinc-300">← Tickers</Link>

          {notFound && <div className="mt-16 text-center text-zinc-500">Token not found.</div>}

          {!notFound && (
            <>
              {/* Hero */}
              <div className="flex items-center gap-4 mt-6">
                <TokenImage src={token ? token.image : null} label={token ? (token.symbol || token.name) : "?"}
                            size="clamp(64px,7vw,92px)" radius="22px" />
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="font-bold truncate" style={{ fontSize: "clamp(22px,2.6vw,34px)" }}>
                      {token && token.name ? token.name : "…"}
                    </h1>
                    {token && token.symbol && (
                      <span className="text-zinc-400 text-lg">${token.symbol}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-sm">
                    <span className="text-zinc-500">{shortAddr}</span>
                    {token && token.chain && (
                      <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-xs capitalize">{token.chain}</span>
                    )}
                    {token && token.twitter && (
                      <a href={token.twitter} target="_blank" rel="noopener noreferrer" title="X (Twitter)" className="text-zinc-400 hover:text-white">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" /></svg>
                      </a>
                    )}
                    {token && token.telegram && (
                      <a href={token.telegram} target="_blank" rel="noopener noreferrer" title="Telegram" className="text-zinc-400 hover:text-white">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M21.94 4.3 18.9 19.04c-.23 1.01-.83 1.26-1.68.78l-4.64-3.42-2.24 2.15c-.25.25-.46.46-.93.46l.33-4.72L18.66 6.3c.37-.33-.08-.51-.58-.18L5.5 14.07l-4.57-1.43c-.99-.31-1.01-.99.21-1.47L20.66 2.9c.83-.31 1.55.19 1.28 1.4Z" /></svg>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
                <Metric label="Price" value={fmtUsd(m.price)} />
                <Metric label="Market Cap" value={fmtUsd(m.market_cap)} />
                <Metric label="24h Volume" value={fmtUsd(m.volume_24h)} />
                <Metric label="24h Change" value={changeVal} color={changeColor} />
                <Metric label="Holders" value="—" />
                <Metric label="All Time High" value="—" sub="n/a" />
              </div>

              {/* Chart (DexScreener embed, petite taille) */}
              <div className="mt-6 rounded-2xl bg-[#0c0d0f] border border-white/[0.08] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
                  <span style={{ fontFamily: MONO }} className="text-sm font-semibold text-[#ededf0]">Chart</span>
                  <div className="flex items-center gap-1">
                    {TIMEFRAMES.map((t) => (
                      <span key={t} className={"text-xs px-2 py-1 rounded-md " + (t === "1D" ? "bg-white/5 text-white" : "text-zinc-500")}>{t}</span>
                    ))}
                  </div>
                </div>
                {token ? (
                  <TVChart chain={token.chain} address={address} height={340} />
                ) : (
                  <div className="flex items-center justify-center text-zinc-500 text-sm"
                       style={{ height: 340 }}>Loading chart…</div>
                )}
              </div>

              {/* Groups who called */}
              <div className="mt-6">
                <GroupsTable groups={data ? data.groups : []} />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
