import { useState, useRef, useCallback, memo, useEffect } from "react";

// ── Supabase config ───────────────────────────────────────────────────────────
const SUPA_URL = "https://ywzxyahotwvdwhhqqjih.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3enh5YWhvdHd2ZHdoaHFxamloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5Mzg5ODEsImV4cCI6MjA4OTUxNDk4MX0.ZedzBYBPDt1BQ14yq6F2OZan4CN24btlhsk9jD6561A";

const supa = async (path, opts = {}) => {
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    headers: {
      "apikey": SUPA_KEY,
      "Authorization": `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json",
      "Prefer": opts.prefer ?? "return=representation",
      ...opts.headers,
    },
    ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const db = {
  get:    (table, qs = "")    => supa(`${table}?${qs}`),
  insert: (table, body)       => supa(`${table}`,      { method: "POST",  body: JSON.stringify(body) }),
  update: (table, qs, body)   => supa(`${table}?${qs}`,{ method: "PATCH", body: JSON.stringify(body) }),
  delete: (table, qs)         => supa(`${table}?${qs}`,{ method: "DELETE", prefer: "" }),
};

const uploadFile = async (file, investmentId) => {
  const path = `${investmentId}/${Date.now()}_${file.name}`;
  const res = await fetch(`${SUPA_URL}/storage/v1/object/investment-files/${path}`, {
    method: "POST",
    headers: {
      "apikey": SUPA_KEY,
      "Authorization": `Bearer ${SUPA_KEY}`,
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });
  if (!res.ok) throw new Error(await res.text());
  return path;
};

// ── Brand tokens ──────────────────────────────────────────────────────────────
const T = {
  black:   "#0a0a0a",
  charcoal:"#1a1a1a",
  dark:    "#222222",
  accent:  "#c8a96e",
  light:   "#f5f3ef",
  white:   "#ffffff",
  green:   "#4caf7d",
  red:     "#e05252",
  blue:    "#4a90d9",
  muted:   "#888888",
};

const USERS = [
  { id:1, name:"Kyle Pickens",       role:"admin",   initials:"KP" },
  { id:2, name:"Jay Monroe",         role:"analyst",  initials:"JM" },
  { id:3, name:"Tim Taylor",         role:"analyst",  initials:"TT" },
  { id:4, name:"Christine Harkness", role:"analyst",  initials:"CH" },
  { id:5, name:"Jen Fyock",          role:"analyst",  initials:"JF" },
];

const FILE_ICONS = { pdf:"📄", xlsx:"📊", xls:"📊", csv:"📊", docx:"📝", doc:"📝", default:"📎" };
const fileIcon = n => FILE_ICONS[n.split(".").pop().toLowerCase()] || FILE_ICONS.default;

const fmt  = n => n == null ? "—" : "$" + (Math.abs(n) >= 1e9 ? (n/1e9).toFixed(2)+"B" : Math.abs(n) >= 1e6 ? (n/1e6).toFixed(1)+"M" : Number(n).toLocaleString());
const pct  = n => n == null ? "—" : Number(n).toFixed(1) + "%";
const clr  = n => n > 0 ? T.green : n < 0 ? T.red : T.muted;
const fmtN = n => n == null ? "—" : Number(n).toLocaleString();

// ── Shared UI ─────────────────────────────────────────────────────────────────
const Badge = ({ label, color }) => (
  <span style={{ background: color+"22", color, border: `1px solid ${color}44`, borderRadius:4,
    fontSize:11, fontWeight:700, padding:"2px 8px", letterSpacing:.5, textTransform:"uppercase" }}>
    {label}
  </span>
);

const TypeBadge = ({ type }) => {
  const m = { public:[T.blue,"PUBLIC"], private:[T.accent,"PRIVATE"], fund:[T.green,"FUND"] };
  const [c,l] = m[type] || [T.muted, type];
  return <Badge label={l} color={c} />;
};

const Card = ({ children, style={} }) => (
  <div style={{ background:T.charcoal, border:"1px solid #333", borderRadius:8, padding:"20px 24px", ...style }}>
    {children}
  </div>
);

const Stat = ({ label, value, color }) => (
  <div style={{ textAlign:"center" }}>
    <div style={{ fontSize:22, fontWeight:700, color:color||T.accent, fontFamily:"Georgia,serif" }}>{value}</div>
    <div style={{ fontSize:11, color:T.muted, marginTop:4, letterSpacing:.5, textTransform:"uppercase" }}>{label}</div>
  </div>
);

const Toast = ({ msg, type }) => (
  <div style={{ position:"fixed", bottom:24, right:24, zIndex:2000,
    background: type==="error" ? T.red : T.green, color:T.white,
    padding:"12px 20px", borderRadius:8, fontSize:13, fontWeight:600,
    boxShadow:"0 4px 20px rgba(0,0,0,.4)" }}>
    {type==="error" ? "⚠ " : "✓ "}{msg}
  </div>
);

// ── Stable form fields (defined outside App to prevent re-mount on state change) ──
const FieldInput = memo(({ label, value, onChange, type="text", placeholder="", highlight=false }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ color:T.muted, fontSize:11, textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:4 }}>{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ width:"100%", background: highlight ? "#1a2a1a" : T.dark,
          color: highlight ? T.green : T.white,
          border: `1px solid ${focused ? T.accent : highlight ? "#4caf7d44" : "#444"}`,
          borderRadius:6, padding:"9px 12px", fontSize:13, boxSizing:"border-box",
          fontFamily:"inherit", outline:"none", transition:"border-color .15s" }} />
    </div>
  );
});

const FieldSelect = memo(({ label, value, onChange, children }) => (
  <div style={{ marginBottom:14 }}>
    <label style={{ color:T.muted, fontSize:11, textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:4 }}>{label}</label>
    <select value={value} onChange={onChange}
      style={{ width:"100%", background:T.dark, color:T.white, border:"1px solid #444",
        borderRadius:6, padding:"9px 12px", fontSize:13, outline:"none", fontFamily:"inherit" }}>
      {children}
    </select>
  </div>
));

const FieldTextarea = memo(({ label, value, onChange, placeholder="" }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ color:T.muted, fontSize:11, textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:4 }}>{label}</label>
      <textarea value={value} onChange={onChange} placeholder={placeholder}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ width:"100%", background:T.dark, color:T.white,
          border: `1px solid ${focused ? T.accent : "#444"}`, borderRadius:6,
          padding:"9px 12px", fontSize:13, minHeight:72, resize:"vertical",
          fontFamily:"inherit", boxSizing:"border-box", outline:"none", transition:"border-color .15s" }} />
    </div>
  );
});

// ── Ticker lookup DB (replace with Bloomberg reference data when connected) ────
const TICKER_DB = {
  GSAT:  { name:"Globalstar, Inc.",         sector:"Satellite / Telecom" },
  AAPL:  { name:"Apple Inc.",               sector:"Technology" },
  MSFT:  { name:"Microsoft Corporation",    sector:"Technology" },
  TSLA:  { name:"Tesla, Inc.",              sector:"Automotive / Energy" },
  AMZN:  { name:"Amazon.com, Inc.",         sector:"E-Commerce / Cloud" },
  GOOGL: { name:"Alphabet Inc.",            sector:"Technology" },
  META:  { name:"Meta Platforms, Inc.",     sector:"Technology" },
  JPM:   { name:"JPMorgan Chase & Co.",     sector:"Banking" },
  XOM:   { name:"Exxon Mobil Corporation",  sector:"Energy" },
  NEE:   { name:"NextEra Energy, Inc.",     sector:"Utilities / Energy" },
  BEP:   { name:"Brookfield Renewable",     sector:"Renewable Energy" },
  ENPH:  { name:"Enphase Energy",           sector:"Solar / Energy Tech" },
  VICI:  { name:"VICI Properties",          sector:"Real Estate / Gaming" },
  AMT:   { name:"American Tower",           sector:"Real Estate / Telecom" },
};

// ── Add Investment Modal ───────────────────────────────────────────────────────
const BLANK = { name:"", ticker:"", type:"public", sector:"", committed:"", vintage:"", description:"", units:"", pricePerUnit:"" };

const AddInvestmentModal = memo(({ onSave, onClose }) => {
  const [form, setForm]               = useState(BLANK);
  const [tickerStatus, setTickerStatus] = useState(null);
  const [saving, setSaving]           = useState(false);
  const tickerTimer = useRef(null);

  const set = useCallback((k, v) => setForm(p => ({ ...p, [k]: v })), []);

  const handleTicker = useCallback(e => {
    const v = e.target.value.toUpperCase();
    set("ticker", v);
    if (form.type !== "public") return;
    setTickerStatus("loading");
    clearTimeout(tickerTimer.current);
    tickerTimer.current = setTimeout(() => {
      const hit = TICKER_DB[v];
      if (hit) { setForm(p => ({ ...p, name: hit.name, sector: hit.sector })); setTickerStatus("found"); }
      else setTickerStatus(v.length > 0 ? "notfound" : null);
    }, 600);
  }, [form.type, set]);

  const implied = form.units && form.pricePerUnit ? Math.round(Number(form.units) * Number(form.pricePerUnit)) : null;
  const unitLabel  = form.type==="fund" ? "Units / LP Interest" : form.type==="private" ? "Shares / Units" : "# of Shares";
  const priceLabel = form.type==="fund" ? "Price Per Unit ($)"  : form.type==="public"  ? "Price Paid Per Share ($)" : "Price Paid Per Share / Bond ($)";

  const handleSave = async () => {
    if (!form.name || !form.sector) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.82)", zIndex:999,
      display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:T.charcoal, border:"1px solid #333", borderRadius:8, width:540,
        padding:32, maxHeight:"92vh", overflowY:"auto", boxSizing:"border-box" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:22 }}>
          <span style={{ color:T.white, fontSize:18, fontFamily:"Georgia,serif" }}>Add Investment</span>
          <button onClick={onClose} style={{ background:"none", color:T.muted, border:"none", fontSize:22, cursor:"pointer" }}>×</button>
        </div>

        <FieldSelect label="Type *" value={form.type} onChange={e => { set("type", e.target.value); setTickerStatus(null); }}>
          <option value="public">Public Equity</option>
          <option value="private">Private Investment</option>
          <option value="fund">Fund</option>
        </FieldSelect>

        {form.type === "public" && (
          <div style={{ marginBottom:14 }}>
            <label style={{ color:T.muted, fontSize:11, textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:4 }}>Ticker Symbol</label>
            <div style={{ position:"relative" }}>
              <input value={form.ticker} onChange={handleTicker} placeholder="e.g. AAPL"
                style={{ width:"100%", background:T.dark, color:T.white,
                  border: `1px solid ${tickerStatus==="found" ? T.green : tickerStatus==="notfound" ? "#666" : "#444"}`,
                  borderRadius:6, padding:"9px 40px 9px 12px", fontSize:13,
                  boxSizing:"border-box", fontFamily:"inherit", outline:"none" }} />
              <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)" }}>
                {tickerStatus==="loading"  && <span style={{ color:T.muted }}>⟳</span>}
                {tickerStatus==="found"    && <span style={{ color:T.green }}>✓</span>}
                {tickerStatus==="notfound" && <span style={{ color:T.muted, fontSize:11 }}>?</span>}
              </span>
            </div>
            {tickerStatus==="found"    && <div style={{ color:T.green, fontSize:11, marginTop:4 }}>✓ Company name and sector auto-filled</div>}
            {tickerStatus==="notfound" && <div style={{ color:T.muted, fontSize:11, marginTop:4 }}>Ticker not found — fill in manually below</div>}
          </div>
        )}

        <FieldInput label="Company / Fund Name *" value={form.name}        onChange={e => set("name", e.target.value)}        highlight={tickerStatus==="found"} />
        <FieldInput label="Sector *"               value={form.sector}      onChange={e => set("sector", e.target.value)}      highlight={tickerStatus==="found"} />
        <FieldInput label="Committed Capital ($)"  value={form.committed}   onChange={e => set("committed", e.target.value)}   type="number" placeholder="e.g. 25000000" />

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <FieldInput label={unitLabel}  value={form.units}        onChange={e => set("units", e.target.value)}        type="number" placeholder="e.g. 500000" />
          <FieldInput label={priceLabel} value={form.pricePerUnit} onChange={e => set("pricePerUnit", e.target.value)} type="number" placeholder="e.g. 2.50" />
        </div>

        {implied !== null && (
          <div style={{ background:T.dark, border:"1px solid #333", borderRadius:6, padding:"10px 14px", marginBottom:14, marginTop:-6, display:"flex", gap:20 }}>
            <div>
              <div style={{ color:T.muted, fontSize:10, textTransform:"uppercase", letterSpacing:.5 }}>Implied Cost Basis</div>
              <div style={{ color:T.accent, fontSize:15, fontWeight:700 }}>{fmt(implied)}</div>
            </div>
            {form.committed && Number(form.committed) > 0 && (
              <div>
                <div style={{ color:T.muted, fontSize:10, textTransform:"uppercase", letterSpacing:.5 }}>vs. Committed</div>
                <div style={{ color:T.muted, fontSize:15, fontWeight:700 }}>{fmt(Number(form.committed))}</div>
              </div>
            )}
          </div>
        )}

        <FieldInput label="Vintage Year" value={form.vintage} onChange={e => set("vintage", e.target.value)} type="number" placeholder={String(new Date().getFullYear())} />
        <FieldTextarea label="Description" value={form.description} onChange={e => set("description", e.target.value)} placeholder="Brief description of the investment…" />

        <div style={{ display:"flex", gap:10, marginTop:4 }}>
          <button onClick={handleSave} disabled={!form.name || !form.sector || saving}
            style={{ flex:1, background: form.name && form.sector ? T.accent : "#333",
              color: form.name && form.sector ? T.black : T.muted, border:"none", borderRadius:6,
              padding:"11px", fontSize:13, fontWeight:700, cursor: form.name && form.sector ? "pointer" : "not-allowed",
              opacity: saving ? .7 : 1 }}>
            {saving ? "Saving…" : "Save Investment"}
          </button>
          <button onClick={onClose} style={{ flex:1, background:"transparent", color:T.muted, border:"1px solid #444", borderRadius:6, padding:"11px", fontSize:13, cursor:"pointer" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
});

// ── Bloomberg Setup Modal ─────────────────────────────────────────────────────
const BBModal = memo(({ onClose }) => (
  <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.8)", zIndex:1000,
    display:"flex", alignItems:"center", justifyContent:"center" }}
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div style={{ background:T.charcoal, border:"1px solid #333", borderRadius:8, width:560, padding:32, maxHeight:"80vh", overflowY:"auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20 }}>
        <span style={{ color:T.white, fontSize:18, fontFamily:"Georgia,serif" }}>Bloomberg Integration</span>
        <button onClick={onClose} style={{ background:"none", color:T.muted, border:"none", fontSize:22, cursor:"pointer" }}>×</button>
      </div>
      {[
        ["Bloomberg B-PIPE / Server API",  "Recommended for firm-wide deployment. Requires a Bloomberg Data License and server-side proxy. Supports real-time streaming, historical data, and corporate actions."],
        ["Bloomberg PORT API",             "Ideal if your team already uses PORT for portfolio analytics. Enables NAV, P&L, and risk data to flow directly into this portal."],
        ["Bloomberg Open API (Desktop)",   "Free with an active Bloomberg Terminal subscription. Requires the Terminal running locally."],
      ].map(([t,d]) => (
        <div key={t} style={{ background:T.dark, border:"1px solid #333", borderRadius:8, padding:"16px 18px", marginBottom:12 }}>
          <div style={{ color:T.accent, fontWeight:700, fontSize:13, marginBottom:6 }}>{t}</div>
          <div style={{ color:T.muted, fontSize:12, lineHeight:1.7 }}>{d}</div>
        </div>
      ))}
      <div style={{ background:"#1a1a2e", border:"1px solid #4a90d933", borderRadius:8, padding:"14px 18px", marginTop:8 }}>
        <div style={{ color:T.blue, fontSize:12, fontWeight:700, marginBottom:6 }}>Current Status</div>
        <div style={{ color:T.muted, fontSize:12 }}>Running on simulated data. Connect credentials to go live.</div>
      </div>
    </div>
  </div>
));

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [currentUser,    setCurrentUser]    = useState(USERS[0]);
  const [view,           setView]           = useState("dashboard");
  const [investments,    setInvestments]    = useState([]);
  const [notes,          setNotes]          = useState([]);
  const [files,          setFiles]          = useState([]);
  const [selectedId,     setSelectedId]     = useState(null);
  const [noteText,       setNoteText]       = useState("");
  const [noteType,       setNoteType]       = useState("update");
  const [filterType,     setFilterType]     = useState("all");
  const [filterSector,   setFilterSector]   = useState("all");
  const [showAddInv,     setShowAddInv]     = useState(false);
  const [showBBModal,    setShowBBModal]    = useState(false);
  const [bbRefresh,      setBbRefresh]      = useState(false);
  const [fileTab,        setFileTab]        = useState("all");
  const [activityFilter, setActivityFilter] = useState("all");
  const [loading,        setLoading]        = useState(true);
  const [toast,          setToast]          = useState(null);
  const fileRef = useRef();

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Load all data ────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, nt, fl] = await Promise.all([
        db.get("investments", "order=created_at.asc"),
        db.get("notes",       "order=created_at.desc"),
        db.get("files",       "order=created_at.desc"),
      ]);
      const withBB = (inv || []).map(i =>
        i.type === "public" && i.ticker
          ? { ...i, bloombergData: { price: Number(i.price_per_unit)||0, change:0, pct:0, mktCap:"—", pe:null, vol:"—" } }
          : { ...i, bloombergData: null }
      );
      setInvestments(withBB);
      setNotes(nt || []);
      setFiles(fl || []);
    } catch (e) {
      showToast("Failed to connect to Supabase — check your project is active", "error");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const selected     = investments.find(i => i.id === selectedId) || null;
  const invNotes     = notes.filter(n => n.investment_id === selectedId);
  const invFiles     = files.filter(f => f.investment_id === selectedId);
  const totalCommit  = investments.reduce((s,i) => s + (i.committed||0), 0);
  const totalNAV     = investments.reduce((s,i) => s + (i.nav||0), 0);
  const totalGain    = totalNAV - totalCommit;
  const avgIRR       = investments.length ? (investments.reduce((s,i) => s+(i.irr||0),0)/investments.length).toFixed(1) : "0.0";
  const sectors      = [...new Set(investments.map(i => i.sector))];
  const filtered     = investments.filter(i => (filterType==="all"||i.type===filterType) && (filterSector==="all"||i.sector===filterSector));
  const fileFilter   = f => fileTab==="all" ? true : fileTab==="pdf" ? f.ext==="pdf" : fileTab==="excel" ? ["xlsx","xls","csv"].includes(f.ext) : ["docx","doc"].includes(f.ext);
  const allNotes     = notes.map(n => { const inv=investments.find(i=>i.id===n.investment_id)||{}; return {...n,invName:inv.name||"—",invType:inv.type||"private"}; }).filter(n => activityFilter==="all"||n.type===activityFilter);

  // ── Actions ──────────────────────────────────────────────────────────────
  const addNote = async () => {
    if (!noteText.trim() || !selected) return;
    try {
      const res = await db.insert("notes", { investment_id:selected.id, author:currentUser.initials, text:noteText.trim(), type:noteType });
      setNotes(p => [res[0], ...p]);
      setNoteText("");
      showToast("Note saved");
    } catch (e) { showToast("Failed to save note", "error"); }
  };

  const handleFile = async e => {
    const ok = ["pdf","xlsx","xls","csv","docx","doc"];
    const list = Array.from(e.target.files).filter(f => ok.includes(f.name.split(".").pop().toLowerCase()));
    if (!list.length || !selected) return;
    for (const f of list) {
      try {
        const path = await uploadFile(f, selected.id);
        const meta = { investment_id:selected.id, name:f.name, size:(f.size/1024).toFixed(0)+"KB", ext:f.name.split(".").pop().toLowerCase(), storage_path:path, author:currentUser.initials };
        const res  = await db.insert("files", meta);
        setFiles(p => [res[0], ...p]);
        showToast(`${f.name} uploaded`);
      } catch {
        try {
          const meta = { investment_id:selected.id, name:f.name, size:(f.size/1024).toFixed(0)+"KB", ext:f.name.split(".").pop().toLowerCase(), storage_path:null, author:currentUser.initials };
          const res  = await db.insert("files", meta);
          setFiles(p => [res[0], ...p]);
          showToast(`${f.name} saved (create storage bucket to enable full uploads)`);
        } catch { showToast("File upload failed","error"); }
      }
    }
    e.target.value = "";
  };

  const refreshBB = () => {
    setBbRefresh(true);
    setTimeout(() => {
      setInvestments(p => p.map(i => i.bloombergData ? { ...i, bloombergData: {
        ...i.bloombergData,
        price:  +(i.bloombergData.price  * (1+(Math.random()-.5)*.02)).toFixed(2),
        change: +((Math.random()-.48)*.08).toFixed(3),
        pct:    +((Math.random()-.48)*2).toFixed(2),
      }} : i));
      setBbRefresh(false);
      showToast("Bloomberg data refreshed");
    }, 1400);
  };

  const saveNewInv = useCallback(async form => {
    const body = {
      name:           form.name,
      ticker:         form.ticker || null,
      type:           form.type,
      sector:         form.sector,
      committed:      Number(form.committed) || 0,
      nav:            Number(form.committed) || 0,
      irr:            0,
      moic:           1.0,
      units:          form.units        ? Number(form.units)        : null,
      price_per_unit: form.pricePerUnit ? Number(form.pricePerUnit) : null,
      description:    form.description  || null,
      tags:           [],
      vintage:        Number(form.vintage) || new Date().getFullYear(),
      status:         "active",
    };
    try {
      const res = await db.insert("investments", body);
      const inv = res[0];
      inv.bloombergData = inv.type==="public" && inv.ticker
        ? { price: Number(inv.price_per_unit)||0, change:0, pct:0, mktCap:"—", pe:null, vol:"—" }
        : null;
      setInvestments(p => [...p, inv]);
      setShowAddInv(false);
      showToast(`${inv.name} added`);
    } catch (e) {
      let msg = "Failed to save investment";
      try { const d = JSON.parse(e.message); msg = d.message || d.hint || d.error || e.message; } catch { msg = e.message; }
      showToast(msg, "error");
    }
  }, []);

  // ── Nav ───────────────────────────────────────────────────────────────────
  const Nav = () => (
    <div style={{ background:T.black, borderBottom:"1px solid #2a2a2a", padding:"0 32px",
      display:"flex", alignItems:"center", justifyContent:"space-between", height:64, flexShrink:0 }}>
      <div style={{ display:"flex", alignItems:"center", gap:24 }}>
        <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
          <span style={{ color:"#cc2222", fontSize:22, fontWeight:700, fontFamily:"Georgia,serif", letterSpacing:1 }}>Thermo</span>
          <span style={{ color:T.white,   fontSize:22, fontWeight:300, fontFamily:"Georgia,serif", letterSpacing:1 }}>Investments</span>
        </div>
        <div style={{ display:"flex", gap:4, marginLeft:8 }}>
          {[["dashboard","Dashboard"],["portfolio","Portfolio"],["activity","Activity Log"]].map(([v,l]) => (
            <button key={v} onClick={() => setView(v)}
              style={{ background: view===v ? T.accent+"22" : "transparent", color: view===v ? T.accent : T.muted,
                border:"none", borderRadius:6, padding:"6px 16px", cursor:"pointer", fontSize:13, fontWeight: view===v ? 600 : 400 }}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <select value={currentUser.id} onChange={e => setCurrentUser(USERS.find(u => u.id===Number(e.target.value)))}
          style={{ background:T.charcoal, color:T.light, border:"1px solid #333", borderRadius:6, padding:"6px 10px", fontSize:12, cursor:"pointer" }}>
          {USERS.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
        </select>
        <div style={{ width:34, height:34, borderRadius:"50%", background:T.accent, color:T.black,
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700 }}>
          {currentUser.initials}
        </div>
      </div>
    </div>
  );

  // ── Loading screen ────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ height:"100vh", background:T.black, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", gap:16, fontFamily:"'Helvetica Neue',sans-serif" }}>
      <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
        <span style={{ color:"#cc2222", fontSize:28, fontWeight:700, fontFamily:"Georgia,serif" }}>Thermo</span>
        <span style={{ color:T.white,   fontSize:28, fontWeight:300, fontFamily:"Georgia,serif" }}>Investments</span>
      </div>
      <div style={{ color:T.muted, fontSize:13, letterSpacing:2, textTransform:"uppercase" }}>Connecting…</div>
      <div style={{ width:200, height:2, background:"#222", borderRadius:2, overflow:"hidden" }}>
        <div style={{ width:"60%", height:"100%", background:T.accent, borderRadius:2, animation:"slide 1.2s ease-in-out infinite" }} />
      </div>
      <style>{`@keyframes slide{0%{transform:translateX(-200%)}100%{transform:translateX(400%)}}`}</style>
    </div>
  );

  // ── Dashboard ─────────────────────────────────────────────────────────────
  const Dashboard = () => (
    <div style={{ padding:32, overflowY:"auto", flex:1 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:28 }}>
        <div>
          <h1 style={{ color:T.white, fontSize:28, fontFamily:"Georgia,serif", margin:0 }}>Portfolio Overview</h1>
          <div style={{ color:T.muted, fontSize:13, marginTop:4 }}>{new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={() => setShowBBModal(true)} style={{ background:"#1a1a2e", color:T.blue, border:"1px solid #4a90d944", borderRadius:6, padding:"8px 16px", cursor:"pointer", fontSize:12, fontWeight:600 }}>Bloomberg Setup</button>
          <button onClick={refreshBB} disabled={bbRefresh} style={{ background: bbRefresh?"#333":T.accent+"22", color: bbRefresh?T.muted:T.accent, border:`1px solid ${bbRefresh?"#333":T.accent+"44"}`, borderRadius:6, padding:"8px 16px", cursor: bbRefresh?"not-allowed":"pointer", fontSize:12, fontWeight:600 }}>
            {bbRefresh ? "⟳ Refreshing…" : "⟳ Bloomberg Refresh"}
          </button>
          {currentUser.role==="admin" && (
            <button onClick={() => setShowAddInv(true)} style={{ background:T.accent, color:T.black, border:"none", borderRadius:6, padding:"8px 18px", cursor:"pointer", fontSize:13, fontWeight:700 }}>+ Add Investment</button>
          )}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:16, marginBottom:24 }}>
        {[["Total Committed",fmt(totalCommit),T.accent],["Total NAV",fmt(totalNAV),T.accent],["Unrealized Gain",fmt(totalGain),totalGain>=0?T.green:T.red],["Avg. Net IRR",pct(parseFloat(avgIRR)),T.accent],["# Investments",investments.length,T.accent]].map(([l,v,c]) => (
          <Card key={l} style={{ padding:"18px 20px" }}><Stat label={l} value={v} color={c} /></Card>
        ))}
      </div>

      {investments.some(i => i.bloombergData) && (
        <Card style={{ marginBottom:24, padding:"16px 24px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ color:T.accent, fontSize:11, fontWeight:700, letterSpacing:2, textTransform:"uppercase" }}>Bloomberg — Public Holdings</div>
            <button onClick={() => setShowBBModal(true)} style={{ background:"none", border:"none", color:T.muted, fontSize:11, cursor:"pointer", textDecoration:"underline" }}>
              {bbRefresh ? "Fetching…" : "Simulated · Configure →"}
            </button>
          </div>
          <div style={{ display:"flex", gap:36, flexWrap:"wrap" }}>
            {investments.filter(i => i.bloombergData).map(i => (
              <div key={i.id}>
                <div style={{ color:T.white, fontSize:13, fontWeight:700 }}>{i.ticker}</div>
                <div style={{ display:"flex", alignItems:"baseline", gap:8, marginTop:2 }}>
                  <span style={{ fontSize:20, fontWeight:700, color:T.light, fontFamily:"Georgia,serif" }}>${i.bloombergData.price}</span>
                  <span style={{ fontSize:13, color:clr(i.bloombergData.pct), fontWeight:600 }}>{i.bloombergData.pct>=0?"+":""}{i.bloombergData.pct}%</span>
                </div>
                <div style={{ fontSize:11, color:T.muted }}>Cap {i.bloombergData.mktCap} · Vol {i.bloombergData.vol}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {investments.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:24 }}>
          <Card>
            <div style={{ color:T.accent, fontSize:11, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:16 }}>NAV by Type</div>
            {["public","private","fund"].map(t => {
              const n = investments.filter(i=>i.type===t).reduce((s,i)=>s+(i.nav||0),0);
              const p = totalNAV > 0 ? (n/totalNAV*100).toFixed(1) : "0";
              const c = t==="public"?T.blue:t==="private"?T.accent:T.green;
              return (<div key={t} style={{ marginBottom:12 }}><div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}><span style={{ color:T.light, fontSize:13, textTransform:"capitalize" }}>{t}</span><span style={{ color:T.muted, fontSize:12 }}>{fmt(n)} · {p}%</span></div><div style={{ height:6, background:"#333", borderRadius:3 }}><div style={{ height:"100%", width:p+"%", background:c, borderRadius:3 }}/></div></div>);
            })}
          </Card>
          <Card>
            <div style={{ color:T.accent, fontSize:11, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:16 }}>NAV by Sector</div>
            {sectors.map((s,idx) => {
              const n = investments.filter(i=>i.sector===s).reduce((a,i)=>a+(i.nav||0),0);
              const p = totalNAV > 0 ? (n/totalNAV*100).toFixed(1) : "0";
              const cols = [T.accent,T.blue,T.green,"#9b59b6","#e67e22","#e84393"];
              return (<div key={s} style={{ marginBottom:12 }}><div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}><span style={{ color:T.light, fontSize:13 }}>{s}</span><span style={{ color:T.muted, fontSize:12 }}>{p}%</span></div><div style={{ height:6, background:"#333", borderRadius:3 }}><div style={{ height:"100%", width:p+"%", background:cols[idx%cols.length], borderRadius:3 }}/></div></div>);
            })}
          </Card>
        </div>
      )}

      <Card>
        <div style={{ color:T.accent, fontSize:11, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:16 }}>Recent Notes & Updates</div>
        {notes.slice(0,6).map(n => {
          const inv = investments.find(i=>i.id===n.investment_id)||{};
          return (
            <div key={n.id} style={{ borderBottom:"1px solid #2a2a2a", paddingBottom:12, marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{ color:T.accent, fontWeight:600, fontSize:13, cursor:"pointer" }} onClick={() => { setSelectedId(n.investment_id); setView("portfolio"); }}>{inv.name||"—"}</span>
                  <Badge label={n.type} color={n.type==="meeting"?T.blue:T.accent}/>
                </div>
                <span style={{ color:T.muted, fontSize:11 }}>{n.created_at?.slice(0,10)} · {n.author}</span>
              </div>
              <div style={{ color:T.light, fontSize:13, lineHeight:1.6 }}>{n.text}</div>
            </div>
          );
        })}
        {notes.length===0 && <div style={{ color:T.muted, fontSize:13 }}>No notes yet.</div>}
      </Card>
    </div>
  );

  // ── Portfolio ──────────────────────────────────────────────────────────────
  const Portfolio = () => (
    <div style={{ display:"flex", flex:1, overflow:"hidden" }}>
      <div style={{ width:360, borderRight:"1px solid #2a2a2a", overflowY:"auto", background:T.black, flexShrink:0 }}>
        <div style={{ padding:"16px 14px 10px", borderBottom:"1px solid #1e1e1e", position:"sticky", top:0, background:T.black, zIndex:10 }}>
          <div style={{ display:"flex", gap:6, marginBottom:8, flexWrap:"wrap" }}>
            {["all","public","private","fund"].map(t => (
              <button key={t} onClick={() => setFilterType(t)}
                style={{ background: filterType===t?T.accent:T.charcoal, color: filterType===t?T.black:T.muted,
                  border:`1px solid ${filterType===t?T.accent:"#333"}`, borderRadius:4, padding:"4px 10px",
                  cursor:"pointer", fontSize:11, fontWeight:600, textTransform:"uppercase" }}>
                {t}
              </button>
            ))}
          </div>
          <select value={filterSector} onChange={e => setFilterSector(e.target.value)}
            style={{ width:"100%", background:T.charcoal, color:T.light, border:"1px solid #333", borderRadius:6, padding:"7px 10px", fontSize:12 }}>
            <option value="all">All Sectors</option>
            {sectors.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {filtered.length===0 && <div style={{ padding:24, color:T.muted, fontSize:13, textAlign:"center" }}>No investments yet.<br/>Add one to get started.</div>}
        {filtered.map(inv => (
          <div key={inv.id} onClick={() => setSelectedId(inv.id)}
            style={{ padding:"16px 20px", borderBottom:"1px solid #1e1e1e", cursor:"pointer",
              background: selectedId===inv.id ? T.charcoal : "transparent",
              borderLeft:`3px solid ${selectedId===inv.id?T.accent:"transparent"}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
              <span style={{ color:T.white, fontWeight:600, fontSize:14 }}>{inv.name}</span>
              <TypeBadge type={inv.type}/>
            </div>
            <div style={{ color:T.muted, fontSize:11, marginBottom:8 }}>{inv.sector} · {inv.vintage}</div>
            <div style={{ display:"flex", gap:18, flexWrap:"wrap" }}>
              <div><div style={{ color:T.accent, fontSize:13, fontWeight:600 }}>{fmt(inv.nav)}</div><div style={{ color:T.muted, fontSize:10, textTransform:"uppercase" }}>NAV</div></div>
              <div><div style={{ color:T.green,  fontSize:13, fontWeight:600 }}>{pct(inv.irr)}</div><div style={{ color:T.muted, fontSize:10, textTransform:"uppercase" }}>IRR</div></div>
              <div><div style={{ color:T.light,  fontSize:13, fontWeight:600 }}>{(inv.moic||1).toFixed(2)}x</div><div style={{ color:T.muted, fontSize:10, textTransform:"uppercase" }}>MOIC</div></div>
              {files.filter(f=>f.investment_id===inv.id).length>0 && <div><div style={{ color:T.muted, fontSize:13 }}>📎{files.filter(f=>f.investment_id===inv.id).length}</div><div style={{ color:T.muted, fontSize:10, textTransform:"uppercase" }}>Files</div></div>}
            </div>
          </div>
        ))}
        {currentUser.role==="admin" && (
          <div style={{ padding:14 }}>
            <button onClick={() => setShowAddInv(true)} style={{ width:"100%", background:"transparent", color:T.accent, border:`1px dashed ${T.accent}44`, borderRadius:6, padding:"10px", cursor:"pointer", fontSize:12, fontWeight:600 }}>+ Add Investment</button>
          </div>
        )}
      </div>

      {selected ? (
        <div style={{ flex:1, overflowY:"auto", padding:32, background:T.black }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
            <div>
              <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:6 }}>
                <h2 style={{ color:T.white, fontSize:26, fontFamily:"Georgia,serif", margin:0 }}>{selected.name}</h2>
                <TypeBadge type={selected.type}/>
                {selected.ticker && <span style={{ color:T.muted, fontSize:14, fontWeight:600 }}>{selected.ticker}</span>}
              </div>
              <div style={{ color:T.muted, fontSize:13 }}>{selected.sector} · Vintage {selected.vintage}</div>
              <div style={{ color:T.light, fontSize:13, marginTop:8, maxWidth:600, lineHeight:1.7 }}>{selected.description}</div>
            </div>
            {selected.bloombergData && (
              <button onClick={refreshBB} disabled={bbRefresh} style={{ background:T.accent+"22", color:T.accent, border:`1px solid ${T.accent}44`, borderRadius:6, padding:"7px 14px", cursor: bbRefresh?"not-allowed":"pointer", fontSize:12, fontWeight:600 }}>
                {bbRefresh ? "⟳ …" : "⟳ Bloomberg"}
              </button>
            )}
          </div>

          {selected.bloombergData && (
            <Card style={{ marginBottom:24 }}>
              <div style={{ color:T.accent, fontSize:11, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:12 }}>Bloomberg Market Data</div>
              <div style={{ display:"flex", gap:36, flexWrap:"wrap" }}>
                {[["Price","$"+selected.bloombergData.price,T.white],["Change",(selected.bloombergData.pct>=0?"+":"")+selected.bloombergData.pct+"%",clr(selected.bloombergData.pct)],["Market Cap",selected.bloombergData.mktCap,T.light],["P/E",selected.bloombergData.pe||"N/M",T.light],["Volume",selected.bloombergData.vol,T.light]].map(([l,v,c]) => (
                  <div key={l}><div style={{ fontSize:20, fontWeight:700, color:c, fontFamily:"Georgia,serif" }}>{v}</div><div style={{ fontSize:10, color:T.muted, textTransform:"uppercase", letterSpacing:.5, marginTop:2 }}>{l}</div></div>
                ))}
              </div>
            </Card>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
            {[["Committed",fmt(selected.committed),T.accent],["Current NAV",fmt(selected.nav),T.accent],["Net IRR",pct(selected.irr),T.green],["MOIC",(selected.moic||1).toFixed(2)+"x",T.accent]].map(([l,v,c]) => (
              <Card key={l} style={{ padding:"16px 18px" }}><Stat label={l} value={v} color={c}/></Card>
            ))}
          </div>

          {(selected.units || selected.price_per_unit) && (
            <Card style={{ marginBottom:24 }}>
              <div style={{ color:T.accent, fontSize:11, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:14 }}>Position Detail</div>
              <div style={{ display:"flex", gap:32, flexWrap:"wrap" }}>
                {selected.units        && <div><div style={{ fontSize:18, fontWeight:700, color:T.light,  fontFamily:"Georgia,serif" }}>{fmtN(selected.units)}</div><div style={{ fontSize:10, color:T.muted, textTransform:"uppercase", letterSpacing:.5, marginTop:2 }}>{selected.type==="fund"?"Units":"Shares / Units"}</div></div>}
                {selected.price_per_unit && <div><div style={{ fontSize:18, fontWeight:700, color:T.light,  fontFamily:"Georgia,serif" }}>{fmt(selected.price_per_unit)}</div><div style={{ fontSize:10, color:T.muted, textTransform:"uppercase", letterSpacing:.5, marginTop:2 }}>Avg. Cost Basis</div></div>}
                {selected.units && selected.price_per_unit && <div><div style={{ fontSize:18, fontWeight:700, color:T.accent, fontFamily:"Georgia,serif" }}>{fmt(Math.round(selected.units*selected.price_per_unit))}</div><div style={{ fontSize:10, color:T.muted, textTransform:"uppercase", letterSpacing:.5, marginTop:2 }}>Implied Cost</div></div>}
              </div>
            </Card>
          )}

          <Card style={{ marginBottom:24 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div style={{ color:T.accent, fontSize:11, fontWeight:700, letterSpacing:2, textTransform:"uppercase" }}>Documents & Files</div>
              {currentUser.role!=="viewer" && <button onClick={() => fileRef.current.click()} style={{ background:T.accent+"22", color:T.accent, border:`1px solid ${T.accent}44`, borderRadius:6, padding:"5px 14px", cursor:"pointer", fontSize:12, fontWeight:600 }}>+ Upload</button>}
            </div>
            <input ref={fileRef} type="file" multiple accept=".pdf,.xlsx,.xls,.csv,.docx,.doc" style={{ display:"none" }} onChange={handleFile}/>
            {invFiles.length>0 && (
              <div style={{ display:"flex", gap:6, marginBottom:14 }}>
                {["all","pdf","excel","word"].map(t => (
                  <button key={t} onClick={() => setFileTab(t)} style={{ background: fileTab===t?T.dark:"transparent", color: fileTab===t?T.light:T.muted, border:`1px solid ${fileTab===t?"#555":"transparent"}`, borderRadius:4, padding:"3px 12px", cursor:"pointer", fontSize:11, textTransform:"capitalize" }}>
                    {t==="excel"?"Excel/CSV":t}
                  </button>
                ))}
              </div>
            )}
            {invFiles.filter(fileFilter).length===0
              ? <div style={{ color:T.muted, fontSize:13, padding:"8px 0" }}>{invFiles.length===0?"No files uploaded yet.":"No files in this category."}</div>
              : invFiles.filter(fileFilter).map((f,i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 12px", borderRadius:6, background:T.dark, marginBottom:6 }}>
                  <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                    <span style={{ fontSize:18 }}>{fileIcon(f.name)}</span>
                    <div><div style={{ color:T.light, fontSize:13 }}>{f.name}</div><div style={{ color:T.muted, fontSize:11 }}>{f.size} · {f.author}</div></div>
                  </div>
                  <span style={{ color:T.muted, fontSize:11 }}>{f.created_at?.slice(0,10)}</span>
                </div>
              ))
            }
          </Card>

          <Card>
            <div style={{ color:T.accent, fontSize:11, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:16 }}>Meeting Notes & Updates</div>
            {invNotes.map(n => (
              <div key={n.id} style={{ borderBottom:"1px solid #2a2a2a", paddingBottom:14, marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <div style={{ width:28, height:28, borderRadius:"50%", background:T.accent, color:T.black, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700 }}>{n.author}</div>
                    <Badge label={n.type} color={n.type==="meeting"?T.blue:n.type==="call"?T.green:T.accent}/>
                  </div>
                  <span style={{ color:T.muted, fontSize:11 }}>{n.created_at?.slice(0,10)}</span>
                </div>
                <div style={{ color:T.light, fontSize:13, lineHeight:1.75, paddingLeft:36 }}>{n.text}</div>
              </div>
            ))}
            {invNotes.length===0 && <div style={{ color:T.muted, fontSize:13, marginBottom:16 }}>No notes yet.</div>}
            {currentUser.role!=="viewer" && (
              <div style={{ marginTop:8 }}>
                <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                  {["update","meeting","call","other"].map(t => (
                    <button key={t} onClick={() => setNoteType(t)}
                      style={{ background: noteType===t?T.accent:T.dark, color: noteType===t?T.black:T.muted,
                        border:`1px solid ${noteType===t?T.accent:"#444"}`, borderRadius:4, padding:"4px 14px",
                        cursor:"pointer", fontSize:11, textTransform:"capitalize", fontWeight: noteType===t?700:400 }}>
                      {t}
                    </button>
                  ))}
                </div>
                <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a note, meeting summary, or update…"
                  style={{ width:"100%", background:T.dark, color:T.light, border:"1px solid #444", borderRadius:6,
                    padding:"10px 12px", fontSize:13, resize:"vertical", minHeight:88, fontFamily:"inherit", boxSizing:"border-box", outline:"none" }}/>
                <button onClick={addNote} style={{ marginTop:8, background:T.accent, color:T.black, border:"none", borderRadius:6, padding:"8px 24px", cursor:"pointer", fontSize:13, fontWeight:700 }}>Save Note</button>
              </div>
            )}
          </Card>
        </div>
      ) : (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12 }}>
          <div style={{ color:"#333", fontSize:48 }}>📂</div>
          <div style={{ color:T.muted, fontSize:14 }}>Select an investment to view details</div>
        </div>
      )}
    </div>
  );

  // ── Activity Log ───────────────────────────────────────────────────────────
  const Activity = () => (
    <div style={{ padding:32, overflowY:"auto", flex:1 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <h1 style={{ color:T.white, fontSize:28, fontFamily:"Georgia,serif", margin:0 }}>Activity Log</h1>
          <div style={{ color:T.muted, fontSize:13, marginTop:4 }}>{notes.length} total entries</div>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {["all","update","meeting","call","other"].map(t => (
            <button key={t} onClick={() => setActivityFilter(t)}
              style={{ background: activityFilter===t?T.accent:T.charcoal, color: activityFilter===t?T.black:T.muted,
                border:`1px solid ${activityFilter===t?T.accent:"#333"}`, borderRadius:4, padding:"5px 12px",
                cursor:"pointer", fontSize:11, fontWeight:600, textTransform:"capitalize" }}>
              {t}
            </button>
          ))}
        </div>
      </div>
      {allNotes.map(n => (
        <Card key={n.id} style={{ marginBottom:10, padding:"14px 20px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <span style={{ color:T.accent, fontWeight:600, fontSize:14, cursor:"pointer" }} onClick={() => { setSelectedId(n.investment_id); setView("portfolio"); }}>{n.invName}</span>
              <TypeBadge type={n.invType}/>
              <Badge label={n.type} color={n.type==="meeting"?T.blue:n.type==="call"?T.green:T.accent}/>
            </div>
            <span style={{ color:T.muted, fontSize:12 }}>{n.created_at?.slice(0,10)} · {n.author}</span>
          </div>
          <div style={{ color:T.light, fontSize:13, lineHeight:1.7 }}>{n.text}</div>
        </Card>
      ))}
      {allNotes.length===0 && <div style={{ color:T.muted, fontSize:14 }}>No activity recorded yet.</div>}
    </div>
  );

  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column", background:T.black, fontFamily:"'Helvetica Neue',Arial,sans-serif", color:T.white, overflow:"hidden" }}>
      <Nav/>
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
        {view==="dashboard" && <Dashboard/>}
        {view==="portfolio" && <Portfolio/>}
        {view==="activity"  && <Activity/>}
      </div>
      {showAddInv  && <AddInvestmentModal onSave={saveNewInv} onClose={() => setShowAddInv(false)}/>}
      {showBBModal && <BBModal onClose={() => setShowBBModal(false)}/>}
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
      <div style={{ background:T.black, borderTop:"1px solid #1a1a1a", padding:"8px 32px", display:"flex", justifyContent:"space-between", flexShrink:0 }}>
        <span style={{ color:"#333", fontSize:11 }}>Thermo Investments Portal · Proprietary © {new Date().getFullYear()}</span>
        <span style={{ color:"#333", fontSize:11 }}>Denver, CO · 1735 19th Street #200</span>
      </div>
    </div>
  );
}
