"use strict";
const $ = (id) => document.getElementById(id);

/* ============================================================
   CONFIGURAÇÃO
   ============================================================ */
const SAVE_KEY = "fabrica-lapis-save-v2";
const DAY_START = 480, DAY_END = 1080;          // 08:00 às 18:00 (minutos do relógio)
const MIN_PER_TICK = 3.5;                       // minutos de jogo por segundo em velocidade normal (dia de ~3 min)
const BASE_RATE = 0.5;                          // lápis por minuto de jogo com máquinas nível 1
const LEVEL_RATE = [0, 1, 1.5, 2.1];
const LEVEL_RELIABILITY = [0, 1, 1.35, 1.8];
const UPGRADE_COST = [0, 0, 450, 950];
const MAX_LEVEL = 3;
const MAX_LINES = 5, LINE_COST = [0, 0, 6000, 9000, 13000, 18000], EXTRA_LINE_RATE = .65;   // linhas extras dentro da Produção
const REPAIR_COST = 80, MAINT_COST = 30, REPAIR_TIME = 20, TECH_REPAIR_TIME = 35;
const ENERGY_PER_MIN = 0.028;                    // R$ por minuto por máquina ligada
const FIXED_DAILY = 120;
const MAX_OFFERS = 3;
const WAREHOUSE_CAP = [0, 300, 500, 800], WAREHOUSE_COST = [0, 0, 400, 900];
const BANKRUPT_AT = -500;
const VICTORY_MONEY = 15000;

const STATIONS = [
  { id: "corte", icon: "🪵", name: "Corte da madeira", short: "Corte", description: "Serra as tábuas e abre os sulcos para a mina." },
  { id: "mina", icon: "✏️", name: "Colocação da mina", short: "Mina", description: "Deita o grafite nos sulcos de cada tábua." },
  { id: "prensa", icon: "🗜️", name: "Colagem e prensa", short: "Prensa", description: "Cola as duas metades e prensa o “sanduíche” de madeira." },
  { id: "fresagem", icon: "⚙️", name: "Fresagem", short: "Fresagem", description: "Corta o bloco em lápis sextavados ou redondos." },
  { id: "pintura", icon: "🎨", name: "Pintura e impressão", short: "Pintura", description: "Aplica camadas de tinta e grava a marca." },
  { id: "secagem", icon: "♨️", name: "Secagem a vapor", short: "Secagem", description: "Estufa aquecida pelo vapor da caldeira seca a tinta." },
  { id: "embalagem", icon: "📦", name: "Qualidade e embalagem", short: "Embalagem", description: "Confere cada lápis e fecha as caixas." }
];

const RESOURCES = {
  wood:     { name: "Madeira", icon: "🪵", unit: "tábuas", base: 1.4, lot: 50 },
  graphite: { name: "Grafite", icon: "⚫", unit: "kg",     base: 2.6, lot: 40 },
  paint:    { name: "Tinta",   icon: "🧪", unit: "L",      base: 2.1, lot: 40 }
};

const PRODUCTS = {
  hb:   { name: "Lápis grafite HB",     use: { wood: .10, graphite: .06, paint: .04 }, price: 3.7, color: 0xe8b838 },
  azul: { name: "Lápis escolar azul",   use: { wood: .10, graphite: .06, paint: .05 }, price: 3.9, color: 0x2e79bd },
  cor:  { name: "Caixa de lápis de cor", use: { wood: .10, graphite: .03, paint: .10 }, price: 4.8, color: 0xd4483f, rainbow: true },
  b2:   { name: "Lápis de desenho 2B",  use: { wood: .10, graphite: .11, paint: .03 }, price: 5.2, color: 0x2d3a36 },
  eco:  { name: "Lápis ecológico",      use: { wood: .07, graphite: .05, paint: .02 }, price: 4.3, color: 0x3e9d63, rep: 2 }
};

/* Refeitório: das 12h às 13h todo mundo para e vai almoçar */
const LUNCH_START = 720, LUNCH_END = 810;
const CANTEEN = {
  1: { name: "Marmitas", meal: 8, morale: 1, desc: "marmita simples" },
  2: { name: "Buffet", meal: 12, morale: 3, cost: 1800, desc: "buffet com saladas e sobremesa" },
  3: { name: "Restaurante com chef", meal: 16, morale: 5, cost: 4500, desc: "chef, prato do dia e sorvete" }
};
const MENUS = ["Arroz, feijão, frango grelhado e salada", "Macarronada com almôndegas", "Feijoada completa", "Peixe assado com legumes", "Strogonoff com batata palha", "Escondidinho de carne seca", "Frango com polenta", "Lasanha à bolonhesa", "Bife acebolado com purê"];
function isLunch(s = state) { return !s.night && s.running && s.minute >= LUNCH_START && s.minute < LUNCH_END; }
function headcount(s = state) { return 6 + Object.values(s.staff).reduce((a, b) => a + b, 0); }
function startLunch() {
  state.canteen.menu = pick(MENUS);
  addLog(`🍽️ Hora do almoço: a linha parou e todo mundo foi para o refeitório (${state.canteen.menu}).`);
  toast("🍽️ Hora do almoço! Todo mundo foi para o refeitório. A linha volta às 13:30.");
}
function endLunch() {
  const c = CANTEEN[state.canteen.level] || CANTEEN[1], n = headcount(), cost = n * c.meal;
  spend(cost, "materials");
  state.morale = Math.min(100, state.morale + c.morale);
  state.canteen.served = (state.canteen.served || 0) + n;
  addLog(`Almoço servido (${c.name}): ${n} refeições, ${fmtMoney(cost)}. Moral +${c.morale}.`);
  toast(`🍽️ Fim do almoço: ${n} refeições · −${fmtMoney(cost)} · moral +${c.morale}. De volta ao trabalho!`, "good");
}
function upgradeCanteen() {
  const next = CANTEEN[state.canteen.level + 1]; if (!next) return;
  if (state.money < next.cost) { toast("Dinheiro insuficiente para melhorar o refeitório.", "bad"); return; }
  spend(next.cost, "investments"); state.canteen.level++;
  sfx.success(); toast(`🍽️ Refeitório agora é ${next.name}: ${next.desc}. Mais moral a cada almoço!`, "good");
  addLog(`Refeitório melhorado para ${next.name}.`, "good");
  render();
}

/* Novos setores: começam como canteiro de obras; construídos, cada um dá um efeito */
const FACILITIES = {
  qualidade:   { name: "Controle de Qualidade",      icon: "🧪", cost: 2500,  effect: "Pedidos pagam +8% e cada entrega dá +1% de reputação." },
  mina:        { name: "Preparo da Mina",            icon: "⚫", cost: 3000,  effect: "Mina feita em casa: gasta 12% menos grafite e o lápis 2B paga +15%." },
  viveiro:     { name: "Viveiro e Reflorestamento",  icon: "🌲", cost: 2200,  effect: "Em 3 dias as mudas crescem: madeira 15% mais barata e selo verde no mercado." },
  reciclagem:  { name: "Reciclagem",                 icon: "♻️", cost: 1800,  effect: "Serragem vira lenha: a caldeira gasta 40% menos madeira e as sobras rendem R$ 40 por dia." },
  subestacao:  { name: "Subestação e Energia Solar", icon: "⚡", cost: 3500,  effect: "Falta de luz 60% mais rara e energia 25% mais barata." },
  brigada:     { name: "Brigada e Enfermaria",       icon: "🚒", cost: 1500,  effect: "Máquinas desgastam 15% menos e a equipe fica mais tranquila (+4 de moral)." },
  portaria:    { name: "Portaria",                   icon: "🛂", cost: 1200,  effect: "Caminhões organizados na entrada: ofertas chegam 15% mais rápido." },
  treinamento: { name: "Centro de Treinamento",      icon: "🎓", cost: 2800,  effect: "Equipe treinada: linha 8% mais rápida e consertos 30% mais curtos." },
  creche:      { name: "Creche da Fábrica",          icon: "👶", cost: 2000,  effect: "Benefício para as famílias: +2 de moral todo dia." }
};
function hasFac(id, s = state) { return !!(s.facilities && s.facilities[id]); }
function maxActive(s = state) { return (s.lines || 1) + 1; }
/* ---------- Linhas de produção extras (dentro do prédio da Produção) ---------- */
function buyLine() {
  const n = state.lines || 1; if (n >= MAX_LINES) return;
  const cost = LINE_COST[n + 1];
  if (state.money < cost) { toast("Dinheiro insuficiente para a nova linha.", "bad"); return; }
  spend(cost, "investments"); state.lines = n + 1;
  sfx.success(); toast(`🏭 Linha ${state.lines} instalada na Produção! Agora dá para produzir ${state.lines} pedidos ao mesmo tempo.`, "good");
  addLog(`Nova linha de produção (${state.lines}ª) instalada por ${fmtMoney(cost)}.`, "good");
  window.Factory3D?.notify("complete");
  render();
}
function renderLines() {
  const el = $("lines"); if (!el) return;
  const n = state.lines || 1, next = n < MAX_LINES ? LINE_COST[n + 1] : 0;
  patch(el, `${n}|${next && state.money >= next}|${state.active.length}`, `
    <div class="bo-head"><div class="station-icon">🏭</div>
      <div><h3>Linhas de produção <span class="chip">${n} de ${MAX_LINES}</span></h3><p>Cada linha extra produz mais um pedido ao mesmo tempo, a ${Math.round(EXTRA_LINE_RATE * 100)}% do ritmo da linha principal, e abre uma vaga a mais na fila de pedidos. Fica tudo dentro do prédio da Produção.</p></div></div>
    <div class="line-pips">${Array.from({ length: MAX_LINES }, (_, i) => `<span class="${i < n ? "on" : ""}" title="Linha ${i + 1}">${i + 1}</span>`).join("")}</div>
    <div class="line-row">${Array.from({ length: n }, (_, i) => { const o = state.active[i]; return `<span class="chip ${o ? "ok" : "muted"}">Linha ${i + 1}: ${o ? `${PRODUCTS[o.product].name} · ${fmtInt(o.done)}/${o.amount}` : "sem pedido"}</span>`; }).join("")}</div>
    ${next ? `<button data-act="buyline" class="upgrade-btn" ${state.money < next ? "disabled" : ""}>⬆ Comprar a ${n + 1}ª linha · ${fmtMoney(next)} <small>+1 pedido ao mesmo tempo · fila de ${n + 2} pedidos</small></button>` : `<button class="upgrade-btn" disabled>★ Produção com todas as ${MAX_LINES} linhas</button>`}`);
}
function viveiroReady(s = state) { return hasFac("viveiro", s) && s.day - s.facilities.viveiro.day >= 3; }
function buildFacility(id) {
  const f = FACILITIES[id]; if (!f || hasFac(id)) return;
  if (state.money < f.cost) { toast("Dinheiro insuficiente para esta obra.", "bad"); return; }
  spend(f.cost, "investments");
  state.facilities[id] = { day: state.day };
  if (id === "brigada") state.morale = Math.min(100, state.morale + 4);
  sfx.success(); toast(`${f.icon} ${f.name} inaugurado! ${f.effect}`, "good");
  addLog(`Obra concluída: ${f.name}. ${f.effect}`, "good");
  window.Factory3D?.notify("complete");
  render();
}
function facilitiesDay() {
  if (hasFac("creche")) state.morale = Math.min(100, state.morale + 2);
  if (hasFac("reciclagem")) { earn(40); addLog("♻️ Reciclagem vendeu sobras de madeira: +R$ 40."); }
  if (hasFac("viveiro") && state.day - state.facilities.viveiro.day === 2) addLog("🌲 As mudas do viveiro cresceram: a partir de amanhã a madeira fica mais barata.", "good");
}
function facilityInfo(id, s) {
  const f = FACILITIES[id], built = hasFac(id, s);
  if (!built) return { text: `🚧 Terreno em obras. ${f.effect}`, stats: [["Obra", fmtMoney(f.cost)], ["Status", "aguardando você"]],
    actions: [{ label: `🏗️ Construir · ${fmtMoney(f.cost)}`, attrs: `data-act="build" data-id="${id}" ${s.money < f.cost ? "disabled" : ""}` }] };
  const extra = {
    viveiro: () => [["Mudas", viveiroReady(s) ? "🌳 crescidas" : `crescendo · pronto no dia ${s.facilities.viveiro.day + 3}`]],
    subestacao: () => [["Máquinas ligadas", STATIONS.filter(x => s.stations[x.id].on).length]],
    treinamento: () => [["Operadores", s.staff.operator], ["Técnicos", s.staff.tech]],
    creche: () => [["Moral da equipe", Math.round(s.morale)]],
    brigada: () => [["Moral da equipe", Math.round(s.morale)]],
    qualidade: () => [["Reputação", `${Math.round(s.reputation)}%`]],
    reciclagem: () => [["Lenha da caldeira", `${(.075 * s.boiler.fire * 12 * .6).toFixed(1)} tábuas/h`]]
  }[id]?.() || [];
  const tabFor = { mina: "market", viveiro: "market", treinamento: "staff", creche: "staff", qualidade: null };
  const acts = [];
  if (tabFor[id]) acts.push({ label: tabFor[id] === "staff" ? "👥 Equipe" : "🛒 Mercado", attrs: `data-act="tab" data-tab="${tabFor[id]}"` });
  if (id === "qualidade" || id === "portaria") acts.push({ label: "📋 Ver pedidos", attrs: `data-act="goto" data-target="orders"` });
  return { text: `✅ Funcionando desde o dia ${s.facilities[id].day}. ${f.effect}`, stats: extra, actions: acts };
}

/* Palestras do auditório: o efeito vale quando a palestra termina */
const TALKS = [
  { id: "seguranca", icon: "🦺", name: "Segurança no trabalho", cost: 150, duration: 90, desc: "Máquinas desgastam 30% menos por 2 dias. +5 de moral.",
    run: s => { s.buffs.safetyUntil = s.clock + 1200; s.morale += 5; },
    slides: ["Segurança em primeiro lugar", "EPI sempre: capacete, óculos e luvas", "Máquina desligada para manutenção", "Zero acidentes é meta de todos"] },
  { id: "qualidade", icon: "✅", name: "Qualidade e 5S", cost: 200, duration: 90, desc: "+4% de reputação e +5 de moral.",
    run: s => { s.reputation += 4; s.morale += 5; },
    slides: ["Os 5 sensos: utilização, ordem, limpeza, saúde e disciplina", "Cada lápis conta", "Inspeção na origem", "Cliente satisfeito volta"] },
  { id: "inovacao", icon: "💡", name: "Inovação na produção", cost: 250, duration: 120, desc: "Cada lápis gasta 10% menos material por 2 dias. +8 de moral.",
    run: s => { s.buffs.efficiencyUntil = s.clock + 1200; s.morale += 8; },
    slides: ["Melhoria contínua (kaizen)", "As melhores ideias vêm da linha", "Menos desperdício, mais lápis", "Teste, meça e melhore"] },
  { id: "motivacao", icon: "🔥", name: "Motivação da equipe", cost: 180, duration: 60, desc: "+15 de moral.",
    run: s => { s.morale += 15; },
    slides: ["Juntos somos mais fortes", "Cada etapa da linha importa", "Comemore as pequenas vitórias", "Obrigado, equipe!"] },
  { id: "escolas", icon: "🎒", name: "Palestra para escolas", cost: 100, duration: 90, desc: "A comunidade conhece a fábrica: +6% de reputação.",
    run: s => { s.reputation += 6; },
    slides: ["Da árvore ao lápis", "Madeira de reflorestamento", "Como a mina entra no lápis", "Venham nos visitar!"] }
];
/* Festas do Clube da Fábrica */
const PARTY_SIZES = {
  pequena: { label: "Pequena — happy hour", cost: 200, morale: 10, rep: 0, duration: 120 },
  media:   { label: "Média — festa da equipe", cost: 450, morale: 20, rep: 2, duration: 180 },
  grande:  { label: "Grande — festão com as famílias", cost: 900, morale: 32, rep: 5, duration: 240 }
};
const PARTY_IDEAS = ["Happy hour de sexta", "Aniversário da fábrica", "Comemoração da meta batida", "Festa junina", "Confraternização de fim de ano", "Dia das crianças", "Recorde de produção"];

/* Museu do Lápis: peças liberadas conforme as metas concluídas */
const MUSEUM_EXHIBITS = [
  { goals: 0, year: "Por volta de 1560", title: "A descoberta do grafite", text: "Em Borrowdale, na Inglaterra, foi achada uma grande jazida de grafite puro. No começo, pastores usavam o grafite para marcar as ovelhas." },
  { goals: 1, year: "1795", title: "Grafite + argila", text: "O francês Nicolas-Jacques Conté misturou grafite em pó com argila e levou ao forno. Assim surgiram as durezas da mina: H, HB, B." },
  { goals: 3, year: "1858", title: "O lápis com borracha", text: "Nos Estados Unidos, Hymen Lipman registrou a patente de um lápis com borracha presa na ponta." },
  { goals: 5, year: "Anos 1890", title: "O lápis amarelo", text: "Um fabricante europeu pintou seus lápis de luxo de amarelo. A cor pegou e virou símbolo de lápis de qualidade." },
  { goals: 8, year: "Século XX", title: "Lápis de cor", text: "Pigmentos misturados com cera e aglutinantes deram cor à mina. O lápis de cor virou companheiro de toda escola." },
  { goals: 11, year: "Hoje", title: "Nossa fábrica", text: "" }
];
const TICKET_PRICE = 3;

/* Loja da Fábrica */
const SHOP_CAP = [0, 400, 800, 1500], SHOP_UPGRADE = [0, 0, 800, 1800];
const SHOP_PRICES = {
  barato:  { label: "Promoção", value: 2.6, demand: 1.55 },
  normal:  { label: "Normal",   value: 3.6, demand: 1 },
  premium: { label: "Premium",  value: 5.4, demand: .55 }
};
/* Feiras: uma a cada 3 dias */
const FAIRS = [
  { id: "aulas", icon: "🎒", name: "Feira de Volta às Aulas" },
  { id: "papelaria", icon: "🖊️", name: "Expo Papelaria" },
  { id: "livro", icon: "📚", name: "Bienal do Livro" },
  { id: "artes", icon: "🎨", name: "Feira de Artes e Desenho" }
];
const BOOTHS = {
  pequeno: { label: "Estande pequeno", cost: 350, sales: 1, leads: 1, candidates: 2, rep: 1 },
  medio:   { label: "Estande médio",   cost: 800, sales: 1.8, leads: 2, candidates: 3, rep: 3 },
  grande:  { label: "Estande grande",  cost: 1600, sales: 3, leads: 3, candidates: 4, rep: 6 }
};
const FIRST_NAMES = ["Ana", "Bruno", "Carla", "Diego", "Elisa", "Fábio", "Gabi", "Heitor", "Isabela", "João", "Karina", "Lucas", "Marina", "Nicolas", "Olívia", "Pedro", "Rafaela", "Samuel", "Tainá", "Vitor"];
const EXTRA_SLOTS_MAX = { operator: 3, seller: 2, tech: 1 };
function fairOfDay(day) { return (day - 2) % 3 === 0 && day >= 2 ? FAIRS[Math.floor((day - 2) / 3) % FAIRS.length] : null; }
function nextFairDay(day) { let d = day; while (!fairOfDay(d)) d++; return d; }
function maxOf(role, s = state) { return STAFF[role].max + ((s.extraSlots || {})[role] || 0); }

const CLIENTS = ["Papelaria Horizonte", "Escola Primavera", "Ateliê Central", "Loja Criativa", "Distribuidora Sol",
  "Livraria Ponto Final", "Colégio Aurora", "Rede Papel & Cia", "Prefeitura Municipal", "Estúdio Traço Livre",
  "Escritório Nova Era", "Clube do Desenho"];

const STAFF = {
  manager:  { name: "Gerente geral",         icon: "👔", wage: 220, max: 1, desc: "Toca a fábrica sozinho: abre o turno, escolhe pedidos, compra material, cuida das máquinas e decide os acontecimentos. Você escolhe o que ele pode fazer." },
  tech:     { name: "Técnico de manutenção", icon: "🔧", wage: 90, max: 1, desc: "Conserta máquinas quebradas sem custo e faz manutenção preventiva quando o desgaste passa de 70%." },
  operator: { name: "Operador de linha",     icon: "👷", wage: 70, max: 2, desc: "Cada operador deixa a linha 20% mais rápida." },
  buyer:    { name: "Comprador",             icon: "🧾", wage: 50, max: 1, desc: "Repõe matéria-prima sozinho quando o estoque fica abaixo de 15%." },
  seller:   { name: "Vendedor da loja",      icon: "🧑‍💼", wage: 60, max: 2, desc: "Cada vendedor aumenta as vendas da Loja da Fábrica e do estande nas feiras em 30%." }
};

const GOALS = [
  { id: "first", text: "Conclua o primeiro pedido", reward: 100, check: s => s.stats.ordersDone >= 1 },
  { id: "p500",  text: "Produza 500 lápis", reward: 150, check: s => s.stats.produced >= 500 },
  { id: "steam", text: "Deixe a caldeira com vapor na faixa verde", reward: 150, check: s => s.boiler.on && s.boiler.pressure >= STEAM_OK[0] && s.boiler.pressure <= STEAM_OK[1] },
  { id: "shop500", text: "Venda 500 lápis na Loja da Fábrica", reward: 200, check: s => s.shop.soldTotal >= 500 },
  { id: "fair1", text: "Monte um estande numa feira", reward: 150, check: s => (s.stats.fairs || 0) >= 1 },
  { id: "talk1", text: "Faça uma palestra no auditório", reward: 100, check: s => s.stats.talks >= 1 },
  { id: "party1", text: "Faça uma festa no Clube da Fábrica", reward: 100, check: s => s.stats.parties >= 1 },
  { id: "morale90", text: "Deixe a moral da equipe em 90 ou mais", reward: 200, check: s => s.morale >= 90 },
  { id: "maint", text: "Faça uma manutenção preventiva", reward: 80, check: s => s.stats.maintenances >= 1 },
  { id: "up2",   text: "Melhore uma máquina para o nível 2", reward: 200, check: s => STATIONS.some(x => s.stations[x.id].level >= 2) },
  { id: "staff", text: "Contrate alguém para a equipe", reward: 120, check: s => Object.values(s.staff).some(n => n > 0) },
  { id: "o5",    text: "Conclua 5 pedidos", reward: 250, check: s => s.stats.ordersDone >= 5 },
  { id: "rep85", text: "Chegue a 85% de reputação", reward: 300, check: s => s.reputation >= 85 },
  { id: "p3000", text: "Produza 3.000 lápis", reward: 400, check: s => s.stats.produced >= 3000 },
  { id: "all2",  text: "Deixe todas as máquinas no nível 2", reward: 500, check: s => STATIONS.every(x => s.stations[x.id].level >= 2) },
  { id: "o15",   text: "Conclua 15 pedidos", reward: 700, check: s => s.stats.ordersDone >= 15 },
  { id: "all3",  text: "Deixe todas as máquinas no nível 3", reward: 1000, check: s => STATIONS.every(x => s.stations[x.id].level >= 3) },
  { id: "rich",  text: `Tenha ${fmtMoney(VICTORY_MONEY)} em caixa`, reward: 0, check: s => s.money >= VICTORY_MONEY }
];

/* Acontecimentos: cada escolha pode ter custo (bloqueia se faltar dinheiro) e um efeito. */
const EVENTS = [
  {
    title: "Madeira fora do padrão",
    text: "Um lote de madeira chegou com pequenas imperfeições. Como você quer agir?",
    choices: [
      { label: "Separar e revisar", hint: "Custa R$ 90 e protege a reputação (+3%).", cost: 90, run: s => { s.reputation += 3; } },
      { label: "Usar mesmo assim", hint: "Economiza agora, mas a qualidade cai (−8% de reputação).", run: s => { s.reputation -= 8; } }
    ]
  },
  {
    title: "Cliente quer furar a fila",
    text: "Um cliente oferece pagamento extra para a equipe fazer hora extra no pedido dele.",
    choices: [
      { label: "Aceitar a hora extra", hint: "Receba R$ 180, mas todas as máquinas desgastam +15%.", run: s => { earn(180); addWearAll(s, 15); } },
      { label: "Manter a programação", hint: "A fábrica segue organizada (+2% de reputação).", run: s => { s.reputation += 2; } }
    ]
  },
  {
    title: "Ideia da equipe",
    text: "Os operadores sugeriram um ajuste nas máquinas para reduzir o desperdício de material.",
    when: s => s.efficiency < 3,
    choices: [
      { label: "Investir na melhoria", hint: "Custa R$ 160. A partir de agora cada lápis gasta 8% menos material.", cost: 160, run: s => { s.efficiency++; } },
      { label: "Deixar para depois", hint: "Nenhuma mudança agora.", run: () => {} }
    ]
  },
  {
    title: "Visita escolar",
    managerPick: s => { const o = s.active[0]; return o && (o.deadlineAt - s.clock) - (o.amount - o.done) / lineRate() > 90 ? 0 : 1; },
    text: "Uma escola quer conhecer a linha de produção durante o turno.",
    when: s => s.active.length > 0,
    choices: [
      { label: "Receber os alunos", hint: "+6% de reputação, mas o prazo do pedido atual perde 40 minutos.", run: s => { s.reputation += 6; if (s.active[0]) s.active[0].deadlineAt -= 40; } },
      { label: "Agendar outro dia", hint: "A produção não é interrompida.", run: () => {} }
    ]
  },
  {
    title: "Queda de energia",
    text: "A rede elétrica do bairro caiu. As máquinas vão parar.",
    when: s => !s.blackout && STATIONS.some(x => s.stations[x.id].on),
    choices: [
      { label: "Ligar o gerador", hint: "Custa R$ 150 e a linha continua.", cost: 150, run: () => {} },
      { label: "Esperar a energia voltar", hint: "Tudo apaga por cerca de 1 hora. As máquinas religam sozinhas quando a luz voltar.", run: () => { startBlackout(rand(50, 90), false); } }
    ]
  },
  {
    title: "Promoção do fornecedor",
    text: "Um fornecedor de grafite está liquidando o estoque do mês.",
    choices: [
      { label: "Comprar 60 kg por R$ 80", hint: "Bem abaixo do preço de mercado.", cost: 80, run: s => { addStock(s, "graphite", 60); } },
      { label: "Dispensar", hint: "Nada muda.", run: () => {} }
    ]
  },
  {
    title: "Inspeção de qualidade",
    managerPick: s => avgWear(s) < 45 ? 0 : 1,
    text: "Fiscais querem avaliar o estado das máquinas. Se estiverem bem cuidadas, a fábrica ganha prestígio.",
    choices: [
      { label: "Receber os fiscais", hint: "Desgaste médio abaixo de 45%: +7% de reputação. Acima: −6%.", run: s => {
        const avg = avgWear(s);
        if (avg < 45) { s.reputation += 7; addLog(`Inspeção aprovada! Desgaste médio de ${Math.round(avg)}%.`, "good"); }
        else { s.reputation -= 6; addLog(`Inspeção reprovou: desgaste médio de ${Math.round(avg)}%.`, "bad"); }
      } },
      { label: "Pedir para adiar", hint: "−2% de reputação.", run: s => { s.reputation -= 2; } }
    ]
  },
  {
    title: "Feira de volta às aulas",
    text: "A feira regional de material escolar abriu inscrições para expositores.",
    choices: [
      { label: "Montar um estande", hint: "Custa R$ 200. +5% de reputação e chega uma oferta grande e bem paga.", cost: 200, run: s => { s.reputation += 5; spawnOffer({ big: true }); } },
      { label: "Não participar", hint: "Nada muda.", run: () => {} }
    ]
  },
  {
    title: "Caminhão atrasado",
    text: "Uma chuva forte atrasou o caminhão de madeira. O motorista pede um valor para vir pela rota expressa.",
    when: s => s.stock.wood > 30,
    choices: [
      { label: "Pagar a rota expressa", hint: "Custa R$ 60 e chegam 40 tábuas agora.", cost: 60, run: s => { addStock(s, "wood", 40); } },
      { label: "Esperar", hint: "Parte da madeira molha: −25 tábuas do estoque.", run: s => { s.stock.wood = Math.max(0, s.stock.wood - 25); } }
    ]
  },
  {
    title: "Operador pede treinamento",
    text: "Um curso de operação segura de máquinas está com vagas abertas.",
    choices: [
      { label: "Pagar o curso", hint: "Custa R$ 140. Todas as máquinas voltam para no máximo 20% de desgaste.", cost: 140, run: s => { STATIONS.forEach(x => { const st = s.stations[x.id]; st.wear = Math.min(st.wear, 20); }); } },
      { label: "Fica para outra hora", hint: "Nada muda.", run: () => {} }
    ]
  }
];

/* ============================================================
   ESTADO
   ============================================================ */
const defaultState = () => ({
  version: 2,
  money: 1500, reputation: 70, day: 1, minute: DAY_START, clock: 0,
  stock: { wood: 140, graphite: 90, paint: 80 },
  prices: { wood: RESOURCES.wood.base, graphite: RESOURCES.graphite.base, paint: RESOURCES.paint.base },
  warehouse: 1, efficiency: 0, lines: 1,
  running: false, paused: false, sound: false, speed: 1, tutorialSeen: false,
  night: false, blackout: 0, powerRestore: [],
  brand: { name: "Fábrica de Lápis", logo: null },
  nextOfferAt: 0, nextEventAt: 150, nextId: 1,
  offers: [], active: [],
  staff: { manager: 0, tech: 0, operator: 0, buyer: 0, seller: 0 },
  extraSlots: { operator: 0, seller: 0, tech: 0 },
  shop: { stock: 220, level: 1, price: "normal", produce: true, share: .25, soldToday: 0, revenueToday: 0, soldTotal: 0, lastSold: 0, lastRevenue: 0 },
  fair: null,
  managerPrefs: { orders: true, buy: true, machines: true, events: true, silent: true, invest: false, people: false, sales: false },
  morale: 70, buffs: { safetyUntil: 0, efficiencyUntil: 0, pcpUntil: 0, marketingUntil: 0, suppliersDay: 0 }, benefits: false, recruits: null,
  lab: { level: 1, unlocked: [...BASE_COLORS], research: null }, custom: [], rivals: null, rivalNews: [], rivalFx: {}, theme: { id: "classico" }, themePaid: false,
  workDays: { sat: false, sun: false }, dayOff: false, schedule: [],
  canteen: { level: 1, menu: null, served: 0 }, lunchOn: false, facilities: Object.fromEntries(Object.keys(FACILITIES).map(k => [k, { day: -2 }])),
  ceo: { name: "", photo: null }, talk: null, party: null, partyHistory: [],
  museum: { unlocked: 1, lastVisitors: 0, lastRevenue: 0, totalVisitors: 0 },
  cantina: { lastSold: 0, lastRevenue: 0, totalSold: 0 },
  boiler: { on: false, fire: 2, pressure: 0, wear: 0, broken: false, repair: 0, level: 1, pops: 0 },
  stations: Object.fromEntries(STATIONS.map(x => [x.id, { on: false, broken: false, wear: 0, level: 1, repair: 0, byTech: false }])),
  goals: {},
  stats: { produced: 0, ordersDone: 0, ordersFailed: 0, earned: 0, spent: 0, maintenances: 0, repairs: 0, bestDay: 0, talks: 0, parties: 0 },
  today: freshDay(),
  history: [],
  ended: false, won: false,
  log: []
});
function freshDay() { return { income: 0, materials: 0, energy: 0, maintenance: 0, investments: 0, produced: 0, orders: 0, failed: 0, repStart: null }; }

let state = defaultState();
let simulating = false;                 // true enquanto o gerente trabalha "com a página fechada"
let modalOpen = false;
let audio;
let lastMoney = null;

/* ============================================================
   UTILITÁRIOS
   ============================================================ */
function fmtMoney(v) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }); }
function fmtInt(v) { return Math.floor(v).toLocaleString("pt-BR"); }
function rand(a, b) { return a + Math.random() * (b - a); }
function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function stationName(id) { return STATIONS.find(x => x.id === id).name; }
function cap() { return WAREHOUSE_CAP[state.warehouse]; }
function avgWear(s = state) { return STATIONS.reduce((a, x) => a + s.stations[x.id].wear, 0) / STATIONS.length; }
function addWearAll(s, n) { STATIONS.forEach(x => { const st = s.stations[x.id]; if (!st.broken) st.wear = Math.min(100, st.wear + n); }); }
function addStock(s, res, n) { s.stock[res] = Math.min(WAREHOUSE_CAP[s.warehouse], s.stock[res] + n); }
function clockText(minute = state.minute) {
  const h = Math.floor(minute / 60) % 24, m = Math.floor(minute % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
/* Dias da semana: o dia 1 é uma segunda-feira. Sábado e domingo só têm expediente se a jornada permitir. */
const WEEKDAYS = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
function weekdayIndex(day = state.day) { return ((day - 1) % 7 + 7) % 7; }
function weekdayOf(day = state.day) { return WEEKDAYS[weekdayIndex(day)]; }
function weekdayShort(day = state.day) { return weekdayOf(day).slice(0, 3).toLowerCase(); }
function isDayOff(day = state.day) { const w = weekdayIndex(day), wd = state.workDays || {}; return (w === 5 && !wd.sat) || (w === 6 && !wd.sun); }
function durationText(min) {
  min = Math.max(0, Math.round(min));
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h}h${m ? String(m).padStart(2, "0") : ""}` : `${m} min`;
}
function escapeHtml(t) { return String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

function spend(amount, kind) {
  state.money -= amount; state.stats.spent += amount;
  if (kind) state.today[kind] += amount;
}
function earn(amount) {
  state.money += amount; state.stats.earned += amount; state.today.income += amount;
}
function moraleMult(s = state) { return .9 + clamp(s.morale, 0, 100) / 500; }          // 0 → 0,9× · 100 → 1,1×
function moraleRisk(s = state) { return 1.3 - clamp(s.morale, 0, 100) * .006; }        // 0 → +30% quebras · 100 → −30%
function moraleText(m) { return m >= 85 ? "Animadíssima" : m >= 65 ? "Motivada" : m >= 45 ? "Normal" : m >= 25 ? "Desanimada" : "Revoltada"; }
function useFactor(res, product) {
  return PRODUCTS[product].use[res] * (1 - 0.08 * state.efficiency) * (state.clock < state.buffs.efficiencyUntil ? .9 : 1) * (res === "graphite" && hasFac("mina") ? .88 : 1);
}

/* Ritmo da linha: a estação mais lenta dita a velocidade (gargalo). */
function stationRate(id) { return BASE_RATE * LEVEL_RATE[state.stations[id].level]; }
/* ---------- Caldeira ---------- */
const BOILER_LIMIT = [0, 100, 112, 125], BOILER_BONUS = [0, .25, .35, .45], BOILER_UPGRADE = [0, 0, 600, 1200];
const BOILER_REPAIR = 120, BOILER_MAINT = 40, BOILER_REPAIR_TIME = 30, STEAM_OK = [45, 95];
function boilerMult(s = state) {
  const b = s.boiler; if (!b || !b.on || b.broken) return 1;
  if (b.pressure >= STEAM_OK[0] && b.pressure <= BOILER_LIMIT[b.level]) return 1 + BOILER_BONUS[b.level];
  if (b.pressure >= 25) return 1 + BOILER_BONUS[b.level] / 2;
  return 1;
}
function boilerStatus(b = state.boiler) {
  if (b.repair > 0) return "repair";
  if (b.broken) return "broken";
  if (!b.on) return "off";
  if (b.pressure > STEAM_OK[1]) return "high";
  if (b.pressure >= STEAM_OK[0]) return "ok";
  return "low";
}
function toggleBoiler() {
  const b = state.boiler;
  if (b.broken) { toast("A caldeira está quebrada. Conserte primeiro.", "bad"); return; }
  if (!b.on && state.stock.wood < 5) { toast("Sem lenha! Compre madeira para acender a caldeira.", "bad"); return; }
  b.on = !b.on; b.on ? sfx.on() : sfx.off();
  addLog(`Caldeira ${b.on ? "acesa (fogo " + b.fire + ")" : "apagada"}.`);
  render();
}
function setFire(d) {
  const b = state.boiler, nf = clamp(b.fire + d, 1, 3);
  if (nf === b.fire) return;
  b.fire = nf; sfx.click(); render();
}
function repairBoiler() {
  const b = state.boiler;
  if (!b.broken || b.repair > 0) return;
  if (state.money < BOILER_REPAIR) { toast("Dinheiro insuficiente para consertar a caldeira.", "bad"); return; }
  spend(BOILER_REPAIR, "maintenance"); b.repair = BOILER_REPAIR_TIME;
  sfx.click(); addLog(`Conserto da caldeira iniciado (${BOILER_REPAIR_TIME} min).`); render();
}
function maintainBoiler() {
  const b = state.boiler;
  if (b.broken || b.wear < 5) return;
  if (state.money < BOILER_MAINT) { toast("Dinheiro insuficiente.", "bad"); return; }
  spend(BOILER_MAINT, "maintenance"); b.wear = 0; state.stats.maintenances++;
  sfx.repair(); addLog("Manutenção na caldeira: válvulas e tubos revisados.", "good"); checkGoals(); render();
}
function upgradeBoiler() {
  const b = state.boiler;
  if (b.level >= 3) return;
  const cost = BOILER_UPGRADE[b.level + 1];
  if (state.money < cost) { toast("Dinheiro insuficiente para a melhoria.", "bad"); return; }
  spend(cost, "investments"); b.level++; b.wear = 0;
  sfx.success(); toast(`Caldeira agora é nível ${b.level}!`, "good"); addLog(`Caldeira melhorada para o nível ${b.level}: aguenta mais pressão e rende mais vapor.`, "good");
  render();
}
function boilerTick(dm, producing) {
  const b = state.boiler, steps = Math.max(1, Math.round(dm / MIN_PER_TICK));
  if (b.repair > 0) {
    b.repair -= dm;
    if (b.repair <= 0) { b.repair = 0; b.broken = false; b.wear = 0; b.pressure = 0; sfx.repair(); addLog("Caldeira consertada. Pode acender de novo.", "good"); }
    return;
  }
  if (!b.on || b.broken) { b.pressure = Math.max(0, b.pressure * Math.pow(.88, steps)); return; }
  const fuel = .075 * b.fire * steps * (hasFac("reciclagem") ? .6 : 1);
  if (state.stock.wood < fuel) { b.on = false; sfx.alarm(); toast("🔥 A caldeira apagou: acabou a lenha!", "bad"); addLog("A caldeira apagou por falta de madeira.", "bad"); return; }
  state.stock.wood -= fuel;
  for (let i = 0; i < steps; i++) b.pressure = Math.max(0, b.pressure + 3 * b.fire - b.pressure * (.0545 + (producing ? .0378 : 0)));
  b.wear = Math.min(100, b.wear + .09 * b.fire * steps / (1 + .35 * (b.level - 1)));
  if (b.pressure > BOILER_LIMIT[b.level]) {
    b.pressure -= 28; b.pops++; b.wear = Math.min(100, b.wear + 12);
    window.Factory3D?.notify("valve");
    if (b.wear >= 100) {
      b.broken = true; b.on = false; b.pressure = 0; sfx.fail(); window.Factory3D?.notify("breakdown");
      toast("💥 A caldeira quebrou de tanto excesso de pressão!", "bad"); addLog("A caldeira quebrou. Pressão alta demais por muito tempo.", "bad");
    } else {
      sfx.alarm(); toast("💨 Válvula de segurança da caldeira abriu! Baixe o fogo.", "warn");
      addLog(`Pressão passou do limite: a válvula de segurança abriu (desgaste ${Math.round(b.wear)}%).`, "bad");
    }
  }
}

function lineRate() {
  const slowest = Math.min(...STATIONS.map(x => stationRate(x.id)));
  return slowest * (1 + 0.2 * state.staff.operator) * boilerMult() * moraleMult() * (state.clock < state.buffs.pcpUntil ? 1.1 : 1) * (hasFac("treinamento") ? 1.08 : 1);
}
function orderRate() {   // parte do ritmo que vai para os pedidos (o resto abastece a loja)
  const sh = state.shop, filling = sh.produce && sh.stock < SHOP_CAP[sh.level] * .98;
  return lineRate() * (1 - (filling ? sh.share : 0));
}
function bottleneckId() {
  const rates = STATIONS.map(x => stationRate(x.id));
  const min = Math.min(...rates), max = Math.max(...rates);
  if (min === max) return null;
  return STATIONS[rates.indexOf(min)].id;
}
function lineReady() { return STATIONS.every(x => { const s = state.stations[x.id]; return s.on && !s.broken; }); }

/* ============================================================
   SOM
   ============================================================ */
function tone(freq = 540, duration = .08, type = "sine", delay = 0, vol = .035) {
  if (!state.sound || simulating) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    const t0 = audio.currentTime + delay;
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(.0008, t0 + duration);
    o.connect(g); g.connect(audio.destination); o.start(t0); o.stop(t0 + duration + .02);
  } catch (_) { }
}
const sfx = {
  click: () => tone(620, .06),
  on: () => tone(660, .08, "triangle"),
  off: () => tone(330, .08, "triangle"),
  coin: () => { tone(988, .08, "square", 0, .02); tone(1319, .18, "square", .07, .02); },
  applause: () => { for (let i = 0; i < 26; i++) tone(900 + Math.random() * 1600, .03, "square", Math.random() * 1.4, .012); },
  party: () => { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, .16, "triangle", i * .11, .03)); },
  success: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .22, "triangle", i * .09)),
  fail: () => { tone(220, .25, "sawtooth", 0, .025); tone(165, .35, "sawtooth", .18, .025); },
  alarm: () => { tone(880, .12, "square", 0, .02); tone(660, .12, "square", .14, .02); tone(880, .12, "square", .28, .02); },
  notice: () => { tone(740, .1, "sine"); tone(990, .14, "sine", .1); },
  repair: () => [440, 554, 659].forEach((f, i) => tone(f, .1, "triangle", i * .06))
};

/* ============================================================
   DIÁRIO E NOTIFICAÇÕES
   ============================================================ */
function addLog(text, kind = "") {
  state.log.unshift({ t: `D${state.day} ${clockText()}`, text, kind });
  state.log.length = Math.min(state.log.length, 40);
  renderLog();
}
function renderLog() {
  if (simulating) return;
  $("log").innerHTML = state.log.slice(0, 14).map(l => `<li class="${l.kind}"><time>${l.t}</time>${escapeHtml(l.text)}</li>`).join("");
}
function toast(text, kind = "") {
  if (simulating) return;
  const el = document.createElement("div");
  el.className = `toast ${kind}`; el.textContent = text;
  $("toasts").append(el);
  setTimeout(() => el.classList.add("out"), 3200);
  setTimeout(() => el.remove(), 3700);
  while ($("toasts").children.length > 4) $("toasts").firstChild.remove();
}

/* ============================================================
   AÇÕES DO JOGADOR
   ============================================================ */
function toggleStation(id) {
  const s = state.stations[id];
  if (!state.running || state.ended) { toast("Inicie o turno primeiro."); return; }
  if (state.blackout > 0) { toast("⚡ Sem energia! Ligue o gerador ou espere a luz voltar.", "bad"); return; }
  if (s.broken) { toast(`${stationName(id)} está com defeito.`, "bad"); return; }
  s.on = !s.on;
  s.on ? sfx.on() : sfx.off();
  addLog(`${stationName(id)}: ${s.on ? "ligada" : "desligada"}.`);
  render();
}
function allOn() {
  if (!state.running) return;
  if (state.blackout > 0) { toast("⚡ Sem energia!", "bad"); return; }
  let n = 0;
  STATIONS.forEach(x => { const s = state.stations[x.id]; if (!s.broken && !s.on) { s.on = true; n++; } });
  if (n) { sfx.on(); addLog(`${n} máquina(s) ligada(s).`); }
  render();
}
/* ---------- Falta de energia ---------- */
const GENERATOR_COST = 150;
function startBlackout(minutes, surprise = true) {
  if (state.blackout > 0) return;
  state.blackout = minutes; state.morale = Math.max(0, state.morale - 2);
  state.powerRestore = STATIONS.filter(x => state.stations[x.id].on).map(x => x.id);
  STATIONS.forEach(x => state.stations[x.id].on = false);
  sfx.fail(); window.Factory3D?.notify("breakdown");
  toast(surprise ? "⚡ A energia acabou! Tudo apagou." : "⚡ Sem energia. Esperando a luz voltar…", "bad");
  addLog(`Queda de energia: a fábrica ficou sem luz (cerca de ${Math.round(minutes)} min).`, "bad");
  render();
}
function endBlackout(byGenerator = false) {
  if (!state.blackout) return;
  state.blackout = 0;
  let n = 0;
  for (const id of state.powerRestore || []) { const s = state.stations[id]; if (!s.broken && !s.repair) { s.on = true; n++; } }
  state.powerRestore = [];
  sfx.repair();
  toast(byGenerator ? "Gerador ligado! A luz voltou." : "💡 A energia voltou!", "good");
  addLog(`${byGenerator ? "Gerador ligado" : "A energia voltou"}${n ? ` — ${n} máquina(s) religada(s)` : ""}.`, "good");
  render();
}
function useGenerator() {
  if (!state.blackout) return;
  if (state.money < GENERATOR_COST) { toast("Dinheiro insuficiente para o gerador.", "bad"); return; }
  spend(GENERATOR_COST, "maintenance");
  endBlackout(true);
}
function maintainAll() {
  const list = STATIONS.filter(x => { const s = state.stations[x.id]; return !s.broken && s.wear >= 5; });
  if (!list.length) { toast("Todas as máquinas já estão em dia."); return; }
  const cost = list.length * MAINT_COST;
  if (state.money < cost) { toast("Dinheiro insuficiente.", "bad"); return; }
  spend(cost, "maintenance");
  list.forEach(x => { state.stations[x.id].wear = 0; state.stats.maintenances++; });
  sfx.repair(); addLog(`Manutenção geral em ${list.length} máquina(s).`, "good");
  checkGoals(); render();
}

/* ---------- Loja da Fábrica ---------- */
function shopDemandPerMin(s = state) {
  const p = SHOP_PRICES[s.shop.price] || SHOP_PRICES.normal;
  return .22 * (1 + .6 * (s.shop.level - 1)) * (.5 + s.reputation / 100) * p.demand * (1 + .3 * s.staff.seller) * (s.party ? 1.1 : 1) * (s.clock < s.buffs.marketingUntil ? 1.5 : 1) * marketMult(s);
}
function sellFromShop(units, price, where) {
  units = Math.min(units, state.shop.stock);
  if (units <= 0) return 0;
  state.shop.stock -= units;
  const revenue = units * price;
  state.money += revenue; state.stats.earned += revenue; state.today.income += revenue;
  state.shop.soldToday += units; state.shop.revenueToday += revenue; state.shop.soldTotal += units;
  if (where === "fair" && state.fair) { state.fair.sold += units; state.fair.revenue += revenue; }
  return units;
}
function shopTick(dm) {
  const p = SHOP_PRICES[state.shop.price] || SHOP_PRICES.normal;
  sellFromShop(shopDemandPerMin() * dm * rand(.6, 1.4), p.value, "shop");
  const f = state.fair;
  if (f && f.day === state.day) {
    const booth = BOOTHS[f.size];
    sellFromShop(.3 * booth.sales * dm * (1 + .3 * state.staff.seller) * rand(.6, 1.4), p.value * 1.1, "fair");
  }
}
function setShopPrice(k) { if (!SHOP_PRICES[k]) return; state.shop.price = k; sfx.click(); addLog(`Loja da Fábrica: preço ${SHOP_PRICES[k].label.toLowerCase()} (${fmtMoney(SHOP_PRICES[k].value * 10)} a dezena).`); render(); }
function upgradeShop() {
  const sh = state.shop; if (sh.level >= 3) return;
  const cost = SHOP_UPGRADE[sh.level + 1];
  if (state.money < cost) { toast("Dinheiro insuficiente para ampliar a loja.", "bad"); return; }
  spend(cost, "investments"); sh.level++;
  sfx.success(); toast(`🛍️ Loja da Fábrica ampliada para o nível ${sh.level}!`, "good"); addLog(`Loja da Fábrica ampliada: guarda ${SHOP_CAP[sh.level]} lápis e atrai mais clientes.`, "good");
  render();
}

/* ---------- Feiras e estande ---------- */
function makeCandidate() {
  const roles = ["operator", "operator", "seller", "seller", "tech", "buyer"];
  const role = pick(roles), st = STAFF[role];
  const traits = ["experiente", "comunicativo(a)", "caprichoso(a)", "rápido(a)", "organizado(a)"];
  return { id: state.nextId++, name: pick(FIRST_NAMES), role, wage: Math.round(st.wage * rand(.85, 1.1)), trait: pick(traits) };
}
function startBooth(size) {
  const fairInfo = fairOfDay(state.day), booth = BOOTHS[size];
  if (!fairInfo || !booth) { toast("Hoje não tem feira. Veja o dia da próxima na aba Loja & Feiras.", "bad"); return; }
  if (state.fair && state.fair.day === state.day) { toast("Seu estande já está montado nesta feira.", "bad"); return; }
  if (!state.running) { toast("Inicie o turno para montar o estande.", "bad"); return; }
  if (state.money < booth.cost) { toast("Dinheiro insuficiente para esse estande.", "bad"); return; }
  spend(booth.cost, "investments");
  state.fair = { id: fairInfo.id, name: fairInfo.name, size, day: state.day, sold: 0, revenue: 0, hired: 0, candidates: Array.from({ length: booth.candidates }, makeCandidate) };
  state.reputation = clamp(state.reputation + booth.rep, 0, 100);
  for (let i = 0; i < booth.leads; i++) spawnOffer({ big: true });
  sfx.party(); toast(`🎪 Estande montado na ${fairInfo.name}! Vendas, ${booth.leads} pedido(s) grande(s) e ${booth.candidates} candidato(s).`, "good");
  addLog(`Estande (${booth.label.toLowerCase()}) montado na ${fairInfo.name}.`, "good");
  state.stats.fairs = (state.stats.fairs || 0) + 1;
  checkGoals(); render();
}
function hireCandidate(id) {
  const f = [state.fair, state.recruits].find(src => src && src.candidates.some(x => x.id === id)); if (!f) return;
  const fromFair = f === state.fair;
  const c = f.candidates.find(x => x.id === id); if (!c) return;
  const st = STAFF[c.role];
  if (state.staff[c.role] >= maxOf(c.role)) {
    if (!fromFair) { toast(`Sem vaga de ${STAFF[c.role].name.toLowerCase()}. Vagas extras só se abrem em feiras.`, "bad"); return; }
    if ((state.extraSlots[c.role] || 0) >= (EXTRA_SLOTS_MAX[c.role] || 0)) { toast(`Não dá para ter mais ${st.name.toLowerCase()}s.`, "bad"); return; }
    state.extraSlots[c.role] = (state.extraSlots[c.role] || 0) + 1;   // vaga extra aberta na feira
  }
  if (state.money < c.wage) { toast("Dinheiro insuficiente para contratar.", "bad"); return; }
  spend(c.wage, "investments");
  state.staff[c.role]++; f.hired = (f.hired || 0) + 1;
  f.candidates = f.candidates.filter(x => x !== c);
  sfx.success(); toast(`🤝 ${c.name} (${st.name.toLowerCase()}) foi contratado(a)${fromFair ? " na feira" : " pelo RH"}!`, "good");
  addLog(`Contratação na feira: ${c.name}, ${st.name.toLowerCase()}, ${c.trait}.`, "good");
  checkGoals(); render();
}

/* ---------- Administração: departamentos ---------- */
const BENEFITS_COST = 80;
const DEPTS = [
  { id: "marketing", icon: "📣", name: "Marketing", desc: "Campanhas para vender mais e ficar conhecido.", actions: [
    { id: "redes", label: "Campanha nas redes sociais", cost: 300, info: "+50% de clientes na loja por 2 dias e +2% de reputação.", run: s => { s.buffs.marketingUntil = s.clock + 1200; s.reputation += 2; } },
    { id: "tv", label: "Comercial na TV local", cost: 900, info: "+6% de reputação e 2 pedidos grandes chegam.", run: s => { s.reputation += 6; spawnOffer({ big: true }); spawnOffer({ big: true }); } }] },
  { id: "financeiro", icon: "💰", name: "Financeiro", desc: "Controla o caixa e negocia com fornecedores.", actions: [
    { id: "fornecedores", label: "Renegociar com fornecedores", cost: 200, info: "Matéria-prima 15% mais barata hoje.", once: "day", run: s => { for (const k of Object.keys(RESOURCES)) s.prices[k] *= .85; s.buffs.suppliersDay = s.day; } }] },
  { id: "pcp", icon: "🗂️", name: "PCP", desc: "Planejamento e Controle da Produção: sequência e prazos.", actions: [
    { id: "plano", label: "Otimizar o plano de produção", cost: 250, info: "Linha 10% mais rápida por 2 dias.", run: s => { s.buffs.pcpUntil = s.clock + 1200; } }] },
  { id: "rh", icon: "🧑‍🤝‍🧑", name: "RH", desc: "Recrutamento, seleção e treinamento.", actions: [
    { id: "seletivo", label: "Abrir processo seletivo", cost: 250, info: "3 candidatos para contratar hoje, sem esperar feira.", once: "day", run: s => { s.recruits = { day: s.day, hired: 0, candidates: Array.from({ length: 3 }, makeCandidate) }; } },
    { id: "treino", label: "Treinamento da equipe", cost: 300, info: "+8 de moral e máquinas desgastam 30% menos por 2 dias.", run: s => { s.morale += 8; s.buffs.safetyUntil = Math.max(s.buffs.safetyUntil, s.clock + 1200); } }] },
  { id: "dp", icon: "📑", name: "DP", desc: "Departamento Pessoal: folha de pagamento, ponto e benefícios.", actions: [
    { id: "beneficios", label: "Vale-refeição e benefícios", cost: 0, toggle: true, info: `R$ ${BENEFITS_COST}/dia · a moral cai só metade por dia.` }] }
];
function runDept(deptId, actId) {
  const d = DEPTS.find(x => x.id === deptId), a = d && d.actions.find(x => x.id === actId);
  if (!a) return;
  if (a.toggle) { state.benefits = !state.benefits; sfx.click(); addLog(`DP: benefícios ${state.benefits ? "ativados" : "cancelados"}.`, state.benefits ? "good" : ""); render(); return; }
  if (!state.running) { toast("Inicie o turno para acionar os departamentos.", "bad"); return; }
  if (a.once === "day" && ((a.id === "fornecedores" && state.buffs.suppliersDay === state.day) || (a.id === "seletivo" && state.recruits && state.recruits.day === state.day))) { toast("Isso já foi feito hoje.", "bad"); return; }
  if (state.money < a.cost) { toast("Dinheiro insuficiente.", "bad"); return; }
  spend(a.cost, "investments"); a.run(state);
  state.reputation = clamp(state.reputation, 0, 100); state.morale = clamp(state.morale, 0, 100);
  sfx.success(); toast(`${d.icon} ${d.name}: ${a.label}. ${a.info}`, "good"); addLog(`${d.name}: ${a.label}.`, "good");
  render();
}
function setCeoPhoto(file) {
  if (!file || !file.type.startsWith("image/")) { toast("Escolha um arquivo de imagem.", "bad"); return; }
  const reader = new FileReader();
  reader.onload = () => { const img = new Image(); img.onload = () => {
    const max = 360, k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k)); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    state.ceo.photo = c.toDataURL("image/jpeg", .88); save(); render(); sfx.success(); toast("🖼️ Foto colocada no quadro da sua sala!", "good"); };
    img.onerror = () => toast("Não consegui ler essa imagem.", "bad"); img.src = reader.result; };
  reader.readAsDataURL(file);
}

/* ---------- Sala de reunião: convocar e apresentar ---------- */
let meetSlides = [], meetVideo = null, meetStream = null;
function reportSlides() {
  const s = state, o = s.active[0], last = s.history.at(-1);
  return [
    { t: `Reunião — ${s.brand.name || "Fábrica de Lápis"}`, l: [`Dia ${s.day}`, `Presentes: diretoria e equipe`, `Apresentação: ${s.ceo.name || "CEO"}`] },
    { t: "Financeiro", l: [`Caixa: ${fmtMoney(s.money)}`, last ? `Ontem: receita ${fmtMoney(last.income)} · despesas ${fmtMoney(last.expenses)}` : "Primeiro dia de resultados", `Loja: ${fmtInt(s.shop.lastSold)} lápis vendidos ontem`] },
    { t: "Produção", l: [`${fmtInt(s.stats.produced)} lápis produzidos no total`, `Ritmo da linha: ${Math.round(lineRate() * 60)} lápis/h`, o ? `Pedido atual: ${fmtInt(o.done)}/${o.amount} ${PRODUCTS[o.product].name}` : "Nenhum pedido em produção agora"] },
    { t: "Pessoas", l: [`Moral da equipe: ${Math.round(s.morale)} (${moraleText(s.morale)})`, `Reputação: ${Math.round(s.reputation)}%`, `Equipe contratada: ${Object.values(s.staff).reduce((a, b) => a + b, 0)} pessoa(s)`] },
    { t: "Próximos passos", l: [`Metas concluídas: ${GOALS.filter(g => s.goals[g.id]).length} de ${GOALS.length}`, `Próxima feira: dia ${nextFairDay(s.day)}`, "Obrigado a todos!"] }
  ];
}
function startMeeting(source) {
  if (state.meeting) endMeeting(true);
  state.meeting = { source, slide: 0, day: state.day };
  if (state.lastMeetingDay !== state.day) { state.lastMeetingDay = state.day; state.morale = clamp(state.morale + 3, 0, 100); }
  sfx.notice(); addLog(`🤝 Reunião convocada na sala de reunião (${{ report: "resultados da fábrica", slides: "apresentação de imagens", screen: "tela compartilhada" }[source]}).`, "good");
  toast("🤝 Reunião convocada! O pessoal está indo para a sala.", "good");
  window.Factory3D?.setView("admin"); setTimeout(() => window.Factory3D?.focusMeeting?.(), 60);
  document.querySelector(".factory-view").scrollIntoView({ behavior: "smooth", block: "start" });
  render();
}
function endMeeting(silent) {
  if (meetStream) { meetStream.getTracks().forEach(t => t.stop()); meetStream = null; meetVideo = null; }
  if (!state.meeting) return;
  state.meeting = null;
  if (!silent) { addLog("Reunião encerrada. Todos voltaram para as suas salas."); sfx.click(); }
  render();
}
function meetSlideCount() { const m = state.meeting; return !m ? 0 : m.source === "slides" ? meetSlides.length : m.source === "report" ? reportSlides().length : 1; }
function meetStep(d) { const m = state.meeting; if (!m) return; const n = meetSlideCount(); m.slide = (m.slide + d + n) % Math.max(1, n); sfx.click(); render(); }
async function startScreenShare() {
  if (!navigator.mediaDevices?.getDisplayMedia || !window.isSecureContext) {
    toast("Este navegador não deixa compartilhar a tela aqui. Abra o jogo pelo INICIAR-JOGO.bat ou use “Apresentar imagens”.", "bad"); return;
  }
  try {
    meetStream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 12 }, audio: false });
    meetVideo = document.createElement("video"); meetVideo.muted = true; meetVideo.playsInline = true; meetVideo.srcObject = meetStream; await meetVideo.play();
    meetStream.getVideoTracks()[0].addEventListener("ended", () => { if (state.meeting?.source === "screen") endMeeting(); });
    startMeeting("screen");
  } catch (_) { toast("O compartilhamento de tela foi cancelado ou bloqueado pelo navegador.", "bad"); meetStream = null; }
}
function loadSlides(files) {
  const list = [...files].filter(f => f.type.startsWith("image/")).slice(0, 20);
  if (!list.length) { toast("Escolha imagens (PNG ou JPG). Dica: exporte seus slides como imagens.", "bad"); return; }
  meetSlides = [];
  let loaded = 0;
  list.forEach((f, i) => { const r = new FileReader(); r.onload = () => { const img = new Image(); img.onload = () => { meetSlides[i] = img; if (++loaded === list.length) { meetSlides = meetSlides.filter(Boolean); startMeeting("slides"); } }; img.src = r.result; }; r.readAsDataURL(f); });
}
function fitDraw(ctx, src, sw, sh, W, H) { const k = Math.min(W / sw, H / sh), w = sw * k, h = sh * k; ctx.drawImage(src, (W - w) / 2, (H - h) / 2, w, h); }
window.drawMeetingFrame = (ctx, W, H) => {
  const m = state.meeting; if (!m) return;
  ctx.fillStyle = "#0b1410"; ctx.fillRect(0, 0, W, H);
  if (state.blackout > 0) return;
  if (m.source === "screen") {
    if (meetVideo && meetVideo.videoWidth) fitDraw(ctx, meetVideo, meetVideo.videoWidth, meetVideo.videoHeight, W, H);
    else { ctx.fillStyle = "#cfe3d6"; ctx.font = "700 40px Segoe UI, Arial"; ctx.textAlign = "center"; ctx.fillText("Aguardando a tela…", W / 2, H / 2); ctx.textAlign = "left"; }
  } else if (m.source === "slides") {
    const img = meetSlides[m.slide]; if (img) fitDraw(ctx, img, img.width, img.height, W, H);
  } else {
    const sl = reportSlides()[m.slide] || reportSlides()[0];
    ctx.fillStyle = "#fffdf7"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#143c2b"; ctx.fillRect(0, 0, W, 110);
    ctx.fillStyle = "#fff"; ctx.font = "800 52px Segoe UI, Arial"; ctx.fillText(sl.t, 44, 74, W - 88);
    ctx.fillStyle = "#15251d"; ctx.font = "600 38px Segoe UI, Arial";
    sl.l.forEach((l, i) => { ctx.fillStyle = "#e88d32"; ctx.fillRect(48, 178 + i * 92, 16, 16); ctx.fillStyle = "#15251d"; ctx.fillText(l, 84, 196 + i * 92, W - 130); });
  }
  const n = meetSlideCount();
  if (n > 1) { ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(W - 150, H - 50, 136, 38); ctx.fillStyle = "#fff"; ctx.font = "700 22px Segoe UI, Arial"; ctx.textAlign = "center"; ctx.fillText(`${m.slide + 1} / ${n}`, W - 82, H - 23); ctx.textAlign = "left"; }
};
function renderMeetingBar() {
  const bar = $("meetingBar"), m = state.meeting;
  bar.hidden = !m;
  if (!m) return;
  const n = meetSlideCount();
  $("meetingInfo").textContent = `🤝 Reunião · ${{ report: "Resultados da fábrica", slides: "Suas imagens", screen: "Sua tela ao vivo" }[m.source]}${n > 1 ? ` · ${m.slide + 1}/${n}` : ""}`;
  $("meetPrev").hidden = $("meetNext").hidden = n <= 1;
}

/* ---------- Auditório: palestras ---------- */
function startTalk(id, opts = {}) {
  const t = TALKS.find(x => x.id === id);
  if (!t) return false;
  if (state.talk) { if (!opts.quiet) toast("Já tem uma palestra acontecendo no auditório.", "bad"); return false; }
  if (!state.running) { if (!opts.quiet) toast("Inicie o turno para ter plateia no auditório.", "bad"); return false; }
  if (!opts.prepaid) {
    if (state.money < t.cost) { toast("Dinheiro insuficiente para a palestra.", "bad"); return false; }
    spend(t.cost, "investments");
  }
  state.talk = { id, name: t.name, startedAt: state.clock, endsAt: state.clock + t.duration };
  sfx.notice(); toast(`🎤 Palestra “${t.name}” começou no auditório!`, "good");
  addLog(`Palestra no auditório: ${t.name} (${durationText(t.duration)}).`, "good");
  render(); return true;
}

/* ---------- Agenda: palestras e festas marcadas para um dia e uma hora ---------- */
const SCHEDULE_HOURS = [540, 600, 660, 840, 900, 960];   // 09:00 até 16:00, fora do almoço
function scheduleDays() { const days = []; for (let d = state.day; days.length < 10 && d < state.day + 30; d++) if (!isDayOff(d)) days.push(d); return days; }
function refund(cost) { state.money += cost; state.stats.spent = Math.max(0, state.stats.spent - cost); state.today.investments = Math.max(0, state.today.investments - cost); }
function scheduleEvent(type, data, day, minute, cost) {
  if (!(day >= state.day) || !SCHEDULE_HOURS.includes(minute)) return;
  if (day === state.day && minute <= state.minute) { toast("Esse horário já passou hoje. Escolha outro.", "bad"); return; }
  if (state.money < cost) { toast("Dinheiro insuficiente para agendar.", "bad"); return; }
  spend(cost, "investments");
  state.schedule.push({ id: state.nextId++, type, ...data, day, minute, cost });
  state.schedule.sort((a, b) => a.day - b.day || a.minute - b.minute);
  sfx.notice(); toast(`📅 ${type === "talk" ? "Palestra" : "Festa"} agendada: ${weekdayOf(day).toLowerCase()}, dia ${day}, às ${clockText(minute)}.`, "good");
  addLog(`Agendado: ${data.name} (${type === "talk" ? "palestra" : "festa"}) para ${weekdayOf(day).toLowerCase()}, dia ${day}, às ${clockText(minute)}.`);
  render();
}
function cancelScheduled(id) {
  const i = state.schedule.findIndex(x => x.id === id); if (i < 0) return;
  const [ev] = state.schedule.splice(i, 1); refund(ev.cost);
  sfx.off(); addLog(`Agendamento cancelado: ${ev.name} (valor devolvido).`); render();
}
function scheduleTick() {
  for (const ev of [...state.schedule]) {
    if (ev.day > state.day || (ev.day === state.day && state.minute < ev.minute)) continue;
    const ok = ev.type === "talk" ? startTalk(ev.talk, { prepaid: true, quiet: true }) : startParty(ev.name, ev.size, { prepaid: true, quiet: true });
    if (ok) state.schedule = state.schedule.filter(x => x !== ev);
    else if (ev.day < state.day || state.minute >= ev.minute + 120) { refund(ev.cost); state.schedule = state.schedule.filter(x => x !== ev); addLog(`${ev.name}: não deu para começar no horário marcado (valor devolvido).`, "bad"); }
  }
}
function finishTalk() {
  const t = TALKS.find(x => x.id === state.talk.id);
  state.talk = null;
  if (!t) return;
  t.run(state); state.stats.talks++;
  state.morale = clamp(state.morale, 0, 100); state.reputation = clamp(state.reputation, 0, 100);
  sfx.applause(); toast(`👏 Palestra concluída: ${t.name}. ${t.desc}`, "good");
  addLog(`Palestra concluída: ${t.name}. ${t.desc}`, "good");
  checkGoals(); render();
}

/* ---------- Clube da Fábrica: festas ---------- */
function startParty(name, sizeKey, opts = {}) {
  const size = PARTY_SIZES[sizeKey];
  if (!size) return false;
  if (state.party) { if (!opts.quiet) toast("Já tem uma festa rolando no clube!", "bad"); return false; }
  name = (name || "").trim().slice(0, 50) || PARTY_IDEAS[Math.floor(Math.random() * PARTY_IDEAS.length)];
  if (!opts.prepaid) {
    if (state.money < size.cost) { toast("Dinheiro insuficiente para essa festa.", "bad"); return false; }
    spend(size.cost, "investments");
  }
  const sameDay = state.partyHistory.filter(p => p.day === state.day).length;
  const gain = Math.round(size.morale * (sameDay ? .5 : 1));
  state.morale = clamp(state.morale + gain, 0, 100); state.reputation = clamp(state.reputation + size.rep, 0, 100);
  state.party = { name, size: sizeKey, endsAt: state.clock + size.duration, startedAt: state.clock };
  state.partyHistory.unshift({ name, size: sizeKey, day: state.day, gain }); state.partyHistory.length = Math.min(state.partyHistory.length, 8);
  state.stats.parties++;
  sfx.party(); window.Factory3D?.notify("party");
  toast(`🎉 “${name}” começou no Clube da Fábrica! +${gain} de moral${sameDay ? " (já teve festa hoje, rendeu metade)" : ""}`, "good");
  addLog(`Festa no Clube da Fábrica: ${name} (${size.label.toLowerCase()}). +${gain} de moral.`, "good");
  checkGoals(); render(); return true;
}
function endParty() {
  if (!state.party) return;
  addLog(`A festa “${state.party.name}” terminou. A equipe voltou animada!`);
  state.party = null; render();
}

/* ---------- Gerente geral (piloto automático) ---------- */
const MANAGER_RESERVE = 300;
const MANAGER_PREFS = [
  ["orders", "Escolher e aceitar pedidos"],
  ["buy", "Comprar matéria-prima"],
  ["machines", "Ligar máquinas, manutenção, consertos e gerador"],
  ["events", "Decidir acontecimentos e fechar o dia"],
  ["invest", "Investir em melhorias (sempre guarda R$ 1.500)"],
  ["people", "Cuidar da moral: palestras e festas (guarda R$ 1.500)"],
  ["sales", "Loja e feiras: montar estande pequeno e contratar vendedores"],
  ["silent", "Decidir sem abrir janelas (só um aviso no canto)"]
];
function mgrLog(text) { addLog(`👔 Gerente ${text}`, "mgr"); }
function managerBestOffer() {
  const rate = orderRate();
  const backlog = state.active.reduce((a, o) => a + (o.amount - o.done), 0) / rate;
  let best = null, bestScore = -Infinity;
  for (const o of state.offers) {
    const eta = backlog + o.amount / rate;
    if (eta > o.deadline * .9) continue;                         // não dá tempo: recusa
    const matCost = Object.keys(RESOURCES).reduce((a, r) => a + Math.max(0, useFactor(r, o.product) * o.amount - state.stock[r]) * state.prices[r], 0);
    if (matCost > state.money - 100) continue;                    // não tem caixa para o material
    const score = (o.reward - matCost) / (o.amount / rate);       // lucro por hora de linha
    if (score > bestScore) { bestScore = score; best = o; }
  }
  return best;
}
function managerBuy() {
  const c = cap();
  for (const r of Object.keys(RESOURCES)) {
    const need = state.active.reduce((a, o) => a + useFactor(r, o.product) * (o.amount - o.done), 0);
    const target = Math.min(c * .95, Math.max(need * 1.1, c * .2));
    if (state.stock[r] >= target) continue;
    const lot = RESOURCES[r].lot;
    let lots = Math.max(1, Math.min(4, Math.ceil((target - state.stock[r]) / lot)));
    while (lots > 1 && Math.ceil(lot * lots * state.prices[r]) > state.money - 100) lots--;
    const cost = Math.ceil(lot * lots * state.prices[r]);
    const urgent = state.stock[r] < need;
    if (cost > state.money - (urgent ? 0 : 150)) continue;
    mgrLog(`comprou ${RESOURCES[r].name.toLowerCase()}.`);
    buyResource(r, lots);
    return true;
  }
  return false;
}
function managerLoop(force = false) {
  if (window.GUEST_MODE) return;
  if (!state.staff.manager || state.ended) return;
  const P = state.managerPrefs;
  if (modalOpen) {
    if (!currentModal || !$("tutorialModal").hidden || (!force && Date.now() - currentModal.at < 2500)) return;
    if (currentModal.kind === "win") { currentModal.buttons[0]?.click(); return; }
    if (currentModal.kind === "day" && P.events) { mgrLog("fechou o dia."); currentModal.buttons[0]?.click(); return; }
    if (currentModal.kind === "event" && P.events) {
      let i = currentModal.pickIndex ? currentModal.pickIndex() : 0;
      if (currentModal.buttons[i]?.disabled) i = currentModal.buttons.findIndex(b => !b.disabled);
      const b = currentModal.buttons[i];
      if (b) { mgrLog(`decidiu: “${currentModal.choices[i].label}” (${currentModal.title}).`); b.click(); }
    }
    return;
  }
  if (state.night) return;
  if (!state.running) { mgrLog("abriu o turno."); startShift(); return; }
  if (state.paused) return;
  if (P.machines) {
    if (state.blackout > 0) { if (state.money >= GENERATOR_COST + MANAGER_RESERVE) { mgrLog("ligou o gerador."); useGenerator(); } return; }
    for (const x of STATIONS) {
      const s = state.stations[x.id];
      if (s.broken && !s.repair && !state.staff.tech && state.money >= REPAIR_COST) { mgrLog(`chamou o conserto da ${x.name}.`); repairStation(x.id); return; }
      if (!s.broken && s.wear >= 60 && state.money >= MAINT_COST + 50) { mgrLog(`mandou fazer manutenção na ${x.name}.`); maintainStation(x.id); return; }
    }
  }
  if (P.orders && state.active.length < maxActive() && state.offers.length) {
    const o = managerBestOffer();
    if (o) { mgrLog(`aceitou ${o.amount} × ${PRODUCTS[o.product].name} para ${o.client} (${fmtMoney(o.reward)}).`); acceptOffer(o.id); return; }
  }
  if (P.buy && managerBuy()) return;
  if (P.sales) {
    if (fairOfDay(state.day) && !(state.fair && state.fair.day === state.day) && state.money >= BOOTHS.pequeno.cost + 1500) { mgrLog("montou um estande pequeno na feira."); startBooth("pequeno"); return; }
    if (state.fair && state.fair.candidates.length && state.staff.seller < maxOf("seller")) { const c = state.fair.candidates.find(x => x.role === "seller"); if (c && state.money >= c.wage + 1500) { mgrLog(`contratou ${c.name} como vendedor(a) na feira.`); hireCandidate(c.id); return; } }
  }
  if (P.people) {
    if (!state.party && state.morale < 50 && state.money >= PARTY_SIZES.pequena.cost + 1500) { mgrLog("organizou um happy hour no Clube da Fábrica."); startParty("Happy hour do gerente", "pequena"); return; }
    if (!state.talk && state.clock >= state.buffs.safetyUntil && state.money >= 2000 && avgWear() > 35) { mgrLog("agendou uma palestra de segurança."); startTalk("seguranca"); return; }
  }
  if (P.machines && !state.blackout) {
    const bo = state.boiler;
    if (bo.broken && !bo.repair && state.money >= BOILER_REPAIR + MANAGER_RESERVE) { mgrLog("chamou o conserto da caldeira."); repairBoiler(); return; }
    if (!bo.broken && bo.wear >= 60 && state.money >= BOILER_MAINT + 50) { mgrLog("fez manutenção na caldeira."); maintainBoiler(); return; }
    const shopBusy = state.shop.produce && state.shop.stock < SHOP_CAP[state.shop.level] * .95;
    if ((state.active.length || shopBusy) && !bo.on && !bo.broken && !bo.repair && state.stock.wood > 30) { bo.fire = 3; mgrLog("acendeu a caldeira."); toggleBoiler(); return; }
    if (!state.active.length && !shopBusy && bo.on) { mgrLog("apagou a caldeira enquanto não há pedido."); toggleBoiler(); return; }
    if (bo.on) {
      const want = bo.pressure < 30 ? 3 : bo.pressure > 92 ? 1 : bo.pressure > 80 ? 2 : bo.fire;
      if (want !== bo.fire) { setFire(want - bo.fire); mgrLog(`ajustou o fogo da caldeira para ${want}.`); return; }
    }
    const idle = STATIONS.some(x => !state.stations[x.id].on && !state.stations[x.id].broken);
    if ((state.active.length || shopBusy) && idle) { mgrLog(state.active.length ? "ligou as máquinas." : "ligou as máquinas para abastecer a loja."); allOn(); return; }
    if (!state.active.length && !shopBusy && STATIONS.some(x => state.stations[x.id].on)) {
      STATIONS.forEach(x => state.stations[x.id].on = false);
      mgrLog("desligou as máquinas enquanto não há pedido (economia de energia)."); render(); return;
    }
  }
  if (P.invest) {
    const low = STATIONS.slice().sort((a, b) => state.stations[a.id].level - state.stations[b.id].level)[0].id;
    const target = bottleneckId() || low, st = state.stations[target];
    if (st.level < MAX_LEVEL && state.money >= UPGRADE_COST[st.level + 1] + 1500) { mgrLog(`investiu na melhoria da ${stationName(target)}.`); upgradeStation(target); return; }
    if (!state.staff.tech && state.money >= 1500 + STAFF.tech.wage) { mgrLog("contratou um técnico de manutenção."); hire("tech"); return; }
  }
}

/* ---------- Gerente trabalhando com a página fechada ---------- */
const OFFLINE_MAX = 12 * 3600;          // conta no máximo 12 horas longe do CEO
const AWAY_EFFICIENCY = 0.5;            // longe do CEO, o gerente rende metade
function snapshot() {
  return { money: state.money, done: state.stats.ordersDone, failed: state.stats.ordersFailed, produced: state.stats.produced,
    rep: state.reputation, day: state.day, maint: state.stats.maintenances, repairs: state.stats.repairs, level: STATIONS.map(x => state.stations[x.id].level).join("") };
}
function resolveModalOffline() {
  const m = currentModal;
  if (!m || !["event", "day", "win"].includes(m.kind)) return;
  let i = m.kind === "event" && m.pickIndex ? m.pickIndex() : 0;
  if (m.buttons[i]?.disabled) i = m.buttons.findIndex(b => !b.disabled);
  if (i < 0) return;
  if (m.kind === "event") mgrLog(`decidiu: “${m.choices[i].label}” (${m.title}).`);
  if (m.kind === "day") mgrLog("fechou o dia.");
  m.buttons[i].click();
}
function simulateAway(seconds) {
  const steps = Math.min(Math.floor(seconds), OFFLINE_MAX);
  let i = 0;
  simulating = true;
  try {
    for (; i < steps; i++) {
      if (state.ended || !state.staff.manager) break;
      if (modalOpen) { resolveModalOffline(); if (modalOpen) break; }
      if (state.night) {
        clearInterval(nightTimer); nightTimer = null;
        state.minute += MIN_PER_TICK * state.speed;
        if (state.minute >= 1440 + DAY_START) finishNight();
        continue;
      }
      managerLoop(true);
      state.paused = false;
      tick();
    }
  } finally { simulating = false; }
  if (state.night && !nightTimer && !modalOpen) startNight();   // continua a noite animada na tela
  return i;
}
function awayText(sec) {
  sec = Math.round(sec);
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60);
  return h ? `${h} h${m ? ` ${m} min` : ""}` : m ? `${m} min` : `${sec} s`;
}
function showAwayReport(before, seconds, worked) {
  const a = snapshot(), won = state.wonWhileAway, dMoney = a.money - before.money, dRep = Math.round(a.rep - before.rep);
  const row = (label, value, cls = "") => `<tr class="${cls}"><td>${label}</td><td>${value}</td></tr>`;
  const upgrades = [...a.level].reduce((n, v, i) => n + (Number(v) - Number(before.level[i])), 0);
  openModal({
    eyebrow: "ENQUANTO VOCÊ ESTAVA FORA", kind: "info",
    title: state.ended ? "A fábrica entrou em crise 😟" : "O gerente cuidou de tudo 👔",
    html: `<p>Você ficou fora por <strong>${awayText(seconds)}</strong>${seconds > OFFLINE_MAX ? " (contam no máximo 12 h)" : ""}.
      Sem o CEO por perto, o gerente rende <strong>metade</strong>: a fábrica andou o mesmo que <strong>${awayText(worked)}</strong> jogando com você.
      Na fábrica passaram <strong>${a.day - before.day} dia(s)</strong>.</p>
      <table class="summary">
        ${row("Pedidos entregues", a.done - before.done)}
        ${row("Pedidos perdidos", a.failed - before.failed)}
        ${row("Lápis produzidos", fmtInt(a.produced - before.produced))}
        ${row("Manutenções e consertos", (a.maint - before.maint) + (a.repairs - before.repairs))}
        ${upgrades ? row("Melhorias feitas", upgrades) : ""}
        ${state.wonWhileAway ? row("🏆 Conquista", "Fábrica modelo! (vitória)", "pos") : ""}
        ${row("Reputação", `${dRep >= 0 ? "+" : ""}${dRep}%`)}
        ${row("Resultado no caixa", (dMoney >= 0 ? "+" : "−") + fmtMoney(Math.abs(dMoney)), dMoney >= 0 ? "total pos" : "total neg")}
      </table>
      ${won ? "<p><strong>🏆 O gerente levou a fábrica à vitória!</strong> Você pode continuar jogando para bater seus recordes.</p>" : ""}<p class="muted-text">Tudo o que ele fez está no Diário da fábrica (👔).</p>`,
    choices: [{ label: "Continuar", primary: true, onPick: () => {} }]
  });
  state.wonWhileAway = false;
}
function catchUp(seconds, showReport) {
  if (window.GUEST_MODE) return;
  if (!state.staff.manager || state.ended || seconds < 3) return;
  const before = snapshot();
  const counted = Math.min(seconds, OFFLINE_MAX);
  const worked = simulateAway(counted * AWAY_EFFICIENCY);
  save(); render(); renderLog();
  if ((showReport && worked > 30) || state.wonWhileAway) showAwayReport(before, seconds, worked);
  else if (worked > 10) toast(`👔 O gerente adiantou ${awayText(worked)} de fábrica enquanto a aba estava escondida (rende metade longe de você).`, "good");
}

/* ---------- Noite ---------- */
let nightTimer = null;
function startNight() {
  state.night = true;
  addLog("A fábrica fechou. Boa noite! 🌙");
  clearInterval(nightTimer);
  if (simulating) { render(); return; }
  nightTimer = setInterval(() => {
    state.minute += 7;
    if (state.minute >= 1440 + DAY_START) finishNight(); else render();
  }, 100);
  render();
}
function finishNight() {
  clearInterval(nightTimer); nightTimer = null;
  state.night = false; state.dayOff = false; state.day++; state.minute = DAY_START;
  if (isDayOff(state.day)) {
    // dia de folga: a fábrica fica fechada e o relógio corre até o dia seguinte
    state.dayOff = true; state.night = true;
    addLog(`${weekdayOf()}, dia ${state.day}: folga. A fábrica reabre no próximo dia útil. 🛌`);
    if (!simulating) nightTimer = setInterval(() => { state.minute += 9; if (state.minute >= 1440 + DAY_START) finishNight(); else render(); }, 100);
    save(); render(); return;
  }
  addLog(`Bom dia! Começou ${weekdayOf().toLowerCase()}, dia ${state.day}. ☀️`);
  sfx.notice(); save(); render();
}

function repairStation(id) {
  const s = state.stations[id];
  if (!s.broken || s.repair > 0) return;
  if (state.money < REPAIR_COST) { toast("Dinheiro insuficiente para o conserto.", "bad"); return; }
  spend(REPAIR_COST, "maintenance");
  s.repair = REPAIR_TIME * (hasFac("treinamento") ? .7 : 1); s.byTech = false;
  sfx.click(); addLog(`Conserto da ${stationName(id)} iniciado (${REPAIR_TIME} min).`);
  render();
}
function maintainStation(id) {
  const s = state.stations[id];
  if (s.broken || s.wear < 5) return;
  if (state.money < MAINT_COST) { toast("Dinheiro insuficiente.", "bad"); return; }
  spend(MAINT_COST, "maintenance");
  s.wear = 0; state.stats.maintenances++;
  sfx.repair(); addLog(`Manutenção preventiva na ${stationName(id)}.`, "good");
  checkGoals(); render();
}
function upgradeStation(id) {
  const s = state.stations[id];
  if (s.level >= MAX_LEVEL) return;
  const cost = UPGRADE_COST[s.level + 1];
  if (state.money < cost) { toast("Dinheiro insuficiente para a melhoria.", "bad"); return; }
  spend(cost, "investments");
  s.level++; s.wear = 0;
  sfx.success(); toast(`${stationName(id)} agora é nível ${s.level}!`, "good");
  addLog(`${stationName(id)} melhorada para o nível ${s.level}.`, "good");
  window.Factory3D?.notify("upgrade", id);
  checkGoals(); render();
}
function buyResource(res, lots = 1) {
  const r = RESOURCES[res];
  const room = cap() - state.stock[res];
  const qty = Math.min(r.lot * lots, Math.floor(room));
  if (qty <= 0) { toast("Armazém cheio para esse material.", "bad"); return; }
  const cost = Math.ceil(qty * state.prices[res]);
  if (state.money < cost) { toast("Dinheiro insuficiente.", "bad"); return; }
  spend(cost, "materials");
  state.stock[res] += qty;
  sfx.coin(); addLog(`Compra: ${qty} ${r.unit} de ${r.name.toLowerCase()} por ${fmtMoney(cost)}.`);
  render();
}
function upgradeWarehouse() {
  if (state.warehouse >= WAREHOUSE_CAP.length - 1) return;
  const cost = WAREHOUSE_COST[state.warehouse + 1];
  if (state.money < cost) { toast("Dinheiro insuficiente.", "bad"); return; }
  spend(cost, "investments");
  state.warehouse++;
  sfx.success(); addLog(`Armazém ampliado para ${cap()} unidades por material.`, "good");
  render();
}
function hire(role) {
  const st = STAFF[role];
  if (state.staff[role] >= maxOf(role)) return;
  const fee = st.wage;                          // taxa de contratação = um dia de salário
  if (state.money < fee) { toast("Dinheiro insuficiente para contratar.", "bad"); return; }
  spend(fee, "investments");
  state.staff[role]++;
  sfx.success(); addLog(`${st.name} contratado.`, "good");
  checkGoals(); render();
}
function fire(role) {
  if (state.staff[role] <= 0) return;
  state.staff[role]--;
  sfx.off(); addLog(`${STAFF[role].name} dispensado.`);
  render();
}
function acceptOffer(id) {
  if (!state.running) { toast("Inicie o turno para aceitar pedidos."); return; }
  if (state.active.length >= maxActive()) { toast(`Você já tem ${maxActive()} pedidos em produção.`, "bad"); return; }
  const i = state.offers.findIndex(o => o.id === id);
  if (i < 0) return;
  const o = state.offers.splice(i, 1)[0];
  o.done = 0; o.deadlineAt = state.clock + o.deadline;
  state.active.push(o);
  sfx.notice(); addLog(`Pedido aceito: ${o.amount} × ${PRODUCTS[o.product].name} para ${o.client}.`);
  if (!lineReady()) toast("Ligue todas as máquinas para começar a produzir.");
  render();
}
function declineOffer(id) {
  state.offers = state.offers.filter(o => o.id !== id);
  sfx.off(); render();
}
function prioritize(id) {
  const i = state.active.findIndex(o => o.id === id);
  if (i > 0) { const [o] = state.active.splice(i, 1); state.active.unshift(o); sfx.click(); render(); }
}

/* ============================================================
   PEDIDOS
   ============================================================ */
function spawnOffer({ big = false } = {}) {
  const productKey = pickProduct();
  const p = PRODUCTS[productKey];
  const growth = 1 + (state.day - 1) * 0.12;
  let amount = Math.round(rand(80, 200) * growth * (big ? 2 : 1) / 10) * 10;
  const urgent = !big && Math.random() < .22;
  const factor = urgent ? 1.2 : big ? 1.7 : rand(1.6, 2.1);
  const deadline = Math.round((amount / BASE_RATE * factor + 60) / 10) * 10;
  const repMul = 0.75 + state.reputation / 100 * 0.5;
  const reward = Math.round(amount * p.price * repMul * (urgent ? 1.45 : 1) * (big ? 1.3 : 1) * offerMult(productKey) * (hasFac("qualidade") ? 1.08 : 1) * (productKey === "b2" && hasFac("mina") ? 1.15 : 1) / 10) * 10;
  state.offers.push({
    id: state.nextId++, product: productKey, client: pick(CLIENTS), amount, reward, deadline, urgent, big,
    expiresAt: state.clock + (big ? 240 : 180)
  });
  if (state.offers.length > MAX_OFFERS + 1) state.offers.shift();
  sfx.notice();
  toast(big ? "Uma oferta grande chegou da feira!" : urgent ? "Nova oferta URGENTE no quadro!" : "Nova oferta no quadro.", big || urgent ? "warn" : "");
}
function completeOrder(o) {
  const p = PRODUCTS[o.product];
  if (p.custom) p.custom.sold = (p.custom.sold || 0) + o.amount;
  const early = (o.deadlineAt - state.clock) / o.deadline > 0.4;
  earn(o.reward);
  const rep = 3 + (p.rep || 0) + (early ? 1 : 0) + (hasFac("qualidade") ? 1 : 0);
  state.reputation += rep;
  state.stats.ordersDone++; state.today.orders++; state.morale = Math.min(100, state.morale + 1);
  state.active = state.active.filter(x => x !== o);
  sfx.success();
  toast(`Pedido entregue! +${fmtMoney(o.reward)}`, "good");
  addLog(`Pedido de ${o.client} entregue: +${fmtMoney(o.reward)}${early ? " (adiantado, +1% extra de reputação)" : ""}.`, "good");
  window.Factory3D?.notify("complete");
  checkGoals();
}
function expireOrder(o) {
  const ratio = o.done / o.amount;
  state.active = state.active.filter(x => x !== o);
  state.stats.ordersFailed++; state.today.failed++; state.morale = Math.max(0, state.morale - 3);
  if (ratio >= .6) {
    const pay = Math.round(o.reward * ratio * .6 / 10) * 10;
    earn(pay); state.reputation -= 4;
    addLog(`Prazo de ${o.client} venceu. Entrega parcial (${Math.round(ratio * 100)}%): +${fmtMoney(pay)} e −4% de reputação.`, "bad");
    toast("Entrega parcial: o cliente pagou menos.", "warn");
  } else {
    const fine = Math.round(o.reward * .15 / 10) * 10;
    spend(fine); state.reputation -= 9;
    addLog(`Prazo de ${o.client} venceu. Multa de ${fmtMoney(fine)} e −9% de reputação.`, "bad");
    toast("Pedido perdido! Multa e reputação em queda.", "bad");
  }
  sfx.fail();
}

/* ============================================================
   ACONTECIMENTOS E FIM DE DIA
   ============================================================ */
let currentModal = null;
function openModal({ eyebrow = "ACONTECIMENTO", title, html, choices, kind = "info", pickIndex = null }) {
  if (window.GUEST_MODE) return;
  modalOpen = true;
  currentModal = { kind, title, choices, buttons: [], pickIndex, at: Date.now() };
  $("eventEyebrow").textContent = eyebrow;
  $("eventTitle").textContent = title;
  $("eventText").innerHTML = html;
  $("eventChoices").innerHTML = "";
  choices.forEach(c => {
    const b = document.createElement("button");
    b.innerHTML = `${escapeHtml(c.label)}${c.hint ? `<small>${escapeHtml(c.hint)}</small>` : ""}`;
    if (c.primary) b.classList.add("primary");
    if (c.cost && state.money < c.cost) { b.disabled = true; b.innerHTML += `<small class="need">Falta dinheiro (${fmtMoney(c.cost)})</small>`; }
    b.onclick = () => { $("eventModal").hidden = true; modalOpen = false; currentModal = null; c.onPick(); render(); };
    currentModal.buttons.push(b);
    $("eventChoices").append(b);
  });
  $("eventModal").hidden = false;
  $("eventChoices").querySelector("button:not(:disabled)")?.focus();
}
function managerSilent() { return state.staff.manager > 0 && state.managerPrefs.events && state.managerPrefs.silent !== false; }
function showEvent() {
  const pool = EVENTS.filter(e => !e.when || e.when(state));
  const ev = pick(pool);
  if (managerSilent()) {
    // o gerente resolve sem abrir janela: escolhe, aplica e só avisa no canto
    let i = ev.managerPick ? ev.managerPick(state) : (!ev.choices[0].cost || ev.choices[0].cost <= state.money - MANAGER_RESERVE ? 0 : ev.choices.length - 1);
    if (ev.choices[i].cost && ev.choices[i].cost > state.money) i = ev.choices.findIndex(c => !c.cost || c.cost <= state.money);
    const c = ev.choices[Math.max(0, i)];
    if (c.cost) spend(c.cost, "investments");
    c.run(state);
    mgrLog(`resolveu “${ev.title}”: ${c.label}.`);
    toast(`👔 ${ev.title}: o gerente escolheu “${c.label}”.`);
    checkGoals();
    return;
  }
  sfx.notice();
  openModal({
    title: ev.title, html: `<p>${escapeHtml(ev.text)}</p>`, kind: "event",
    pickIndex: () => {
      if (ev.managerPick) return ev.managerPick(state);
      const first = ev.choices[0];
      return !first.cost || first.cost <= state.money - MANAGER_RESERVE ? 0 : ev.choices.length - 1;
    },
    choices: ev.choices.map(c => ({
      ...c, onPick: () => {
        if (c.cost) spend(c.cost, "investments");
        c.run(state);
        addLog(`Decisão (${ev.title}): ${c.label}.`);
        checkGoals();
      }
    }))
  });
}
function museumUnlocked(s = state) { const done = GOALS.filter(g => s.goals[g.id]).length; return MUSEUM_EXHIBITS.filter(e => e.goals <= done).length; }
function endOfDay() {
  coresDay(); facilitiesDay();
  const d = state.today;
  const visitors = Math.round((15 + state.reputation * .9) * (.6 + .1 * museumUnlocked()) * (state.party ? 1.1 : 1));
  const tickets = visitors * TICKET_PRICE;
  earn(tickets);
  Object.assign(state.museum, { lastVisitors: visitors, lastRevenue: tickets, totalVisitors: state.museum.totalVisitors + visitors });
  // cantina da praça: lanches para a equipe e para quem visita o museu
  const snacks = Math.round((headcount() * 2.5 + visitors * .4) * (state.morale >= 65 ? 1.1 : 1) * (state.party ? 1.15 : 1)), snackRev = snacks * 6;
  earn(snackRev);
  Object.assign(state.cantina, { lastSold: snacks, lastRevenue: snackRev, totalSold: (state.cantina.totalSold || 0) + snacks });
  const shopSold = state.shop.soldToday, shopRevenue = state.shop.revenueToday;
  Object.assign(state.shop, { lastSold: shopSold, lastRevenue: shopRevenue, soldToday: 0, revenueToday: 0 });
  const fairDone = state.fair && state.fair.day === state.day ? state.fair : null;
  if (fairDone) { addLog(`Fim da ${fairDone.name}: ${fmtInt(fairDone.sold)} lápis vendidos no estande (${fmtMoney(fairDone.revenue)}).`, "good"); state.fair = null; }
  const wages = Object.entries(state.staff).reduce((a, [k, n]) => a + STAFF[k].wage * n, 0);
  spend(FIXED_DAILY + wages + (state.benefits ? BENEFITS_COST : 0));
  if (weekdayIndex() >= 5) { state.morale = Math.max(0, state.morale - 3); addLog(`Trabalho de ${weekdayOf().toLowerCase()}: a equipe ficou mais cansada (−3 de moral).`); }
  state.morale = Math.max(0, state.morale - (state.benefits ? 2 : 4));
  state.recruits = null;
  if (state.morale < 25 && state.staff.operator > 0) {
    state.staff.operator--; toast("😞 Um operador pediu demissão: a moral da equipe está muito baixa.", "bad");
    addLog("Um operador pediu demissão por causa da moral baixa. Faça uma festa ou palestra!", "bad");
  }
  const expenses = d.materials + d.energy + d.maintenance + d.investments + FIXED_DAILY + wages;
  const profit = d.income - expenses;
  const repDelta = Math.round(state.reputation - (d.repStart ?? state.reputation));
  state.history.push({ day: state.day, income: d.income, expenses, profit, produced: d.produced });
  if (state.history.length > 14) state.history.shift();
  state.stats.bestDay = Math.max(state.stats.bestDay, d.produced);

  // Novo dia: preços variam e a reputação se acomoda
  const oldPrices = { ...state.prices };
  for (const k of Object.keys(RESOURCES)) {
    const base = RESOURCES[k].base;
    state.prices[k] = clamp(state.prices[k] * rand(.84, 1.18), base * .7, base * 1.45);
  }
  if (viveiroReady()) state.prices.wood = Math.max(RESOURCES.wood.base * .6, state.prices.wood * .85);
  const finishedDay = state.day;
  if (state.blackout > 0) endBlackout();
  state.minute = DAY_END; state.night = true;
  state.today = freshDay(); state.today.repStart = state.reputation;

  const row = (label, value, cls = "") => `<tr class="${cls}"><td>${label}</td><td>${value}</td></tr>`;
  const priceRow = k => {
    const diff = (state.prices[k] - oldPrices[k]) / oldPrices[k] * 100;
    return `<span class="price-change ${diff > 0 ? "up" : "down"}">${RESOURCES[k].icon} ${diff > 0 ? "▲" : "▼"} ${Math.abs(diff).toFixed(0)}%</span>`;
  };
  if (managerSilent()) {
    // sem janela: o resumo fica no Relatório e no Diário, e a noite começa sozinha
    mgrLog(`fechou o dia ${finishedDay}: ${profit >= 0 ? "lucro" : "prejuízo"} de ${fmtMoney(Math.abs(profit))}, ${fmtInt(d.produced)} lápis.`);
    toast(`📊 Fim do dia ${finishedDay}: ${profit >= 0 ? "+" : "−"}${fmtMoney(Math.abs(profit))} · ${fmtInt(d.produced)} lápis (detalhes no Relatório)`, profit >= 0 ? "good" : "warn");
    startNight();
    return;
  }
  sfx.notice();
  openModal({
    eyebrow: `FIM DO DIA ${finishedDay}`, kind: "day",
    title: profit >= 0 ? "Dia no azul! 📈" : "Dia no vermelho 📉",
    html: `<table class="summary">
      ${row("Lápis produzidos", fmtInt(d.produced))}
      ${row("Pedidos entregues", d.orders + (d.failed ? ` <span class="bad-text">(${d.failed} perdido${d.failed > 1 ? "s" : ""})</span>` : ""))}
      ${row("Receita", fmtMoney(d.income), "pos")}
      ${row(`  · Loja da Fábrica (${fmtInt(shopSold)} lápis)`, fmtMoney(shopRevenue))}
      ${row(`  · ingressos do museu (${visitors} visitantes)`, fmtMoney(tickets))}
      ${row(`  · cantina (${snacks} lanches)`, fmtMoney(snackRev))}
      ${row("Matéria-prima", "−" + fmtMoney(d.materials))}
      ${row("Energia", "−" + fmtMoney(d.energy))}
      ${row("Manutenção", "−" + fmtMoney(d.maintenance))}
      ${row("Investimentos e eventos", "−" + fmtMoney(d.investments))}
      ${row("Salários", "−" + fmtMoney(wages))}
      ${row("Aluguel e custos fixos", "−" + fmtMoney(FIXED_DAILY))}
      ${row("Resultado do dia", (profit >= 0 ? "+" : "−") + fmtMoney(Math.abs(profit)), profit >= 0 ? "total pos" : "total neg")}
      ${row("Reputação", `${repDelta >= 0 ? "+" : ""}${repDelta}%`)}
      ${row("Moral da equipe", `${Math.round(state.morale)} · ${moraleText(state.morale)}`)}
    </table>
    <p class="prices-line">Preços de amanhã: ${Object.keys(RESOURCES).map(priceRow).join(" ")}</p>`,
    choices: [{ label: "Passar a noite 🌙", hint: "Veja a fábrica anoitecer. Dá para pular a noite a qualquer momento.", primary: true, onPick: startNight }]
  });
}
function checkGoals() {
  const unlocked = museumUnlocked();
  if (unlocked > state.museum.unlocked) {
    const ex = MUSEUM_EXHIBITS[unlocked - 1];
    state.museum.unlocked = unlocked;
    toast(`🏛️ Nova peça no Museu do Lápis: ${ex.title}!`, "good");
    addLog(`O Museu do Lápis recebeu uma peça nova: “${ex.title}” (${ex.year}).`, "good");
  }
  for (const g of GOALS) {
    if (state.goals[g.id] || !g.check(state)) continue;
    state.goals[g.id] = true;
    if (g.reward) earn(g.reward);
    sfx.success();
    toast(`🏆 Meta: ${g.text}${g.reward ? ` (+${fmtMoney(g.reward)})` : ""}`, "good");
    addLog(`Meta concluída: ${g.text}.`, "good");
    if (g.id === "rich" && !state.won) {
      state.won = true;
      if (simulating) { state.wonWhileAway = true; continue; }
      setTimeout(() => openModal({
        eyebrow: "VITÓRIA", kind: "win", title: "Fábrica modelo! 🏭✨",
        html: `<p>Você transformou uma oficina pequena num complexo industrial lucrativo em <strong>${state.day} dias</strong>.</p>${statsHtml()}<p>Pode continuar jogando para bater seus próprios recordes.</p>`,
        choices: [{ label: "Continuar jogando", primary: true, onPick: () => {} }, { label: "Começar um novo jogo", onPick: newGame }]
      }), 400);
    }
  }
}
function statsHtml() {
  const s = state.stats;
  return `<table class="summary">
    <tr><td>Lápis produzidos</td><td>${fmtInt(s.produced)}</td></tr>
    <tr><td>Pedidos entregues</td><td>${s.ordersDone}</td></tr>
    <tr><td>Pedidos perdidos</td><td>${s.ordersFailed}</td></tr>
    <tr><td>Faturamento total</td><td>${fmtMoney(s.earned)}</td></tr>
    <tr><td>Melhor dia</td><td>${fmtInt(s.bestDay)} lápis</td></tr>
  </table>`;
}
function checkGameOver() {
  if (state.ended) return;
  const broke = state.money < BANKRUPT_AT, noRep = state.reputation <= 0;
  if (!broke && !noRep) return;
  state.ended = true; state.running = false;
  sfx.fail();
  openModal({
    eyebrow: "FIM DE JOGO", kind: "end",
    title: broke ? "A fábrica faliu 💸" : "Os clientes sumiram 😞",
    html: `<p>${broke ? `O caixa passou de ${fmtMoney(BANKRUPT_AT)} e o banco fechou a conta.` : "A reputação chegou a zero e ninguém mais faz pedidos."} Você resistiu <strong>${state.day} dia(s)</strong>.</p>${statsHtml()}
      <p class="muted-text">Dica: aceite pedidos que a linha consegue cumprir no prazo e faça manutenção antes de a máquina quebrar.</p>`,
    choices: [{ label: "Tentar de novo", primary: true, onPick: newGame }]
  });
  save();
}

/* ============================================================
   CICLO DO JOGO
   ============================================================ */
function tick() {
  if (window.GUEST_MODE) return;
  if (!state.running || state.paused || modalOpen || state.ended || state.night) return;
  const dm = MIN_PER_TICK * state.speed;
  state.clock += dm; state.minute += dm;
  const lunchNow = isLunch();
  if (lunchNow !== !!state.lunchOn) { state.lunchOn = lunchNow; if (lunchNow) startLunch(); else endLunch(); }
  if (state.blackout > 0) { state.blackout -= dm; if (state.blackout <= 0) { state.blackout = 1; endBlackout(); } }
  else if (Math.random() < .0018 * (hasFac("subestacao") ? .4 : 1) * (dm / MIN_PER_TICK)) startBlackout(rand(40, 80));
  if (state.today.repStart == null) state.today.repStart = state.reputation;

  // Energia das máquinas ligadas
  coresTick(dm);
  const onCount = STATIONS.filter(x => state.stations[x.id].on).length;
  if (onCount) spend(onCount * ENERGY_PER_MIN * dm * (hasFac("subestacao") ? .75 : 1), "energy");

  // Ofertas chegam e expiram
  state.offers = state.offers.filter(o => {
    if (o.expiresAt > state.clock) return true;
    addLog(`A oferta de ${o.client} expirou.`);
    return false;
  });
  if (state.clock >= state.nextOfferAt && state.offers.length < MAX_OFFERS) {
    spawnOffer();
    state.nextOfferAt = state.clock + rand(50, 100) / (hasFac("portaria") ? 1.15 : 1);
  }

  // Produção: parte vai para o pedido, parte para as prateleiras da loja
  const order = state.active[0];
  let produced = 0;
  const shopRoom = state.shop.produce ? Math.max(0, SHOP_CAP[state.shop.level] - state.shop.stock) : 0;
  if (lineReady() && !state.lunchOn && (order || shopRoom > 0)) {
    const capUnits = lineRate() * dm;
    let shopUnits = Math.min(capUnits * (order ? state.shop.share : 1), shopRoom);
    for (const r of Object.keys(RESOURCES)) shopUnits = Math.min(shopUnits, state.stock[r] / useFactor(r, "hb"));
    shopUnits = Math.max(0, shopUnits);
    for (const r of Object.keys(RESOURCES)) state.stock[r] = Math.max(0, state.stock[r] - shopUnits * useFactor(r, "hb"));
    state.shop.stock += shopUnits;
    let orderUnits = 0;
    if (order) {
      const want = capUnits - shopUnits;
      let units = want;
      for (const r of Object.keys(RESOURCES)) units = Math.min(units, state.stock[r] / useFactor(r, order.product));
      units = Math.max(0, Math.min(units, order.amount - order.done));
      if (units < want * .999 && units < order.amount - order.done) {
        if (!state.lackWarned) {
          const missing = Object.keys(RESOURCES).filter(r => state.stock[r] < useFactor(r, order.product) * want).map(r => RESOURCES[r].name.toLowerCase());
          addLog(`Falta matéria-prima: ${missing.join(", ")}. Compre no Mercado.`, "bad");
          toast(`Falta ${missing.join(" e ")}!`, "bad"); sfx.alarm();
          state.lackWarned = true;
        }
      } else state.lackWarned = false;
      for (const r of Object.keys(RESOURCES)) state.stock[r] = Math.max(0, state.stock[r] - units * useFactor(r, order.product));
      order.done += units; orderUnits = units;
    }
    produced = shopUnits + orderUnits;
    // linhas extras: cada uma toca o pedido seguinte da fila, mais devagar que a principal
    for (let k = 1; k < (state.lines || 1); k++) {
      const order2 = state.active[k]; if (!order2 || state.blackout > 0) continue;
      let u2 = lineRate() * EXTRA_LINE_RATE * dm;
      for (const r of Object.keys(RESOURCES)) u2 = Math.min(u2, state.stock[r] / useFactor(r, order2.product));
      u2 = Math.max(0, Math.min(u2, order2.amount - order2.done));
      for (const r of Object.keys(RESOURCES)) state.stock[r] = Math.max(0, state.stock[r] - u2 * useFactor(r, order2.product));
      order2.done += u2; produced += u2;
    }
    state.stats.produced += produced; state.today.produced += produced;
  }
  shopTick(dm);

  boilerTick(dm, produced > 0);
  scheduleTick();
  if (state.talk && state.clock >= state.talk.endsAt) finishTalk();
  if (state.party && state.clock >= state.party.endsAt) endParty();
  state.morale = clamp(state.morale, 0, 100);

  // Desgaste e quebras
  for (const x of STATIONS) {
    const s = state.stations[x.id];
    if (s.repair > 0) {
      s.repair -= dm;
      if (s.repair <= 0) {
        s.repair = 0; s.broken = false; s.wear = 0; s.on = true; state.stats.repairs++;
        sfx.repair(); addLog(`${x.name} consertada${s.byTech ? " pelo técnico" : ""} e religada.`, "good");
      }
      continue;
    }
    if (s.broken) {
      if (state.staff.tech > STATIONS.filter(y => state.stations[y.id].repair > 0 && state.stations[y.id].byTech).length) {
        s.repair = TECH_REPAIR_TIME * (hasFac("treinamento") ? .7 : 1); s.byTech = true;
        addLog(`O técnico começou a consertar a ${x.name}.`);
      }
      continue;
    }
    if (!s.on) continue;
    const working = produced > 0;
    s.wear = Math.min(100, s.wear + dm * (working ? rand(.035, .065) : .012) / LEVEL_RELIABILITY[s.level] * (state.clock < state.buffs.safetyUntil ? .7 : 1) * (hasFac("brigada") ? .85 : 1));
    if (state.staff.tech > 0 && s.wear > 60) {
      s.wear = 0; state.stats.maintenances++;
      addLog(`O técnico fez manutenção preventiva na ${x.name}.`, "good");
      continue;
    }
    const pStep = (s.wear > 60 ? ((s.wear - 60) / 40) ** 2 * .16 : 0.00015) * moraleRisk();
    const p = 1 - (1 - pStep) ** (dm / MIN_PER_TICK);
    if (Math.random() < p) {
      s.broken = true; s.on = false;
      sfx.alarm();
      toast(`⚠️ ${x.name} quebrou!`, "bad");
      addLog(`${x.name} quebrou (desgaste de ${Math.round(s.wear)}%).`, "bad");
      window.Factory3D?.notify("breakdown", x.id);
    }
  }

  // Pedidos concluídos / vencidos
  for (const o of [...state.active]) {
    if (o.done >= o.amount - 1e-6) completeOrder(o);
    else if (state.clock >= o.deadlineAt) expireOrder(o);
  }

  // Comprador automático
  if (state.staff.buyer > 0) {
    for (const r of Object.keys(RESOURCES)) {
      if (state.stock[r] < cap() * .15) {
        const qty = Math.min(RESOURCES[r].lot * 2, cap() - state.stock[r]);
        const cost = Math.ceil(qty * state.prices[r]);
        if (state.money - cost > 0) { spend(cost, "materials"); state.stock[r] += qty; addLog(`Comprador repôs ${qty} ${RESOURCES[r].unit} de ${RESOURCES[r].name.toLowerCase()} (${fmtMoney(cost)}).`); }
      }
    }
  }

  state.reputation = clamp(state.reputation, 0, 100);
  checkGoals();

  if (state.clock >= state.nextEventAt) { state.nextEventAt = state.clock + rand(160, 260); showEvent(); }
  if (state.minute >= DAY_END) endOfDay();

  checkGameOver();
  save(); render();
}

/* ============================================================
   RENDERIZAÇÃO
   Estruturas são montadas uma vez (ou quando mudam) e só os números
   são atualizados a cada segundo, para os botões não "sumirem" no clique.
   ============================================================ */
const cache = {};
function patch(el, key, html) { if (cache[el.id] !== key) { cache[el.id] = key; el.innerHTML = html; } }

function buildStations() {
  $("stations").innerHTML = STATIONS.map((x, i) => `
    <article class="station" id="st-${x.id}">
      <div class="station-head">
        <div class="station-icon">${x.icon}</div>
        <div class="station-meta">
          <span class="level-pips" data-f="pips"></span>
          <span class="station-state" data-f="state"></span>
        </div>
      </div>
      <h3>${x.name} <kbd>${i + 1}</kbd></h3>
      <p>${x.description}</p>
      <div class="wear"><span>Desgaste</span><div class="meter"><div data-f="wear"></div></div><b data-f="wearTxt"></b></div>
      <div class="station-rate" data-f="rate"></div>
      <div class="station-actions">
        <button data-act="toggle" data-id="${x.id}" data-f="toggle"></button>
        <button data-act="maint" data-id="${x.id}" data-f="maint">Manutenção (${fmtMoney(MAINT_COST)})</button>
        <button data-act="repair" data-id="${x.id}" data-f="repair" class="danger">Consertar (${fmtMoney(REPAIR_COST)})</button>
      </div>
      <button data-act="upgrade" data-id="${x.id}" data-f="upgrade" class="upgrade-btn"></button>
    </article>`).join("");
}
function buildProdBoard() {
  $("pbFlow").innerHTML = STATIONS.map(x => `<li id="pb-${x.id}" class="pb-tile" data-act="scrollto" data-target="st-${x.id}" title="${x.name}">
      <span class="pb-lamp"></span><span class="pb-icon">${x.icon}</span><b>${x.short}</b><small data-f="w"></small><span class="pb-lv" data-f="lv"></span></li>`).join("")
    + `<li id="pb-boiler" class="pb-tile boiler" data-act="scrollto" data-target="boiler" title="Caldeira"><span class="pb-lamp"></span><span class="pb-icon">🔥</span><b>Caldeira</b><small data-f="w"></small><span class="pb-lv" data-f="lv"></span></li>`;
  $("boiler").innerHTML = `
    <div class="bo-head"><div class="station-icon">🔥</div>
      <div><h3>Caldeira a vapor <kbd>C</kbd></h3><p>Queima lenha (usa a madeira do estoque) e manda vapor para a secagem. Com a pressão na faixa verde a linha fica mais rápida. Pressão demais abre a válvula de segurança e desgasta a caldeira.</p></div>
      <span class="station-state" data-f="state"></span></div>
    <div class="gauge" aria-label="Pressão da caldeira"><div class="g-low"></div><div class="g-ok"></div><div class="g-high"></div><div class="g-needle" data-f="needle"></div></div>
    <div class="gauge-scale"><span style="left:0;transform:none">0</span><span data-f="s45">45 · faixa verde</span><span data-f="limit"></span><span style="left:100%;transform:translateX(-100%)">130</span></div>
    <div class="bo-row"><span>Pressão <b data-f="p"></b></span><span>Bônus <b data-f="bonus"></b></span><span>Lenha <b data-f="fuel"></b></span><span>Desgaste <b data-f="wear"></b></span></div>
    <div class="bo-actions">
      <button data-act="boiler-toggle" data-f="toggle"></button>
      <div class="fire-ctl"><button data-act="boiler-fire" data-d="-1" data-f="fminus" aria-label="Baixar o fogo">−</button><span data-f="fire"></span><button data-act="boiler-fire" data-d="1" data-f="fplus" aria-label="Aumentar o fogo">+</button></div>
      <button data-act="boiler-maint" data-f="maint">Manutenção (${fmtMoney(BOILER_MAINT)})</button>
      <button data-act="boiler-repair" data-f="repair" class="danger">Consertar (${fmtMoney(BOILER_REPAIR)})</button>
    </div>
    <button data-act="boiler-upgrade" data-f="upgrade" class="upgrade-btn"></button>`;
}
function renderBoiler() {
  renderLines();
  const b = state.boiler, el = $("boiler"), f = n => el.querySelector(`[data-f="${n}"]`), st = boilerStatus(b), SCALE = 130;
  el.className = `boiler-card ${st}`;
  f("state").textContent = { repair: `Em conserto · ${Math.ceil(b.repair)} min`, broken: "Quebrada", off: "Apagada", high: "Pressão alta!", ok: "Vapor ideal", low: "Esquentando" }[st];
  f("needle").style.left = `${Math.min(100, b.pressure / SCALE * 100)}%`;
  el.querySelector(".g-low").style.width = `${STEAM_OK[0] / SCALE * 100}%`;
  el.querySelector(".g-ok").style.width = `${(BOILER_LIMIT[b.level] - STEAM_OK[0]) / SCALE * 100}%`;
  el.querySelector(".g-high").style.width = `${(SCALE - BOILER_LIMIT[b.level]) / SCALE * 100}%`;
  f("limit").textContent = `limite ${BOILER_LIMIT[b.level]}`; f("limit").style.left = `${BOILER_LIMIT[b.level] / SCALE * 100}%`; f("s45").style.left = `${STEAM_OK[0] / SCALE * 100}%`;
  f("p").textContent = `${Math.round(b.pressure)} psi`;
  f("bonus").textContent = `+${Math.round((boilerMult() - 1) * 100)}%`;
  f("fuel").textContent = `${(.075 * b.fire * 12 * (hasFac("reciclagem") ? .6 : 1)).toFixed(1)} tábuas/h`;
  f("wear").textContent = `${Math.round(b.wear)}%`;
  const t = f("toggle"); t.textContent = b.on ? "Apagar" : "Acender"; t.disabled = b.broken || b.repair > 0; t.classList.toggle("primary", !b.on && !b.broken);
  f("fire").textContent = `Fogo ${b.fire}`; f("fminus").disabled = b.fire <= 1; f("fplus").disabled = b.fire >= 3;
  f("maint").hidden = b.broken; f("maint").disabled = b.wear < 5 || state.money < BOILER_MAINT;
  const r = f("repair"); r.hidden = !b.broken || b.repair > 0; r.disabled = state.money < BOILER_REPAIR;
  const u = f("upgrade");
  if (b.level >= 3) { u.textContent = "★ Caldeira no nível máximo"; u.disabled = true; }
  else { const cost = BOILER_UPGRADE[b.level + 1]; u.innerHTML = `⬆ Melhorar caldeira para nível ${b.level + 1} · ${fmtMoney(cost)} <small>limite ${BOILER_LIMIT[b.level + 1]} psi · bônus +${Math.round(BOILER_BONUS[b.level + 1] * 100)}%</small>`; u.disabled = state.money < cost; }
}
function renderProdBoard() {
  const ready = lineReady(), producing = ready && state.active.length > 0 && state.running && !state.paused && !state.blackout && !state.night;
  const broken = STATIONS.filter(x => state.stations[x.id].broken).length;
  $("pbTitle").textContent = state.night ? "Fábrica fechada (noite)" : state.blackout > 0 ? "Sem energia" : broken ? `${broken} máquina(s) com defeito` : producing ? "Linha produzindo" : !state.running ? "Turno não iniciado" : !state.active.length ? "Aguardando pedido" : "Linha incompleta";
  $("pbTitle").parentElement.parentElement.parentElement.dataset.state = state.blackout > 0 || broken ? "bad" : producing ? "good" : "idle";
  $("pbClock").textContent = `Dia ${state.day} · ${weekdayShort()} · ${clockText()}`;
  $("pbRate").textContent = producing ? Math.round(lineRate() * 60) : 0;
  $("pbRateMax").textContent = `máx. ${Math.round(lineRate() * 60)} lápis/h`;
  $("pbToday").textContent = fmtInt(state.today.produced);
  const bn = bottleneckId();
  $("pbBn").textContent = bn ? STATIONS.find(x => x.id === bn).short : "—";
  $("pbBnRate").textContent = bn ? `${Math.round(stationRate(bn) * 60)} lápis/h` : "linha equilibrada";
  const o = state.active[0];
  $("pbOrder").textContent = o ? `${fmtInt(o.done)} / ${o.amount}` : "—";
  $("pbOrderName").textContent = o ? `${PRODUCTS[o.product].name} · ${durationText(o.deadlineAt - state.clock)}` : "sem pedido";
  $("pbOrderBar").style.width = o ? `${Math.min(100, o.done / o.amount * 100)}%` : "0%";
  const b = state.boiler, bst = boilerStatus(b);
  $("pbSteam").textContent = b.on ? `${Math.round(b.pressure)} psi` : { broken: "quebrada", repair: "conserto" }[bst] || "apagada";
  $("pbSteamInfo").textContent = b.on ? `bônus +${Math.round((boilerMult() - 1) * 100)}%` : "sem bônus";
  $("pbSteamBar").style.width = `${Math.min(100, b.pressure / 130 * 100)}%`;
  $("pbSteamBar").className = bst;
  for (const x of STATIONS) {
    const s = state.stations[x.id], el = $(`pb-${x.id}`);
    const status = s.repair > 0 ? "repair" : s.broken ? "broken" : s.on ? (producing ? "run" : "on") : "off";
    el.className = `pb-tile ${status}${bn === x.id ? " bn" : ""}`;
    el.querySelector('[data-f="w"]').textContent = s.broken ? "defeito" : s.repair > 0 ? "conserto" : `${Math.round(s.wear)}%`;
    el.querySelector('[data-f="lv"]').textContent = "●".repeat(s.level) + "○".repeat(MAX_LEVEL - s.level);
  }
  const be = $("pb-boiler");
  be.className = `pb-tile boiler ${{ ok: "run", high: "repair", low: "on", off: "off", broken: "broken", repair: "repair" }[bst]}`;
  be.querySelector('[data-f="w"]').textContent = b.on ? `${Math.round(b.pressure)} psi` : bst === "broken" ? "defeito" : "apagada";
  be.querySelector('[data-f="lv"]').textContent = "●".repeat(b.level) + "○".repeat(3 - b.level);
}
function renderStations() {
  const bn = bottleneckId();
  renderProdBoard(); renderBoiler();
  for (const x of STATIONS) {
    const s = state.stations[x.id], el = $(`st-${x.id}`), f = n => el.querySelector(`[data-f="${n}"]`);
    const status = s.repair > 0 ? "repair" : s.broken ? "broken" : s.on ? "on" : "off";
    el.className = `station ${status}${bn === x.id ? " bottleneck" : ""}`;
    f("state").textContent = { repair: `Em conserto · ${Math.ceil(s.repair)} min`, broken: "Com defeito", on: "Funcionando", off: "Desligada" }[status];
    f("pips").innerHTML = [1, 2, 3].map(n => `<i class="${n <= s.level ? "on" : ""}"></i>`).join("") + `<small>Nv ${s.level}</small>`;
    const w = f("wear"); w.style.width = `${s.wear}%`; w.className = s.wear > 75 ? "hot" : s.wear > 50 ? "warm" : "";
    f("wearTxt").textContent = `${Math.round(s.wear)}%`;
    f("rate").innerHTML = `${Math.round(stationRate(x.id) * 60)} lápis/h${bn === x.id ? ' · <strong class="bn">gargalo</strong>' : ""}`;
    const t = f("toggle"); t.textContent = s.on ? "Desligar" : "Ligar"; t.disabled = s.broken || !state.running;
    t.classList.toggle("primary", !s.on && !s.broken && state.running);
    f("maint").disabled = s.broken || s.wear < 5 || state.money < MAINT_COST;
    const r = f("repair"); r.hidden = !s.broken || s.repair > 0; r.disabled = state.money < REPAIR_COST;
    f("maint").hidden = s.broken;
    const u = f("upgrade");
    if (s.level >= MAX_LEVEL) { u.textContent = "★ Nível máximo"; u.disabled = true; }
    else {
      const cost = UPGRADE_COST[s.level + 1];
      u.innerHTML = `⬆ Melhorar para nível ${s.level + 1} · ${fmtMoney(cost)} <small>+${Math.round((LEVEL_RATE[s.level + 1] / LEVEL_RATE[s.level] - 1) * 100)}% ritmo, menos desgaste</small>`;
      u.disabled = state.money < cost;
    }
  }
}

function orderCard(o, active, index) {
  const p = PRODUCTS[o.product];
  const color = "#" + p.color.toString(16).padStart(6, "0");
  const swatch = p.custom ? `<i class="swatch" style="background:${customSwatchCss(p.custom)}"></i>` : p.rainbow ? `<i class="swatch rainbow"></i>` : `<i class="swatch" style="background:${color}"></i>`;
  const tags = `${o.urgent ? '<span class="tag urgent">URGENTE</span>' : ""}${o.big ? '<span class="tag big">FEIRA</span>' : ""}${p.rep ? '<span class="tag eco">+reputação</span>' : ""}`;
  const needs = Object.keys(RESOURCES).map(r => {
    const need = Math.ceil(useFactor(r, o.product) * (o.amount - (o.done || 0)));
    const lack = state.stock[r] < need;
    return `<span class="need-item ${lack ? "lack" : ""}" title="${RESOURCES[r].name}">${RESOURCES[r].icon} ${need}</span>`;
  }).join("");
  if (active) {
    return `<article class="order active ${index < (state.lines || 1) ? "current" : "queued"}" data-order="${o.id}">
      <div class="order-top">${swatch}<div><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(o.client)} ${tags}</p></div>
      <span class="timer" data-f="timer"></span></div>
      <div class="progress"><div data-f="bar"></div></div>
      <div class="order-row"><span data-f="amount"></span><strong>${fmtMoney(o.reward)}</strong></div>
      <div class="order-row small"><span class="needs">${needs}</span>
      ${index < (state.lines || 1) ? `<span class="now">▶ linha ${index + 1}</span>` : `<button data-act="prio" data-id="${o.id}" class="mini">Produzir agora</button>`}</div>
    </article>`;
  }
  const fullRate = orderRate();
  const eta = o.amount / fullRate;
  const feasible = eta <= o.deadline;
  return `<article class="order offer" data-order="${o.id}">
    <div class="order-top">${swatch}<div><h3>${o.amount} × ${escapeHtml(p.name)}</h3><p>${escapeHtml(o.client)} ${tags}</p></div>
    <strong class="reward">${fmtMoney(o.reward)}</strong></div>
    <div class="order-row small">
      <span>⏱ Prazo ${durationText(o.deadline)} · sua linha leva ~${durationText(eta)} ${feasible ? "✅" : "⚠️"}</span>
    </div>
    <div class="order-row small"><span class="needs">${needs}</span><span class="expires" data-f="exp"></span></div>
    <div class="order-actions">
      <button data-act="accept" data-id="${o.id}" class="primary" ${state.active.length >= maxActive() || !state.running ? "disabled" : ""}>Aceitar</button>
      <button data-act="decline" data-id="${o.id}">Recusar</button>
    </div>
  </article>`;
}
function renderOrders() {
  const stockKey = Object.values(state.stock).map(v => Math.floor(v / 5)).join(",");
  const activeKey = state.active.map(o => o.id).join(",") + "|" + stockKey + "|" + state.efficiency;
  patch($("activeOrders"), activeKey, state.active.length
    ? state.active.map((o, i) => orderCard(o, true, i)).join("")
    : `<p class="empty">Nenhum pedido em produção. Aceite uma oferta abaixo.</p>`);
  const offersKey = state.offers.map(o => o.id).join(",") + "|" + state.active.length + "|" + state.running + "|" + stockKey + "|" +
    STATIONS.map(x => state.stations[x.id].level).join("") + state.staff.operator;
  patch($("offers"), offersKey, state.offers.length
    ? state.offers.map(o => orderCard(o, false)).join("")
    : `<p class="empty">${state.running ? "Aguardando novas ofertas…" : "As ofertas chegam quando o turno começa."}</p>`);
  // números vivos
  for (const o of state.active) {
    const el = $("activeOrders").querySelector(`[data-order="${o.id}"]`); if (!el) continue;
    const left = o.deadlineAt - state.clock;
    const t = el.querySelector('[data-f="timer"]'); t.textContent = durationText(left);
    t.classList.toggle("late", left < (o.amount - o.done) / lineRate());
    el.querySelector('[data-f="bar"]').style.width = `${Math.min(100, o.done / o.amount * 100)}%`;
    el.querySelector('[data-f="amount"]').textContent = `${fmtInt(o.done)} / ${o.amount} lápis`;
  }
  for (const o of state.offers) {
    const el = $("offers").querySelector(`[data-order="${o.id}"] [data-f="exp"]`);
    if (el) el.textContent = `some em ${durationText(o.expiresAt - state.clock)}`;
  }
  $("activeCount").textContent = `${state.active.length}/${maxActive()}`;
}

function renderMarket() {
  const c = cap();
  const key = Object.keys(RESOURCES).map(r => `${state.prices[r].toFixed(2)}:${Math.floor(state.stock[r])}:${state.money >= state.prices[r] * RESOURCES[r].lot}`).join("|") + c;
  patch($("market"), key, Object.entries(RESOURCES).map(([k, r]) => {
    const price = state.prices[k], diff = (price - r.base) / r.base * 100;
    const lotCost = Math.ceil(r.lot * price);
    const room = c - state.stock[k];
    return `<div class="market-item">
      <div class="mi-head"><span class="mi-icon">${r.icon}</span><div><strong>${r.name}</strong><small>${fmtInt(state.stock[k])} / ${c} ${r.unit}</small></div>
      <span class="price ${diff > 5 ? "up" : diff < -5 ? "down" : ""}">${fmtMoney(price * 10)}<small>/10 ${r.unit}</small></span></div>
      <div class="meter"><div style="width:${state.stock[k] / c * 100}%"></div></div>
      <div class="mi-actions">
        <button data-act="buy" data-res="${k}" data-lots="1" ${room < 1 || state.money < lotCost ? "disabled" : ""}>+${r.lot} · ${fmtMoney(lotCost)}</button>
        <button data-act="buy" data-res="${k}" data-lots="3" ${room < 1 || state.money < lotCost * 3 ? "disabled" : ""}>+${r.lot * 3} · ${fmtMoney(lotCost * 3)}</button>
      </div>
      <small class="mi-trend">${diff > 5 ? "▲ caro hoje" : diff < -5 ? "▼ barato hoje — boa hora de estocar" : "preço normal"}</small>
    </div>`;
  }).join(""));
  const wl = state.warehouse, max = wl >= WAREHOUSE_CAP.length - 1;
  patch($("warehouse"), `${wl}:${state.money >= (WAREHOUSE_COST[wl + 1] || 0)}`, `
    <div><strong>🏬 Armazém nível ${wl}</strong><small>Guarda até ${c} unidades de cada material.</small></div>
    ${max ? '<span class="chip">Capacidade máxima</span>' : `<button data-act="warehouse" ${state.money < WAREHOUSE_COST[wl + 1] ? "disabled" : ""}>Ampliar para ${WAREHOUSE_CAP[wl + 1]} · ${fmtMoney(WAREHOUSE_COST[wl + 1])}</button>`}`);
}
function renderWorkdays() {
  document.querySelectorAll("[data-workday]").forEach(b => { b.checked = !!state.workDays[b.dataset.workday]; });
  const t = $("todayLabel"); if (t) t.textContent = `Hoje é ${weekdayOf().toLowerCase()}, dia ${state.day}.`;
}
function renderStaff() {
  renderWorkdays();
  const key = JSON.stringify(state.staff) + JSON.stringify(state.extraSlots) + JSON.stringify(state.managerPrefs) + Object.keys(STAFF).map(k => state.money >= STAFF[k].wage).join("");
  patch($("staff"), key, Object.entries(STAFF).map(([k, st]) => {
    const n = state.staff[k];
    return `<div class="staff-card ${n ? "hired" : ""}">
      <div class="staff-icon">${st.icon}</div>
      <div class="staff-info"><strong>${st.name} ${maxOf(k) > 1 ? `<span class="chip">${n}/${maxOf(k)}</span>` : n ? '<span class="chip ok">contratado</span>' : ""}</strong>
      <p>${st.desc}</p><small>Salário: ${fmtMoney(st.wage)}/dia · contratação: ${fmtMoney(st.wage)}</small>
      ${k === "manager" && n ? `<div class="mgr-prefs"><b>O gerente pode:</b>${MANAGER_PREFS.map(([p, label]) => `<label><input type="checkbox" data-pref="${p}" ${state.managerPrefs[p] ? "checked" : ""}> ${label}</label>`).join("")}</div>` : ""}</div>
      <div class="staff-actions">
        ${n < maxOf(k) ? `<button data-act="hire" data-role="${k}" class="primary" ${state.money < st.wage ? "disabled" : ""}>Contratar</button>` : ""}
        ${n > 0 ? `<button data-act="fire" data-role="${k}">Dispensar</button>` : ""}
      </div>
    </div>`;
  }).join(""));
}
function renderGoals() {
  const doneCount = GOALS.filter(g => state.goals[g.id]).length;
  $("goalsBadge").textContent = `${doneCount}/${GOALS.length}`;
  $("factoryLevel").textContent = doneCount + 1;
  const firstOpen = GOALS.findIndex(g => !state.goals[g.id]);
  patch($("goals"), JSON.stringify(state.goals), GOALS.map((g, i) => `
    <li class="${state.goals[g.id] ? "done" : i === firstOpen ? "next" : ""}">
      <span class="goal-check">${state.goals[g.id] ? "✓" : i + 1}</span>
      <span class="goal-text">${g.text}</span>
      <span class="goal-reward">${g.reward ? "+" + fmtMoney(g.reward) : "🏁 vitória"}</span>
    </li>`).join(""));
}
function renderReport() {
  const h = state.history;
  const key = h.length + ":" + (h.at(-1)?.day || 0) + ":" + Math.floor(state.stats.produced / 50) + state.stats.ordersDone;
  const max = Math.max(1, ...h.map(d => Math.max(d.income, d.expenses)));
  const bars = h.length ? `<div class="chart" role="img" aria-label="Receita e despesa por dia">${h.map(d => `
      <div class="chart-day" title="Dia ${d.day}: receita ${fmtMoney(d.income)}, despesa ${fmtMoney(d.expenses)}">
        <div class="bars"><i class="inc" style="height:${d.income / max * 100}%"></i><i class="exp" style="height:${d.expenses / max * 100}%"></i></div>
        <span class="${d.profit >= 0 ? "pos" : "neg"}">D${d.day}</span>
      </div>`).join("")}</div>
      <div class="legend"><span><i class="inc"></i>Receita</span><span><i class="exp"></i>Despesa</span></div>`
    : `<p class="empty">O gráfico aparece depois do primeiro dia completo.</p>`;
  patch($("report"), key, `${bars}${statsHtml()}`);
}

function render() {
  if (simulating) return;
  state.reputation = clamp(state.reputation, 0, 100);
  const c = cap();
  $("money").textContent = fmtMoney(state.money);
  $("money").classList.toggle("neg", state.money < 0);
  if (lastMoney != null && Math.round(state.money) !== Math.round(lastMoney)) {
    const d = state.money - lastMoney;
    if (Math.abs(d) >= 1) { $("moneyDelta").textContent = `${d > 0 ? "+" : "−"}${fmtMoney(Math.abs(d))}`; $("moneyDelta").className = d > 0 ? "pos" : "neg"; }
  }
  lastMoney = state.money;
  for (const r of Object.keys(RESOURCES)) {
    $(r).textContent = `${fmtInt(state.stock[r])}`;
    const bar = $(r + "Bar"); bar.style.width = `${state.stock[r] / c * 100}%`;
    bar.className = state.stock[r] < c * .12 ? "low" : "";
  }
  $("reputation").textContent = `${Math.floor(state.reputation)}%`;
  $("repBar").style.width = `${state.reputation}%`;
  $("repBar").className = state.reputation < 35 ? "low" : "";
  $("produced").textContent = fmtInt(state.stats.produced);
  $("rateLabel").textContent = `${Math.round(lineRate() * 60)} lápis/h`;
  $("dayLabel").textContent = `Dia ${state.day} · ${weekdayShort()}`;
  $("timeLabel").textContent = clockText();
  $("dayProgress").style.width = `${clamp((state.minute - DAY_START) / (DAY_END - DAY_START), 0, 1) * 100}%`;
  $("dayProgress").classList.toggle("night", !!state.night);

  const ready = lineReady(), broken = STATIONS.some(x => state.stations[x.id].broken);
  const producing = ready && state.active.length > 0 && state.running && !state.paused;
  $("lineStatus").textContent = broken ? "Máquina quebrada" : producing ? "Produzindo" : ready ? "Pronta, sem pedido" : "Linha incompleta";
  $("lineStatus").className = `status ${broken ? "broken" : producing ? "running" : "waiting"}`;
  const bn = bottleneckId();
  $("bottleneck").hidden = !bn;
  if (bn) $("bottleneck").textContent = `Gargalo: ${STATIONS.find(x => x.id === bn).short}`;

  $("startBtn").disabled = state.running || state.ended || state.night;
  $("generatorBtn").hidden = !(state.blackout > 0);
  $("generatorBtn").disabled = state.money < GENERATOR_COST;
  $("skipNightBtn").hidden = !state.night; $("skipNightBtn").textContent = state.dayOff ? "⏭️ Pular a folga" : "☀️ Pular a noite";
  $("managerBadge").hidden = !state.staff.manager;
  $("startBtn").textContent = state.running ? "Turno em andamento" : state.clock > 0 ? "Retomar turno" : "Iniciar turno";
  $("pauseBtn").disabled = !state.running;
  $("pauseBtn").textContent = state.paused ? "Continuar" : "Pausar";
  $("allOnBtn").disabled = !state.running || state.blackout > 0 || state.night || STATIONS.every(x => state.stations[x.id].on || state.stations[x.id].broken);
  $("speedSelect").value = String(state.speed);
  $("soundBtn").textContent = state.sound ? "🔊 Som" : "🔇 Mudo";

  const lack = state.active[0] && Object.keys(RESOURCES).some(r => state.stock[r] < useFactor(r, state.active[0].product) * 2);
  $("mainMessage").textContent =
    state.ended ? "Fim de jogo. Clique em “Novo jogo” para recomeçar." :
    state.night ? (state.dayOff ? `🛌 ${weekdayOf()}: folga. A fábrica reabre no próximo dia útil — ou pule a folga.` : "🌙 Noite: a fábrica está fechada. Amanhece às 08:00 — ou pule a noite.") :
    state.blackout > 0 ? `⚡ Sem energia! Tudo apagou. A luz volta em cerca de ${durationText(state.blackout)} — ou ligue o gerador.` :
    !state.running ? "Clique em “Iniciar turno” para abrir a fábrica." :
    state.paused ? "O turno está pausado." :
    state.lunchOn ? "🍽️ Hora do almoço: todo mundo está no refeitório. A linha volta às 13:30." :
    broken ? "Uma máquina quebrou! Conserte para a linha voltar a andar." :
    !state.active.length ? (ready ? "Linha pronta. Aceite um pedido — máquinas paradas gastam energia." : "Aceite um pedido no quadro de ofertas e ligue as máquinas.") :
    lack ? "A matéria-prima está acabando! Compre no Mercado." :
    ready ? `Produzindo ${PRODUCTS[state.active[0].product].name.toLowerCase()} a ${Math.round(lineRate() * 60)} lápis/h.` :
    "Ligue todas as máquinas para produzir.";

  renderPeople(); renderShop(); renderDirectors(); renderMeetingBar(); renderCores(); renderFolds();
  renderStations(); renderOrders(); renderMarket(); renderStaff(); renderGoals(); renderReport(); renderBrand();
  window.Factory3D?.update(state);
}

/* ============================================================
   DIRETORIA (departamentos da administração)
   ============================================================ */
/* Máquinas e caldeira ficam recolhidas numa linha de resumo; abre quem quiser os detalhes */
const BOILER_WORDS = { repair: "em conserto", broken: "com defeito", off: "apagada", high: "pressão alta", ok: "vapor ideal", low: "esquentando" };
function renderFolds() {
  const f = $("foldLine"); if (!f) return;
  if (!cache.foldInit) {
    cache.foldInit = true;
    try { f.open = localStorage.getItem("fabrica-maquinas-abertas") === "1"; } catch (_) { }
    f.addEventListener("toggle", () => { try { localStorage.setItem("fabrica-maquinas-abertas", f.open ? "1" : "0"); } catch (_) { } });
  }
  const st = STATIONS.map(x => state.stations[x.id]);
  const on = st.filter(x => x.on && !x.broken).length, broken = st.filter(x => x.broken || x.repair > 0).length;
  const wear = Math.round(st.reduce((a, x) => a + x.wear, 0) / st.length), b = state.boiler;
  const html = `<span class="fs">${state.lines || 1} linha(s)</span><span class="fs ${on === st.length ? "ok" : ""}">${on}/${st.length} ligadas</span>`
    + (broken ? `<span class="fs bad">⚠ ${broken} com defeito</span>` : "")
    + `<span class="fs ${wear >= 60 ? "warn" : ""}">desgaste ${wear}%</span>`
    + `<span class="fs ${b.broken ? "bad" : boilerStatus(b) === "ok" ? "ok" : ""}">🔥 ${BOILER_WORDS[boilerStatus(b)] || "caldeira ligada"}</span>`;
  if (cache.foldSum !== html) { cache.foldSum = html; $("foldLineSum").innerHTML = html; }
  f.classList.toggle("alert", broken > 0 || b.broken);
}
function renderDirectors() {
  const buffs = [];
  if (state.clock < state.buffs.marketingUntil) buffs.push(`📣 Campanha no ar · ${durationText(state.buffs.marketingUntil - state.clock)}`);
  if (state.clock < state.buffs.pcpUntil) buffs.push(`🗂️ Plano otimizado · ${durationText(state.buffs.pcpUntil - state.clock)}`);
  if (state.buffs.suppliersDay === state.day) buffs.push("💰 Fornecedores com desconto hoje");
  if (state.benefits) buffs.push("📑 Benefícios ativos");
  patch($("dirBuffs"), buffs.join("|"), buffs.length ? buffs.map(b => `<span class="chip ok">${b}</span>`).join("") : `<span class="chip muted">Nenhuma ação de departamento em andamento</span>`);
  const key = [state.running, state.benefits, state.buffs.suppliersDay === state.day, !!(state.recruits && state.recruits.day === state.day), ...DEPTS.flatMap(d => d.actions.map(a => state.money >= a.cost))].join("");
  patch($("depts"), key, DEPTS.map(d => `<div class="dept-card"><div class="dept-head"><span class="dept-ico">${d.icon}</span><div><strong>${d.name}</strong><small>${d.desc}</small></div></div>
    ${d.actions.map(a => {
      const done = (a.id === "fornecedores" && state.buffs.suppliersDay === state.day) || (a.id === "seletivo" && state.recruits && state.recruits.day === state.day);
      const label = a.toggle ? (state.benefits ? "✅ Benefícios ativos — cancelar" : "Ativar benefícios") : done ? "✔ Feito hoje" : `${a.label} · ${fmtMoney(a.cost)}`;
      return `<button data-act="dept" data-dept="${d.id}" data-id="${a.id}" class="${a.toggle && state.benefits ? "" : "primary"}" ${!a.toggle && (done || !state.running || state.money < a.cost) ? "disabled" : ""}>${label}<small>${a.info}</small></button>`; }).join("")}</div>`).join(""));
  const r = state.recruits && state.recruits.day === state.day ? state.recruits : null;
  patch($("rhCandidates"), r ? JSON.stringify(r.candidates) + Math.floor(state.money / 50) : "none", r && r.candidates.length ? r.candidates.map(c => { const st = STAFF[c.role], full = state.staff[c.role] >= maxOf(c.role);
      return `<div class="cand"><span class="cand-av">${st.icon}</span><div><strong>${escapeHtml(c.name)}</strong><small>${st.name} · ${c.trait} · ${fmtMoney(c.wage)}/dia${full ? " · sem vaga" : ""}</small></div><button data-act="cand" data-id="${c.id}" ${full || state.money < c.wage ? "disabled" : ""}>Contratar</button></div>`; }).join("")
    : `<p class="empty">${r ? "Todos os candidatos foram contratados." : "Abra um processo seletivo no RH para receber candidatos."}</p>`);
  // CEO
  const ceoKey = (state.ceo.name || "") + "|" + (state.ceo.photo || "").length;
  if (cache.ceoKey !== ceoKey) {
    cache.ceoKey = ceoKey;
    $("ceoPreview").innerHTML = state.ceo.photo ? `<img src="${state.ceo.photo}" alt="Foto do CEO">` : "<span>🧑‍💼</span>";
    if (document.activeElement !== $("ceoNameInput")) $("ceoNameInput").value = state.ceo.name || "";
    $("ceoRemovePhoto").hidden = !state.ceo.photo;
    window.Factory3D?.setCeo?.(state.ceo);
  }
  $("ceoTrophies").textContent = `${GOALS.filter(g => state.goals[g.id]).length} troféus de metas na estante`;
}

/* ============================================================
   LOJA & FEIRAS
   ============================================================ */
function renderShop() {
  const sh = state.shop, c = SHOP_CAP[sh.level], p = SHOP_PRICES[sh.price];
  $("shopStock").textContent = `${fmtInt(sh.stock)} / ${c}`;
  $("shopBar").style.width = `${Math.min(100, sh.stock / c * 100)}%`;
  $("shopToday").textContent = `${fmtInt(sh.soldToday)} lápis · ${fmtMoney(sh.revenueToday)}`;
  $("shopYesterday").textContent = `${fmtInt(sh.lastSold)} lápis · ${fmtMoney(sh.lastRevenue)}`;
  $("shopRate").textContent = `~${Math.round(shopDemandPerMin() * 60)} lápis/h a ${fmtMoney(p.value * 10)} a dezena`;
  $("shopLevel").textContent = `Nível ${sh.level}`;
  patch($("shopPrices"), sh.price, Object.entries(SHOP_PRICES).map(([k, v]) => `<button data-act="shopprice" data-price="${k}" class="${k === sh.price ? "primary" : ""}">${v.label}<small>${fmtMoney(v.value * 10)} a dezena · ${v.demand > 1 ? "mais clientes" : v.demand < 1 ? "menos clientes" : "equilibrado"}</small></button>`).join(""));
  patch($("shopShare"), String(sh.share), [0, .25, .5].map(v => `<button data-act="shopshare" data-share="${v}" class="${sh.share === v ? "primary" : ""}">${Math.round(v * 100)}%</button>`).join(""));
  const pb = $("shopProduce"); pb.textContent = sh.produce ? "✅ Linha abastece a loja quando não há pedido" : "⏸️ Linha não abastece a loja"; pb.classList.toggle("on", sh.produce);
  const up = $("shopUpgrade");
  if (sh.level >= 3) { up.textContent = "★ Loja no nível máximo"; up.disabled = true; }
  else { up.innerHTML = `⬆ Ampliar loja para nível ${sh.level + 1} · ${fmtMoney(SHOP_UPGRADE[sh.level + 1])} <small>guarda ${SHOP_CAP[sh.level + 1]} lápis e atrai mais clientes</small>`; up.disabled = state.money < SHOP_UPGRADE[sh.level + 1]; }
  // feiras
  const today = fairOfDay(state.day), f = state.fair && state.fair.day === state.day ? state.fair : null;
  const nd = nextFairDay(state.day + (today ? 1 : 0)), nf = fairOfDay(nd);
  $("fairNow").innerHTML = f ? `<strong>🎪 ${f.name}</strong> — seu ${BOOTHS[f.size].label.toLowerCase()} está aberto hoje · ${fmtInt(f.sold)} lápis vendidos (${fmtMoney(f.revenue)})`
    : today ? `<strong>${today.icon} ${today.name}</strong> acontece <b>hoje</b>! Monte seu estande:` : `Próxima feira: <strong>${nf.icon} ${nf.name}</strong> no dia ${nd}.`;
  $("fairNow").classList.toggle("live", !!f || !!today);
  patch($("booths"), `${!!today}|${!!f}|${state.running}|${Object.values(BOOTHS).map(b => state.money >= b.cost).join("")}`, Object.entries(BOOTHS).map(([k, b]) => `
    <div class="booth-card"><strong>${b.label}</strong><p>Vendas ${b.sales}× · ${b.leads} pedido(s) grande(s) · ${b.candidates} candidato(s) · +${b.rep}% reputação</p>
    <button data-act="booth" data-size="${k}" class="primary" ${!today || f || !state.running || state.money < b.cost ? "disabled" : ""}>Montar · ${fmtMoney(b.cost)}</button></div>`).join(""));
  patch($("candidates"), f ? JSON.stringify(f.candidates) + state.money.toFixed(0).slice(0, -2) : "none", f && f.candidates.length
    ? f.candidates.map(c => { const st = STAFF[c.role], full = state.staff[c.role] >= maxOf(c.role), noSlot = full && (state.extraSlots[c.role] || 0) >= (EXTRA_SLOTS_MAX[c.role] || 0);
        return `<div class="cand"><span class="cand-av">${st.icon}</span><div><strong>${escapeHtml(c.name)}</strong><small>${st.name} · ${c.trait} · ${fmtMoney(c.wage)}/dia${full && !noSlot ? " · abre vaga extra" : ""}</small></div>
        <button data-act="cand" data-id="${c.id}" ${noSlot || state.money < c.wage ? "disabled" : ""}>Contratar</button></div>`; }).join("")
    : `<p class="empty">${f ? "Todos os candidatos já foram contratados." : "Os candidatos aparecem quando você monta um estande."}</p>`);
}

/* ============================================================
   CLUBE & AUDITÓRIO
   ============================================================ */
function renderPeople() {
  const m = Math.round(state.morale);
  $("morale").textContent = m; $("moraleBar").style.width = `${m}%`; $("moraleBar").className = m < 35 ? "low" : "";
  $("moraleLabel").textContent = moraleText(m);
  $("pMorale").textContent = m; $("pMoraleText").textContent = moraleText(m);
  $("pMoraleBar").style.width = `${m}%`; $("pMoraleBar").className = m < 35 ? "low" : m >= 85 ? "high" : "";
  $("pMoraleFx").textContent = `Ritmo da linha ${moraleMult() >= 1 ? "+" : "−"}${Math.abs(Math.round((moraleMult() - 1) * 100))}% · quebras ${moraleRisk() <= 1 ? "−" : "+"}${Math.abs(Math.round((moraleRisk() - 1) * 100))}%`;
  const buffs = [];
  if (state.clock < state.buffs.safetyUntil) buffs.push(`🦺 Menos desgaste · ${durationText(state.buffs.safetyUntil - state.clock)}`);
  if (state.clock < state.buffs.efficiencyUntil) buffs.push(`💡 Menos material · ${durationText(state.buffs.efficiencyUntil - state.clock)}`);
  patch($("pBuffs"), buffs.join("|"), buffs.length ? buffs.map(b => `<span class="chip ok">${b}</span>`).join("") : `<span class="chip muted">Nenhum bônus de palestra ativo</span>`);
  const t = state.talk;
  $("talkNow").innerHTML = t ? `<strong>🎤 ${escapeHtml(t.name)}</strong> acontecendo agora · termina em ${durationText(t.endsAt - state.clock)}` : "Auditório livre. Escolha uma palestra:";
  $("talkNow").classList.toggle("live", !!t);
  patch($("talks"), `${!!t}|${state.running}|${TALKS.map(x => state.money >= x.cost).join("")}`, TALKS.map(x => `
    <div class="talk-card"><span class="tc-icon">${x.icon}</span><div><strong>${x.name}</strong><p>${x.desc}</p><small>${durationText(x.duration)} de palestra</small></div>
    <button data-act="talk" data-id="${x.id}" class="primary" ${t || !state.running || state.money < x.cost ? "disabled" : ""}>Agendar · ${fmtMoney(x.cost)}</button></div>`).join(""));
  const p = state.party;
  $("partyNow").innerHTML = p ? `<strong>🎉 ${escapeHtml(p.name)}</strong> rolando no clube · termina em ${durationText(p.endsAt - state.clock)}` : "Nenhuma festa agora. Crie a sua:";
  $("partyNow").classList.toggle("live", !!p);
  const sz = PARTY_SIZES[$("partySize").value] || PARTY_SIZES.pequena;
  $("partyBtn").textContent = `🎉 Fazer a festa · ${fmtMoney(sz.cost)}`;
  $("partyBtn").disabled = !!p || state.money < sz.cost;
  $("partyFx").textContent = `+${sz.morale} de moral${sz.rep ? ` · +${sz.rep}% de reputação` : ""} · ${durationText(sz.duration)} de festa`;
  patch($("partyHistory"), JSON.stringify(state.partyHistory), state.partyHistory.length
    ? state.partyHistory.map(h => `<li><span>🎉 ${escapeHtml(h.name)}</span><small>Dia ${h.day} · ${PARTY_SIZES[h.size]?.label.split(" — ")[0] || ""} · +${h.gain} moral</small></li>`).join("")
    : `<li class="empty-li">Nenhuma festa ainda. Que tal comemorar o primeiro pedido?</li>`);
  // seletores de dia e hora (só dias úteis; refeitos quando o dia ou a jornada mudam)
  const days = scheduleDays(), dkey = days.join() + "|" + state.day;
  const dayOpts = days.map(d => `<option value="${d}">${d === state.day ? "Hoje" : `Dia ${d}`} · ${weekdayOf(d)}</option>`).join("");
  const hourOpts = SCHEDULE_HOURS.map(m => `<option value="${m}">${clockText(m)}</option>`).join("");
  patch($("talkSchedId"), "talks", TALKS.map(x => `<option value="${x.id}">${x.icon} ${x.name} · ${fmtMoney(x.cost)}</option>`).join(""));
  patch($("talkSchedDay"), dkey, dayOpts); patch($("partyDay"), dkey, dayOpts);
  patch($("talkSchedHour"), "h", hourOpts); patch($("partyHour"), "h", hourOpts);
  patch($("scheduleList"), JSON.stringify(state.schedule), state.schedule.length
    ? state.schedule.map(ev => `<li><span>${ev.type === "talk" ? "🎤" : "🎉"} ${escapeHtml(ev.name)}</span><small>${weekdayOf(ev.day)}, dia ${ev.day} · ${clockText(ev.minute)}</small><button type="button" data-act="unsched" data-id="${ev.id}">Cancelar</button></li>`).join("")
    : `<li class="empty-li">Nada agendado. Marque uma palestra ou uma festa para um dia e hora.</li>`);
}

/* ============================================================
   MARCA DA FÁBRICA (nome + logo)
   ============================================================ */
function renderBrand() {
  const b = state.brand;
  const key = b.name + "|" + (b.logo || "").length;
  if (cache.brandKey === key) return;
  cache.brandKey = key;
  $("brandName").textContent = b.name || "Fábrica de Lápis";
  document.title = b.name || "Fábrica de Lápis";
  $("brandLogo").innerHTML = b.logo ? `<img src="${b.logo}" alt="">` : "✏️";
  $("brandPreview").innerHTML = b.logo ? `<img src="${b.logo}" alt="Logo atual">` : `<span>✏️</span>`;
  if (document.activeElement !== $("brandNameInput")) $("brandNameInput").value = b.name || "";
  $("brandRemoveLogo").hidden = !b.logo;
  window.Factory3D?.setBrand(b);
}
function setBrandLogo(file) {
  if (!file || !file.type.startsWith("image/")) { toast("Escolha um arquivo de imagem (PNG, JPG ou SVG).", "bad"); return; }
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const max = 320, k = Math.min(1, max / Math.max(img.width || max, img.height || max));
      const c = document.createElement("canvas"); c.width = Math.max(1, Math.round((img.width || max) * k)); c.height = Math.max(1, Math.round((img.height || max) * k));
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      state.brand.logo = c.toDataURL("image/png");
      save(); render(); sfx.success(); toast("Logo aplicada na fábrica!", "good");
    };
    img.onerror = () => toast("Não consegui ler essa imagem.", "bad");
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

/* ============================================================
   PAINEL DE CADA SETOR (aparece dentro da cena 3D)
   ============================================================ */
window.getAdminInfo = () => ({
  money: state.money, day: state.day, reputation: state.reputation, morale: state.morale,
  orders: state.active.map(o => ({ name: PRODUCTS[o.product].name, client: o.client, done: Math.floor(o.done), amount: o.amount, left: durationText(o.deadlineAt - state.clock) })),
  offers: state.offers.length, delivered: state.stats.ordersDone, history: state.history.slice(-7),
  wages: Object.entries(state.staff).reduce((a, [k, n]) => a + STAFF[k].wage * n, 0) + (state.benefits ? BENEFITS_COST : 0),
  staff: Object.entries(state.staff).filter(([, n]) => n > 0).map(([k, n]) => `${STAFF[k].name}: ${n}`),
  openRoles: Object.keys(STAFF).filter(k => state.staff[k] < maxOf(k)).map(k => STAFF[k].name),
  campaign: state.clock < state.buffs.marketingUntil, pcp: state.clock < state.buffs.pcpUntil, benefits: state.benefits,
  shopStock: Math.floor(state.shop.stock), goals: GOALS.filter(g => state.goals[g.id]).length, ceoName: state.ceo.name || "CEO", brand: state.brand.name
});
window.getMuseumInfo = () => {
  const list = MUSEUM_EXHIBITS.map(e => ({ ...e }));
  const name = state.brand.name || "Fábrica de Lápis";
  list[5].title = name;
  list[5].text = `Já produzimos ${fmtInt(state.stats.produced)} lápis e entregamos ${state.stats.ordersDone} pedidos em ${state.day} dia(s). Obrigado pela visita!`;
  return { unlocked: museumUnlocked(), list, produced: fmtInt(state.stats.produced), producedRaw: state.stats.produced, orders: state.stats.ordersDone,
    days: state.day, visitors: fmtInt(state.museum.totalVisitors) };
};
window.getProdSummary = () => {
  const o = state.active[0], bn = bottleneckId(), b = state.boiler;
  const producing = lineReady() && !!o && state.running && !state.paused && !state.blackout && !state.night;
  return { rate: producing ? Math.round(lineRate() * 60) : 0, max: Math.round(lineRate() * 60), today: Math.floor(state.today.produced),
    bottleneck: bn ? STATIONS.find(x => x.id === bn).short : "—", order: o ? { name: PRODUCTS[o.product].name, done: Math.floor(o.done), amount: o.amount } : null,
    boiler: { on: b.on, pressure: Math.round(b.pressure), status: boilerStatus(b), bonus: Math.round((boilerMult() - 1) * 100), level: b.level },
    names: Object.fromEntries(STATIONS.map(x => [x.id, x.short])), day: state.day, time: clockText() };
};
window.getSectorInfo = (id, s) => {
  const c = cap(), buy = (res, lots = 1) => {
    const r = RESOURCES[res], cost = Math.ceil(r.lot * lots * s.prices[res]);
    return { label: `🛒 +${r.lot * lots} ${r.unit} · ${fmtMoney(cost)}`, attrs: `data-act="buy" data-res="${res}" data-lots="${lots}" ${s.money < cost || s.stock[res] >= c ? "disabled" : ""}` };
  };
  const tab = (name, label) => ({ label, attrs: `data-act="tab" data-tab="${name}"` });
  const stock = res => [`${RESOURCES[res].icon} Estoque`, `${fmtInt(s.stock[res])} / ${c} ${RESOURCES[res].unit}`];
  const price = res => ["Preço hoje", `${fmtMoney(s.prices[res] * 10)} / 10 ${RESOURCES[res].unit}`];
  const order = s.active[0];
  const orderLine = ["Pedido atual", order ? `${fmtInt(order.done)} / ${order.amount}` : "nenhum"];
  const staffTotal = Object.values(s.staff).reduce((a, b) => a + b, 0);
  const wages = Object.entries(s.staff).reduce((a, [k, n]) => a + STAFF[k].wage * n, 0);
  const bn = bottleneckId();
  const goalsDone = GOALS.filter(g => s.goals[g.id]).length;
  switch (id) {
    case "producao": return { text: `As 7 etapas da linha de lápis, em ${s.lines || 1} linha(s).`, stats: [["Ritmo", `${Math.round(lineRate() * 60)} lápis/h`], ["Gargalo", bn ? STATIONS.find(x => x.id === bn).short : "nenhum"], ["Linhas", `${s.lines || 1} de ${MAX_LINES}`], orderLine],
      actions: [{ label: "⚡ Ligar tudo", attrs: `data-act="allon" ${!s.running || s.blackout > 0 ? "disabled" : ""}` }, ...((s.lines || 1) < MAX_LINES ? [{ label: `🏭 Comprar ${(s.lines || 1) + 1}ª linha · ${fmtMoney(LINE_COST[(s.lines || 1) + 1])}`, attrs: `data-act="buyline" ${s.money < LINE_COST[(s.lines || 1) + 1] ? "disabled" : ""}` }] : []), { label: "⚙️ Ver máquinas", attrs: `data-act="goto" data-target="stations"` }] };
    case "madeira": return { text: "Tábuas de madeira para o corpo do lápis.", stats: [stock("wood"), price("wood")], actions: [buy("wood"), buy("wood", 3), tab("market", "🏬 Mercado")] };
    case "tintas": return { text: "Tinturaria: cada cor descoberta no laboratório ganha um tanque aqui.", stats: [stock("paint"), price("paint"), ["🎨 Cores", `${s.lab.unlocked.length} de ${Object.keys(COLORS).length}`]], actions: [buy("paint"), buy("paint", 3), tab("cores", "🔬 Laboratório de cores")] };
    case "qualidade": case "mina": case "viveiro": case "reciclagem": case "subestacao": case "brigada": case "portaria": case "treinamento": case "creche": return facilityInfo(id, s);
    case "refeitorio": {
      const cv = CANTEEN[s.canteen.level] || CANTEEN[1], nx = CANTEEN[s.canteen.level + 1], n = headcount(s);
      return { text: "Das 12:00 às 13:30 a linha para e todo mundo almoça aqui.", stats: [["Agora", isLunch(s) ? "🍽️ almoçando" : "fechado"], ["Serviço", cv.name], ["Prato do dia", s.canteen.menu || "—"], ["Almoço", `${n} pessoas · ${fmtMoney(n * cv.meal)}`], ["Moral por almoço", `+${cv.morale}`]],
        actions: [nx ? { label: `⬆️ ${nx.name} · ${fmtMoney(nx.cost)}`, attrs: `data-act="canteen" ${s.money < nx.cost ? "disabled" : ""}` } : null, tab("staff", "👥 Equipe")].filter(Boolean) };
    }
    case "laboratorio": {
      const r = s.lab.research, live = s.custom.filter(c => !c.retired).length;
      return { text: "Pesquise cores novas e crie lápis exclusivos no Estúdio.", stats: [["Nível", s.lab.level], ["Cores", `${s.lab.unlocked.length} de ${Object.keys(COLORS).length}`], ["Pesquisa", r ? `${COLORS[r.color].name} · ${Math.round((1 - r.left / r.total) * 100)}%` : "parada"], ["Seus lápis", `${live} de ${MAX_CUSTOM}`], ["Mercado", `${Math.round(marketShares(s).me * 100)}%`]],
        actions: [tab("cores", "🔬 Pesquisar cores"), tab("cores", "✏️ Estúdio de lápis")] };
    }
    case "estoque": return { text: "Grafite e lápis prontos esperando saída.", stats: [stock("graphite"), price("graphite"), ["Armazém", `nível ${s.warehouse}`]],
      actions: [buy("graphite"), s.warehouse < WAREHOUSE_CAP.length - 1 ? { label: `🏗️ Ampliar armazém · ${fmtMoney(WAREHOUSE_COST[s.warehouse + 1])}`, attrs: `data-act="warehouse" ${s.money < WAREHOUSE_COST[s.warehouse + 1] ? "disabled" : ""}` } : null].filter(Boolean) };
    case "acabamento": return { text: "Apontar, gravar a marca e embalar.", stats: [["Produzidos hoje", fmtInt(s.today.produced)], ["Total", fmtInt(s.stats.produced)], orderLine], actions: [{ label: "📋 Ver pedidos", attrs: `data-act="goto" data-target="orders"` }] };
    case "logistica": return { text: "Separação e carregamento dos pedidos.", stats: [["Em produção", `${s.active.length} / ${maxActive()}`], ["Ofertas no quadro", s.offers.length], ["Próximo prazo", order ? durationText(order.deadlineAt - s.clock) : "—"]], actions: [{ label: "📋 Ver pedidos", attrs: `data-act="goto" data-target="orders"` }] };
    case "expedicao": return { text: "Caminhões saem daqui com os pedidos.", stats: [["Entregues", s.stats.ordersDone], ["Perdidos", s.stats.ordersFailed], ["Faturamento", fmtMoney(s.stats.earned)]], actions: [{ label: "📋 Ver pedidos", attrs: `data-act="goto" data-target="orders"` }, tab("report", "📊 Relatório")] };
    case "admin": return { text: "Sala do CEO, Financeiro, Marketing, PCP, RH e DP.", stats: [["Caixa", fmtMoney(s.money)], ["Reputação", `${Math.round(s.reputation)}%`], ["Equipe", `${staffTotal} pessoa(s) · ${fmtMoney(wages)}/dia`], ["Gerente", s.staff.manager ? "👔 no comando" : "não contratado"]], actions: [s.meeting ? { label: "⏹️ Encerrar reunião", attrs: `data-act="meetend"` } : { label: "🤝 Convocar reunião", attrs: `data-act="meet" data-src="report"` }, tab("dir", "🏢 Diretoria"), tab("staff", s.staff.manager ? "👥 Equipe" : "👔 Contratar gerente")] };
    case "oficinas": {
      const need = STATIONS.filter(x => !s.stations[x.id].broken && s.stations[x.id].wear >= 5).length;
      return { text: "Manutenção e peças de reposição.", stats: [["Desgaste médio", `${Math.round(avgWear(s))}%`], ["Com defeito", STATIONS.filter(x => s.stations[x.id].broken).length], ["Técnico", s.staff.tech ? "contratado" : "não contratado"]],
        actions: [{ label: `🔧 Manutenção geral · ${fmtMoney(need * MAINT_COST)}`, attrs: `data-act="maintall" ${!need || s.money < need * MAINT_COST ? "disabled" : ""}` }, tab("staff", "👷 Contratar técnico")] };
    }
    case "cantina": return { text: "Lanches, café e suco para a equipe e para quem visita o museu.", stats: [["Lanches ontem", `${fmtInt(s.cantina?.lastSold || 0)} · ${fmtMoney(s.cantina?.lastRevenue || 0)}`], ["Lanches vendidos", fmtInt(s.cantina?.totalSold || 0)], ["Cardápio", "coxinha, pão de queijo, sanduíche, suco e café"], ["Movimento", s.morale >= 65 ? "cheia (equipe animada)" : "normal"]],
      actions: [tab("people", "🎉 Clube & Auditório"), { label: "🏛️ Ver o museu", attrs: `data-view="visitantes"` }] };
    case "ambulatorio": return { text: "Atendimento da equipe durante o turno, ao lado do auditório.", stats: [["Moral da equipe", Math.round(s.morale)], ["Enfermagem", "de plantão"], ["Brigada", hasFac("brigada", s) ? "✅ apoiando" : "ainda não construída"]], actions: [tab("staff", "👥 Equipe"), !hasFac("brigada", s) ? { label: "🚒 Ver obra da Brigada", attrs: `data-view="brigada"` } : null].filter(Boolean) };
    case "auditorio": {
      const t = s.talk;
      return { text: "Palestras para a equipe e para a comunidade.", stats: [["Agora", t ? `🎤 ${t.name}` : "livre"], ["Termina em", t ? durationText(t.endsAt - s.clock) : "—"], ["Moral da equipe", `${Math.round(s.morale)} · ${moraleText(s.morale)}`], ["Palestras feitas", s.stats.talks]],
        actions: [...TALKS.slice(0, 3).map(x => ({ label: `${x.icon} ${x.name} · ${fmtMoney(x.cost)}`, attrs: `data-act="talk" data-id="${x.id}" ${t || !s.running || s.money < x.cost ? "disabled" : ""}` })), tab("people", "🎉 Todas as palestras")] };
    }
    case "loja": {
      const sh = s.shop, p = SHOP_PRICES[sh.price];
      return { text: "Venda direta ao público, de frente para a rua.", stats: [["Estoque de lápis", `${fmtInt(sh.stock)} / ${SHOP_CAP[sh.level]}`], ["Preço", `${p.label} · ${fmtMoney(p.value * 10)} a dezena`], ["Vendas hoje", `${fmtInt(sh.soldToday)} · ${fmtMoney(sh.revenueToday)}`], ["Vendedores", `${s.staff.seller} / ${maxOf("seller", s)}`]],
        actions: [...Object.entries(SHOP_PRICES).map(([k, v]) => ({ label: `${k === sh.price ? "● " : ""}${v.label}`, attrs: `data-act="shopprice" data-price="${k}"` })), tab("shop", "🛍️ Loja & Feiras")] };
    }
    case "feira": {
      const f = s.fair && s.fair.day === s.day ? s.fair : null, today = fairOfDay(s.day), nd = nextFairDay(s.day);
      return { text: f ? `${f.name} — ${BOOTHS[f.size].label.toLowerCase()}` : today ? `${today.name} acontece hoje!` : `Próxima feira no dia ${nd}.`,
        stats: f ? [["Vendidos no estande", `${fmtInt(f.sold)} lápis · ${fmtMoney(f.revenue)}`], ["Candidatos", `${f.candidates.length} esperando`], ["Contratados aqui", f.hired], ["Estoque da loja", `${fmtInt(s.shop.stock)} lápis`]]
          : [["Estande", "ainda não montado"], ["Estoque da loja", `${fmtInt(s.shop.stock)} lápis`]],
        actions: f ? [...f.candidates.slice(0, 3).map(c => ({ label: `🤝 ${c.name} (${STAFF[c.role].name.split(" ")[0].toLowerCase()})`, attrs: `data-act="cand" data-id="${c.id}"` })), tab("shop", "🎪 Loja & Feiras")]
          : [...(today ? Object.entries(BOOTHS).map(([k, b]) => ({ label: `🎪 ${b.label.split(" ")[1]} · ${fmtMoney(b.cost)}`, attrs: `data-act="booth" data-size="${k}" ${!s.running || s.money < b.cost ? "disabled" : ""}` })) : []), tab("shop", "🎪 Loja & Feiras")] };
    }
    case "clube": {
      const p = s.party;
      return { text: "Festas e comemorações da equipe.", stats: [["Agora", p ? `🎉 ${p.name}` : "sem festa"], ["Termina em", p ? durationText(p.endsAt - s.clock) : "—"], ["Moral da equipe", `${Math.round(s.morale)} · ${moraleText(s.morale)}`], ["Festas feitas", s.stats.parties]],
        actions: [{ label: `🍻 Happy hour · ${fmtMoney(PARTY_SIZES.pequena.cost)}`, attrs: `data-act="party" data-size="pequena" ${p || s.money < PARTY_SIZES.pequena.cost ? "disabled" : ""}` },
          { label: `🎊 Festa da equipe · ${fmtMoney(PARTY_SIZES.media.cost)}`, attrs: `data-act="party" data-size="media" ${p || s.money < PARTY_SIZES.media.cost ? "disabled" : ""}` },
          tab("people", "✍️ Criar festa com nome")] };
    }
    case "caldeira": {
      const b = s.boiler, st = boilerStatus(b);
      const label = { repair: "em conserto", broken: "quebrada", off: "apagada", high: "pressão alta!", ok: "na faixa verde", low: "esquentando" }[st];
      return { text: "Queima lenha e manda vapor para a estufa de secagem.", stats: [["Pressão", `${Math.round(b.pressure)} psi · ${label}`], ["Fogo", `${b.fire} de 3`], ["Bônus na linha", `+${Math.round((boilerMult(s) - 1) * 100)}%`], ["Lenha (madeira)", `${fmtInt(s.stock.wood)} tábuas`], ["Desgaste", `${Math.round(b.wear)}%`]],
        actions: [
          { label: b.on ? "🔥 Apagar" : "🔥 Acender", attrs: `data-act="boiler-toggle" ${b.broken ? "disabled" : ""}` },
          { label: "Fogo −", attrs: `data-act="boiler-fire" data-d="-1" ${b.fire <= 1 ? "disabled" : ""}` },
          { label: "Fogo +", attrs: `data-act="boiler-fire" data-d="1" ${b.fire >= 3 ? "disabled" : ""}` },
          b.broken ? { label: `🔧 Consertar · ${fmtMoney(BOILER_REPAIR)}`, attrs: `data-act="boiler-repair" ${b.repair > 0 || s.money < BOILER_REPAIR ? "disabled" : ""}` } : { label: `🔧 Manutenção · ${fmtMoney(BOILER_MAINT)}`, attrs: `data-act="boiler-maint" ${b.wear < 5 || s.money < BOILER_MAINT ? "disabled" : ""}` },
          buy("wood")
        ] };
    }
    case "visitantes": {
      const u = museumUnlocked(s), next = MUSEUM_EXHIBITS[u];
      return { text: "A história do lápis — e da sua fábrica.", stats: [["Peças no acervo", `${u} de ${MUSEUM_EXHIBITS.length}`], ["Próxima peça", next ? `com ${next.goals} metas (você tem ${goalsDone})` : "acervo completo!"],
        ["Visitantes ontem", `${s.museum.lastVisitors} · ${fmtMoney(s.museum.lastRevenue)}`], ["Total de visitantes", fmtInt(s.museum.totalVisitors)], ["Reputação", `${Math.round(s.reputation)}% (mais reputação, mais público)`]],
        actions: [tab("goals", "🏆 Ver metas"), tab("brand", "🏷️ Marca")] };
    }
  }
  return {};
};

/* ============================================================
   SALVAR / CARREGAR
   ============================================================ */
function save() { if (simulating || window.GUEST_MODE) return; state.lastSeen = Date.now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, lackWarned: false, meeting: null })); } catch (_) { } }
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!saved || saved.version !== 2) return false;
    const base = defaultState();
    state = { ...base, ...saved, running: false, paused: false,
      stock: { ...base.stock, ...saved.stock }, prices: { ...base.prices, ...saved.prices },
      staff: { ...base.staff, ...saved.staff }, stats: { ...base.stats, ...saved.stats },
      today: { ...freshDay(), ...saved.today } };
    for (const x of STATIONS) state.stations[x.id] = { ...base.stations[x.id], ...(saved.stations?.[x.id] || {}) };
    state.brand = { ...base.brand, ...(saved.brand || {}) };
    state.managerPrefs = { ...base.managerPrefs, ...(saved.managerPrefs || {}) };
    state.boiler = { ...base.boiler, ...(saved.boiler || {}) };
    state.buffs = { ...base.buffs, ...(saved.buffs || {}) };
    if (!saved.soundOffV1) { state.sound = false; state.soundOffV1 = true; }
    state.museum = { ...base.museum, ...(saved.museum || {}) };
    state.cantina = { ...base.cantina, ...(saved.cantina || {}) };
    state.shop = { ...base.shop, ...(saved.shop || {}) };
    state.ceo = { ...base.ceo, ...(saved.ceo || {}) };
    state.canteen = { ...base.canteen, ...(saved.canteen || {}) };
    state.workDays = { ...base.workDays, ...(saved.workDays || {}) }; state.schedule = Array.isArray(saved.schedule) ? saved.schedule : [];
    state.facilities = saved.facilities && typeof saved.facilities === "object" ? saved.facilities : {};
    state.lines = clamp(Number(saved.lines) || 2, 1, MAX_LINES);   // jogos antigos já tinham o Galpão 2: viram 2 linhas
    for (const k of Object.keys(FACILITIES)) if (!state.facilities[k]) state.facilities[k] = { day: state.day - 3 };   // todas as obras já prontas
    state.lab = { ...base.lab, ...(saved.lab || {}) }; state.theme = { ...base.theme, ...(saved.theme || {}) };
    state.custom = Array.isArray(saved.custom) ? saved.custom : []; state.rivalFx = saved.rivalFx || {};
    registerCustomProducts();
    if (state.recruits && state.recruits.day !== state.day) state.recruits = null;
    state.extraSlots = { ...base.extraSlots, ...(saved.extraSlots || {}) };
    if (state.fair && state.fair.day !== state.day) state.fair = null;
    if (state.night) { state.night = false; state.day++; state.minute = DAY_START; }
    state.dayOff = false; while (isDayOff(state.day)) state.day++;
    return true;
  } catch (_) { return false; }
}
function newGame() {
  const keepSound = state.sound;
  const keepBrand = state.brand;
  clearInterval(nightTimer); nightTimer = null;
  state = defaultState(); state.sound = keepSound; state.tutorialSeen = true; state.brand = keepBrand; registerCustomProducts();
  for (const k in cache) delete cache[k];
  lastMoney = null; $("moneyDelta").innerHTML = "&nbsp;";
  addLog("Nova fábrica aberta. Boa sorte, gerente!");
  save(); render();
}

/* ============================================================
   EVENTOS DE INTERFACE
   ============================================================ */
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]");
  if (!b || b.disabled) return;
  const { act, id, res, lots, role } = b.dataset;
  if (act === "toggle") toggleStation(id);
  else if (act === "repair") repairStation(id);
  else if (act === "maint") maintainStation(id);
  else if (act === "upgrade") upgradeStation(id);
  else if (act === "buy") buyResource(res, Number(lots));
  else if (act === "warehouse") upgradeWarehouse();
  else if (act === "hire") hire(role);
  else if (act === "fire") fire(role);
  else if (act === "accept") acceptOffer(Number(id));
  else if (act === "decline") declineOffer(Number(id));
  else if (act === "prio") prioritize(Number(id));
  else if (act === "allon") allOn();
  else if (act === "maintall") maintainAll();
  else if (act === "generator") useGenerator();
  else if (act === "canteen") upgradeCanteen();
  else if (act === "build") buildFacility(b.dataset.id);
  else if (act === "tab") { selectTab(b.dataset.tab); document.querySelector(".manage").scrollIntoView({ behavior: "smooth", block: "start" }); }
  else if (act === "talk") startTalk(b.dataset.id);
  else if (act === "shopprice") setShopPrice(b.dataset.price);
  else if (act === "shopshare") { state.shop.share = Number(b.dataset.share); sfx.click(); addLog(`Loja: ${Math.round(state.shop.share * 100)}% da produção vai para as prateleiras durante os pedidos.`); render(); }
  else if (act === "dept") runDept(b.dataset.dept, b.dataset.id);
  else if (act === "meet") { if (b.dataset.src === "screen") startScreenShare(); else if (b.dataset.src === "slides") $("meetFiles").click(); else startMeeting("report"); }
  else if (act === "meetprev") meetStep(-1);
  else if (act === "meetnext") meetStep(1);
  else if (act === "meetend") endMeeting();
  else if (act === "viewadmin") { window.Factory3D?.setView("admin"); document.querySelector(".factory-view").scrollIntoView({ behavior: "smooth", block: "start" }); }
  else if (act === "shopup") upgradeShop();
  else if (act === "shopprod") { state.shop.produce = !state.shop.produce; sfx.click(); render(); }
  else if (act === "booth") startBooth(b.dataset.size);
  else if (act === "cand") hireCandidate(Number(b.dataset.id));
  else if (act === "viewbooth") { window.Factory3D?.setView("feira"); document.querySelector(".factory-view").scrollIntoView({ behavior: "smooth", block: "start" }); }
  else if (act === "viewshop") { window.Factory3D?.setView("loja"); document.querySelector(".factory-view").scrollIntoView({ behavior: "smooth", block: "start" }); }
  else if (act === "party") startParty(b.dataset.name || "", b.dataset.size);
  else if (act === "unsched") cancelScheduled(Number(b.dataset.id));
  else if (act === "buyline") buyLine();
  else if (act === "idea") { $("partyName").value = b.dataset.name; $("partyName").focus(); }
  else if (act === "boiler-toggle") toggleBoiler();
  else if (act === "boiler-fire") setFire(Number(b.dataset.d));
  else if (act === "boiler-repair") repairBoiler();
  else if (act === "boiler-maint") maintainBoiler();
  else if (act === "boiler-upgrade") upgradeBoiler();
  else if (act === "scrollto") $(b.dataset.target)?.scrollIntoView({ behavior: "smooth", block: "center" });
  else if (act === "goto") { if (b.dataset.target !== "orders") $("foldLine").open = true; document.querySelector(b.dataset.target === "orders" ? ".order-panel" : "#foldLine").scrollIntoView({ behavior: "smooth", block: "start" }); }
});
function selectTab(name) {
  document.querySelectorAll(".tabs [data-tab]").forEach(t => t.classList.toggle("active", t.dataset.tab === name));
  document.querySelectorAll(".tab-body").forEach(b => b.hidden = b.id !== `tab-${name}`);
}
document.querySelectorAll(".tabs [data-tab]").forEach(t => t.onclick = () => { selectTab(t.dataset.tab); sfx.click(); });

function startShift() {
  if (state.running || state.ended) return;
  state.running = true; state.paused = false;
  if (state.clock === 0 && !state.offers.length) { spawnOffer(); state.nextOfferAt = 40; }
  addLog("O turno começou."); sfx.click(); render();
}
function togglePause() { if (!state.running || state.night) return; state.paused = !state.paused; sfx.click(); render(); }
$("startBtn").onclick = startShift;
$("pauseBtn").onclick = togglePause;
$("allOnBtn").onclick = allOn;
$("generatorBtn").onclick = useGenerator;
$("skipNightBtn").onclick = () => { if (state.night) finishNight(); };
$("speedSelect").onchange = e => { state.speed = Number(e.target.value); render(); };
$("soundBtn").onclick = () => { state.sound = !state.sound; sfx.click(); render(); save(); };
$("tutorialBtn").onclick = () => { $("tutorialModal").hidden = true; modalOpen = false; state.tutorialSeen = true; save(); };
$("newGameBtn").onclick = () => {
  if (state.clock === 0 || state.ended) { newGame(); return; }
  if (modalOpen) return;
  openModal({ eyebrow: "NOVO JOGO", title: "Começar do zero?", kind: "info",
    html: "<p>O progresso atual será perdido. O nome e a logo da fábrica continuam.</p>",
    choices: [{ label: "Sim, começar de novo", primary: true, onPick: newGame }, { label: "Cancelar", onPick: () => {} }] });
};

document.addEventListener("keydown", e => {
  if (window.GUEST_MODE && !/^(Key[WASDEV]|Arrow|Escape|Enter|Shift)/.test(e.code)) return;
  if (e.target.closest("input, select, textarea") || e.ctrlKey || e.metaKey || e.altKey) return;
  if (modalOpen) return;
  if (window.Factory3D?.isWalking?.() && /^(Key[WASDE]|Arrow)/.test(e.code)) return;
  if (e.code === "Space") { e.preventDefault(); state.running ? togglePause() : startShift(); }
  else if (/^Digit[1-7]$/.test(e.code)) toggleStation(STATIONS[Number(e.code.slice(5)) - 1].id);
  else if (e.key.toLowerCase() === "l") allOn();
  else if (e.key.toLowerCase() === "c") toggleBoiler();
  else if (e.key.toLowerCase() === "v" && !window.Factory3D?.isWalking?.()) window.Factory3D?.toggleView();
});

/* Cliques em prédios da vista aérea abrem a aba correspondente */
window.onFactoryAction = action => {
  if (action === "market" || action === "staff") {
    selectTab(action);
    document.querySelector(".manage").scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (action === "orders") document.querySelector(".order-panel").scrollIntoView({ behavior: "smooth", block: "start" });
};
window.toggleStationBy3D = toggleStation;
document.addEventListener("change", e => {
  const box = e.target.closest("[data-pref]");
  if (!box) return;
  state.managerPrefs[box.dataset.pref] = box.checked;
  mgrLog(`${box.checked ? "agora pode" : "não vai mais"}: ${MANAGER_PREFS.find(p => p[0] === box.dataset.pref)[1].toLowerCase()}.`);
  save(); render();
});
let brandTimer = null;
$("brandNameInput").addEventListener("input", e => { state.brand.name = e.target.value.slice(0, 40) || "Fábrica de Lápis"; clearTimeout(brandTimer); brandTimer = setTimeout(() => { save(); render(); }, 250); });
$("brandLogoInput").addEventListener("change", e => { setBrandLogo(e.target.files[0]); e.target.value = ""; });
$("brandRemoveLogo").onclick = () => { state.brand.logo = null; save(); render(); };
$("ceoNameInput").addEventListener("input", e => { state.ceo.name = e.target.value.slice(0, 30); clearTimeout(brandTimer); brandTimer = setTimeout(() => { save(); render(); }, 250); });
$("ceoPhotoInput").addEventListener("change", e => { setCeoPhoto(e.target.files[0]); e.target.value = ""; });
$("ceoRemovePhoto").onclick = () => { state.ceo.photo = null; save(); render(); };
$("meetFiles").addEventListener("change", e => { loadSlides(e.target.files); e.target.value = ""; });
{ const bar = document.createElement("div"); bar.id = "meetingBar"; bar.className = "meeting-bar"; bar.hidden = true;
  bar.innerHTML = `<span id="meetingInfo"></span><button id="meetPrev" data-act="meetprev" aria-label="Slide anterior">◀</button><button id="meetNext" data-act="meetnext" aria-label="Próximo slide">▶</button><button data-act="meetend" class="danger">Encerrar reunião</button>`;
  $("factory3d").append(bar); }
document.addEventListener("keydown", e => { if (!state.meeting || e.target.closest("input, select, textarea")) return; if (e.key === "PageDown" || (e.key === "ArrowRight" && !window.Factory3D?.isWalking?.())) { meetStep(1); e.preventDefault(); } if (e.key === "PageUp" || (e.key === "ArrowLeft" && !window.Factory3D?.isWalking?.())) { meetStep(-1); e.preventDefault(); } });

/* ============================================================
   INÍCIO
   ============================================================ */
buildStations();
buildProdBoard();
const hadSave = load();
const awaySeconds = hadSave && state.lastSeen ? (Date.now() - state.lastSeen) / 1000 : 0;
if (!hadSave) state.today.repStart = state.reputation;
if (!state.tutorialSeen) { $("tutorialModal").hidden = false; modalOpen = true; }
if (hadSave && state.clock > 0) addLog(`Jogo carregado: dia ${state.day}, ${clockText()}.`);
else if (!state.log.length) addLog("Bem-vindo à sua fábrica de lápis!");
renderLog();
window.Factory3D?.init();
render();
if (state.ended) checkGameOverModalOnLoad();
else if (state.staff.manager && awaySeconds > 30) catchUp(awaySeconds, true);
function checkGameOverModalOnLoad() { state.ended = false; checkGameOver(); if (!state.ended) render(); }
let lastBeat = Date.now();
setInterval(() => {
  const now = Date.now(), gap = (now - lastBeat) / 1000; lastBeat = now;
  if (gap > 3) catchUp(gap - 1, gap > 300);
  tick();
}, 1000);
setInterval(managerLoop, 1200);
$("talkSchedBtn").onclick = () => { const t = TALKS.find(x => x.id === $("talkSchedId").value); if (t) scheduleEvent("talk", { talk: t.id, name: t.name }, Number($("talkSchedDay").value), Number($("talkSchedHour").value), t.cost); };
$("partySchedBtn").onclick = () => { const size = $("partySize").value, name = ($("partyName").value || "").trim().slice(0, 50) || pick(PARTY_IDEAS); scheduleEvent("party", { name, size }, Number($("partyDay").value), Number($("partyHour").value), PARTY_SIZES[size].cost); $("partyName").value = ""; };
document.addEventListener("change", e => {
  const box = e.target.closest("[data-workday]"); if (!box) return;
  state.workDays[box.dataset.workday] = box.checked;
  addLog(`Jornada: ${box.dataset.workday === "sat" ? "sábado" : "domingo"} ${box.checked ? "passa a ter expediente" : "vira folga"}.`);
  sfx.click(); save(); render();
});
$("partyForm").addEventListener("submit", e => { e.preventDefault(); startParty($("partyName").value, $("partySize").value); $("partyName").value = ""; });
$("partySize").addEventListener("change", () => render());
$("partyIdeas").innerHTML = PARTY_IDEAS.map(n => `<button type="button" class="idea" data-act="idea" data-name="${n}">${n}</button>`).join("");
/* música do clube: toca só com a vista do clube aberta e durante a festa */
let beat = 0;
setInterval(() => {
  if (!state.party || !state.sound || simulating || document.hidden || window.Factory3D?.getView?.() !== "clube") return;
  const bass = [131, 131, 165, 147], mel = [523, 659, 784, 659, 587, 698, 880, 698];
  tone(bass[Math.floor(beat / 2) % 4], .12, "square", 0, .02);
  if (beat % 2 === 0) tone(mel[(beat / 2) % 8], .1, "triangle", .02, .018);
  if (beat % 4 === 2) tone(2400 + Math.random() * 400, .03, "square", 0, .008);
  beat++;
}, 230);
window.addEventListener("pagehide", save);
document.addEventListener("visibilitychange", () => { if (document.hidden) save(); });

/* ============================================================
   FOCO: dentro de um prédio, a página mostra só o que é dele
   ============================================================ */
const FOCUS = {
  producao:    { line: "all", orders: true, what: "a linha, as máquinas e os pedidos" },
  caldeira:    { line: "boiler", what: "a caldeira" },
  oficinas:    { line: "stations", what: "as máquinas para manutenção" },
  acabamento:  { orders: true, what: "os pedidos" },
  logistica:   { orders: true, what: "os pedidos" },
  expedicao:   { orders: true, what: "os pedidos" },
  madeira:     { tab: "market", what: "a compra de materiais" },
  tintas:      { tab: "market", what: "a compra de materiais" },
  estoque:     { tab: "market", what: "a compra de materiais" },
  laboratorio: { tab: "cores", what: "o laboratório, o estúdio e os concorrentes" },
  admin:       { tab: "dir", what: "a diretoria e os departamentos" },
  loja:        { tab: "shop", what: "a loja e as feiras" },
  feira:       { tab: "shop", what: "a loja e as feiras" },
  auditorio:   { tab: "people", what: "palestras e festas" },
  ambulatorio: { tab: "staff", what: "a equipe" },
  cantina:     { what: "a cantina (é só passar, lanchar e ver o movimento)" },
  clube:       { tab: "people", what: "palestras e festas" },
  visitantes:  { what: "o museu (é só passear e olhar)" },
  qualidade:   { orders: true, what: "os pedidos que passam pelo controle" },
  mina:        { tab: "market", what: "a compra de grafite" },
  viveiro:     { tab: "market", what: "a compra de madeira" },
  portaria:    { orders: true, what: "os pedidos que chegam pela portaria" },
  treinamento: { tab: "staff", what: "a equipe" },
  creche:      { tab: "staff", what: "a equipe" },
  reciclagem:  { line: "boiler", what: "a caldeira que usa a lenha reciclada" },
  subestacao:  { line: "stations", what: "as máquinas que usam a energia" },
  brigada:     { line: "stations", what: "as máquinas (segurança e desgaste)" },
  refeitorio:  { tab: "staff", what: "a equipe que almoça aqui (o refeitório melhora pelo quadro da cena)" }
};
const focus = { view: "campus", off: false, prevTab: null, prevOpen: null };
function applyFocus() {
  const f = focus.off ? null : FOCUS[focus.view], b = document.body;
  b.classList.toggle("focus", !!f);
  b.classList.toggle("focus-line", !!f?.line);
  b.classList.toggle("focus-boiler", f?.line === "boiler");
  b.classList.toggle("focus-stations", f?.line === "stations");
  b.classList.toggle("focus-tab", !!f?.tab);
  b.classList.toggle("focus-orders", !!f?.orders);
  const bar = $("focusBar"), name = { producao: "Produção" }[focus.view] || document.querySelector(`#sectorSelect option[value="${focus.view}"]`)?.textContent?.replace(/^\S+\s/, "") || "";
  bar.hidden = focus.view === "campus";
  $("focusText").textContent = focus.off ? `Mostrando tudo. Você está em: ${name}.` : `Você está em: ${name}. Aqui embaixo fica só ${f?.what || "o que é daqui"}.`;
  $("focusAll").textContent = focus.off ? "Mostrar só daqui" : "Mostrar tudo";
  const fold = $("foldLine");
  if (f?.line && fold) { if (focus.prevOpen == null) focus.prevOpen = fold.open; fold.open = true; }
  else if (fold && focus.prevOpen != null) { fold.open = focus.prevOpen; focus.prevOpen = null; }
  if (f?.tab) { if (!focus.prevTab) focus.prevTab = document.querySelector(".tabs [data-tab].active")?.dataset.tab || "market"; selectTab(f.tab); }
  else if (focus.prevTab) { selectTab(focus.prevTab); focus.prevTab = null; }
}
window.addEventListener("factory:view", e => { focus.view = e.detail; focus.off = false; applyFocus(); });
$("focusAll").addEventListener("click", () => { focus.off = !focus.off; applyFocus(); });
