/* Shared Versus search widget — works on every page.
   Loaded as <script type="text/babel" src="/js/versus-search.js"> BEFORE the page's
   own babel script. Exposes a global <VsSearch/> that renders the header search box
   with a live accordion dropdown (groups + tickers) and navigates to the
   personalized pages /group/<id> and /ticker/<address>.
   Backend: GET /api/search?q= -> { success, groups:[{group_id,group_name}],
                                    tickers:[{contract_address,coin_name,market_cap}] } */
(function injectSearchStyles() {
  if (document.getElementById("vs-search-styles")) return;
  var css = `
  .vs-search{position:relative;width:100%;font-family:'Inter',system-ui,sans-serif}
  .vs-search-box{display:flex;align-items:center;gap:8px;border-radius:12px;background:#18181b;
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);padding:8px 12px;color:#a1a1aa}
  .vs-search-box input{background:transparent;border:none;outline:none;color:#e6e6e8;font-size:14px;flex:1;min-width:0}
  .vs-search-box input::placeholder{color:#71717a}
  .vs-search-kbd{font-size:12px;padding:1px 6px;border-radius:6px;background:#27272a;color:#71717a;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)}
  .vs-search-drop{position:absolute;top:calc(100% + 8px);left:0;right:0;z-index:80;
    background:#0e0e11;border:1px solid rgba(255,255,255,.1);border-radius:14px;overflow:hidden;
    box-shadow:0 24px 60px -20px rgba(0,0,0,.85);max-height:60vh;overflow-y:auto;
    animation:vs-search-in .14s ease both}
  @keyframes vs-search-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
  .vs-search-sec{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#71717a;
    padding:10px 14px 6px;font-weight:700}
  .vs-search-row{display:flex;align-items:center;gap:10px;padding:9px 14px;cursor:pointer;text-decoration:none;
    color:#e6e6e8;transition:background .12s}
  .vs-search-row:hover{background:rgba(255,255,255,.05)}
  .vs-search-av{width:30px;height:30px;flex:0 0 30px;border-radius:8px;object-fit:cover;background:#27272a;
    display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#c9ccd2;overflow:hidden}
  .vs-search-av img{width:100%;height:100%;object-fit:cover}
  .vs-search-main{min-width:0;flex:1}
  .vs-search-name{font-size:14px;font-weight:600;color:#f3f3f4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .vs-search-sub{font-size:12px;color:#71717a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .vs-search-empty{padding:16px 14px;color:#71717a;font-size:13px;text-align:center}
  .vs-search-divider{height:1px;background:rgba(255,255,255,.06);margin:2px 0}
  `;
  var s = document.createElement("style");
  s.id = "vs-search-styles";
  s.textContent = css;
  document.head.appendChild(s);
})();

function vsFmtMC(v) {
  if (v == null || v === "") return null;
  var n = typeof v === "string" ? parseFloat(v.replace(/,/g, "")) : v;
  if (isNaN(n)) return null;
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
  return "$" + Math.round(n);
}

function VsSearchIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" width="16" height="16" {...props}>
      <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function VsSearch(props) {
  const [q, setQ] = React.useState("");
  const [res, setRes] = React.useState({ groups: [], tickers: [] });
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [tokenImgs, setTokenImgs] = React.useState({}); // cache { [addr]: url } persistant entre frappes
  const wrapRef = React.useRef(null);
  const timerRef = React.useRef(null);
  const seqRef = React.useRef(0);

  // Debounce + fetch, en ignorant les reponses hors-sequence (course reseau).
  React.useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const term = q.trim();
    if (!term) { setRes({ groups: [], tickers: [] }); setLoading(false); return; }
    setLoading(true);
    const mySeq = ++seqRef.current;
    timerRef.current = setTimeout(() => {
      fetch("/api/search?q=" + encodeURIComponent(term))
        .then((r) => r.json())
        .then((d) => {
          if (mySeq !== seqRef.current) return;
          setRes({ groups: d.groups || [], tickers: d.tickers || [] });
          setLoading(false);
        })
        .catch(() => { if (mySeq === seqRef.current) setLoading(false); });
    }, 180);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [q]);

  // Resout l'image de chaque ticker via /api/token-image/<addr> (<=6), avec cache.
  React.useEffect(() => {
    res.tickers.forEach((t) => {
      const addr = t.contract_address;
      if (!addr || tokenImgs[addr] !== undefined) return;
      // Marque comme "en cours" (null) pour eviter les fetch redondants entre frappes.
      setTokenImgs((prev) => (prev[addr] !== undefined ? prev : { ...prev, [addr]: null }));
      fetch("/api/token-image/" + encodeURIComponent(addr))
        .then((r) => r.json())
        .then((img) => {
          if (img && img.success && img.image_url) {
            setTokenImgs((prev) => ({ ...prev, [addr]: img.image_url }));
          }
        })
        .catch(() => {});
    });
  }, [res.tickers]);

  // Fermeture au clic dehors + touche Echap.
  React.useEffect(() => {
    function onDoc(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); }
    function onKey(e) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, []);

  const term = q.trim();
  const hasResults = res.groups.length > 0 || res.tickers.length > 0;
  const showDrop = open && term.length > 0;

  return (
    <div className="vs-search" ref={wrapRef}>
      <div className="vs-search-box">
        <VsSearchIcon />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={props.placeholder || "Search groups or tickers"}
        />
        <span className="vs-search-kbd">/</span>
      </div>
      {showDrop && (
        <div className="vs-search-drop">
          {loading && !hasResults && <div className="vs-search-empty">Searching…</div>}
          {!loading && !hasResults && <div className="vs-search-empty">No results for “{term}”.</div>}

          {res.groups.length > 0 && (
            <>
              <div className="vs-search-sec">Groups</div>
              {res.groups.map((g, i) => (
                <a key={"g" + i} className="vs-search-row" href={"/group/" + g.group_id}>
                  <span className="vs-search-av">
                    <img src={"/api/group-photo/" + g.group_id} alt=""
                      onError={(e) => { e.target.style.display = "none"; }} />
                  </span>
                  <div className="vs-search-main">
                    <div className="vs-search-name">{g.group_name}</div>
                    <div className="vs-search-sub">Group</div>
                  </div>
                </a>
              ))}
            </>
          )}

          {res.tickers.length > 0 && (
            <>
              {res.groups.length > 0 && <div className="vs-search-divider" />}
              <div className="vs-search-sec">Tickers</div>
              {res.tickers.map((t, i) => {
                const mc = vsFmtMC(t.market_cap);
                const imgUrl = tokenImgs[t.contract_address];
                return (
                  <a key={"t" + i} className="vs-search-row"
                    href={"/ticker/" + encodeURIComponent(t.contract_address)}>
                    <span className="vs-search-av">
                      {imgUrl
                        ? <img src={imgUrl} alt="" onError={(e) => { e.target.style.display = "none"; }} />
                        : (t.coin_name || "?").slice(0, 1).toUpperCase()}
                    </span>
                    <div className="vs-search-main">
                      <div className="vs-search-name">{t.coin_name}</div>
                      <div className="vs-search-sub">{mc ? mc + " MC" : "Token"}</div>
                    </div>
                  </a>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
