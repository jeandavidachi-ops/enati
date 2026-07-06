import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import VsSearch from '../components/VsSearch.jsx'
import AuthCorner from '../components/AuthCorner.jsx'
import useGlobalZoom from '../hooks/useGlobalZoom.js'

// ---- Helpers ----
const GRADS = [
  "from-lime-600 via-emerald-700 to-stone-800","from-sky-400 via-blue-500 to-amber-700",
  "from-green-400 via-emerald-500 to-fuchsia-700","from-slate-500 via-slate-700 to-zinc-900",
  "from-purple-600 to-indigo-800","from-orange-600 to-red-800",
  "from-pink-600 to-rose-900","from-cyan-600 to-blue-900",
];
const EMOJIS = ["⚔️","🚀","🔥","💎","🐍","👑","🦅","🪙","🛡️","🐱","₿","🎯"];
const gradOf = (i) => GRADS[Math.abs(i) % GRADS.length];
const emojiOf = (i) => EMOJIS[Math.abs(i) % EMOJIS.length];

function fmtMC(v) {
  if (v === null || v === undefined) return "-";
  v = Number(v); if (isNaN(v)) return "-";
  if (v >= 1e9) return "$" + (v / 1e9).toFixed(1) + "B";
  if (v >= 1e6) return "$" + (v / 1e6).toFixed(1) + "M";
  if (v >= 1e3) return "$" + (v / 1e3).toFixed(1) + "K";
  return "$" + Math.round(v);
}

// ---- Icons ----
const XIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
  </svg>
);
const TelegramIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0Zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635Z" />
  </svg>
);

function VsLogo({ className = "" }) {
  return <img src="/images/versus.png" alt="Versus" className={"object-cover " + className} />;
}

// ---- Carte "Blocks" (reprise de l'accueil) ----
function BlocksThumb({ src, g, e }) {
  const [err, setErr] = useState(false);
  return (
    <div className="relative self-stretch w-[clamp(112px,8vw,150px)] min-h-[clamp(112px,8vw,150px)] flex-none overflow-hidden rounded-[16px] bg-[#0d0d0d]"
      style={{ boxShadow: "0 10px 26px rgba(0,0,0,0.42), inset 0 0 0 1px rgba(255,255,255,0.05)" }}>
      {src && !err
        ? <img src={src} onError={() => setErr(true)} className="absolute inset-0 w-full h-full object-cover" />
        : <VsLogo className="absolute inset-0 w-full h-full" />}
      <div className="pointer-events-none absolute inset-0 rounded-[16px]"
        style={{ background: "radial-gradient(70% 60% at 30% 18%, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 60%)" }} />
    </div>
  );
}
function BlocksCard({ image, name, stats, g, e, href, time, join, twitter, telegram }) {
  const Tag = href ? Link : "article";
  // Ouvre le lien social sans declencher la navigation de la card (evite l'<a> imbrique).
  const openSocial = (url) => (ev) => { ev.preventDefault(); ev.stopPropagation(); window.open(url, "_blank", "noopener"); };
  return (
    <Tag {...(href ? { to: href } : {})}
      className={"relative w-full block overflow-hidden rounded-[20px]" + (href ? " cursor-pointer transition-colors hover:border-white/30" : "")}
      style={{
        padding: "16px 18px 15px 15px",
        background: "radial-gradient(ellipse at 49% -20%, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.012) 34%, transparent 58%), linear-gradient(180deg, rgba(25,26,28,0.78) 0%, rgba(11,12,13,0.94) 44%, rgba(15,16,17,0.92) 100%)",
        border: "1.5px solid rgba(154,160,171,0.38)",
        boxShadow: "0 14px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -22px 46px rgba(255,255,255,0.02)"
      }}>
      <div className="relative flex gap-4">
        <BlocksThumb src={image} g={g} e={e} />
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-baseline gap-2 min-w-0">
            <h2 className="font-semibold tracking-[-0.02em] text-[#f3f3f4] truncate text-[clamp(18px,1.25vw,24px)]"
              style={{ textShadow: "0 0 18px rgba(255,255,255,0.14)" }}>{name}</h2>
            {time ? <span className="flex-none text-[clamp(11px,0.8vw,14px)] font-medium tracking-[-0.01em] text-[rgba(179,181,186,0.72)]">{time}</span> : null}
          </div>
          <dl className="grid grid-cols-3 gap-2 mt-3">
            {stats.map((s, i) => (
              <div key={i} className="flex flex-col gap-1 min-w-0">
                <dt className="font-mono text-[clamp(11px,0.75vw,13px)] tracking-[-0.02em] text-[rgba(183,184,188,0.72)]">{s.label}</dt>
                <dd className="text-[clamp(14px,1vw,18px)] font-medium tracking-[-0.01em] truncate"
                  style={s.positive ? { color: "#29db38", textShadow: "0 0 15px rgba(41,219,56,0.16)" } : { color: "#f3f3f4" }}>
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex items-center justify-between gap-2">
            <nav className="flex items-center gap-3 text-[#c9ccd2]">
              {twitter
                ? <span role="link" title="X (Twitter)" onClick={openSocial(twitter)} className="hover:text-white cursor-pointer"><XIcon className="w-[clamp(15px,1vw,18px)] h-[clamp(15px,1vw,18px)]" /></span>
                : <XIcon className="w-[clamp(15px,1vw,18px)] h-[clamp(15px,1vw,18px)] text-[#c9ccd2]/40" />}
              {telegram
                ? <span role="link" title="Telegram" onClick={openSocial(telegram)} className="hover:text-white cursor-pointer"><TelegramIcon className="w-[clamp(16px,1.05vw,19px)] h-[clamp(16px,1.05vw,19px)]" /></span>
                : <TelegramIcon className="w-[clamp(16px,1.05vw,19px)] h-[clamp(16px,1.05vw,19px)] text-[#c9ccd2]/40" />}
            </nav>
            {join ? (
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
              className="rtj-btn flex items-center gap-1.5 rounded-[8px] bg-[#f5f5f5] text-black font-semibold px-3.5 py-1.5 text-[clamp(11px,0.8vw,13px)] whitespace-nowrap">
              Request to Join
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
            ) : null}
          </div>
        </div>
      </div>
    </Tag>
  );
}

// ---- Pagination (numeros de page en bas) ----
function pageWindow(current, total) {
  // renvoie une liste de numeros + "..." condensee
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("…");
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}
function Pagination({ page, pageCount, onGo }) {
  if (pageCount <= 1) return null;
  const items = pageWindow(page, pageCount);
  const btn = "min-w-[36px] h-9 px-3 rounded-md text-sm font-mono transition-colors flex items-center justify-center";
  return (
    <div className="flex items-center justify-center gap-1 mt-10 flex-wrap">
      <button onClick={() => onGo(page - 1)} disabled={page === 1}
        className={btn + (page === 1 ? " text-zinc-700 cursor-not-allowed" : " text-zinc-400 hover:text-white hover:bg-zinc-800")}>‹</button>
      {items.map((it, i) => it === "…"
        ? <span key={"e" + i} className="min-w-[36px] h-9 flex items-center justify-center text-zinc-600 text-sm">…</span>
        : <button key={it} onClick={() => onGo(it)}
            className={btn + (it === page ? " bg-zinc-800 text-white" : " text-zinc-400 hover:text-white hover:bg-zinc-800")}>{it}</button>
      )}
      <button onClick={() => onGo(page + 1)} disabled={page === pageCount}
        className={btn + (page === pageCount ? " text-zinc-700 cursor-not-allowed" : " text-zinc-400 hover:text-white hover:bg-zinc-800")}>›</button>
    </div>
  );
}

const PAGE_SIZE = 24;

export default function App({ type = "group" }) {
  useGlobalZoom();
  const TYPE = type;
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [sharedMap, setSharedMap] = useState({});

  // Chargement des donnees selon le type (recharge quand on passe /group <-> /ticker)
  useEffect(() => {
    setItems([]);
    setPage(1);
    if (TYPE === "group") {
      fetch("/api/all-groups-stats").then(r => r.json()).then(res => {
        const all = res.data || [];
        setItems(all.map((g, i) => ({
          id: g.group_id,
          name: g.group_name || "Unknown",
          win: Math.round(g.win_rate || 0),
          best: g.max_current_stat || 0,
          calls: g.total_members || 0,
          img: g.group_id ? ("/api/group-photo/" + g.group_id) : null,
          g: gradOf(i), e: emojiOf(i),
        })));
      }).catch(() => {});
    } else {
      fetch("/api/shared-contracts").then(r => r.json()).then(res => {
        const map = {};
        (res.data || []).forEach(c => { if (c.contract_address) map[String(c.contract_address).toLowerCase()] = c.groups_count; });
        setSharedMap(map);
      }).catch(() => {});
      fetch("/api/latest-records").then(r => r.json()).then(res => {
        const all = res.data || [];
        setItems(all.map((c, i) => ({
          sym: c.coin_name || "?",
          mc: fmtMC(c.market_cap),
          mult: c.current_stat || 0,
          addr: c.contract_address,
          img: null,
          g: gradOf(i + 3), e: emojiOf(i + 5),
        })));
      }).catch(() => {});
    }
  }, [TYPE]);

  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const pageItems = items.slice(start, start + PAGE_SIZE);

  // Images des tokens: seulement pour la page visible (tickers)
  useEffect(() => {
    if (TYPE !== "ticker") return;
    pageItems.forEach((t, k) => {
      const idx = start + k;
      if (!t.addr || t.img) return;
      fetch("/api/token-image/" + encodeURIComponent(t.addr)).then(r => r.json()).then(img => {
        if (img && img.success) {
          setItems(prev => prev.map((x, j) => j === idx ? {
            ...x,
            img: img.image_url || x.img,
            twitter: img.twitter || null,
            telegram: img.telegram || null,
          } : x));
        }
      }).catch(() => {});
    });
  }, [page, items.length]);

  const go = (n) => { const p = Math.min(pageCount, Math.max(1, n)); setPage(p); window.scrollTo(0, 0); };

  const title = TYPE === "ticker" ? "All Tickers" : "All Groups";
  const subtitle = TYPE === "ticker" ? "Every recently called token." : "Every group making crypto calls.";
  const navCls = (active) => "hover:text-white" + (active ? " text-white" : "");

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0b0c] font-mono text-white">
      <div className="flex flex-col flex-1 bg-[#0b0b0c]">
        <header className="pl-6 pr-4 sm:pr-6 lg:pr-10 xl:pr-16 2xl:pr-24 py-5">
          <div className="w-full flex items-center gap-6">
          <Link to="/" style={{ fontFamily: "Arial, Helvetica, sans-serif" }} className="text-2xl font-semibold tracking-[0.15em] italic select-none text-zinc-300">VERSUS</Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-300">
            <Link className={navCls(TYPE === "ticker")} to="/ticker">Tickers</Link>
            <Link className={navCls(TYPE === "group")} to="/group">Groups</Link>
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

        <main className="flex-1 px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 py-8">
          <div className="max-w-[clamp(960px,72vw,1400px)] mx-auto w-full">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-3xl font-bold">{title}</h1>
                <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>
              </div>
              <Link to="/" className="text-sm px-4 py-2 rounded-xl bg-zinc-900 ring-1 ring-white/10 text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors">← Home</Link>
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(clamp(340px,20vw,440px),1fr))] gap-5 mt-6">
              {TYPE === "group"
                ? pageItems.map((d, i) => (
                    <BlocksCard key={start + i} image={d.img} name={d.name} g={d.g} e={d.e} join
                      href={d.id ? ("/group/" + d.id) : null}
                      stats={[
                        { label: "PnL", value: d.win + "%", positive: true },
                        { label: "Best Call", value: d.best + "x" },
                        { label: "Total Calls", value: d.calls },
                      ]} />
                  ))
                : pageItems.map((d, i) => (
                    <BlocksCard key={start + i} image={d.img} name={d.sym} g={d.g} e={d.e}
                      twitter={d.twitter} telegram={d.telegram}
                      href={d.addr ? ("/ticker/" + encodeURIComponent(d.addr)) : null}
                      stats={[
                        { label: "Best", value: d.mult + "x", positive: true },
                        { label: "MC", value: d.mc },
                        { label: "Groups", value: (d.addr && sharedMap[String(d.addr).toLowerCase()]) || 1 },
                      ]} />
                  ))}
            </div>

            {items.length === 0 && <p className="text-sm text-zinc-600 mt-6">Nothing to show yet.</p>}

            <Pagination page={page} pageCount={pageCount} onGo={go} />
          </div>
        </main>

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
  );
}
