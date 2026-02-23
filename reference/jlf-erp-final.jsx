import { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronRight, ChevronLeft, ChevronUp, LogOut, Users, Calendar, BarChart3, Settings, Bell, Download, Plus, Eye, EyeOff, CheckCircle, AlertTriangle, Clock, XCircle, MapPin, Phone, Mail, ArrowLeft, Filter, RefreshCw, Send, Edit, UserPlus, FileText, Home, Menu, X, Shield, Activity, DollarSign, TrendingUp, Layers, Zap, Database, GitMerge, Scissors, Info, RotateCcw, CreditCard, ExternalLink, Sun, TreePine, Mountain, UtensilsCrossed } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

/* ══════════════════════════════════════════════════
   DESIGN TOKENS — Warm Forest Palette
   ══════════════════════════════════════════════════ */
const C = {
  forest: "#1a3a2a", canopy: "#2d5a3d", moss: "#4a7c5c", sage: "#7ba68a",
  meadow: "#a8d5b8", cream: "#faf8f2", bark: "#8b6f47", earth: "#c4a472",
  sun: "#e8b84b", ember: "#d4644a", sky: "#5b9bd5", berry: "#9b5ba5",
};
const PIE_COLORS = [C.canopy, C.sun, C.sky, C.ember];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Serif+Display&display=swap');
*{box-sizing:border-box;scrollbar-width:thin;scrollbar-color:#d4d4d8 transparent}
body{background:${C.cream};margin:0}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}
@keyframes toastIn{from{opacity:0;transform:translateY(-12px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes toastOut{from{opacity:1;transform:translateY(0) scale(1)}to{opacity:0;transform:translateY(-8px) scale(.95)}}
.af{animation:fadeIn .3s ease-out both}
.asu{animation:slideUp .35s ease-out both}
.asi{animation:slideIn .3s ease-out both}
.afloat{animation:float 4s ease-in-out infinite}
.apulse{animation:pulse 2s ease-in-out infinite}
.atoast{animation:toastIn .3s ease-out both}
.tr{transition:all .2s cubic-bezier(.4,0,.2,1)}
.tr3{transition:all .35s cubic-bezier(.4,0,.2,1)}
.card-hover{transition:all .25s cubic-bezier(.4,0,.2,1)}
.card-hover:hover{transform:translateY(-2px);box-shadow:0 8px 25px -5px rgba(0,0,0,.08)}
.card-hover:active{transform:translateY(0);transition-duration:.1s}
.sb-text{transition:opacity .2s ease,max-width .3s ease;overflow:hidden;white-space:nowrap}
.sb-collapsed .sb-text{opacity:0;max-width:0;margin:0;padding:0}
.sb-expanded .sb-text{opacity:1;max-width:200px}
.nav-item{position:relative;overflow:hidden}
.nav-item::after{content:'';position:absolute;inset:0;background:rgba(255,255,255,.08);opacity:0;transition:opacity .2s}
.nav-item:hover::after{opacity:1}
`;
const F = "'DM Sans', sans-serif";
const FD = "'DM Serif Display', serif";

/* ══════════════════════════════════════════════════
   MOCK DATA
   ══════════════════════════════════════════════════ */
const EVENTS = [
  { id:"e1", name:"Intro to Loving Awareness (Zoom)", date:"2026-02-19", end:null, status:"active", cat:"Ashram", pricing:"free", fixedCents:0, meetA:"Zoom (link emailed)", meetB:null, reminderMin:60, escalationHr:24, smsTime:"18:00", acuityId:"apt_la_zoom", stripeId:"", stats:{total:34,complete:28,paid:0,booked:6,review:0,bell:0,nylon:0,self:0,rev:0,cancelled:1,refunded:0}, dietary:{vegetarian:0,vegan:0,gf:0,none:0} },
  { id:"e2", name:"Emerging from Winter Retreat", date:"2026-02-21", end:"2026-02-22", status:"active", cat:"Retreats", pricing:"fixed", fixedCents:12500, meetA:"Heated Yurt — Basecamp", meetB:"Stargazing Meadow", reminderMin:60, escalationHr:24, smsTime:"12:00", acuityId:"apt_emerge", stripeId:"plink_emerge01", stats:{total:18,complete:14,paid:2,booked:1,review:1,bell:8,nylon:4,self:2,rev:225000,cancelled:0,refunded:0}, dietary:{vegetarian:5,vegan:3,gf:2,none:4} },
  { id:"e3", name:"Green Burial 101 Virtual Tour", date:"2026-02-22", end:null, status:"active", cat:"Green Burial", pricing:"free", fixedCents:0, meetA:"Zoom (link emailed)", meetB:null, reminderMin:30, escalationHr:24, smsTime:"12:00", acuityId:"apt_gb101", stripeId:"", stats:{total:22,complete:20,paid:0,booked:2,review:0,bell:0,nylon:0,self:0,rev:0,cancelled:0,refunded:0}, dietary:{vegetarian:0,vegan:0,gf:0,none:0} },
  { id:"e4", name:"March Community Weekend", date:"2026-03-06", end:"2026-03-08", status:"active", cat:"Community Weekend", pricing:"mixed", fixedCents:5000, meetA:"Basecamp Welcome Circle", meetB:"Fire Circle", reminderMin:60, escalationHr:24, smsTime:"15:00", acuityId:"apt_marcomm", stripeId:"plink_marcomm", stats:{total:26,complete:18,paid:5,booked:2,review:1,bell:8,nylon:6,self:4,rev:182000,cancelled:1,refunded:0}, dietary:{vegetarian:6,vegan:4,gf:3,none:5} },
  { id:"e5", name:"Ram Dass Evenings — Satsang", date:"2026-03-06", end:"2026-03-07", status:"active", cat:"Meditation", pricing:"donation", fixedCents:null, meetA:"Meditation Yurt", meetB:null, reminderMin:60, escalationHr:24, smsTime:"15:30", acuityId:"apt_satsang_mar", stripeId:"plink_satsang", stats:{total:15,complete:12,paid:2,booked:1,review:0,bell:5,nylon:3,self:4,rev:67500,cancelled:0,refunded:0}, dietary:{vegetarian:4,vegan:3,gf:1,none:4} },
  { id:"e6", name:"March Forest Therapy — Shinrin Yoku", date:"2026-03-08", end:null, status:"active", cat:"Forest Therapy", pricing:"fixed", fixedCents:12500, meetA:"Yurt — Rose Tea Ceremony", meetB:"Forest Trailhead", reminderMin:60, escalationHr:24, smsTime:"09:30", acuityId:"apt_ft_mar", stripeId:"plink_ft_mar", stats:{total:12,complete:10,paid:1,booked:1,review:0,bell:0,nylon:0,self:0,rev:150000,cancelled:0,refunded:0}, dietary:{vegetarian:3,vegan:2,gf:1,none:4} },
  { id:"e7", name:"Loving Awareness Retreat w/ Sitaram Dass", date:"2026-03-20", end:"2026-03-22", status:"active", cat:"Retreats", pricing:"fixed", fixedCents:25000, meetA:"Ashram Main Gathering", meetB:"Bhakti Mountain Trail", reminderMin:60, escalationHr:24, smsTime:"14:00", acuityId:"apt_lovaware", stripeId:"plink_lovaware", stats:{total:32,complete:22,paid:6,booked:3,review:1,bell:12,nylon:8,self:2,rev:800000,cancelled:1,refunded:0}, dietary:{vegetarian:8,vegan:6,gf:3,none:5} },
  { id:"e8", name:"5-Day Forest Sadhana w/ Sitaram Dass", date:"2026-03-22", end:"2026-03-27", status:"active", cat:"Retreats", pricing:"fixed", fixedCents:45000, meetA:"Ashram Main Gathering", meetB:"Bhakti Mountain Summit", reminderMin:60, escalationHr:24, smsTime:"14:00", acuityId:"apt_sadhana", stripeId:"plink_sadhana", stats:{total:16,complete:12,paid:3,booked:1,review:0,bell:6,nylon:4,self:2,rev:720000,cancelled:0,refunded:0}, dietary:{vegetarian:4,vegan:5,gf:2,none:1} },
  { id:"e9", name:"Intimacy & Connection Retreat", date:"2026-04-24", end:"2026-04-26", status:"active", cat:"Retreats", pricing:"fixed", fixedCents:27500, meetA:"Welcome Circle — Basecamp", meetB:null, reminderMin:60, escalationHr:24, smsTime:"13:00", acuityId:"apt_intimacy", stripeId:"plink_intimacy", stats:{total:20,complete:14,paid:4,booked:1,review:1,bell:8,nylon:4,self:2,rev:550000,cancelled:0,refunded:0}, dietary:{vegetarian:5,vegan:3,gf:2,none:4} },
  { id:"e10", name:"GAY by NATURE Retreat", date:"2026-05-28", end:"2026-05-31", status:"draft", cat:"Retreats", pricing:"fixed", fixedCents:30000, meetA:"Basecamp Welcome", meetB:"Fire Circle", reminderMin:60, escalationHr:24, smsTime:"15:00", acuityId:"", stripeId:"", stats:{total:0,complete:0,paid:0,booked:0,review:0,bell:0,nylon:0,self:0,rev:0,cancelled:0,refunded:0}, dietary:{vegetarian:0,vegan:0,gf:0,none:0} },
];
const ATT = [
  { id:"a1", nm:"Mara Chen", em:"mara.c@email.com", ph:"+1-555-0101", st:"complete", pay:"paid", bk:"booked", ac:"bell_tent", di:"Vegetarian", amt:12500, src:"webhook", intake:{exp:"Intermediate",emg:"Jay Chen, 555-0199",hrd:"Instagram"}, flag:null },
  { id:"a2", nm:"Devon Okafor", em:"devon.o@email.com", ph:"+1-555-0102", st:"complete", pay:"paid", bk:"booked", ac:"nylon_tent", di:"None", amt:7500, src:"webhook", intake:{exp:"Beginner",emg:"Nia Okafor, 555-0188",hrd:"Friend referral"}, flag:null },
  { id:"a3", nm:"Sage Willowbrook", em:"sage.w@email.com", ph:"+1-555-0103", st:"paid_only", pay:"paid", bk:"none", ac:null, di:null, amt:15000, src:"webhook", intake:null, flag:null },
  { id:"a4", nm:"River Nakamura", em:"river.n@email.com", ph:"+1-555-0104", st:"booked_only", pay:"none", bk:"booked", ac:"self_camping", di:"Vegan", amt:0, src:"webhook", intake:{exp:"Advanced",emg:"Kai Nakamura, 555-0177",hrd:"Website"}, flag:null },
  { id:"a5", nm:"Juniper Hayes", em:"juni.h@email.com", ph:"+1-555-0105", st:"complete", pay:"paid", bk:"booked", ac:"bell_tent", di:"Gluten-free", amt:10000, src:"webhook", intake:{exp:"Beginner",emg:"Pat Hayes, 555-0166",hrd:"Facebook event"}, flag:null },
  { id:"a6", nm:"Aspen Torres", em:"aspen.t@email.com", ph:"+1-555-0106", st:"needs_review", pay:"paid", bk:"booked", ac:"bell_tent", di:"None", amt:35000, src:"webhook", intake:{exp:"Intermediate",emg:"Rosa Torres, 555-0155",hrd:"Friend referral"}, flag:"Amount ($350) significantly exceeds event average — possible group payment for 2–3 attendees" },
  { id:"a7", nm:"Indigo Park", em:"indigo.p@email.com", ph:"+1-555-0107", st:"complete", pay:"paid", bk:"booked", ac:"nylon_tent", di:"Vegetarian", amt:8000, src:"webhook", intake:{exp:"Beginner",emg:"Min Park, 555-0144",hrd:"Meetup group"}, flag:null },
  { id:"a8", nm:"Wren Delacroix", em:"wren.d@email.com", ph:"+1-555-0108", st:"complete", pay:"paid", bk:"booked", ac:"self_camping", di:"None", amt:10000, src:"webhook", intake:{exp:"Advanced",emg:"Luc Delacroix, 555-0133",hrd:"Returning attendee"}, flag:null },
  { id:"a9", nm:"Cedar Mbeki", em:"cedar.m@email.com", ph:"+1-555-0109", st:"paid_only", pay:"paid", bk:"none", ac:null, di:null, amt:5000, src:"webhook", intake:null, flag:null },
  { id:"a10", nm:"Fern Kowalski", em:"fern.k@email.com", ph:"+1-555-0110", st:"booked_only", pay:"none", bk:"booked", ac:"bell_tent", di:"Vegan", amt:0, src:"webhook", intake:{exp:"Intermediate",emg:"Anna Kowalski, 555-0122",hrd:"Newsletter"}, flag:null },
  { id:"a11", nm:"Sol Reeves", em:"sol.r@email.com", ph:"+1-555-0111", st:"complete", pay:"paid", bk:"booked", ac:"bell_tent", di:"None", amt:20000, src:"webhook", intake:{exp:"Beginner",emg:"Dana Reeves, 555-0111",hrd:"Instagram"}, flag:null },
  { id:"a12", nm:"Lark Johansson", em:"lark.j@email.com", ph:null, st:"needs_review", pay:"paid", bk:"none", ac:null, di:null, amt:10000, src:"manual", intake:{exp:"Intermediate"}, flag:"Email mismatch — Stripe: lark.j@email.com · Possible Acuity: l.johansson@work.com", notes:"Walk-in, paid cash at gate" },
];
const COCREATORS = [
  { id:"c1", nm:"Sitaram Dass", em:"sitaram@sacredcommunityproject.org", evts:["Loving Awareness Retreat w/ Sitaram Dass","5-Day Forest Sadhana w/ Sitaram Dass"], last:"2026-02-16" },
  { id:"c2", nm:"Christina Della Iacono", em:"christina@justloveforest.com", evts:["Intimacy & Connection Retreat"], last:"2026-02-10" },
  { id:"c3", nm:"Naveed N.", em:"naveed@justloveforest.com", evts:["March Community Weekend","March Forest Therapy — Shinrin Yoku"], last:"2026-02-17" },
];

/* ══════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════ */
const $=c=>`$${(c/100).toLocaleString("en-US",{minimumFractionDigits:2})}`;
const fD=d=>new Date(d+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
const fDL=d=>new Date(d+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"});
const fDShort=d=>new Date(d+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"});
const initials=n=>n.split(" ").map(w=>w[0]).join("");
const SC={
  complete:{l:"Complete",bg:`${C.canopy}18`,tx:C.canopy,bdr:`${C.canopy}40`,Icon:CheckCircle},
  paid_only:{l:"Paid Only",bg:`${C.sun}20`,tx:"#92700c",bdr:`${C.sun}50`,Icon:CreditCard},
  booked_only:{l:"Booked Only",bg:`${C.sky}18`,tx:"#2563eb",bdr:`${C.sky}40`,Icon:Calendar},
  needs_review:{l:"Needs Review",bg:`${C.ember}18`,tx:C.ember,bdr:`${C.ember}40`,Icon:AlertTriangle},
  cancelled:{l:"Cancelled",bg:"#f4f4f5",tx:"#71717a",bdr:"#d4d4d8",Icon:XCircle},
  refunded:{l:"Refunded",bg:`${C.berry}15`,tx:C.berry,bdr:`${C.berry}40`,Icon:RotateCcw},
};
const evColor=s=>({active:C.canopy,draft:"#9ca3af",completed:C.sky,cancelled:C.ember}[s]||"#9ca3af");

/* ══════════════════════════════════════════════════
   MICRO COMPONENTS
   ══════════════════════════════════════════════════ */
const Badge=({s})=>{const c=SC[s]||SC.complete;return(<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border" style={{background:c.bg,color:c.tx,borderColor:c.bdr}}><c.Icon size={11}/>{c.l}</span>);};

const StatCard=({icon:I,label,value,sub,color=C.canopy,accent})=>(
  <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md tr3 shadow-sm">
    <div className="flex items-center justify-between">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:`${color}15`}}><I size={18} style={{color}}/></div>
      {accent!==undefined&&<span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${accent>=0?"text-emerald-600 bg-emerald-50":"text-rose-500 bg-rose-50"}`}>↗ {Math.abs(accent)}%</span>}
    </div>
    <p className="text-2xl font-bold mt-3 tracking-tight" style={{color:C.forest,fontFamily:F}}>{value}</p>
    <p className="text-sm text-gray-500">{label}</p>
    {sub&&<p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

const CountPill=({n,label,color})=>n>0?<span className="text-xs font-semibold px-2.5 py-1 rounded-full border" style={{color,borderColor:`${color}50`,background:`${color}12`}}>{n} {label}</span>:null;

const Btn=({children,primary,small,danger,className="",...p})=>(
  <button className={`inline-flex items-center gap-1.5 font-semibold rounded-xl tr active:scale-[0.97] ${small?"px-3 py-1.5 text-[11px]":"px-4 py-2.5 text-sm"} ${primary?"text-white shadow-sm hover:shadow-md":"bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"} ${danger?"!bg-rose-600 !text-white hover:!bg-rose-700":""} ${className}`} style={primary&&!danger?{background:C.canopy}:{}} {...p}>{children}</button>
);

const Modal=({open,onClose,title,wide,children})=>{
  if(!open)return null;
  return(
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 af" onClick={onClose}>
      <div className={`bg-white rounded-2xl ${wide?"w-full max-w-2xl":"w-full max-w-md"} max-h-[90vh] overflow-y-auto p-6 shadow-2xl asu`} onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold" style={{color:C.forest,fontFamily:FD}}>{title}</h3>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 tr"><X size={18}/></button>
        </div>
        {children}
      </div>
    </div>
  );
};

const ProgressBar=({value,max,color=C.canopy,h="h-2.5"})=>(
  <div className={`${h} bg-gray-100 rounded-full overflow-hidden`}>
    <div className="h-full rounded-full tr3" style={{width:`${max>0?(value/max)*100:0}%`,background:color}}/>
  </div>
);

/* ══════════════════════════════════════════════════
   LOGIN PAGE
   ══════════════════════════════════════════════════ */
const Login=({onAuth})=>{
  const [em,setEm]=useState("");const [pw,setPw]=useState("");const [show,setShow]=useState(false);
  return(
    <div className="min-h-screen flex" style={{background:`linear-gradient(135deg, ${C.forest} 0%, #065f46 40%, ${C.canopy} 80%, ${C.moss} 100%)`,fontFamily:F}}>
      <style>{CSS}</style>
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06]" style={{backgroundImage:`url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='.5'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")`}}/>
        <div className="text-center relative z-10">
          <div className="w-24 h-24 rounded-3xl bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-8 border border-white/20 afloat"><TreePine size={40} className="text-white"/></div>
          <h1 className="text-5xl font-bold text-white mb-4" style={{fontFamily:FD}}>Just Love Forest</h1>
          <p className="text-emerald-200/80 text-lg max-w-md mx-auto leading-relaxed">Event Management System — where community gathering meets operational clarity.</p>
          <div className="mt-12 grid grid-cols-2 gap-4 max-w-sm mx-auto text-left">
            {["Automated reconciliation","Real-time dashboards","Co-host self-service","Day-of logistics"].map(t=>(
              <div key={t} className="flex items-center gap-2 text-emerald-200/70 text-sm"><CheckCircle size={14}/>{t}</div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8 bg-white lg:rounded-l-[3rem]">
        <div className="w-full max-w-md af">
          <div className="lg:hidden mb-8 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{background:C.canopy}}><TreePine size={24} className="text-white"/></div>
            <h1 className="text-2xl font-bold" style={{color:C.forest,fontFamily:FD}}>Just Love Forest</h1>
          </div>
          <h2 className="text-2xl font-bold mb-1" style={{color:C.forest,fontFamily:FD}}>Welcome back</h2>
          <p className="text-gray-400 text-sm mb-8">Sign in to manage events and attendees</p>
          <div className="space-y-4">
            <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Email</label>
              <div className="relative"><Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300"/><input value={em} onChange={e=>setEm(e.target.value)} placeholder="brian@justloveforest.com" className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 tr" style={{fontFamily:F}}/></div></div>
            <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Password</label>
              <div className="relative"><Shield size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300"/><input type={show?"text":"password"} value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 tr" style={{fontFamily:F}}/><button type="button" onClick={()=>setShow(!show)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 tr">{show?<EyeOff size={15}/>:<Eye size={15}/>}</button></div></div>
            <button onClick={()=>onAuth(true)} className="w-full py-3 text-white font-semibold rounded-xl hover:shadow-lg active:scale-[0.98] tr shadow-md mt-2" style={{background:C.canopy}}>Sign In</button>
          </div>
          <p className="text-center text-xs text-gray-300 mt-6">Protected by JWT + TLS 1.3 encryption</p>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════
   MAIN APP
   ══════════════════════════════════════════════════ */
const App=()=>{
  const [auth,setAuth]=useState(false);
  const [pg,setPg]=useState("events");
  const [evId,setEvId]=useState(null);
  const [mob,setMob]=useState(false);
  const [col,setCol]=useState(false); // sidebar collapsed
  const [sf,setSf]=useState("all");
  const [sq,setSq]=useState("");
  const [exp,setExp]=useState(null);
  const [mdl,setMdl]=useState(null);
  const [toast,setToast]=useState(null);

  const firstEvt=EVENTS.find(e=>e.status==="active")||EVENTS[0];
  const ev=evId?EVENTS.find(e=>e.id===evId):(["dash","log","att","set"].includes(pg)?firstEvt:null);
  const fa=useMemo(()=>ATT.filter(a=>(sf==="all"||a.st===sf)&&(!sq||a.nm.toLowerCase().includes(sq.toLowerCase())||a.em.toLowerCase().includes(sq.toLowerCase()))),[sf,sq]);
  const reviewCt=ATT.filter(a=>a.st==="needs_review").length;

  const go=(p,eid)=>{
    if(eid!==undefined)setEvId(eid);
    // Reset to event list when clicking Events
    if(p==="events"){setEvId(null);setPg(p);setMob(false);return;}
    // Auto-select first event if navigating to event-specific page without one
    if(["dash","log","att","cohost","set"].includes(p)&&!evId&&eid===undefined) setEvId(firstEvt.id);
    setPg(p);setMob(false);setSf("all");setSq("");setExp(null);
  };
  const showToast=(msg)=>{setToast(msg);setTimeout(()=>setToast(null),3000);};

  if(!auth) return <Login onAuth={setAuth}/>;

  const nav=[
    {i:Calendar,l:"Events",k:"events"},
    {i:BarChart3,l:"Dashboard",k:"dash"},
    {i:Sun,l:"Day-of View",k:"log"},
    {i:UserPlus,l:"Co-Creators",k:"cohost"},
    {i:Settings,l:"Settings",k:"set"},
  ];

  return(
    <div className="h-screen flex overflow-hidden" style={{background:C.cream,fontFamily:F}}>
      <style>{CSS}</style>

      {/* ═══ TOAST ═══ */}
      {toast&&<div className="fixed top-4 right-4 z-[60] px-4 py-3 rounded-xl bg-gray-900 text-white text-sm font-medium shadow-xl atoast flex items-center gap-2"><CheckCircle size={16} className="text-emerald-400"/>{toast}</div>}

      {/* ═══ MOBILE OVERLAY ═══ */}
      {mob&&<div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={()=>setMob(false)}/>}

      {/* ═══ SIDEBAR ═══ */}
      <aside className={`fixed inset-y-0 left-0 z-40 bg-white border-r border-gray-100 flex flex-col tr3 lg:relative ${mob?"translate-x-0 shadow-2xl w-60":"-translate-x-full lg:translate-x-0"} ${col?"lg:w-[68px]":"lg:w-60"} ${col?"sb-collapsed":"sb-expanded"}`}>
        <div className={`flex items-center ${col?"justify-center":"gap-2.5"} p-4 border-b border-gray-50`}>
          <button onClick={()=>{setEvId(null);setPg("events");setMob(false);}} className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 tr hover:scale-105 hover:shadow-md active:scale-95 cursor-pointer" style={{background:C.canopy}} title="Home"><TreePine size={16} className="text-white"/></button>
          {!col&&<button onClick={()=>{setEvId(null);setPg("events");setMob(false);}} className="min-w-0 overflow-hidden text-left sb-text hover:opacity-70 tr cursor-pointer"><p className="text-sm font-bold tracking-tight truncate" style={{color:C.forest,fontFamily:FD}}>Just Love Forest</p><p className="text-[10px] text-gray-400 uppercase tracking-widest">ERP System</p></button>}
          {!col&&<button onClick={()=>setMob(false)} className="ml-auto text-gray-300 hover:text-gray-500 p-1 tr lg:hidden"><X size={16}/></button>}
        </div>

        {evId&&ev&&!col&&(
          <div className="mx-3 mt-3 p-2.5 rounded-xl border asi" style={{background:`${C.canopy}08`,borderColor:`${C.canopy}20`}}>
            <div className="flex items-center gap-2">
              <button onClick={()=>{setEvId(null);setPg("events");}} className="tr hover:opacity-70 hover:scale-110 active:scale-90" style={{color:C.canopy}}><ArrowLeft size={14}/></button>
              <button onClick={()=>go("dash")} className="min-w-0 text-left hover:opacity-70 tr cursor-pointer"><p className="text-[11px] font-bold truncate" style={{color:C.forest}}>{ev.name}</p><p className="text-[9px]" style={{color:C.moss}}>{fD(ev.date)}</p></button>
            </div>
          </div>
        )}

        <nav className={`flex-1 py-3 ${col?"px-1.5":"px-2"} space-y-0.5 overflow-y-auto`}>{nav.map(n=>(
          <button key={n.k} onClick={()=>go(n.k)} title={col?n.l:undefined} className={`nav-item w-full flex items-center ${col?"justify-center":"gap-3"} ${col?"px-0 py-2.5":"px-3 py-2.5"} rounded-xl text-sm font-medium tr ${pg===n.k?"text-white shadow-sm":"text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`} style={pg===n.k?{background:C.canopy}:{}}>
            <n.i size={17} className="shrink-0"/>
            {!col&&<span className="flex-1 text-left sb-text">{n.l}</span>}
            {!col&&n.k==="dash"&&reviewCt>0&&pg!==n.k&&<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600 sb-text">{reviewCt}</span>}
          </button>
        ))}</nav>

        {/* Collapse toggle — desktop only */}
        <button onClick={()=>setCol(!col)} className="hidden lg:flex items-center justify-center py-2.5 border-t border-b border-gray-50 text-gray-300 hover:text-gray-600 hover:bg-gray-50 tr group" title={col?"Expand sidebar":"Collapse sidebar"}>
          <div className="tr group-hover:scale-110">{col?<ChevronRight size={16}/>:<ChevronLeft size={16}/>}</div>
        </button>

        <div className={`p-3 ${col?"flex flex-col items-center":""}`}>
          <div className={`flex items-center ${col?"justify-center":"gap-3 mb-3 px-1"}`}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{background:C.bark}}>BY</div>
            {!col&&<div className="min-w-0 sb-text"><p className="text-sm font-semibold text-gray-800">Brian Y.</p><p className="text-[10px] text-gray-400">Admin</p></div>}
          </div>
          <button onClick={()=>setAuth(false)} title={col?"Sign Out":undefined} className={`w-full flex items-center ${col?"justify-center mt-2":"gap-3"} px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 tr`}><LogOut size={16} className="shrink-0"/>{!col&&<span className="sb-text">Sign Out</span>}</button>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* HEADER */}
        <header className="h-14 border-b border-gray-100 bg-white flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={()=>setMob(true)} className="lg:hidden text-gray-500 hover:text-gray-700 active:scale-90 tr"><Menu size={20}/></button>
            {pg==="events"&&<h1 className="text-sm font-semibold hidden sm:block" style={{color:C.forest}}>All Events</h1>}
            {pg!=="events"&&<nav className="flex items-center gap-1.5 text-xs text-gray-400">
              <button onClick={()=>go("events")} className="hover:text-gray-600 tr cursor-pointer hover:underline">Events</button>
              {evId&&ev&&<><ChevronRight size={12}/><button onClick={()=>go("dash")} className="hover:text-gray-600 tr cursor-pointer hover:underline truncate max-w-[160px]">{ev.name}</button></>}
              <ChevronRight size={12}/><span className="text-gray-600 font-medium">{nav.find(n=>n.k===pg)?.l||""}</span>
            </nav>}
          </div>
          <div className="flex items-center gap-2">
            {pg==="dash"&&ev&&<>
              <Btn small onClick={()=>showToast("CSV exported successfully")}><Download size={13}/>Export CSV</Btn>
              <Btn small onClick={()=>showToast("Sending reminders...")}><Send size={13}/>Send Reminders</Btn>
              <Btn small onClick={()=>go("set")}><Edit size={13}/>Edit Event</Btn>
            </>}
            <button className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white hover:ring-2 hover:ring-offset-2 tr cursor-pointer active:scale-90" style={{background:C.bark,["--tw-ring-color"]:C.bark}} title="Brian Y. — Admin">BY</button>
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 max-w-6xl mx-auto asu" key={pg+(evId||"")}>

          {/* ═══════════════════════════ EVENTS PAGE ═══════════════════════════ */}
          {pg==="events"&&(<div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Events</p>
                <h2 className="text-2xl font-bold tracking-tight" style={{color:C.forest,fontFamily:FD}}>Events</h2>
                <p className="text-sm text-gray-400 mt-0.5">Manage your events and registrations</p>
              </div>
              <Btn primary onClick={()=>setMdl("newevt")}><Plus size={15}/>New Event</Btn>
            </div>

            <div className="text-xs text-gray-400 font-medium">{EVENTS.filter(e=>e.status==="active").length} active events</div>

            <div className="grid gap-4">{EVENTS.map((e,i)=>(
              <div key={e.id} onClick={()=>go("dash",e.id)} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-5 cursor-pointer card-hover group shadow-sm asu" style={{animationDelay:`${i*60}ms`}}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{background:`${C.canopy}10`}}><Mountain size={24} style={{color:C.canopy}}/></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                    <h3 className="text-base font-bold truncate group-hover:opacity-80 tr" style={{color:C.forest}}>{e.name}</h3>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{background:evColor(e.status)}}/>
                    <span className="text-xs text-gray-400 capitalize">{e.status}</span>
                    {e.cat&&<span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{background:`${C.canopy}12`,color:C.canopy}}>{e.cat}</span>}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap">
                    <span className="flex items-center gap-1"><Calendar size={13}/>{fDShort(e.date)}{e.end?` – ${fDShort(e.end)}`:""}</span>
                    <span className="flex items-center gap-1"><Users size={13}/>{e.stats.total} attendees</span>
                    <span className="flex items-center gap-1"><CreditCard size={13}/>{e.pricing==="free"?"Free":e.pricing==="donation"?"Donation":$(e.stats.rev)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  <CountPill n={e.stats.paid} label="paid only" color="#92700c"/>
                  <CountPill n={e.stats.booked} label="booked only" color="#2563eb"/>
                  <CountPill n={e.stats.review} label="review" color={C.ember}/>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 tr ml-1"/>
                </div>
              </div>
            ))}</div>
          </div>)}

          {/* ═══════════════════════════ DASHBOARD ═══════════════════════════ */}
          {pg==="dash"&&ev&&(<div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight" style={{color:C.forest,fontFamily:FD}}>{ev.name}</h2>
              <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5"><Calendar size={13}/>{fDL(ev.date)} · <MapPin size={13}/>{ev.meetA}</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              <StatCard icon={Users} label="Total Attendees" value={ev.stats.total} color={C.forest}/>
              <StatCard icon={CheckCircle} label="Complete" value={ev.stats.complete} accent={ev.stats.total>0?Math.round(ev.stats.complete/ev.stats.total*100):0} color={C.canopy}/>
              <StatCard icon={Clock} label="Paid Only" value={ev.stats.paid} sub="Awaiting registration" color="#92700c"/>
              <StatCard icon={Calendar} label="Booked Only" value={ev.stats.booked} sub="Awaiting payment" color={C.sky}/>
              <StatCard icon={AlertTriangle} label="Needs Review" value={ev.stats.review} sub="Requires manual action" color={C.ember}/>
              <StatCard icon={DollarSign} label="Revenue" value={$(ev.stats.rev)} color={C.bark}/>
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
              {/* Registration Status Pie Chart */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 mb-2">Registration Status</h3>
                {ev.stats.total>0?(
                  <ResponsiveContainer width="100%" height={170}>
                    <PieChart><Pie data={[{name:"Complete",value:ev.stats.complete},{name:"Paid Only",value:ev.stats.paid},{name:"Booked Only",value:ev.stats.booked},{name:"Review",value:ev.stats.review}]} cx="50%" cy="50%" innerRadius={48} outerRadius={68} paddingAngle={3} dataKey="value">{PIE_COLORS.map((c,i)=><Cell key={i} fill={c}/>)}</Pie><Tooltip formatter={(v,n)=>[v,n]}/></PieChart>
                  </ResponsiveContainer>
                ):<p className="text-sm text-gray-400 py-16 text-center">No attendees yet</p>}
                <div className="flex flex-wrap gap-3 mt-2 justify-center">{[
                  {l:"Complete",c:PIE_COLORS[0],v:ev.stats.complete},
                  {l:"Paid Only",c:PIE_COLORS[1],v:ev.stats.paid},
                  {l:"Booked Only",c:PIE_COLORS[2],v:ev.stats.booked},
                  {l:"Review",c:PIE_COLORS[3],v:ev.stats.review}
                ].map(d=>(
                  <span key={d.l} className="flex items-center gap-1.5 text-[11px] text-gray-500"><span className="w-2.5 h-2.5 rounded-full" style={{background:d.c}}/>{d.l}: {d.v}</span>
                ))}</div>
              </div>

              {/* Accommodation Breakdown */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 mb-4">Accommodation Breakdown</h3>
                {[{l:"Bell Tent",v:ev.stats.bell,cl:C.canopy,e:"⛺"},{l:"Nylon Tent",v:ev.stats.nylon,cl:C.moss,e:"🏕️"},{l:"Self-Camping",v:ev.stats.self,cl:C.earth,e:"🌲"}].map(t=>(
                  <div key={t.l} className="mb-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-base">{t.e}</span>
                      <span className="text-sm text-gray-600 flex-1">{t.l}</span>
                      <span className="text-sm font-bold" style={{color:C.forest}}>{t.v}</span>
                    </div>
                    <ProgressBar value={t.v} max={ev.stats.total} color={t.cl}/>
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-2 mt-4 text-center">{[{l:"Bell",v:ev.stats.bell,e:"⛺"},{l:"Nylon",v:ev.stats.nylon,e:"🏕️"},{l:"Self",v:ev.stats.self,e:"🌲"}].map(t=>(
                  <div key={t.l} className="py-3 rounded-xl bg-gray-50">
                    <span className="text-lg">{t.e}</span>
                    <p className="text-xl font-bold mt-0.5" style={{color:C.forest}}>{t.v}</p>
                    <p className="text-[10px] text-gray-400">{t.l}</p>
                  </div>
                ))}</div>
              </div>

              {/* Dietary Restrictions */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 mb-4">Dietary Restrictions</h3>
                {[{l:"Vegetarian",v:ev.dietary.vegetarian,c:C.moss,e:"🥬"},{l:"Vegan",v:ev.dietary.vegan,c:C.canopy,e:"🌱"},{l:"Gluten-Free",v:ev.dietary.gf,c:C.earth,e:"🚫"},{l:"None / Not Specified",v:ev.dietary.none,c:C.sage,e:""}].map(d=>(
                  <div key={d.l} className="mb-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">{d.e?d.e+" ":""}{d.l}</span>
                      <span className="font-bold" style={{color:C.forest}}>{d.v}</span>
                    </div>
                    <ProgressBar value={d.v} max={ev.stats.total} color={d.c}/>
                  </div>
                ))}
                <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700"><UtensilsCrossed size={13}/>Catering Summary</div>
                  <p className="text-xs text-amber-600 mt-1">{ev.dietary.vegetarian+ev.dietary.vegan} plant-based meals needed ({ev.dietary.vegan} fully vegan)</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
              <Btn primary onClick={()=>go("log")}><Sun size={14}/>Day-of View</Btn>
              <Btn onClick={()=>{setSf("needs_review");go("att");}}><AlertTriangle size={14}/>Review Flagged ({ev.stats.review})</Btn>
              <Btn onClick={()=>go("att")}><Users size={14}/>All Attendees</Btn>
              <Btn onClick={()=>showToast("Sync complete — all data up to date")}><RefreshCw size={14}/>Sync Now</Btn>
            </div>
          </div>)}

          {/* ═══════════════════════════ ATTENDEES (accessed from dashboard actions) ═══════════════════════════ */}
          {pg==="att"&&ev&&(<div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold" style={{color:C.forest,fontFamily:FD}}>Attendees</h2>
                <p className="text-sm text-gray-400">{ev.name} · {fa.length} of {ATT.length} shown</p>
              </div>
              <Btn onClick={()=>showToast("CSV exported")}><Download size={14}/>Export</Btn>
            </div>

            <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
              <div className="relative flex-1 max-w-sm"><Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300"/><input value={sq} onChange={e=>setSq(e.target.value)} placeholder="Search name or email..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white tr"/></div>
              <div className="flex items-center rounded-xl border border-gray-200 overflow-hidden bg-white">
                {["all","complete","paid_only","booked_only","needs_review"].map(s=>(
                  <button key={s} onClick={()=>setSf(s)} className={`px-3 py-2 text-xs font-medium tr ${sf===s?"text-white":"text-gray-500 hover:bg-gray-50"}`} style={sf===s?{background:C.forest}:{}}>{s==="all"?"All":SC[s]?.l}</button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-50 text-left text-xs text-gray-400 uppercase tracking-wider">{["Attendee","Status","Amount","Accommodation","Dietary","Source",""].map(h=><th key={h} className="px-5 py-3 font-semibold">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-50">{fa.length===0?(
                    <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">No attendees match the current filter.</td></tr>
                  ):fa.flatMap(a=>{
                    const rows=[
                    <tr key={a.id} onClick={()=>setExp(exp===a.id?null:a.id)} className={`hover:bg-gray-50/50 cursor-pointer tr ${a.st==="needs_review"?"bg-rose-50/30":""}`}>
                      <td className="px-5 py-3.5"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{background:a.st==="needs_review"?C.ember:C.sage}}>{initials(a.nm)}</div><div><p className="font-semibold text-gray-800 text-[13px]">{a.nm}</p><p className="text-[11px] text-gray-400">{a.em}</p></div></div></td>
                      <td className="px-5 py-3.5"><Badge s={a.st}/></td>
                      <td className="px-5 py-3.5 font-semibold" style={{color:C.forest}}>{a.amt>0?$(a.amt):"—"}</td>
                      <td className="px-5 py-3.5 text-gray-600 capitalize text-xs">{a.ac?.replace("_"," ")||"—"}</td>
                      <td className="px-5 py-3.5 text-gray-600 text-xs">{a.di||"—"}</td>
                      <td className="px-5 py-3.5"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.src==="webhook"?"bg-gray-100 text-gray-500":"bg-purple-50 text-purple-600 border border-purple-200"}`}>{a.src}</span></td>
                      <td className="px-5 py-3.5">{exp===a.id?<ChevronUp size={14} className="text-gray-300"/>:<ChevronDown size={14} className="text-gray-300"/>}</td>
                    </tr>];
                    if(exp===a.id) rows.push(
                    <tr key={a.id+"x"}><td colSpan={7} className="px-5 py-4 bg-gray-50/50 af">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div><span className="text-gray-400 block mb-0.5">Phone</span><span className="text-gray-700 font-medium">{a.ph||"Not provided"}</span></div>
                        <div><span className="text-gray-400 block mb-0.5">Payment</span><span className="text-gray-700 font-medium capitalize">{a.pay}</span></div>
                        <div><span className="text-gray-400 block mb-0.5">Booking</span><span className="text-gray-700 font-medium capitalize">{a.bk}</span></div>
                        <div><span className="text-gray-400 block mb-0.5">Experience</span><span className="text-gray-700 font-medium capitalize">{a.intake?.exp||"N/A"}</span></div>
                        {a.intake?.emg&&<div><span className="text-gray-400 block mb-0.5">Emergency Contact</span><span className="text-gray-700 font-medium">{a.intake.emg}</span></div>}
                        {a.intake?.hrd&&<div><span className="text-gray-400 block mb-0.5">How They Heard</span><span className="text-gray-700 font-medium">{a.intake.hrd}</span></div>}
                        {a.flag&&<div className="col-span-full p-2.5 rounded-lg bg-rose-50 border border-rose-100"><span className="text-rose-600 font-semibold flex items-center gap-1.5 text-xs"><AlertTriangle size={12}/>{a.flag}</span></div>}
                      </div>
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {a.st==="needs_review"&&<Btn small danger onClick={(e)=>{e.stopPropagation();setMdl({type:"override",att:a});}}><Edit size={11}/>Resolve</Btn>}
                        <Btn small primary onClick={(e)=>{e.stopPropagation();showToast(`${a.nm} marked complete`);}}>Mark Complete</Btn>
                        <Btn small onClick={(e)=>{e.stopPropagation();showToast(`Reminder sent to ${a.nm}`);}}><Send size={11}/>Remind</Btn>
                      </div>
                    </td></tr>);
                    return rows;
                  })}</tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400"><span>Showing {fa.length} of {ATT.length} attendees</span><span>Last synced: 2 min ago</span></div>
            </div>
          </div>)}

          {/* ═══════════════════════════ DAY-OF LOGISTICS ═══════════════════════════ */}
          {pg==="log"&&ev&&(<div className="space-y-4 max-w-lg mx-auto">
            <div className="text-center py-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Day-of Logistics</h2>
              <p className="text-xs text-gray-400 mt-0.5">{ev.name}</p>
            </div>

            {/* Hero Confirmed Count */}
            <div className="rounded-2xl p-8 text-center text-white" style={{background:`linear-gradient(135deg, ${C.forest}, ${C.canopy})`}}>
              <p className="text-7xl font-bold tracking-tight" style={{fontFamily:FD}}>{ev.stats.complete}</p>
              <p className="text-base opacity-80 mt-1 font-medium">Confirmed Attendees</p>
              <div className="flex justify-center gap-6 mt-4 text-sm opacity-70">
                <span>{ev.stats.paid} paid only</span>
                <span>{ev.stats.booked} booked only</span>
              </div>
            </div>

            {/* Tents Needed */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Tents Needed</h3>
              <div className="grid grid-cols-3 gap-3 text-center">{[{l:"Bell Tent",v:ev.stats.bell,e:"⛺"},{l:"Nylon Tent",v:ev.stats.nylon,e:"🏕️"},{l:"Self-Camp",v:ev.stats.self,e:"🌲"}].map(t=>(
                <div key={t.l} className="p-4 rounded-xl bg-gray-50">
                  <div className="text-3xl mb-1">{t.e}</div>
                  <p className="text-3xl font-bold" style={{color:C.forest,fontFamily:FD}}>{t.v}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.l}</p>
                </div>
              ))}</div>
            </div>

            {/* Dietary Requirements */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Dietary Requirements</h3>
              <div className="space-y-2">{[{l:"Vegetarian",v:ev.dietary.vegetarian,e:"🥬"},{l:"Vegan",v:ev.dietary.vegan,e:"🌱"},{l:"Gluten-Free",v:ev.dietary.gf,e:"🚫"}].map(d=>(
                <div key={d.l} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                  <span className="text-sm text-gray-700 flex items-center gap-2"><span className="text-base">{d.e}</span>{d.l}</span>
                  <span className="text-lg font-bold" style={{color:C.forest}}>{d.v}</span>
                </div>
              ))}</div>
              <div className="mt-3 p-3 rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 text-center">
                <p className="text-sm font-semibold" style={{color:C.canopy}}>Total plant-based: {ev.dietary.vegetarian+ev.dietary.vegan}</p>
                <p className="text-xs" style={{color:C.moss}}>({ev.dietary.vegan} fully vegan)</p>
              </div>
            </div>

            {/* Meeting Points */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Meeting Points</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3.5 rounded-xl" style={{background:C.canopy,color:"white"}}>
                  <MapPin size={18} className="shrink-0"/>
                  <div><p className="text-[10px] font-semibold opacity-70">Point A</p><p className="text-sm font-medium">{ev.meetA}</p></div>
                </div>
                {ev.meetB&&<div className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 bg-gray-50">
                  <MapPin size={18} className="text-gray-400 shrink-0"/>
                  <div><p className="text-[10px] font-semibold text-gray-400">Point B</p><p className="text-sm font-medium text-gray-700">{ev.meetB}</p></div>
                </div>}
              </div>
            </div>

            {/* Send SMS Button */}
            <button onClick={()=>showToast(`Day-of SMS sent to ${ev.stats.complete} attendees`)} className="w-full py-4 text-white font-semibold rounded-2xl tr shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2.5 text-base" style={{background:C.canopy}}>
              <Send size={18}/>Send Day-of SMS to All
            </button>
          </div>)}

          {/* ═══════════════════════════ CO-CREATORS ═══════════════════════════ */}
          {pg==="cohost"&&(<div className="space-y-5 max-w-4xl">
            <div className="flex items-center justify-between">
              <div><h2 className="text-xl font-bold" style={{color:C.forest,fontFamily:FD}}>Co-Creators</h2><p className="text-sm text-gray-400 mt-0.5">Manage co-host access to event data</p></div>
              <Btn primary onClick={()=>setMdl("invite")}><UserPlus size={15}/>Invite Co-Creator</Btn>
            </div>
            {COCREATORS.map(c=>(
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{background:C.bark}}>{initials(c.nm)}</div>
                  <div><p className="text-sm font-bold text-gray-800">{c.nm}</p><p className="text-xs text-gray-400">{c.em}</p><p className="text-[10px] text-gray-300 mt-0.5">Last active: {fD(c.last)}</p></div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {c.evts.map(e=><span key={e} className="text-xs px-2.5 py-1 rounded-full border font-medium" style={{background:`${C.canopy}08`,color:C.canopy,borderColor:`${C.canopy}25`}}>{e}</span>)}
                  <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 font-medium flex items-center gap-1"><Eye size={11}/>Read-only</span>
                  <button className="p-2 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-50 tr"><Edit size={15}/></button>
                </div>
              </div>
            ))}
            {COCREATORS.length===0&&<div className="text-center py-16 text-gray-400"><UserPlus size={32} className="mx-auto mb-3 opacity-30"/><p className="text-sm">No co-creators added yet</p></div>}
          </div>)}

          {/* ═══════════════════════════ SETTINGS / EVENT CONFIG ═══════════════════════════ */}
          {pg==="set"&&ev&&(<div className="max-w-3xl space-y-6">
            <h2 className="text-2xl font-bold tracking-tight" style={{color:C.forest,fontFamily:FD}}>Event Configuration</h2>

            {/* Event Details */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><FileText size={16}/>Event Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Event Name</label><input defaultValue={ev.name} className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"/></div>
                <div><label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Start Date</label><input type="date" defaultValue={ev.date} className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"/></div>
                <div><label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">End Date (Multi-day)</label><input type="date" defaultValue={ev.end||""} className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"/></div>
                <div><label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pricing Model</label><select defaultValue={ev.pricing} className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-gray-400"><option value="donation">Pay-What-You-Want (Donation)</option><option value="fixed">Fixed Price</option></select></div>
                <div><label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Fixed Price (if applicable)</label><input defaultValue={ev.fixedCents?`$${(ev.fixedCents/100).toFixed(2)}`:"$0.00"} className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"/></div>
              </div>
            </div>

            {/* Integration Links */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><ExternalLink size={16}/>Integration Links</h3>
              <div className="grid grid-cols-1 gap-4">
                <div><label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Acuity Appointment Type ID</label><input defaultValue={ev.acuityId} className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-gray-400"/><p className="text-[11px] text-gray-300 mt-1 italic">From your Acuity appointment type URL</p></div>
                <div><label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Stripe Payment Link ID</label><input defaultValue={ev.stripeId} className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-gray-400"/><p className="text-[11px] text-gray-300 mt-1 italic">From your Stripe payment link</p></div>
              </div>
            </div>

            {/* Reminder Settings */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><Bell size={16}/>Reminder Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">First Reminder Delay</label><select defaultValue={ev.reminderMin} className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-gray-400"><option value={30}>30 minutes</option><option value={60}>1 hour</option><option value={120}>2 hours</option><option value={360}>6 hours</option><option value={1440}>24 hours</option></select></div>
                <div><label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Escalation Delay</label><select defaultValue={ev.escalationHr} className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-gray-400"><option value={12}>12 hours</option><option value={24}>24 hours</option><option value={48}>48 hours</option><option value={0}>Disabled</option></select></div>
                <div><label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Day-of SMS Time</label><input type="time" defaultValue={ev.smsTime} className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"/></div>
                <div><label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Event Status</label><select defaultValue={ev.status} className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-gray-400"><option value="draft">Draft</option><option value="active">Active</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
              </div>
            </div>

            {/* Meeting Points */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><MapPin size={16}/>Meeting Points</h3>
              <div className="grid grid-cols-1 gap-4">
                <div><label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Meeting Point A</label><input defaultValue={ev.meetA} className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"/></div>
                <div><label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Meeting Point B (optional)</label><input defaultValue={ev.meetB||""} className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"/></div>
              </div>
            </div>

            {/* Save / Delete */}
            <div className="flex items-center justify-between pt-2">
              <button className="text-sm text-rose-500 hover:text-rose-700 font-medium tr">Delete Event</button>
              <Btn primary onClick={()=>showToast("Configuration saved")}>Save Configuration</Btn>
            </div>
          </div>)}

          </div>
        </div>
      </main>

      {/* ═══════════════════════════ MODALS ═══════════════════════════ */}

      {/* New Event Modal */}
      <Modal open={mdl==="newevt"} onClose={()=>setMdl(null)} title="Create New Event" wide>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Event Name *</label><input placeholder="Summer Solstice Gathering" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 tr"/></div>
          <div><label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Start Date *</label><input type="date" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm tr"/></div>
          <div><label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">End Date</label><input type="date" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm tr"/></div>
          <div><label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Pricing *</label><select className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white"><option>Pay-what-you-want</option><option>Fixed price</option></select></div>
          <div><label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Fixed Price</label><input placeholder="$45.00" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm tr"/></div>
          <div className="col-span-2"><label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Meeting Point A *</label><input placeholder="Arrival location..." className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm tr"/></div>
        </div>
        <p className="text-[11px] text-gray-400 mt-3 flex items-center gap-1.5"><Info size={12}/>Webhooks route automatically — no per-event config needed.</p>
        <Btn primary onClick={()=>{setMdl(null);showToast("Event created successfully");}} className="!w-full !py-3 justify-center mt-4">Create Event</Btn>
      </Modal>

      {/* Invite Co-Creator Modal */}
      <Modal open={mdl==="invite"} onClose={()=>setMdl(null)} title="Invite Co-Creator" wide>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</label><input className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400" placeholder="Co-creator name"/></div>
            <div><label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</label><input className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400" placeholder="email@example.com"/></div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Assign to Events</label>
            <div className="flex flex-wrap gap-2 mt-2">{EVENTS.filter(e=>e.status==="active").map(e=>(
              <label key={e.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm cursor-pointer hover:bg-gray-50 tr"><input type="checkbox" className="rounded"/>{e.name}</label>
            ))}</div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Btn onClick={()=>setMdl(null)}>Cancel</Btn><Btn primary onClick={()=>{setMdl(null);showToast("Magic link sent");}}><Send size={14}/>Send Magic Link</Btn></div>
        </div>
      </Modal>

      {/* Override / Resolve Modal */}
      {mdl?.type==="override"&&<Modal open={true} onClose={()=>setMdl(null)} title={`Override: ${mdl.att.nm}`}>
        {mdl.att.flag&&<div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-sm text-rose-700 flex items-start gap-2 mb-4"><AlertTriangle size={16} className="mt-0.5 shrink-0"/>{mdl.att.flag}</div>}
        <div className="space-y-3">
          <div><label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Payment Status</label><select className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl text-sm bg-white" defaultValue={mdl.att.pay}><option value="paid">Paid</option><option value="none">Not Paid</option><option value="refunded">Refunded</option></select></div>
          <div><label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Booking Status</label><select className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl text-sm bg-white" defaultValue={mdl.att.bk}><option value="booked">Booked</option><option value="none">Not Booked</option><option value="cancelled">Cancelled</option><option value="no_show">No Show</option></select></div>
          <div><label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Notes</label><textarea rows={2} className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-gray-400" placeholder="Reason for override..."/></div>
        </div>
        <div className="flex justify-end gap-2 pt-4"><Btn onClick={()=>setMdl(null)}>Cancel</Btn><Btn primary onClick={()=>{setMdl(null);showToast("Override saved");}}>Save Override</Btn></div>
      </Modal>}
    </div>
  );
};

export default App;
