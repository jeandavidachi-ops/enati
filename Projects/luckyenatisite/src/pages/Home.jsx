import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import VsSearch from '../components/VsSearch.jsx'
import AuthCorner from '../components/AuthCorner.jsx'
import useGlobalZoom from '../hooks/useGlobalZoom.js'
import { useApi, apiFetch, apiInvalidate } from '../lib/api.js'

// ---- Helpers ----
const GRADS = [
  "from-lime-600 via-emerald-700 to-stone-800","from-sky-400 via-blue-500 to-amber-700",
  "from-green-400 via-emerald-500 to-fuchsia-700","from-slate-500 via-slate-700 to-zinc-900",
  "from-purple-600 to-indigo-800","from-orange-600 to-red-800",
  "from-pink-600 to-rose-900","from-cyan-600 to-blue-900",
];
const EMOJIS = ["âš”ï¸","ðŸš€","ðŸ”¥","ðŸ’Ž","ðŸ","ðŸ‘‘","ðŸ¦…","ðŸª™","ðŸ›¡ï¸","ðŸ±","â‚¿","ðŸŽ¯"];
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
const SearchIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
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

const TIMES = ["1h", "2h", "12h", "1d", "7d"];
function TimeTabs({ value, onChange }) {
  return (
    <div className="flex items-center gap-1 font-mono text-sm">
      {TIMES.map((t) => (
        <button key={t} onClick={() => onChange(t)}
          className={"px-3 py-1 rounded-md transition-colors " + (value === t ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300")}>
          {t}
        </button>
      ))}
    </div>
  );
}

// Avatar: vraie image si dispo, sinon degrade + emoji (fallback aussi sur erreur de chargement).
function Avatar({ src, g, e, className }) {
  const [err, setErr] = useState(false);
  if (src && !err) {
    return <img src={src} onError={() => setErr(true)}
      className={"shrink-0 object-cover bg-zinc-800 " + className} />;
  }
  return (
    <div className={"shrink-0 flex items-center justify-center overflow-hidden bg-[#0d0d0d] " + className}>
      <VsLogo className="w-full h-full" />
    </div>
  );
}
// Logo Versus de secours pour les cards sans image
function VsLogo({ className = "" }) {
  return <img src="/images/versus.png" alt="Versus" className={"object-cover " + className} />;
}
function Stat({ label, value, valueClass = "text-white" }) {
  return (
    <div>
      <div className="text-[11px] text-zinc-500 font-mono">{label}</div>
      <div className={"text-sm font-mono mt-0.5 " + valueClass}>{value}</div>
    </div>
  );
}
function Socials() {
  return (
    <div className="flex items-center gap-3 text-zinc-500">
      <XIcon className="w-3.5 h-3.5 hover:text-white cursor-pointer" />
      <TelegramIcon className="w-4 h-4 hover:text-white cursor-pointer" />
    </div>
  );
}

// ---- Leaderboard (podium + tableau), repris de la page leaderboards ----
const BG = "#0b0b0c";
function Podium({ d, rank }) {
  const C = {
    1: { border: "rgba(245,158,11,0.6)", bottom: "rgb(44, 38, 11)", num: "text-amber-400", numStyle: {} },
    2: { border: "rgba(212,212,216,0.45)", bottom: "rgb(25, 25, 25)", num: "text-zinc-300", numStyle: {} },
    3: { border: "rgba(249,115,22,0.6)", bottom: "rgb(29, 24, 14)", num: "", numStyle: { color: "rgb(179, 139, 105)" } },
  }[rank];
  const lift = rank === 1 ? "mt-1" : "mt-0";
  const avatarSize = rank === 1 ? "w-28 h-28" : "w-24 h-24";
  const nameSize = rank === 1 ? "text-lg" : "text-base";
  const wrap = {
    transform: "rotateX(-4deg)",
    transformOrigin: "center bottom",
    background: `linear-gradient(to bottom, transparent 22%, ${C.border} 100%)`,
    borderRadius: 26,
    padding: 1,
  };
  const fill = {
    background: `linear-gradient(to bottom, ${BG} 0%, ${BG} 50%, ${C.bottom} 100%)`,
    borderRadius: 25,
  };
  return (
    <div className={"flex-1 " + lift} style={{ transformStyle: "preserve-3d" }}>
      <div style={wrap}>
        <div style={fill} className="px-8 py-3 flex flex-col items-center">
          <div className={"text-2xl font-bold mb-4 " + C.num} style={C.numStyle}>{rank}</div>
          <Avatar src={d ? d.img : null} g={d ? d.g : gradOf(rank)} e={d ? d.e : emojiOf(rank)}
            className={avatarSize + " rounded-2xl text-4xl"} />
          <div className={"mt-4 font-mono font-semibold text-white text-center truncate w-full " + nameSize}>
            {d ? d.name : "â€”"}
          </div>
        </div>
      </div>
    </div>
  );
}
function Th({ children, className = "" }) {
  return <th className={"text-left text-[11px] font-mono font-normal text-zinc-500 uppercase tracking-wider py-3 " + className}>{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={"py-4 font-mono text-sm " + className}>{children}</td>;
}

// ---- Carte "Blocks" (nouveau modele versus-card-1to1, taille compacte) ----
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
// Precharge la page detail correspondant a un href de carte (survol).
function prefetchDetail(href) {
  if (!href) return;
  if (href.startsWith("/group/")) apiFetch("/api/group/" + href.slice(7));
  else if (href.startsWith("/ticker/")) apiFetch("/api/token/" + href.slice(8));
}
function BlocksCard({ image, name, stats, g, e, href, time, join, twitter, telegram, groupId }) {
  const Tag = href ? Link : "article";
  const [joinBusy, setJoinBusy] = useState(false);
  // Ouvre le lien social sans declencher la navigation de la card (evite l'<a> imbrique).
  const openSocial = (url) => (ev) => { ev.preventDefault(); ev.stopPropagation(); window.open(url, "_blank", "noopener"); };
  // Demande d'adhesion a un groupe (meme mecanique que YourGroups/AvailableRow) :
  // enregistre la demande puis ouvre le lien de join. Utilise par le bouton
  // "Request to Join" et par l'icone Telegram des cards de groupe.
  const requestJoin = async (ev) => {
    ev.preventDefault(); ev.stopPropagation();
    if (!groupId || joinBusy) return;
    setJoinBusy(true);
    try {
      const r = await fetch(`/api/group/${groupId}/request-join`, { method: 'POST' });
      const data = await r.json();
      apiInvalidate('/api/my-groups');
      if (data.join_link) window.open(data.join_link, '_blank', 'noopener');
    } catch { /* ignore */ }
    setJoinBusy(false);
  };
  return (
    <Tag {...(href ? { to: href, onMouseEnter: () => prefetchDetail(href) } : {})}
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
              {groupId
                ? <span role="link" title="Telegram" onClick={requestJoin} className="hover:text-white cursor-pointer"><TelegramIcon className="w-[clamp(16px,1.05vw,19px)] h-[clamp(16px,1.05vw,19px)]" /></span>
                : telegram
                ? <span role="link" title="Telegram" onClick={openSocial(telegram)} className="hover:text-white cursor-pointer"><TelegramIcon className="w-[clamp(16px,1.05vw,19px)] h-[clamp(16px,1.05vw,19px)]" /></span>
                : <TelegramIcon className="w-[clamp(16px,1.05vw,19px)] h-[clamp(16px,1.05vw,19px)] text-[#c9ccd2]/40" />}
            </nav>
            {join ? (
            <button onClick={requestJoin} disabled={joinBusy}
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

function GroupCard({ d }) {
  return (
    <div className="rounded-2xl bg-zinc-900/40 ring-1 ring-white/5 p-3 hover:ring-white/15 transition">
      <div className="flex gap-3">
        <Avatar src={d.img} g={d.g} e={d.e} className="w-24 h-24 rounded-xl text-3xl" />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-mono font-semibold text-white truncate">{d.name}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <Stat label="Score" value={d.score + "x"} valueClass="text-emerald-400" />
            <Stat label="Best Call" value={d.best + "x"} />
            <Stat label="Total Calls" value={d.calls} />
          </div>
        </div>
      </div>
      <div className="mt-3 pl-1"><Socials /></div>
    </div>
  );
}
function TickerCard({ d }) {
  return (
    <div className="rounded-2xl bg-zinc-900/40 ring-1 ring-white/5 p-3 hover:ring-white/15 transition">
      <div className="flex gap-3">
        <Avatar src={d.img} g={d.g} e={d.e} className="w-24 h-24 rounded-xl text-3xl" />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-mono font-semibold text-white truncate">{d.sym}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <Stat label="MC" value={d.mc} />
            <Stat label="Best" value={d.mult + "x"} valueClass="text-emerald-400" />
            <Stat label="Called by" value={d.group} />
          </div>
        </div>
      </div>
      <div className="mt-3 pl-1"><Socials /></div>
    </div>
  );
}

// ---- Leaderboard sidebar (vrais groupes) ----
function LbMedal({ rank }) {
  if (rank === "1") return <div className="medal"><span>1</span></div>;
  if (rank === "2") return <div className="medal silver"><span>2</span></div>;
  if (rank === "3") return <div className="medal bronze"><span>3</span></div>;
  return <div className="place">{rank}.</div>;
}
function LeaderboardSidebar({ collapsed, onToggle, rows = [], tokens = [] }) {
  const [tab, setTab] = useState("leaderboard");
  if (collapsed) {
    return (
      <div className="lb-rail">
        <button onClick={onToggle} title="Ouvrir le menu">â‰«</button>
      </div>
    );
  }
  return (
    <aside className="lb-side">
      <section className="panel">
        <header className="tabs">
          <nav className="tab-nav">
            <a className={"tab alert" + (tab === "alerts" ? " active" : "")} href="#" onClick={(e) => { e.preventDefault(); setTab("alerts"); }}><span className="dot"></span><span className="bell">â—</span> Alerts</a>
            <a className={"tab" + (tab === "tokens" ? " active" : "")} href="#" onClick={(e) => { e.preventDefault(); setTab("tokens"); }}>Tokens</a>
            <a className={"tab" + (tab === "leaderboard" ? " active" : "")} href="#" onClick={(e) => { e.preventDefault(); setTab("leaderboard"); }}>Leaderboard</a>
            <a className={"tab" + (tab === "feed" ? " active" : "")} href="#" onClick={(e) => { e.preventDefault(); setTab("feed"); }}>Feed</a>
          </nav>
          <button className="collapse" onClick={onToggle} title="Replier le menu">â‰ª</button>
        </header>
        {tab === "leaderboard" && (
        <div className="content">
          <div className="filters">
            <button>24H</button>
            <button>7D</button>
            <button>30D</button>
            <button className="selected">ALL</button>
          </div>
          <div className="your-rank">
            <div className="rank-avatar logo">âˆž</div>
            <div>
              <div className="muted">Your rank</div>
              <div className="rankline"><span>#</span> -</div>
            </div>
            <div className="pnl-head">
              <div>PnL</div>
              <strong>--</strong>
            </div>
          </div>
          <div className="dash"></div>
          <div className="rows">
            {rows.map((row, i) => (
              <div className="row" key={row.id != null ? row.id : i}>
                <LbMedal rank={String(i + 1)} />
                <Avatar src={row.img} g={row.g} e={row.e} className="avatar" />
                <div className="user"><strong>{row.name}</strong></div>
                <div className="right"><div className="pnl">$0</div></div>
              </div>
            ))}
          </div>
        </div>
        )}
        {tab === "tokens" && (
        <div className="content">
          <div className="filters">
            <button>24H</button>
            <button>7D</button>
            <button>30D</button>
            <button className="selected">ALL</button>
          </div>
          <div className="rows">
            {tokens.map((t, i) => {
              const RowTag = t.addr ? Link : "a";
              return (
              <RowTag className="row" key={i} {...(t.addr ? { to: "/ticker/" + encodeURIComponent(t.addr), onMouseEnter: () => apiFetch("/api/token/" + encodeURIComponent(t.addr)) } : { href: "#" })}>
                <LbMedal rank={String(i + 1)} />
                <Avatar src={t.img} g={t.g} e={t.e} className="avatar" />
                <div className="user"><strong>{t.sym}</strong></div>
                <div className="right"><div className="pnl">{t.mult}x</div></div>
              </RowTag>
              );
            })}
            {tokens.length === 0 && <div className="muted" style={{ padding: "12px 14px" }}>No tokens yet.</div>}
          </div>
        </div>
        )}
        {tab === "alerts" && (
        <div className="content">
          <div className="muted" style={{ padding: "12px 14px" }}>No alerts yet.</div>
        </div>
        )}
        {tab === "feed" && (
        <div className="content">
          <div className="muted" style={{ padding: "12px 14px" }}>No feed yet.</div>
        </div>
        )}
      </section>
    </aside>
  );
}

export default function Versus() {
  useGlobalZoom();
  const [groupTime, setGroupTime] = useState("1h");
  const [tickerTime, setTickerTime] = useState("12h");
  const [lbCollapsed, setLbCollapsed] = useState(false);
  const [tokenImgs, setTokenImgs] = useState({}); // addr -> { img, twitter, telegram }
  const [lbLg, setLbLg] = useState(typeof window !== "undefined" && window.matchMedia("(min-width:1024px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(min-width:1024px)");
    const on = () => setLbLg(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const lbPad = lbLg ? (lbCollapsed ? 44 : 300) : 0;
  const lbTopRef = useRef(null);
  const [lbTop, setLbTop] = useState(0);
  useEffect(() => {
    const el = lbTopRef.current;
    if (!el) return;
    const measure = () => setLbTop(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, []);

  // Donnees depuis le cache (rendu instantane si prechargees au demarrage).
  const groupsStats = useApi("/api/all-groups-stats");
  const sharedRes = useApi("/api/shared-contracts");
  const latestRes = useApi("/api/latest-records");

  // Nombre de groupes par token (contract_address -> groups_count)
  const sharedMap = useMemo(() => {
    const map = {};
    (sharedRes?.data || []).forEach(c => {
      if (c.contract_address) map[String(c.contract_address).toLowerCase()] = c.groups_count;
    });
    return map;
  }, [sharedRes]);

  // Groupes : strip du haut + Popular Groups (12 premiers)
  const groups = useMemo(() => (groupsStats?.data || []).slice(0, 12).map((g, i) => ({
    id: g.group_id,
    name: g.group_name || "Unknown",
    win: Math.round(g.win_rate || 0),
    score: g.total_current_stat || 0,
    best: g.max_current_stat || 0,
    calls: g.total_members || 0,
    img: g.group_id ? ("/api/group-photo/" + g.group_id) : null,
    g: gradOf(i), e: emojiOf(i),
  })), [groupsStats]);

  // Re-mesure quand la bande Groups se remplit (change sa hauteur)
  useEffect(() => {
    if (lbTopRef.current) setLbTop(lbTopRef.current.offsetHeight);
  }, [groups]);

  // Lignes du leaderboard latÃ©ral
  const lbRows = useMemo(() => (groupsStats?.data || []).map((g, i) => {
    const calls = g.total_members || 0;
    const avg = calls > 0 ? (g.total_current_stat || 0) / calls : 0;
    return {
      id: g.group_id,
      name: g.group_name || "Unknown",
      win: Math.round(g.win_rate || 0),
      avg: avg.toFixed(1),
      high: g.max_current_stat || 0,
      calls: calls,
      img: g.group_id ? ("/api/group-photo/" + g.group_id) : null,
      g: gradOf(i), e: emojiOf(i),
    };
  }), [groupsStats]);

  // Derniers coins (Popular Tickers) + leur image (mise en cache)
  const tickers = useMemo(() => (latestRes?.data || []).slice(0, 12).map((c, i) => {
    const im = tokenImgs[c.contract_address] || {};
    return {
      sym: c.coin_name || "?",
      group: c.group_name || "",
      mc: fmtMC(c.market_cap),
      mult: c.current_stat || 0,
      addr: c.contract_address,
      img: im.img || null,
      twitter: im.twitter || null,
      telegram: im.telegram || null,
      g: gradOf(i + 3), e: emojiOf(i + 5),
    };
  }), [latestRes, tokenImgs]);

  useEffect(() => {
    tickers.forEach((t) => {
      if (!t.addr || tokenImgs[t.addr]) return;
      apiFetch("/api/token-image/" + encodeURIComponent(t.addr)).then(img => {
        if (img && img.success) {
          setTokenImgs(prev => (prev[t.addr] ? prev : {
            ...prev,
            [t.addr]: { img: img.image_url || null, twitter: img.twitter || null, telegram: img.telegram || null },
          }));
        }
      }).catch(() => {});
    });
  }, [latestRes]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0b0c] font-mono text-white">
      <div className="hidden lg:block lb-fixed" style={{ top: lbTop }}>
        <LeaderboardSidebar collapsed={lbCollapsed} onToggle={() => setLbCollapsed(v => !v)} rows={lbRows} tokens={tickers} />
      </div>
      <div className="flex flex-col flex-1 bg-[#0b0b0c]">
        <div ref={lbTopRef} className="sticky top-0 z-50 bg-[#0b0b0c]">
        <header className="pl-6 pr-4 sm:pr-6 lg:pr-10 xl:pr-16 2xl:pr-24 py-5">
          <div className="w-full flex items-center gap-6">
          <span style={{ fontFamily: "Arial, Helvetica, sans-serif" }} className="text-2xl font-semibold tracking-[0.15em] italic select-none text-zinc-300">VERSUS</span>
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

        <div className="border-y border-white/5 pl-6 pr-4 sm:pr-6 lg:pr-10 xl:pr-16 2xl:pr-24 py-3">
          <div className="w-full flex items-center gap-5 overflow-x-auto no-scrollbar">
            <span className="text-sm text-zinc-400 shrink-0 flex items-center gap-2">Groups <span className="text-zinc-600">â§‰</span></span>
            {groups.map((g, i) => {
              const StripTag = g.id ? Link : "a";
              return (
              <StripTag key={i} {...(g.id ? { to: "/group/" + g.id, onMouseEnter: () => apiFetch("/api/group/" + g.id) } : {})} className={"flex items-center gap-2 shrink-0" + (g.id ? " cursor-pointer hover:text-white" : "")}>
                <Avatar src={g.img} g={g.g} e={g.e} className="w-6 h-6 rounded-md text-xs" />
                <span className="text-sm text-zinc-200">{g.name}</span>
              </StripTag>
              );
            })}
          </div>
        </div>
        </div>

        <div className="flex-1 flex flex-col" style={{ paddingLeft: lbPad }}>
        <main className="flex-1 pl-6 pr-4 sm:pr-6 lg:pr-10 xl:pr-16 2xl:pr-24 py-8">
          <section id="groups">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Popular Groups</h2>
                <p className="text-sm text-zinc-500 mt-1">See which groups are making the best crypto calls right now.</p>
              </div>
              <TimeTabs value={groupTime} onChange={setGroupTime} />
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(clamp(340px,20vw,440px),1fr))] gap-5 mt-5">
              {groups.map((d, i) => (
                <BlocksCard key={i} image={d.img} name={d.name} g={d.g} e={d.e} time={groupTime} join groupId={d.id}
                  href={d.id ? ("/group/" + d.id) : null}
                  stats={[
                    { label: "PnL", value: d.win + "%", positive: true },
                    { label: "Best Call", value: d.best + "x" },
                    { label: "Total Calls", value: d.calls },
                  ]} />
              ))}
            </div>
            {groups.length === 0 && <p className="text-sm text-zinc-600 mt-5">No groups yet.</p>}
            <div className="flex justify-start mt-6">
              <Link to="/group" className="rounded-xl bg-zinc-900 ring-1 ring-white/10 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors">Explore all</Link>
            </div>
          </section>

          <section id="tickers" className="mt-12">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Popular Tickers</h2>
                <p className="text-sm text-zinc-500 mt-1">The most recently called tokens.</p>
              </div>
              <TimeTabs value={tickerTime} onChange={setTickerTime} />
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(clamp(340px,20vw,440px),1fr))] gap-5 mt-5">
              {tickers.map((d, i) => (
                <BlocksCard key={i} image={d.img} name={d.sym} g={d.g} e={d.e} time={tickerTime}
                  twitter={d.twitter} telegram={d.telegram}
                  href={d.addr ? ("/ticker/" + encodeURIComponent(d.addr)) : null}
                  stats={[
                    { label: "Best", value: d.mult + "x", positive: true },
                    { label: "MC", value: d.mc },
                    { label: "Groups", value: (d.addr && sharedMap[String(d.addr).toLowerCase()]) || 1 },
                  ]} />
              ))}
            </div>
            {tickers.length === 0 && <p className="text-sm text-zinc-600 mt-5">No tokens yet.</p>}
            <div className="flex justify-start mt-6">
              <Link to="/ticker" className="rounded-xl bg-zinc-900 ring-1 ring-white/10 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors">Explore all</Link>
            </div>
          </section>
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
          <p className="shrink-0">Â© 2026 Versus. All rights reserved.</p>
          </div>
        </footer>
        </div>
      </div>
    </div>
  );
}
