/* ============================================================
   VISITANTES — outras pessoas com o link aberto entram na fábrica
   O dono (CEO) roda o jogo e transmite o estado; quem visita só
   olha e passeia. Funciona de dois jeitos:
   • na página publicada no Claude, usa a "sala" da própria página;
   • no site público, usa a sala do próprio site (WebSocket): o CEO
     gera um link com código e o amigo entra na hora, sem cadastro.
   Aberto como arquivo local, este módulo não faz nada.
   ============================================================ */
const FABRICA_HAS_CLAUDE = !!(window.claude && typeof window.claude.use === "function");
const FABRICA_PUBLIC = !FABRICA_HAS_CLAUDE && /^https?:$/.test(location.protocol);
const FABRICA_JOIN = ((new URLSearchParams(location.search)).get("sala") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);

/* sala do CEO no site: código + segredo guardados neste navegador */
function fabricaSala(create) {
  let s = null;
  try { s = JSON.parse(localStorage.getItem("fabrica-sala") || "null"); } catch (_) { }
  if ((!s || !s.code || !s.secret) && create) {
    const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    s = { code: Array.from({ length: 5 }, () => abc[Math.floor(Math.random() * abc.length)]).join(""), secret: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) };
    try { localStorage.setItem("fabrica-sala", JSON.stringify(s)); } catch (_) { }
  }
  return s && s.code && s.secret ? s : null;
}
function fabricaSalaLink(code) { return `${location.origin}${location.pathname}?sala=${code}`; }

/* cliente da sala do site: mesma cara da sala do Claude (presence / peers / onPeers) */
function fabricaSocketRoom({ code, role, secret, name }) {
  let ws = null, peersList = [], me = null, closed = false, backoff = 1000;
  const cbs = [], mine = {};
  const url = `${location.origin.replace(/^http/, "ws")}/sala/ws?sala=${code}&role=${role}&secret=${encodeURIComponent(secret || "")}&name=${encodeURIComponent(name || "")}`;
  function connect() {
    if (closed) return;
    try { ws = new WebSocket(url); } catch (_) { ws = null; setTimeout(connect, 5000); return; }
    ws.onopen = () => { backoff = 1000; if (Object.keys(mine).length) ws.send(JSON.stringify({ t: "p", p: mine })); };
    ws.onmessage = ev => {
      let m; try { m = JSON.parse(ev.data); } catch (_) { return; }
      if (!m || m.t !== "peers" || !Array.isArray(m.peers)) return;
      me = m.me;
      peersList = m.peers.map(p => ({ peer: p.id, kind: "viewer", by: p.id, name: String(p.name || ""), role: p.role, presence: p.presence || {}, updatedAt: p.updatedAt || 0, isMe: p.id === me, sameTab: p.id === me }));
      cbs.forEach(cb => { try { cb({ peers: peersList }); } catch (_) { } });
    };
    ws.onclose = () => { ws = null; if (!closed) { setTimeout(connect, backoff); backoff = Math.min(15000, backoff * 2); } };
    ws.onerror = () => { };
  }
  return {
    connect,
    presence: (p) => { Object.assign(mine, p); if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: "p", p })); return Promise.resolve(); },
    peers: () => peersList,
    onPeers: (cb) => { cbs.push(cb); },
    connected: () => !!(ws && ws.readyState === 1),
    close: () => { closed = true; try { ws?.close(); } catch (_) { } }
  };
}

/* ---------- convite: botão no jogo que prepara e envia o link da fábrica ---------- */
(function () {
  // no Claude o convite leva à SUA fábrica ao vivo pela página do Claude; no site público, pela sala do site
  const ARTIFACT_URL = "https://claude.ai/artifact/1mQHUGVZZY7G7MDPNPvGMu";
  const walk = document.getElementById("walkBtn");
  if (!walk) return;
  const btn = document.createElement("button");
  btn.id = "inviteBtn"; btn.type = "button"; btn.className = "invite-btn";
  btn.title = "Chame alguém para visitar a sua fábrica";
  btn.textContent = "📨 Convidar";
  btn.setAttribute("aria-label", "Convidar");
  walk.after(btn);

  const box = document.createElement("div");
  box.className = "invite-overlay"; box.hidden = true;
  box.innerHTML = `<div class="invite-card" role="dialog" aria-modal="true" aria-labelledby="inviteTitle">
    <button type="button" class="invite-close" aria-label="Fechar">✕</button>
    <p class="invite-eyebrow">FÁBRICA ABERTA</p>
    <h3 id="inviteTitle">📨 Convidar visitantes</h3>
    <p>Quem receber o convite entra na sua fábrica como visitante: anda pelo complexo, entra nos prédios e vê tudo ao vivo, sem mexer em nada.</p>
    <label for="inviteText">Mensagem do convite</label>
    <textarea id="inviteText" rows="4"></textarea>
    <div class="invite-actions">
      <a class="invite-wa" target="_blank" rel="noopener">WhatsApp</a>
      <a class="invite-mail" target="_blank" rel="noopener">Gmail</a>
      <button type="button" class="invite-copy">Copiar convite</button>
    </div>
    <p class="invite-status" aria-live="polite"></p>
    <p class="invite-note"></p>
  </div>`;
  document.body.append(box);
  const text = box.querySelector("#inviteText"), status = box.querySelector(".invite-status"), note = box.querySelector(".invite-note");
  const refresh = () => {
    const t = text.value;
    box.querySelector(".invite-wa").href = "https://wa.me/?text=" + encodeURIComponent(t);
    box.querySelector(".invite-mail").href = "https://mail.google.com/mail/?view=cm&fs=1&su=" + encodeURIComponent(`Visite a ${state.brand.name || "minha fábrica"}`) + "&body=" + encodeURIComponent(t);
  };
  const open = () => {
    const name = state.brand.name || "Fábrica de Lápis", ceo = state.ceo?.name ? `, ${state.ceo.name}` : "";
    if (FABRICA_HAS_CLAUDE) {
      text.value = `Oi! Vem visitar a ${name}${ceo ? " — sou eu" + ceo + ", o CEO" : ""} 🏭✏️\nVocê entra como visitante, anda pela fábrica e vê a produção ao vivo.\nAbra o link entrando com a sua conta do Claude:\n${ARTIFACT_URL}`;
      note.innerHTML = "⚠️ A pessoa precisa ter acesso ao link. Libere uma vez no botão <b>Compartilhar</b> da página: escolha a sua organização em “Quem tem acesso” ou convide o e-mail dela. Ela entra logada no Claude, e você precisa estar com o jogo aberto.";
    } else if (FABRICA_PUBLIC && !FABRICA_JOIN) {
      const sala = fabricaSala(true);
      window.dispatchEvent(new CustomEvent("fabrica:sala"));
      text.value = `Oi! Vem visitar a ${name}${ceo ? " — sou eu" + ceo + ", o CEO" : ""} ao vivo 🏭✏️\nÉ só abrir o link: você entra na hora, anda pela fábrica e vê a produção acontecendo.\n${fabricaSalaLink(sala.code)}`;
      note.innerHTML = `💡 Código da sua fábrica: <b>${sala.code}</b>. A pessoa abre o link e entra na hora, sem cadastro. Você precisa estar com o jogo aberto nesta aba; a sala fica desligada enquanto ninguém entra e liga sozinha na hora. Para andar junto: clique em <b>🚶 Andar pela fábrica</b> e depois no nome dela na lista de visitantes, que leva você até ela.`;
    } else {
      text.value = `Oi! Estou jogando Fábrica de Lápis 🏭✏️ Monte a sua fábrica, contrate um gerente e bata as metas.\nÉ grátis, direto no navegador:\n${location.origin + location.pathname}`;
      note.textContent = "💡 Abra o jogo pelo site publicado para convidar alguém a visitar a sua fábrica ao vivo.";
    }
    status.textContent = ""; refresh(); box.hidden = false; text.focus();
  };
  const close = () => { box.hidden = true; };
  btn.addEventListener("click", open);
  text.addEventListener("input", refresh);
  box.addEventListener("click", e => { if (e.target === box || e.target.closest(".invite-close")) close(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !box.hidden) close(); });
  box.querySelector(".invite-copy").addEventListener("click", () => {
    const done = () => { status.textContent = "✅ Convite copiado. É só colar na conversa."; };
    const fallback = () => { text.select(); try { document.execCommand("copy"); done(); } catch (_) { status.textContent = "Selecionei o texto: aperte Ctrl+C para copiar."; } };
    try { navigator.clipboard.writeText(text.value).then(done, fallback); } catch (_) { fallback(); }
  });
})();

(function () {
  if (!FABRICA_HAS_CLAUDE && !FABRICA_PUBLIC) return;

  const clean = v => typeof v === "string" ? v.replace(/[<>&"'`]/g, "").slice(0, 60)
    : Array.isArray(v) ? v.slice(0, 24).map(clean)
    : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).slice(0, 24).map(([k, x]) => [k, clean(x)]))
    : typeof v === "number" ? (Number.isFinite(v) ? v : 0) : typeof v === "boolean" || v == null ? v : null;
  const num = (v, d = 0) => typeof v === "number" && Number.isFinite(v) ? v : d;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  let room = null, user = null, isHost = false, names = {}, chip = null, banner = null, started = false, othersOnline = false;
  const known = new Set();

  /* ---------- CEO: resumo do que está acontecendo na fábrica ---------- */
  function factoryFrame() {
    const s = state, f = {
      d: s.day, mi: Math.round(s.minute), cl: Math.round(s.clock), n: !!s.night, df: !!s.dayOff, li: s.lines || 1, bo: Math.round(s.blackout), ru: !!s.running, pa: !!s.paused,
      sp: s.speed, mo: Math.round(s.money), re: Math.round(s.reputation), mr: Math.round(s.morale ?? 70), wh: s.warehouse,
      st: Object.fromEntries(Object.entries(s.stations).map(([id, x]) => [id, { on: x.on, broken: x.broken, wear: Math.round(x.wear), level: x.level, repair: Math.round(x.repair) }])),
      ac: s.active.slice(0, 3).map(o => ({ ...o, done: Math.floor(o.done || 0) })),
      sk: { wood: Math.round(s.stock.wood), graphite: Math.round(s.stock.graphite), paint: Math.round(s.stock.paint) },
      sf: s.staff, bl: { on: s.boiler.on, broken: s.boiler.broken, pressure: Math.round(s.boiler.pressure), level: s.boiler.level },
      sh: { stock: Math.round(s.shop.stock), level: s.shop.level },
      pt: s.party ? { name: s.party.name, size: s.party.size, endsAt: s.party.endsAt, startedAt: s.party.startedAt } : null,
      bn: s.brand.name, ceo: s.ceo?.name || "",
      cu: (s.custom || []).filter(c => !c.retired).slice(0, 6).map(c => ({ id: c.id, name: c.name, body: c.body, stripe: c.stripe, cap: c.cap, tip: c.tip, pattern: c.pattern, price: c.price })),
      th: s.theme, lu: s.lab?.unlocked, fa: Object.keys(s.facilities || {})
    };
    if (JSON.stringify(f).length > 3300) f.ac = f.ac.slice(0, 1);
    return f;
  }

  /* ---------- visitante: aplica o que o CEO transmitiu ---------- */
  let lastFrame = "";
  function applyFrame(raw) {
    const key = JSON.stringify(raw);
    if (key === lastFrame) return;
    lastFrame = key;
    const f = clean(raw), s = state;
    Object.assign(s, {
      day: num(f.d, s.day), minute: num(f.mi, s.minute), clock: num(f.cl, s.clock), night: !!f.n, dayOff: !!f.df, lines: clamp(num(f.li, 1), 1, MAX_LINES), blackout: num(f.bo), running: !!f.ru,
      paused: !!f.pa, speed: num(f.sp, 1), money: num(f.mo, s.money), reputation: num(f.re, s.reputation), morale: num(f.mr, 70),
      warehouse: num(f.wh, 1), ended: false
    });
    for (const [id, x] of Object.entries(f.st || {})) if (s.stations[id]) Object.assign(s.stations[id], {
      on: !!x.on, broken: !!x.broken, wear: num(x.wear), level: Math.max(1, Math.min(5, num(x.level, 1))), repair: num(x.repair)
    });
    if (Array.isArray(f.cu)) { s.custom = f.cu.filter(c => c && typeof c.id === "string" && COLORS[c.body]).map(c => ({ ...c, price: num(c.price, 4), day: -99 })); registerCustomProducts(); }
    if (f.th && THEMES[f.th.id]) s.theme = { id: f.th.id, wall: num(f.th.wall, null), trim: num(f.th.trim, null), roof: num(f.th.roof, null) };
    if (Array.isArray(f.lu)) s.lab.unlocked = f.lu.filter(id => COLORS[id]);
    if (Array.isArray(f.fa)) s.facilities = Object.fromEntries(f.fa.filter(id => FACILITIES[id]).map(id => [id, { day: s.facilities?.[id]?.day ?? 0 }]));
    s.active = (f.ac || []).filter(o => o && PRODUCTS[o.product]).map(o => ({ ...o, amount: Math.max(1, num(o.amount, 1)), done: num(o.done), reward: num(o.reward), deadline: num(o.deadline, 1), deadlineAt: num(o.deadlineAt) }));
    for (const k of ["wood", "graphite", "paint"]) s.stock[k] = num(f.sk?.[k], s.stock[k]);
    for (const k of Object.keys(s.staff)) s.staff[k] = Math.max(0, Math.min(40, num(f.sf?.[k], s.staff[k])));
    Object.assign(s.boiler, { on: !!f.bl?.on, broken: !!f.bl?.broken, pressure: num(f.bl?.pressure), level: num(f.bl?.level, 1) });
    Object.assign(s.shop, { stock: num(f.sh?.stock, s.shop.stock), level: num(f.sh?.level, 1) });
    s.party = f.pt && f.pt.name ? { name: f.pt.name, size: f.pt.size, endsAt: num(f.pt.endsAt), startedAt: num(f.pt.startedAt) } : null;
    if (typeof f.bn === "string" && f.bn && f.bn !== s.brand.name) s.brand = { name: f.bn, logo: null };
    s.ceo.name = typeof f.ceo === "string" ? f.ceo : "";
    render();
  }

  /* ---------- quem está na fábrica ---------- */
  function peerName(p) {
    if (p.isMe && p.sameTab) return "Você";
    return (p.by && names[p.by]) || (p.presence.h ? "CEO" : "Visitante");
  }
  async function resolveNames(peers) {
    if (!user) return;
    const ids = [...new Set(peers.map(p => p.by).filter(id => id && !(id in names)))];
    if (!ids.length) return;
    try {
      const ps = await user.profiles(ids);
      for (const id of ids) names[id] = (ps[id]?.name || "").split(" ")[0] || "";
      paint();
    } catch (_) { }
  }
  function sectorName(v) { const opt = document.querySelector(`#sectorSelect option[value="${v}"]`); return opt ? opt.textContent.replace(/^\S+\s/, "") : v; }
  function whereIs(p) {
    const w = p.presence.w; if (!w || typeof w !== "object") return "";
    const v = String(w.v || "campus");
    return v === "campus" ? "no complexo" : `em ${sectorName(v)}`;
  }
  function paint() {
    const peers = room.peers().filter(p => p.kind === "viewer");
    // bonecos das outras pessoas que estão na fábrica (andando ou paradas)
    window.Factory3D?.setPeers?.(peers.filter(p => !p.sameTab && p.presence.w && typeof p.presence.w === "object").map(p => {
      const w = p.presence.w;
      return { key: p.peer, name: peerName(p), host: !!p.presence.h, view: String(w.v || "campus"), x: num(w.x), z: num(w.z), r: num(w.r) };
    }));
    // aviso quando alguém entra
    for (const p of peers) {
      if (p.sameTab || known.has(p.peer)) continue;
      known.add(p.peer);
      toast(`👤 ${peerName(p)} entrou na fábrica! Clique no nome na lista para ir até ${p.presence.h ? "o CEO" : "a pessoa"}.`, "good");
    }
    // a sala só "liga" quando há mais alguém: sozinho, o jogo não transmite nada (e a sala do site hibera de graça)
    const others = peers.filter(p => !p.sameTab), nowOn = others.length > 0;
    if (nowOn && !othersOnline) {
      othersOnline = true;
      const w = window.Factory3D?.getWalk?.() || null;
      room.presence(isHost ? { h: true, f: factoryFrame(), w } : { w }).catch(() => { });
    } else othersOnline = nowOn;
    if (!chip) return;
    chip.hidden = !others.length && isHost;
    chip.innerHTML = `<span>👥 ${peers.length} na fábrica:</span> ` + peers.map(p => p.sameTab
      ? `<span>${p.presence.h ? "👔" : "👤"} Você</span>`
      : `<button type="button" data-peer="${esc(p.peer)}" title="Ir até ${esc(peerName(p))} (${esc(whereIs(p))})">${p.presence.h ? "👔" : "👤"} ${esc(peerName(p))}</button>`).join(" ");
    if (!isHost) {
      const host = peers.find(p => p.presence.h && p.presence.f);
      banner.textContent = host ? `👤 Você está visitando a ${state.brand.name}. Ande com WASD e aperte E para entrar nos prédios.`
        : "👤 O CEO não está na fábrica agora — ela está parada. Você ainda pode passear.";
    }
  }
  function followHost() {
    let best = null;
    for (const p of room.peers()) if (!p.sameTab && p.presence.h && p.presence.f && (!best || p.updatedAt > best.updatedAt)) best = p;
    if (best) applyFrame(best.presence.f);
  }
  function goToPeer(key) {
    const p = room.peers().find(x => x.peer === key); if (!p || !p.presence.w) return;
    window.Factory3D?.focusPeer?.(key, String(p.presence.w.v || "campus"));
    document.querySelector(".factory-view")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- modo visitante: olha, anda, não mexe ---------- */
  function enterGuestMode() {
    window.GUEST_MODE = true;
    document.body.classList.add("guest-mode");
    document.querySelectorAll(".modal:not([hidden])").forEach(m => m.hidden = true);
    modalOpen = false;
    window.toggleStationBy3D = () => toast("👤 Visitantes só olham — quem liga as máquinas é o CEO.");
    const block = e => {
      const t = e.target.closest?.("[data-act], button, input, select, textarea");
      if (!t) return;
      // câmera, passeio, "Ir para", abas e a lista de visitantes continuam livres; o resto é do CEO
      if (t.closest("#factory3d") && !t.matches("[data-act]")) return;
      if (t.closest("#walkBtn, #resetCameraBtn, #viewAerialBtn, #viewInteriorBtn, #sectorSelect, .tabs [data-tab], .visitors-chip")) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (e.type === "click") toast("👤 Você está visitando: só o CEO mexe na fábrica.");
    };
    document.addEventListener("click", block, true);
    document.addEventListener("change", block, true);
    document.addEventListener("submit", e => { e.preventDefault(); e.stopImmediatePropagation(); }, true);
    banner = document.createElement("div");
    banner.className = "guest-banner";
    document.getElementById("factory3d")?.append(banner);
    window.Factory3D?.setView?.("campus");
    window.Factory3D?.setWalk?.(true);
    window.Factory3D?.setWalkName?.("👤 Você (visitante)");
  }

  function buildChip() {
    chip = document.createElement("div");
    chip.className = "visitors-chip";
    chip.hidden = true;
    chip.addEventListener("click", e => { const b = e.target.closest("[data-peer]"); if (b) goToPeer(b.dataset.peer); });
    document.getElementById("factory3d")?.append(chip);
  }

  /* ---------- ligação com a sala (do Claude ou do site) ---------- */
  async function start() {
    if (started) return; started = true;
    if (FABRICA_HAS_CLAUDE) {
      const r = await claude.use("room");
      if (!r) return;
      room = r; user = await claude.use("user");
      isHost = user ? await user.isOwner() : false;
    } else {
      let cfg;
      if (FABRICA_JOIN) {
        let nm = ""; try { nm = localStorage.getItem("fabrica-visitante-nome") || ""; } catch (_) { }
        if (!nm) { nm = (window.prompt("Como você quer ser chamado na fábrica?", "") || "Visitante").trim().slice(0, 24) || "Visitante"; try { localStorage.setItem("fabrica-visitante-nome", nm); } catch (_) { } }
        cfg = { code: FABRICA_JOIN, role: "guest", name: nm };
      } else {
        const sala = fabricaSala(false);
        if (!sala) { started = false; return; }   // o CEO ainda não gerou um convite
        cfg = { code: sala.code, role: "host", secret: sala.secret, name: (state.ceo?.name || "CEO").slice(0, 24) };
      }
      const r = fabricaSocketRoom(cfg);
      room = r; isHost = cfg.role === "host";
      user = { isOwner: async () => isHost, profiles: async (ids) => Object.fromEntries(ids.map(id => [id, { name: (r.peers().find(p => p.peer === id) || {}).name || "" }])) };
      r.connect();
    }
    buildChip();
    if (!isHost) enterGuestMode();
    else room.presence({ h: true, f: factoryFrame() }).catch(() => { });

    room.onPeers(ch => { resolveNames(ch.peers); if (!isHost) followHost(); paint(); }, () => { });

    // posição de quem está na fábrica (andando ou parado), ~10 vezes por segundo, só quando muda
    let lastW = "";
    setInterval(() => {
      if (!othersOnline) return;
      const w = window.Factory3D?.getWalk?.() || null, k = JSON.stringify(w);
      if (k !== lastW) { lastW = k; room.presence({ w }).catch(() => { }); }
    }, 100);
    // o CEO transmite a fábrica uma vez por segundo
    if (isHost) {
      let lastF = "";
      setInterval(() => {
        if (!othersOnline) return;
        const f = factoryFrame(), k = JSON.stringify(f);
        if (k !== lastF) { lastF = k; room.presence({ f }).catch(() => { }); }
      }, 1000);
    }
  }
  window.addEventListener("fabrica:sala", () => { start(); });
  start();
})();
