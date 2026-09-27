/* ============================================================
   CORES — Laboratório de Cores, Estúdio de Lápis, concorrentes
   e tema da fábrica. Carregado antes do game.js: só declara dados
   e funções; tudo que mexe no estado roda depois que o jogo sobe.
   ============================================================ */
const COLORS = {
  amarelo:     { name: "Amarelo",          hex: "#e8b838" },
  azul:        { name: "Azul",             hex: "#2e79bd" },
  vermelho:    { name: "Vermelho",         hex: "#d4483f" },
  verde:       { name: "Verde",            hex: "#3e9d63" },
  preto:       { name: "Preto",            hex: "#2d3a36" },
  branco:      { name: "Branco",           hex: "#f3efe4" },
  laranja:     { name: "Laranja",          hex: "#e78630", cost: 300,  time: 150, lab: 1 },
  rosa:        { name: "Rosa",             hex: "#e86a9a", cost: 300,  time: 150, lab: 1 },
  roxo:        { name: "Roxo",             hex: "#7a54a5", cost: 350,  time: 170, lab: 1 },
  marrom:      { name: "Marrom",           hex: "#8a5a3b", cost: 300,  time: 150, lab: 1 },
  turquesa:    { name: "Turquesa",         hex: "#1fb5b0", cost: 450,  time: 190, lab: 1 },
  vinho:       { name: "Vinho",            hex: "#7c2335", cost: 450,  time: 190, lab: 1 },
  lilas:       { name: "Lilás pastel",     hex: "#c9b3e6", cost: 600,  time: 240, lab: 1, tag: "pastel" },
  menta:       { name: "Menta pastel",     hex: "#a8e0c8", cost: 600,  time: 240, lab: 1, tag: "pastel" },
  pessego:     { name: "Pêssego pastel",   hex: "#f6c1a0", cost: 600,  time: 240, lab: 1, tag: "pastel" },
  ouro:        { name: "Dourado metálico", hex: "#d4a93a", cost: 1200, time: 360, lab: 2, tag: "metal", special: true },
  prata:       { name: "Prata metálico",   hex: "#b9c0c6", cost: 1200, time: 360, lab: 2, tag: "metal", special: true },
  neonverde:   { name: "Verde neon",       hex: "#7dff3a", cost: 1500, time: 380, lab: 2, tag: "neon", special: true },
  neonrosa:    { name: "Rosa neon",        hex: "#ff3fa6", cost: 1500, time: 380, lab: 2, tag: "neon", special: true },
  neonlaranja: { name: "Laranja neon",     hex: "#ff8a1f", cost: 1500, time: 380, lab: 2, tag: "neon", special: true },
  galaxia:     { name: "Galáxia (glitter)", hex: "#3b2e7a", cost: 2400, time: 540, lab: 3, tag: "glitter", special: true }
};
const BASE_COLORS = ["amarelo", "azul", "vermelho", "verde", "preto", "branco"];
const LAB_UPGRADE = { 2: 3000, 3: 6500 };
const LAB_LEVELS = { 1: "cores comuns e pastel", 2: "metálicas e neon", 3: "glitter e pesquisa 40% mais rápida" };
const PATTERNS = { liso: { name: "Liso", bonus: 0 }, listras: { name: "Listras", bonus: .2 }, bolinhas: { name: "Bolinhas", bonus: .3 }, degrade: { name: "Degradê", bonus: .4 }, xadrez: { name: "Xadrez", bonus: .35 } };
const MAX_CUSTOM = 6;
const RIVALS = [
  { id: "grafitao", name: "Grafitão S.A.",    icon: "⚫", hex: "#6b7780", style: "preço baixo, pouca cor" },
  { id: "arcoiris", name: "Arco-Íris Lápis",  icon: "🌈", hex: "#d4483f", style: "muitas cores e novidades" },
  { id: "ecotraco", name: "EcoTraço",         icon: "🌱", hex: "#3e9d63", style: "lápis sustentáveis" }
];
const THEMES = {
  classico:   { name: "Clássico",        wall: null,     trim: null,     roof: null,     cost: 0 },
  industrial: { name: "Industrial",      wall: 0xb8bcbf, trim: 0x3a3f44, roof: 0x5d6468, cost: 400 },
  tropical:   { name: "Tropical",        wall: 0xf3e3b5, trim: 0x1f9e89, roof: 0xd9674e, cost: 400 },
  pastel:     { name: "Pastel",          wall: 0xf6e1e7, trim: 0x8fb8de, roof: 0xb9a3d9, cost: 400 },
  grafite:    { name: "Grafite",         wall: 0x4a5057, trim: 0xe8b838, roof: 0x23282c, cost: 400 },
  lapis:      { name: "Lápis amarelo",   wall: 0xf0c64a, trim: 0x2d3a36, roof: 0xc8473b, cost: 400 },
  personal:   { name: "Do meu jeito",    wall: 0xe9dfd0, trim: 0x7a54a5, roof: 0x4b86d1, cost: 400 }
};
const hexNum = h => parseInt(String(h).replace("#", ""), 16);
const numHex = n => "#" + (n >>> 0).toString(16).padStart(6, "0").slice(-6);
const colorOf = id => COLORS[id]?.hex || "#999999";

/* ---------- produtos criados no Estúdio viram produtos de verdade ---------- */
function designColors(d) { return [...new Set([d.body, d.stripe, d.cap, d.tip !== "grafite" ? d.tip : null].filter(Boolean))]; }
function designPrice(d) {
  const cols = designColors(d);
  let p = 4.1 + cols.length * .18 + (PATTERNS[d.pattern]?.bonus || 0) + (d.cap ? .15 : 0) + (d.tip !== "grafite" ? .3 : 0);
  for (const c of cols) p += COLORS[c]?.special ? .55 : COLORS[c]?.tag === "pastel" ? .2 : 0;
  return Math.round(p * 100) / 100;
}
function designCost(d) { return 500 + designColors(d).reduce((a, c) => a + 120 + (COLORS[c]?.special ? 300 : 0), 0); }
function designUse(d) {
  const n = designColors(d).length;
  return { wood: .10, graphite: d.tip === "grafite" ? .06 : .03, paint: +(.04 + .012 * n + (d.pattern !== "liso" ? .01 : 0) + (d.tip !== "grafite" ? .03 : 0)).toFixed(3) };
}
function registerCustomProducts() {
  for (const k of Object.keys(PRODUCTS)) if (PRODUCTS[k].custom) delete PRODUCTS[k];
  for (const c of state.custom || []) {
    if (!c || !c.id || !COLORS[c.body]) continue;
    PRODUCTS[c.id] = { name: c.name, use: designUse(c), price: c.price, color: hexNum(colorOf(c.body)), custom: c };
  }
}
function customSwatchCss(c) {
  const a = colorOf(c.body), b = colorOf(c.stripe || c.body), cap = c.cap ? colorOf(c.cap) : a;
  return `linear-gradient(${cap} 0 18%, ${a} 18% 45%, ${b} 45% 60%, ${a} 60%)`;
}

/* ---------- mercado: participação contra os concorrentes ---------- */
function defaultRivals() { return { grafitao: { power: 34, colors: 8 }, arcoiris: { power: 30, colors: 14 }, ecotraco: { power: 22, colors: 7 } }; }
function myPower(s = state) {
  const live = (s.custom || []).filter(c => !c.retired).length;
  return 12 + s.reputation * .25 + live * 3.2 + (s.lab?.unlocked?.length || 6) * .9 + (s.clock < s.buffs.marketingUntil ? 8 : 0) + s.shop.level * 2 + Math.min(10, s.stats.ordersDone * .2) + (typeof viveiroReady === "function" && viveiroReady(s) ? 4 : 0);
}
function marketShares(s = state) {
  const r = s.rivals || defaultRivals(), me = myPower(s);
  const total = me + RIVALS.reduce((a, x) => a + (r[x.id]?.power || 20), 0);
  return { me: me / total, ...Object.fromEntries(RIVALS.map(x => [x.id, (r[x.id]?.power || 20) / total])) };
}
function marketMult(s = state) {
  const m = clamp(.75 + marketShares(s).me * 1.1, .8, 1.35);
  return s.rivalFx?.priceWarDay === s.day ? m * .9 : m;
}
function trendActive(s = state) { const t = s.rivalFx?.trend; return t && t.untilDay >= s.day && COLORS[t.color] ? t.color : null; }
function productWeight(key, s = state) {
  const p = PRODUCTS[key];
  if (p.custom?.retired) return 0;
  let w = p.custom ? .8 + (s.day - (p.custom.day || 0) < 3 ? 1 : 0) : 1;
  if (key === "eco" && s.rivalFx?.ecoDay === s.day) w *= 2;
  const tr = trendActive(s);
  if (tr && p.custom && designColors(p.custom).includes(tr)) w *= 1.6;
  return w;
}
function pickProduct() {
  const keys = Object.keys(PRODUCTS), ws = keys.map(k => productWeight(k));
  let r = Math.random() * ws.reduce((a, b) => a + b, 0);
  for (let i = 0; i < keys.length; i++) { r -= ws[i]; if (r <= 0) return keys[i]; }
  return keys[0];
}
function offerMult(key, s = state) {
  const tr = trendActive(s), p = PRODUCTS[key];
  return marketMult(s) * (tr && p?.custom && designColors(p.custom).includes(tr) ? 1.3 : 1);
}
function rivalNews(text, kind = "") {
  state.rivalNews = [{ day: state.day, text, kind }, ...(state.rivalNews || [])].slice(0, 7);
  addLog(`📰 ${text}`, kind === "bad" ? "warn" : "");
}
/* uma vez por dia os concorrentes se mexem */
function coresDay() {
  const s = state;
  if (!s.rivals) s.rivals = defaultRivals();
  s.rivalFx = s.rivalFx || {};
  for (const x of RIVALS) { const r = s.rivals[x.id]; r.power = clamp(r.power + rand(-1.2, 2.2) + .12, 12, 90); }
  const next = s.day + 1, roll = Math.random();
  if (roll < .22) {
    s.rivalFx.priceWarDay = next;
    rivalNews(`Grafitão S.A. anunciou promoção amanhã: os pedidos vão pagar 10% menos no dia ${next}.`, "bad");
  } else if (roll < .44) {
    const pool = Object.keys(COLORS).filter(c => !BASE_COLORS.includes(c));
    const color = pick(pool); s.rivals.arcoiris.colors++; s.rivals.arcoiris.power += 1.5;
    s.rivalFx.trend = { color, untilDay: next + 2 };
    rivalNews(`Arco-Íris Lápis lançou a cor ${COLORS[color].name} e virou moda: até o dia ${next + 2}, lápis seus com essa cor saem mais e pagam +30%.`);
  } else if (roll < .6) {
    s.rivalFx.ecoDay = next; s.rivals.ecotraco.power += 1.2;
    rivalNews(`EcoTraço ganhou um selo verde: amanhã chegam o dobro de pedidos de lápis ecológico.`);
  } else if (roll < .72) {
    const mine = (s.custom || []).filter(c => !c.retired && s.day - (c.day || 0) < 3);
    if (mine.length) { const c = pick(mine); c.day = -99; s.rivals.arcoiris.power += 1;
      rivalNews(`Arco-Íris Lápis copiou o seu “${c.name}”: ele deixou de ser novidade. Crie outro no Estúdio!`, "bad"); }
  }
  // quando você passa de um concorrente, vira notícia
  const sh = marketShares(s), ranks = RIVALS.filter(x => sh[x.id] > sh.me).length;
  if (s.rivalFx.lastRank != null && ranks < s.rivalFx.lastRank) rivalNews(`Sua fábrica subiu no mercado: agora está em ${ranks + 1}º lugar!`, "good");
  s.rivalFx.lastRank = ranks;
}

/* ---------- pesquisa no laboratório ---------- */
function coresTick(dm) {
  const L = state.lab; if (!L?.research) return;
  L.research.left -= dm * (L.level >= 3 ? 1.4 : 1);
  if (L.research.left > 0) return;
  const id = L.research.color; L.research = null;
  if (!L.unlocked.includes(id)) L.unlocked.push(id);
  sfx.success();
  toast(`🔬 Nova cor descoberta: ${COLORS[id].name}! Já pode usar no Estúdio de Lápis.`, "good");
  addLog(`Laboratório de Cores descobriu a cor ${COLORS[id].name}.`, "good");
  window.Factory3D?.notify("upgrade", "lab");
}
function startResearch(id) {
  const c = COLORS[id], L = state.lab;
  if (!c || !c.cost || L.unlocked.includes(id) || L.research) return;
  if (c.lab > L.level) { toast(`Amplie o laboratório para o nível ${c.lab} para pesquisar ${c.name}.`, "bad"); return; }
  if (state.money < c.cost) { toast("Dinheiro insuficiente para a pesquisa.", "bad"); return; }
  spend(c.cost, "investments"); L.research = { color: id, left: c.time, total: c.time };
  sfx.click(); addLog(`Laboratório começou a pesquisar a cor ${c.name}.`); render();
}
function upgradeLab() {
  const L = state.lab, cost = LAB_UPGRADE[L.level + 1]; if (!cost) return;
  if (state.money < cost) { toast("Dinheiro insuficiente para ampliar o laboratório.", "bad"); return; }
  spend(cost, "investments"); L.level++;
  sfx.success(); toast(`🔬 Laboratório nível ${L.level}: libera ${LAB_LEVELS[L.level]}.`, "good"); addLog(`Laboratório de Cores ampliado para o nível ${L.level}.`, "good");
  render();
}

/* ---------- Estúdio de Lápis ---------- */
const studio = { name: "", body: "azul", stripe: "branco", cap: "rosa", tip: "grafite", pattern: "listras" };
function launchDesign() {
  const d = { ...studio }, name = (d.name || "").trim().replace(/[<>&"]/g, "").slice(0, 28);
  const live = state.custom.filter(c => !c.retired);
  if (!name) { toast("Dê um nome para o seu lápis.", "bad"); document.getElementById("studioName")?.focus(); return; }
  if (Object.values(PRODUCTS).some(p => p.name.toLowerCase() === name.toLowerCase())) { toast("Já existe um lápis com esse nome.", "bad"); return; }
  if (live.length >= MAX_CUSTOM) { toast(`Máximo de ${MAX_CUSTOM} lápis próprios à venda. Aposente um para lançar outro.`, "bad"); return; }
  for (const c of designColors(d)) if (!state.lab.unlocked.includes(c)) { toast(`A cor ${COLORS[c].name} ainda não foi descoberta no laboratório.`, "bad"); return; }
  const cost = designCost(d);
  if (state.money < cost) { toast("Dinheiro insuficiente para lançar o lápis.", "bad"); return; }
  spend(cost, "investments");
  const c = { id: "c" + state.nextId++, name, body: d.body, stripe: d.stripe, cap: d.cap, tip: d.tip, pattern: d.pattern, price: designPrice(d), day: state.day, sold: 0 };
  state.custom.push(c); registerCustomProducts();
  state.reputation += 1;
  studio.name = ""; const inp = document.getElementById("studioName"); if (inp) inp.value = "";
  sfx.success(); toast(`✏️ “${name}” lançado! Os clientes já podem pedir.`, "good");
  addLog(`Novo lápis lançado: ${name} (${fmtMoney(c.price * 10)} a dezena).`, "good");
  window.Factory3D?.notify("complete");
  render();
}
function retireDesign(id) {
  const c = state.custom.find(x => x.id === id); if (!c) return;
  c.retired = !c.retired; sfx.click();
  addLog(c.retired ? `${c.name} saiu de linha.` : `${c.name} voltou a ser vendido.`);
  render();
}

/* desenho do lápis (prévia e vitrine) */
function drawPencil(cv, d, withName = true) {
  const g = cv.getContext("2d"), W = cv.width, H = cv.height;
  g.clearRect(0, 0, W, H);
  const y = H * .3, h = H * .4, x0 = W * .05, capW = d.cap ? W * .08 : 0, ferW = W * .05, bodyX = x0 + capW + ferW, bodyW = W * .66, tipW = W * .14;
  const body = colorOf(d.body), stripe = colorOf(d.stripe || d.body);
  g.save(); g.shadowColor = "rgba(0,0,0,.25)"; g.shadowBlur = 10; g.shadowOffsetY = 4;
  g.fillStyle = body; g.fillRect(bodyX, y, bodyW, h); g.restore();
  g.save(); g.beginPath(); g.rect(bodyX, y, bodyW, h); g.clip();
  if (d.pattern === "listras") { g.fillStyle = stripe; for (let i = 0; i < 3; i++) g.fillRect(bodyX, y + h * (.14 + i * .3), bodyW, h * .12); }
  else if (d.pattern === "bolinhas") { g.fillStyle = stripe; for (let x = bodyX + 10; x < bodyX + bodyW; x += 22) for (let r = 0; r < 3; r++) { g.beginPath(); g.arc(x + (r % 2) * 11, y + h * (.2 + r * .3), h * .07, 0, 7); g.fill(); } }
  else if (d.pattern === "degrade") { const gr = g.createLinearGradient(bodyX, 0, bodyX + bodyW, 0); gr.addColorStop(0, body); gr.addColorStop(1, stripe); g.fillStyle = gr; g.fillRect(bodyX, y, bodyW, h); }
  else if (d.pattern === "xadrez") { g.fillStyle = stripe; const q = h / 4; for (let x = 0; x * q < bodyW; x++) for (let r = 0; r < 4; r++) if ((x + r) % 2) g.fillRect(bodyX + x * q, y + r * q, q, q); }
  if (COLORS[d.body]?.tag === "metal" || COLORS[d.stripe]?.tag === "metal") { const gl = g.createLinearGradient(0, y, 0, y + h); gl.addColorStop(0, "rgba(255,255,255,.55)"); gl.addColorStop(.35, "rgba(255,255,255,0)"); gl.addColorStop(1, "rgba(0,0,0,.18)"); g.fillStyle = gl; g.fillRect(bodyX, y, bodyW, h); }
  if (d.body === "galaxia" || d.stripe === "galaxia") { g.fillStyle = "rgba(255,255,255,.85)"; for (let i = 0; i < 40; i++) { const sx = bodyX + ((i * 73) % bodyW), sy = y + ((i * 37) % h); g.fillRect(sx, sy, 1.6, 1.6); } }
  const shade = g.createLinearGradient(0, y, 0, y + h); shade.addColorStop(0, "rgba(255,255,255,.18)"); shade.addColorStop(.5, "rgba(255,255,255,0)"); shade.addColorStop(1, "rgba(0,0,0,.2)");
  g.fillStyle = shade; g.fillRect(bodyX, y, bodyW, h); g.restore();
  // ponteira de metal e borracha
  const fer = g.createLinearGradient(0, y, 0, y + h); fer.addColorStop(0, "#e9ecee"); fer.addColorStop(.5, "#a9b1b6"); fer.addColorStop(1, "#7f878c");
  g.fillStyle = fer; g.fillRect(x0 + capW, y - 2, ferW, h + 4);
  g.fillStyle = "rgba(0,0,0,.18)"; for (let i = 1; i < 4; i++) g.fillRect(x0 + capW + ferW * i / 4, y - 2, 1.5, h + 4);
  if (d.cap) { g.fillStyle = colorOf(d.cap); g.beginPath(); g.moveTo(x0 + capW, y); g.lineTo(x0 + 6, y); g.quadraticCurveTo(x0, y + h / 2, x0 + 6, y + h); g.lineTo(x0 + capW, y + h); g.fill(); }
  // ponta de madeira e mina
  const tx = bodyX + bodyW;
  g.fillStyle = "#e7c9a0"; g.beginPath(); g.moveTo(tx, y); g.lineTo(tx + tipW, y + h / 2); g.lineTo(tx, y + h); g.fill();
  g.fillStyle = d.tip === "grafite" ? "#2d3a36" : colorOf(d.tip);
  g.beginPath(); g.moveTo(tx + tipW * .62, y + h * .31); g.lineTo(tx + tipW, y + h / 2); g.lineTo(tx + tipW * .62, y + h * .69); g.fill();
  if (withName && d.name) {
    g.font = `800 ${Math.round(h * .32)}px system-ui, sans-serif`; g.textBaseline = "middle";
    const light = ["branco", "amarelo", "lilas", "menta", "pessego", "prata", "neonverde"].includes(d.body);
    g.fillStyle = light ? "rgba(27,43,32,.85)" : "rgba(255,255,255,.92)";
    g.fillText(d.name.slice(0, 28), bodyX + 14, y + h / 2, bodyW - 28);
  }
}

/* ---------- tema de cores da fábrica ---------- */
function applyTheme(id) {
  const t = THEMES[id]; if (!t) return;
  const cur = state.theme || {};
  const custom = id === "personal" ? {
    wall: hexNum(document.getElementById("themeWall")?.value || numHex(t.wall)),
    trim: hexNum(document.getElementById("themeTrim")?.value || numHex(t.trim)),
    roof: hexNum(document.getElementById("themeRoof")?.value || numHex(t.roof))
  } : null;
  if (cur.id === id && id !== "personal") return;
  const cost = cur.id === "classico" && !state.themePaid ? 0 : t.cost;
  if (cost && state.money < cost) { toast("Dinheiro insuficiente para pintar a fábrica.", "bad"); return; }
  if (cost) spend(cost, "investments");
  if (id !== "classico") state.themePaid = true;
  state.theme = { id, ...(custom || { wall: t.wall, trim: t.trim, roof: t.roof }) };
  sfx.success(); toast(`🎨 Fábrica pintada no tema ${t.name}${cost ? ` (${fmtMoney(cost)})` : " — a primeira pintura é por nossa conta"}!`, "good");
  addLog(`A fábrica ganhou o tema de cores ${t.name}.`, "good");
  render();
}

/* ---------- tela da aba Cores ---------- */
const coresCache = {};
function swatchRow(slot, allowNone) {
  const un = state.lab.unlocked;
  const none = allowNone ? `<button type="button" class="sw none ${studio[slot] == null ? "on" : ""}" data-cores="pick" data-slot="${slot}" data-color="" title="Sem borracha">✕</button>` : "";
  const lead = slot === "tip" ? `<button type="button" class="sw lead ${studio.tip === "grafite" ? "on" : ""}" data-cores="pick" data-slot="tip" data-color="grafite" title="Grafite (escrita)">✏️</button>` : "";
  return lead + none + un.map(c => `<button type="button" class="sw ${studio[slot] === c ? "on" : ""} ${COLORS[c].special ? "special" : ""}" style="--c:${COLORS[c].hex}" data-cores="pick" data-slot="${slot}" data-color="${c}" title="${COLORS[c].name}" aria-label="${COLORS[c].name}"></button>`).join("");
}
function renderStudio() {
  if (!document.getElementById("studio-body")) return;
  const key = state.lab.unlocked.join() + JSON.stringify(studio);
  if (coresCache.studio !== key) {
    coresCache.studio = key;
    for (const slot of ["body", "stripe", "cap", "tip"]) { const el = document.getElementById(`studio-${slot}`); if (el) el.innerHTML = swatchRow(slot, slot === "cap"); }
    document.querySelectorAll("[data-cores=pattern]").forEach(b => b.classList.toggle("on", b.dataset.pattern === studio.pattern));
    const cv = document.getElementById("studioCanvas"); if (cv) drawPencil(cv, { ...studio, name: studio.name || "Meu lápis" });
  }
  const price = designPrice(studio), cost = designCost(studio), live = state.custom.filter(c => !c.retired).length;
  const info = `<span>Preço de venda <b>${fmtMoney(price * 10)}</b> a dezena</span><span>Lançamento <b>${fmtMoney(cost)}</b></span><span>Na linha <b>${live}/${MAX_CUSTOM}</b></span>`;
  if (coresCache.studioInfo !== info) { coresCache.studioInfo = info; document.getElementById("studioInfo").innerHTML = info; }
  const btn = document.getElementById("studioLaunch"); if (btn) { btn.disabled = state.money < cost || live >= MAX_CUSTOM; btn.textContent = `🚀 Lançar lápis · ${fmtMoney(cost)}`; }
}
function renderCores() {
  if (!document.getElementById("tab-cores")) return;
  const s = state, L = s.lab;
  // laboratório
  const r = L.research, pct = r ? Math.round((1 - r.left / r.total) * 100) : 0;
  const labKey = `${L.level}|${L.unlocked.join()}|${r ? r.color + pct : ""}|${Math.floor(s.money / 100)}`;
  if (coresCache.lab !== labKey) {
    coresCache.lab = labKey;
    const next = LAB_UPGRADE[L.level + 1];
    document.getElementById("labBox").innerHTML = `
      <div class="lab-head"><div><strong>Laboratório nível ${L.level}</strong><small>Pesquisa ${LAB_LEVELS[L.level]}</small></div>
        ${next ? `<button type="button" data-cores="labup" ${s.money < next ? "disabled" : ""}>🏗️ Nível ${L.level + 1} · ${fmtMoney(next)}</button>` : `<span class="chip">nível máximo</span>`}</div>
      ${r ? `<div class="lab-progress"><i style="--c:${COLORS[r.color].hex}"></i><div><b>Pesquisando ${COLORS[r.color].name}</b><div class="bar"><span style="width:${pct}%;background:${COLORS[r.color].hex}"></span></div><small>${pct}% · falta ${durationText(r.left / (L.level >= 3 ? 1.4 : 1))} de fábrica aberta</small></div></div>` : ""}
      <p class="lab-sub">Cores que a tinturaria já sabe fazer (${L.unlocked.length}/${Object.keys(COLORS).length})</p>
      <div class="palette">${L.unlocked.map(c => `<span class="pal" style="--c:${COLORS[c].hex}" title="${COLORS[c].name}"><i></i>${COLORS[c].name}</span>`).join("")}</div>
      <p class="lab-sub">Pesquisar novas cores</p>
      <div class="research">${Object.entries(COLORS).filter(([id, c]) => c.cost && !L.unlocked.includes(id)).map(([id, c]) => {
        const locked = c.lab > L.level;
        return `<button type="button" class="rs ${locked ? "locked" : ""}" data-cores="research" data-color="${id}" ${r || locked || s.money < c.cost ? "disabled" : ""}>
          <i style="--c:${c.hex}"></i><span><b>${c.name}</b><small>${locked ? `🔒 laboratório nível ${c.lab}` : `${fmtMoney(c.cost)} · ${durationText(c.time)}`}</small></span></button>`;
      }).join("") || `<p class="hint">Todas as cores foram descobertas! 🌈</p>`}</div>`;
  }
  renderStudio();
  // seus lápis
  const mineKey = JSON.stringify(s.custom) + s.day;
  if (coresCache.mine !== mineKey) {
    coresCache.mine = mineKey;
    const el = document.getElementById("myPencils");
    el.innerHTML = s.custom.length ? s.custom.map(c => `<div class="my-pencil ${c.retired ? "retired" : ""}"><canvas width="360" height="70" data-pencil="${c.id}"></canvas>
        <div><b>${c.name}</b><small>${fmtMoney(c.price * 10)} a dezena · ${fmtInt(c.sold || 0)} vendidos${!c.retired && s.day - (c.day || 0) < 3 ? " · ✨ novidade" : ""}${c.retired ? " · fora de linha" : ""}</small></div>
        <button type="button" data-cores="retire" data-id="${c.id}">${c.retired ? "Voltar à linha" : "Tirar de linha"}</button></div>`).join("")
      : `<p class="hint">Você ainda não criou nenhum lápis. Monte o primeiro aí em cima!</p>`;
    el.querySelectorAll("canvas[data-pencil]").forEach(cv => { const c = s.custom.find(x => x.id === cv.dataset.pencil); if (c) drawPencil(cv, c, true); });
  }
  // concorrentes
  const sh = marketShares(s), tr = trendActive(s);
  const rows = [{ name: s.brand.name || "Sua fábrica", icon: "✏️", hex: "#e8b838", share: sh.me, me: true }, ...RIVALS.map(x => ({ ...x, share: sh[x.id] }))].sort((a, b) => b.share - a.share);
  const rivalKey = rows.map(x => x.name + Math.round(x.share * 1000)).join() + JSON.stringify(s.rivalNews) + tr + (s.rivalFx?.priceWarDay === s.day);
  if (coresCache.rivals !== rivalKey) {
    coresCache.rivals = rivalKey;
    const mm = marketMult(s);
    document.getElementById("rivalsBox").innerHTML = `
      <div class="shares">${rows.map((x, i) => `<div class="share ${x.me ? "me" : ""}"><span>${i + 1}º ${x.icon} ${x.name}${x.me ? " (você)" : ""}<small>${x.me ? "" : x.style}</small></span><div class="bar"><span style="width:${Math.round(x.share * 100)}%;background:${x.hex}"></span></div><b>${Math.round(x.share * 100)}%</b></div>`).join("")}</div>
      <p class="market-mult">Com essa fatia, seus pedidos pagam <b>${mm >= 1 ? "+" : "−"}${Math.abs(Math.round((mm - 1) * 100))}%</b> e a loja vende no mesmo ritmo.${s.rivalFx?.priceWarDay === s.day ? " ⚠️ Hoje tem promoção da Grafitão." : ""}${tr ? ` 🔥 Moda do momento: <b style="color:${COLORS[tr].hex}">${COLORS[tr].name}</b>.` : ""}</p>
      <p class="hint">Para ganhar mercado: crie lápis no Estúdio, descubra cores novas, cuide da reputação e faça campanhas no Marketing.</p>
      <ul class="rival-news">${(s.rivalNews || []).map(n => `<li class="${n.kind}"><small>Dia ${n.day}</small> ${n.text}</li>`).join("") || "<li>Nenhuma notícia do mercado ainda. Os concorrentes se mexem no fim de cada dia.</li>"}</ul>`;
  }
  // tema
  const th = s.theme || { id: "classico" }, themeKey = th.id + JSON.stringify(th) + !!s.themePaid;
  if (coresCache.theme !== themeKey) {
    coresCache.theme = themeKey;
    const free = th.id === "classico" && !s.themePaid;
    document.getElementById("themeBox").innerHTML = `<div class="themes">${Object.entries(THEMES).filter(([id]) => id !== "personal").map(([id, t]) => {
      const cols = id === "classico" ? ["#d9d4c8", "#2f5d4a", "#7c8589"] : [numHex(t.wall), numHex(t.trim), numHex(t.roof)];
      return `<button type="button" class="theme ${th.id === id ? "on" : ""}" data-cores="theme" data-theme="${id}" ${th.id !== id && t.cost && !free && s.money < t.cost ? "disabled" : ""}>
        <span class="theme-house" style="--w:${cols[0]};--t:${cols[1]};--r:${cols[2]}"><i></i></span><b>${t.name}</b><small>${th.id === id ? "atual" : !t.cost ? "grátis" : free ? "1ª pintura grátis" : fmtMoney(t.cost)}</small></button>`;
    }).join("")}</div>
      <div class="theme-custom"><b>Do meu jeito</b>
        <label>Paredes <input type="color" id="themeWall" value="${th.id === "personal" ? numHex(th.wall) : "#e9dfd0"}"></label>
        <label>Detalhes <input type="color" id="themeTrim" value="${th.id === "personal" ? numHex(th.trim) : "#7a54a5"}"></label>
        <label>Telhados <input type="color" id="themeRoof" value="${th.id === "personal" ? numHex(th.roof) : "#4b86d1"}"></label>
        <button type="button" class="primary" data-cores="theme" data-theme="personal">🎨 Pintar · ${free ? "grátis" : fmtMoney(THEMES.personal.cost)}</button></div>`;
  }
  const t3 = JSON.stringify(th);
  if (coresCache.theme3d !== t3) { coresCache.theme3d = t3; window.Factory3D?.setTheme?.(th); }
}

document.addEventListener("click", e => {
  const b = e.target.closest("[data-cores]"); if (!b || b.disabled) return;
  const a = b.dataset.cores;
  if (a === "pick") { studio[b.dataset.slot] = b.dataset.color || null; sfx.click(); renderStudio(); }
  else if (a === "pattern") { studio.pattern = b.dataset.pattern; sfx.click(); renderStudio(); }
  else if (a === "launch") launchDesign();
  else if (a === "research") startResearch(b.dataset.color);
  else if (a === "labup") upgradeLab();
  else if (a === "retire") retireDesign(b.dataset.id);
  else if (a === "theme") applyTheme(b.dataset.theme);
  else if (a === "random") {
    const un = state.lab.unlocked; Object.assign(studio, { body: pick(un), stripe: pick(un), cap: Math.random() < .8 ? pick(un) : null, tip: Math.random() < .7 ? "grafite" : pick(un), pattern: pick(Object.keys(PATTERNS)) });
    sfx.click(); renderStudio();
  }
});
document.addEventListener("input", e => { if (e.target.id === "studioName") { studio.name = e.target.value.slice(0, 28); renderStudio(); } });
