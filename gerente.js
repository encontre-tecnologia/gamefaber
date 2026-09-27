/* Nova Fábrica 3D · modo Gerente
   A lógica do primeiro jogo (turno, pedidos, matéria-prima, máquinas que gastam e quebram, equipe e gerente que toca a fábrica
   sozinho, inclusive com a página fechada) aplicada aos prédios reais de São Carlos. */
(function () {
  const NF = window.NF; if (!NF) return;
  const $ = id => document.getElementById(id);
  const SAVE = 'nf-gerente-v1', MODE = 'nfMode';

  /* ---------- regras ---------- */
  const DAY_START = 480, DAY_END = 1080, LUNCH = [720, 810], MIN_PER_SEC = 3.5;
  const BASE_RATE = .5, LEVEL_RATE = [0, 1, 1.5, 2.1], LEVEL_REL = [0, 1, 1.35, 1.8], UPGRADE = [0, 0, 450, 950];
  const REPAIR_COST = 80, MAINT_COST = 30, REPAIR_TIME = 20, TECH_TIME = 35, ENERGY = .028, FIXED = 120, BANKRUPT = -500;
  const ALMOX_CAP = [0, 300, 500, 800], ALMOX_UP = [0, 0, 400, 900];
  const RES = {
    wood: { n: 'Madeira', i: '🪵', u: 'tábuas', base: 1.4, lot: 50 },
    graphite: { n: 'Grafite', i: '⚫', u: 'kg', base: 2.6, lot: 40 },
    paint: { n: 'Tinta e pigmento', i: '🧪', u: 'L', base: 2.1, lot: 40 }
  };
  // etapas da produção, cada uma num prédio de verdade
  const ST = {
    mip: { n: 'MIP Faz Grafite Lapiseira', s: 'MIP', i: '⚫', d: 'Faz as minas de grafite.' },
    minas: { n: 'Minas Cor', s: 'Minas Cor', i: '🌈', d: 'Faz as minas coloridas.' },
    lac: { n: 'LAC Lápis Cru', s: 'LAC', i: '🪵', d: 'Coloca a mina na madeira e prensa o lápis cru.' },
    cic: { n: 'CIC Acabamento', s: 'CIC', i: '🎨', d: 'Pinta, imprime a marca e aponta. Rende mais com vapor da caldeira.', steam: 1 },
    gun: { n: 'GUN Brindes', s: 'GUN', i: '🎁', d: 'Personaliza lápis com logo de clientes.', lock: 3500 },
    cos: { n: 'Cosméticos 1', s: 'Cosméticos', i: '💄', d: 'Envasa lápis cosméticos (delineador, batom). Rende mais com vapor.', steam: 1, lock: 6000 },
    exp: { n: 'Expedição', s: 'Expedição', i: '📦', d: 'Embala e carrega os caminhões.' }
  };
  const PRODUCTS = {
    hb: { n: 'Lápis grafite HB', r: ['mip', 'lac', 'cic', 'exp'], use: { wood: .10, graphite: .06, paint: .04 }, price: 3.7 },
    cor: { n: 'Lápis de cor', r: ['minas', 'lac', 'cic', 'exp'], use: { wood: .10, graphite: .03, paint: .10 }, price: 4.8 },
    brinde: { n: 'Lápis personalizado', r: ['mip', 'lac', 'cic', 'gun', 'exp'], use: { wood: .10, graphite: .06, paint: .07 }, price: 6.4, need: 'gun' },
    cosm: { n: 'Lápis cosmético', r: ['cos', 'exp'], use: { wood: .05, graphite: 0, paint: .12 }, price: 7.2, need: 'cos' }
  };
  const STAFF = {
    manager: { n: 'Gerente geral', i: '👔', wage: 220, max: 1, d: 'Toca a fábrica sozinho: abre o turno, aceita pedidos, compra material, cuida das máquinas e da caldeira. Continua trabalhando com a página fechada (rende metade).' },
    tech: { n: 'Técnico de manutenção', i: '🔧', wage: 90, max: 2, d: 'Fica na Mecânica. Conserta máquinas sem custo e faz a preventiva quando o desgaste passa de 70%.' },
    operator: { n: 'Operador de linha', i: '👷', wage: 70, max: 4, d: 'Cada operador deixa todas as etapas 20% mais rápidas.' },
    buyer: { n: 'Comprador', i: '🧾', wage: 50, max: 1, d: 'Repõe a matéria-prima do Almoxarifado quando fica abaixo de 20%.' }
  };
  const CLIENTS = ['Papelaria Horizonte', 'Escola Primavera', 'Ateliê Central', 'Kalunga', 'Distribuidora Sol', 'Livraria Ponto Final', 'Colégio Aurora', 'Rede Papel & Cia', 'Prefeitura de São Carlos', 'Estúdio Traço Livre', 'USP São Carlos', 'Farmácia Bela Pele', 'Perfumaria Encanto', 'Banco Paulista (brindes)'];
  const CANTEEN = [0, { n: 'Marmitas', meal: 8, mor: 1 }, { n: 'Buffet', meal: 12, mor: 3, cost: 1800 }, { n: 'Restaurante com chef', meal: 16, mor: 5, cost: 4500 }];
  const LAB = [0, { n: 'Básico', bonus: 0 }, { n: 'Controle de qualidade', bonus: .08, cost: 1500 }, { n: 'Laboratório completo', bonus: .15, cost: 3500 }];
  const GOALS = [
    { t: 'Conclua o primeiro pedido', r: 100, c: s => s.stats.done >= 1 },
    { t: 'Produza 500 lápis', r: 150, c: s => s.stats.produced >= 500 },
    { t: 'Deixe a caldeira com vapor na faixa verde', r: 150, c: s => s.boiler.on && s.boiler.p >= 45 && s.boiler.p <= 95 },
    { t: 'Contrate alguém para a equipe', r: 120, c: s => Object.values(s.staff).some(n => n > 0) },
    { t: 'Faça uma manutenção preventiva', r: 80, c: s => s.stats.maint >= 1 },
    { t: 'Melhore uma etapa para o nível 2', r: 200, c: s => Object.values(s.st).some(x => x.level >= 2) },
    { t: 'Conclua 5 pedidos', r: 250, c: s => s.stats.done >= 5 },
    { t: 'Ative a linha da GUN Brindes', r: 300, c: s => s.unlock.gun },
    { t: 'Chegue a 85% de reputação', r: 300, c: s => s.rep >= 85 },
    { t: 'Produza 3.000 lápis', r: 400, c: s => s.stats.produced >= 3000 },
    { t: 'Ative a linha de Cosméticos', r: 500, c: s => s.unlock.cos },
    { t: 'Conclua 15 pedidos', r: 700, c: s => s.stats.done >= 15 },
    { t: 'Deixe todas as etapas no nível 3', r: 1000, c: s => Object.keys(ST).every(k => (ST[k].lock && !s.unlock[k]) || s.st[k].level >= 3) },
    { t: 'Tenha R$ 30.000 em caixa', r: 0, c: s => s.money >= 30000 }
  ];
  const EVENTS = [
    { t: 'Madeira fora do padrão', d: 'Um lote de tábuas chegou úmido. Usar assim mesmo desgasta o LAC.', o: [
      { l: 'Devolver o lote (perde 30 tábuas)', f: s => { s.stock.wood = Math.max(0, s.stock.wood - 30); } },
      { l: 'Usar assim mesmo (+20% de desgaste no LAC)', f: s => { s.st.lac.wear = Math.min(100, s.st.lac.wear + 20); } }] },
    { t: 'Visita de uma escola', d: 'Uma escola de São Carlos quer conhecer a fábrica hoje.', o: [
      { l: 'Receber a turma (+3% reputação, +3 moral)', f: s => { s.rep += 3; s.morale += 3; } },
      { l: 'Remarcar (−1% reputação)', f: s => { s.rep -= 1; } }] },
    { t: 'Queda de energia na Central', d: 'A Central de utilidades caiu. Sem energia, a produção para por cerca de 1 hora.', o: [
      { l: 'Ligar o gerador (R$ 150)', cost: 150, f: s => { } },
      { l: 'Esperar a energia voltar', f: s => { s.blackout = 60; } }] },
    { t: 'Pequeno acidente no LAC', d: 'Um operador machucou a mão. A Enfermaria atendeu na hora.', o: [
      { l: 'Palestra de segurança no Anfiteatro (R$ 300, +5 moral, menos quebras hoje)', cost: 300, f: s => { s.morale += 5; s.safety = s.clock + 600; } },
      { l: 'Seguir o turno (−4 moral)', f: s => { s.morale -= 4; } }] },
    { t: 'Fornecedor com promoção', d: 'O fornecedor de grafite oferece um lote com desconto.', o: [
      { l: 'Comprar 40 kg por R$ 70', cost: 70, f: s => { addStock(s, 'graphite', 40); } },
      { l: 'Agora não', f: s => { } }] },
    { t: 'Caminhão atrasado', d: 'A transportadora atrasou e a Expedição ficou lotada.', o: [
      { l: 'Pagar frete extra (R$ 120)', cost: 120, f: s => { } },
      { l: 'Esperar (Expedição fica 50% mais lenta por 2 horas)', f: s => { s.expSlow = s.clock + 120; } }] }
  ];

  /* ---------- estado ---------- */
  const fresh = () => ({
    v: 1, money: 2000, rep: 70, morale: 70, day: 1, minute: DAY_START, clock: 0, running: false, speed: 1,
    stock: { wood: 160, graphite: 100, paint: 90 }, prices: { wood: 1.4, graphite: 2.6, paint: 2.1 }, almox: 1,
    st: Object.fromEntries(Object.keys(ST).map(k => [k, { on: false, broken: false, wear: 0, level: 1, repair: 0, tech: false }])),
    boiler: { on: false, p: 0, wear: 0, broken: false, repair: 0 },
    staff: { manager: 0, tech: 0, operator: 0, buyer: 0 },
    prefs: { orders: true, buy: true, machines: true, events: true },
    unlock: { gun: false, cos: false }, canteen: 1, lab: 1,
    offers: [], active: [], nextOfferAt: 20, nextEventAt: 160, nextId: 1, blackout: 0, safety: 0, expSlow: 0,
    today: fd(), stats: { produced: 0, done: 0, failed: 0, earned: 0, maint: 0, repairs: 0 }, goals: {}, log: [], history: [], lastSeen: Date.now(), over: false
  });
  function fd() { return { income: 0, spent: 0, produced: 0, orders: 0, failed: 0 }; }
  let S = fresh(), sim = false, modal = null, eventOpen = null;
  try { const raw = localStorage.getItem(SAVE); if (raw) { const o = JSON.parse(raw); if (o && o.v === 1) S = Object.assign(fresh(), o); } } catch (e) { }
  const save = () => { if (sim) return; S.lastSeen = Date.now(); try { localStorage.setItem(SAVE, JSON.stringify(S)); } catch (e) { } };

  /* ---------- utilidades ---------- */
  const money = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const int = v => Math.floor(v).toLocaleString('pt-BR');
  const rand = (a, b) => a + Math.random() * (b - a), pick = l => l[Math.floor(Math.random() * l.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const clock = (m = S.minute) => { const h = Math.floor(m / 60) % 24, mm = Math.floor(m % 60); return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); };
  const cap = () => ALMOX_CAP[S.almox];
  function addStock(s, r, n) { s.stock[r] = Math.min(ALMOX_CAP[s.almox], s.stock[r] + n); }
  function spend(v) { S.money -= v; S.today.spent += v; }
  function earn(v) { S.money += v; S.today.income += v; S.stats.earned += v; }
  function log(t, k) { S.log.unshift({ d: S.day, h: clock(), t, k: k || '' }); S.log.length = Math.min(S.log.length, 60); }
  const available = k => !ST[k].lock || S.unlock[k];
  const lunch = () => S.minute >= LUNCH[0] && S.minute < LUNCH[1];
  const moraleMult = () => .9 + clamp(S.morale, 0, 100) / 500;
  const steamOk = () => S.boiler.on && !S.boiler.broken && S.boiler.p >= 45 && S.boiler.p <= 95;
  function rate(k) {
    const x = S.st[k]; if (!x.on || x.broken || !available(k)) return 0;
    let r = BASE_RATE * LEVEL_RATE[x.level] * (1 + .2 * S.staff.operator) * moraleMult();
    if (ST[k].steam) r *= steamOk() ? 1.25 : .8;
    if (k === 'exp' && S.clock < S.expSlow) r *= .5;
    return r;
  }
  const routeRate = p => Math.min(...PRODUCTS[p].r.map(rate));
  const headcount = () => 40 + S.staff.operator * 6 + S.staff.tech + S.staff.buyer + S.staff.manager;

  /* ---------- ações ---------- */
  function toggleSt(k) { const x = S.st[k]; if (!available(k)) return; if (x.broken) return toast('Essa etapa está quebrada. Mande consertar.', 'bad'); x.on = !x.on; render(); }
  function allOn(v = true) { Object.keys(ST).forEach(k => { if (available(k) && !S.st[k].broken) S.st[k].on = v; }); render(); }
  function repair(k) { const x = S.st[k]; if (!x.broken || x.repair) return; if (!S.staff.tech) { if (S.money < REPAIR_COST) return toast('Sem dinheiro para o conserto.', 'bad'); spend(REPAIR_COST); } x.repair = S.staff.tech ? TECH_TIME : REPAIR_TIME; x.tech = !!S.staff.tech; log(`Conserto da ${ST[k].s} iniciado.`); render(); }
  function maint(k) { const x = S.st[k]; if (x.broken) return; if (S.money < MAINT_COST) return toast('Sem dinheiro.', 'bad'); spend(MAINT_COST); x.wear = 0; S.stats.maint++; log(`Manutenção preventiva na ${ST[k].s}.`); render(); }
  function upgrade(k) { const x = S.st[k]; if (x.level >= 3) return; const c = UPGRADE[x.level + 1]; if (S.money < c) return toast('Sem dinheiro para a melhoria.', 'bad'); spend(c); x.level++; log(`${ST[k].s} melhorada para o nível ${x.level}.`, 'good'); toast(`${ST[k].s} agora é nível ${x.level}!`, 'good'); render(); }
  function unlock(k) { const c = ST[k].lock; if (S.unlock[k]) return; if (S.money < c) return toast('Sem dinheiro para ativar a linha.', 'bad'); spend(c); S.unlock[k] = true; log(`Linha ${ST[k].s} ativada.`, 'good'); toast(`Linha ${ST[k].s} ativada! Novos pedidos vão chegar.`, 'good'); render(); }
  function buy(r, lots = 1) { const n = RES[r].lot * lots, c = Math.ceil(n * S.prices[r]); if (S.money < c) return toast('Sem dinheiro para comprar.', 'bad'); if (S.stock[r] >= cap()) return toast('O Almoxarifado está cheio.', 'bad'); spend(c); addStock(S, r, n); log(`Compra: ${n} ${RES[r].u} de ${RES[r].n.toLowerCase()} (${money(c)}).`); render(); }
  function upAlmox() { if (S.almox >= 3) return; const c = ALMOX_UP[S.almox + 1]; if (S.money < c) return toast('Sem dinheiro.', 'bad'); spend(c); S.almox++; log(`Almoxarifado ampliado para ${ALMOX_CAP[S.almox]} por item.`, 'good'); render(); }
  function hire(r) { if (S.staff[r] >= STAFF[r].max) return; S.staff[r]++; log(`Contratado: ${STAFF[r].n}.`, 'good'); toast(`${STAFF[r].i} ${STAFF[r].n} contratado!`, 'good'); render(); }
  function fire(r) { if (!S.staff[r]) return; S.staff[r]--; S.morale -= 3; log(`Demitido: ${STAFF[r].n}.`); render(); }
  function toggleBoiler() { const b = S.boiler; if (b.broken) return toast('A caldeira está quebrada.', 'bad'); b.on = !b.on; log(b.on ? 'Caldeira acesa.' : 'Caldeira apagada.'); render(); }
  function repairBoiler() { const b = S.boiler; if (!b.broken || b.repair) return; if (S.money < 120) return toast('Sem dinheiro.', 'bad'); spend(120); b.repair = 30; log('Conserto da caldeira iniciado.'); render(); }
  function maintBoiler() { const b = S.boiler; if (b.broken) return; if (S.money < 40) return; spend(40); b.wear = 0; S.stats.maint++; log('Manutenção na caldeira.'); render(); }
  function upCanteen() { const n = CANTEEN[S.canteen + 1]; if (!n) return; if (S.money < n.cost) return toast('Sem dinheiro.', 'bad'); spend(n.cost); S.canteen++; S.morale += 6; log(`Refeitório agora serve ${n.n.toLowerCase()}.`, 'good'); render(); }
  function upLab() { const n = LAB[S.lab + 1]; if (!n) return; if (S.money < n.cost) return toast('Sem dinheiro.', 'bad'); spend(n.cost); S.lab++; log(`Laboratório: ${n.n}. Pedidos pagam ${Math.round(n.bonus * 100)}% a mais.`, 'good'); render(); }
  function talk() { if (S.money < 300) return toast('Sem dinheiro.', 'bad'); spend(300); S.morale += 5; S.safety = S.clock + 600; log('Palestra de segurança no Anfiteatro: +5 moral e menos quebras hoje.', 'good'); render(); }
  function startShift() { if (S.running || S.over) return; S.running = true; S.minute = DAY_START; S.today = fd(); log(`Turno do dia ${S.day} aberto.`); NF.setNight && NF.setNight(false); render(); }

  function spawnOffer() {
    const keys = Object.keys(PRODUCTS).filter(k => !PRODUCTS[k].need || S.unlock[PRODUCTS[k].need]);
    const p = pick(keys), P = PRODUCTS[p], growth = 1 + (S.day - 1) * .12;
    const amount = Math.round(rand(80, 200) * growth / 10) * 10, urgent = Math.random() < .22, f = urgent ? 1.2 : rand(1.6, 2.1);
    const deadline = Math.round((amount / BASE_RATE * f + 60) / 10) * 10;
    const reward = Math.round(amount * P.price * (.75 + S.rep / 200) * (urgent ? 1.45 : 1) * (1 + LAB[S.lab].bonus) / 10) * 10;
    S.offers.push({ id: S.nextId++, p, client: pick(CLIENTS), amount, reward, deadline, urgent, exp: S.clock + 180 });
    if (!sim) toast(urgent ? 'Novo pedido URGENTE chegou!' : 'Novo pedido chegou.', urgent ? 'warn' : '');
  }
  function accept(id) { if (!S.running) return toast('Abra o turno primeiro.'); if (S.active.length >= 4) return toast('Já tem 4 pedidos em produção.', 'bad'); const i = S.offers.findIndex(o => o.id === id); if (i < 0) return; const o = S.offers.splice(i, 1)[0]; o.done = 0; o.due = S.clock + o.deadline; S.active.push(o); log(`Pedido aceito: ${o.amount} × ${PRODUCTS[o.p].n} para ${o.client}.`); const miss = PRODUCTS[o.p].r.filter(k => !S.st[k].on); if (miss.length && !sim) toast('Ligue as etapas: ' + miss.map(k => ST[k].s).join(', ')); render(); }
  function decline(id) { S.offers = S.offers.filter(o => o.id !== id); render(); }
  function first(id) { const i = S.active.findIndex(o => o.id === id); if (i > 0) { const [o] = S.active.splice(i, 1); S.active.unshift(o); render(); } }
  function complete(o) { earn(o.reward); const early = (o.due - S.clock) / o.deadline > .4; S.rep += 3 + (early ? 1 : 0); S.morale += 1; S.stats.done++; S.today.orders++; S.active = S.active.filter(x => x !== o); log(`Pedido de ${o.client} entregue pela Expedição: +${money(o.reward)}.`, 'good'); if (!sim) toast(`🚚 Pedido entregue! +${money(o.reward)}`, 'good'); }
  function expire(o) { const ratio = o.done / o.amount; S.active = S.active.filter(x => x !== o); S.stats.failed++; S.today.failed++; S.morale -= 3; if (ratio >= .6) { const pay = Math.round(o.reward * ratio * .6 / 10) * 10; earn(pay); S.rep -= 4; log(`Prazo de ${o.client} venceu: entrega parcial, +${money(pay)} e −4% de reputação.`, 'bad'); } else { S.rep -= 8; log(`Prazo de ${o.client} venceu sem entrega: −8% de reputação.`, 'bad'); } if (!sim) toast('Um pedido passou do prazo!', 'bad'); }

  /* ---------- um passo do relógio ---------- */
  function step(dm) {
    if (!S.running || S.over || eventOpen) return;
    S.clock += dm; S.minute += dm;
    const onCount = Object.keys(ST).filter(k => S.st[k].on && available(k)).length;
    if (S.blackout > 0) { S.blackout -= dm; }
    else spend(onCount * ENERGY * dm);
    // pedidos chegam e vencem
    S.offers = S.offers.filter(o => o.exp > S.clock);
    if (S.clock >= S.nextOfferAt && S.offers.length < 3) { spawnOffer(); S.nextOfferAt = S.clock + rand(50, 100); }
    // produção: cada pedido passa pelas etapas do seu roteiro, dividindo a capacidade
    let made = 0;
    if (!lunch() && S.blackout <= 0) {
      const capa = {}; Object.keys(ST).forEach(k => capa[k] = rate(k) * dm);
      for (const o of S.active) {
        const P = PRODUCTS[o.p]; let u = Math.min(...P.r.map(k => capa[k]), o.amount - o.done);
        for (const r in RES) if (P.use[r]) u = Math.min(u, S.stock[r] / P.use[r]);
        u = Math.max(0, u); if (u <= 0) continue;
        P.r.forEach(k => capa[k] -= u); for (const r in RES) S.stock[r] = Math.max(0, S.stock[r] - u * P.use[r]);
        o.done += u; made += u;
        P.r.forEach(k => S.st[k].busy = S.clock);
      }
      if (S.active.length && !made && !S.lackWarn) { const o = S.active[0], P = PRODUCTS[o.p], miss = Object.keys(RES).filter(r => P.use[r] && S.stock[r] < P.use[r] * 2); if (miss.length) { S.lackWarn = true; log('Falta matéria-prima no Almoxarifado: ' + miss.map(r => RES[r].n.toLowerCase()).join(', ') + '.', 'bad'); if (!sim) toast('Falta ' + miss.map(r => RES[r].n.toLowerCase()).join(' e ') + '!', 'bad'); } }
      if (made) S.lackWarn = false;
    }
    S.stats.produced += made; S.today.produced += made;
    S.active.filter(o => o.done >= o.amount - .01).forEach(complete);
    S.active.filter(o => S.clock > o.due).forEach(expire);
    // caldeira: queima lenha, sobe pressão e se desgasta
    const b = S.boiler;
    if (b.repair > 0) { b.repair -= dm; if (b.repair <= 0) { b.repair = 0; b.broken = false; b.wear = 10; log('Caldeira consertada.', 'good'); } }
    if (b.on && !b.broken) { spend(.05 * dm); S.stock.wood = Math.max(0, S.stock.wood - .015 * dm); b.p = clamp(b.p + (70 - b.p) * .04 * dm + rand(-1, 1), 0, 110); b.wear = Math.min(100, b.wear + .02 * dm); if (b.wear > 75 && Math.random() < .0015 * dm) { b.broken = true; b.on = false; b.p = 0; log('A caldeira parou! Sem vapor, o CIC e os Cosméticos rendem menos.', 'bad'); if (!sim) toast('🔥 A caldeira quebrou!', 'bad'); } }
    else b.p = Math.max(0, b.p - 2 * dm);
    // desgaste, quebras e consertos das etapas
    const risk = (1.3 - clamp(S.morale, 0, 100) * .006) * (S.clock < S.safety ? .6 : 1);
    for (const k in ST) {
      const x = S.st[k];
      if (x.repair > 0) { x.repair -= dm; if (x.repair <= 0) { x.repair = 0; x.broken = false; x.wear = 5; S.stats.repairs++; log(`${ST[k].s} voltou a funcionar.`, 'good'); } continue; }
      if (!x.on || x.broken || x.busy !== S.clock) continue;
      x.wear = Math.min(100, x.wear + .06 * dm / LEVEL_REL[x.level]);
      if (S.staff.tech && x.wear > 70) { x.wear = 0; S.stats.maint++; log(`Técnico fez a preventiva na ${ST[k].s}.`); }
      else if (x.wear > 55 && Math.random() < .0009 * dm * (x.wear / 55) * risk) { x.broken = true; x.on = false; log(`A ${ST[k].s} quebrou!`, 'bad'); if (!sim) toast(`⚠️ ${ST[k].s} quebrou!`, 'bad'); if (S.staff.tech) repair(k); }
    }
    // almoço no Refeitório
    if (!S.lunchDone && S.minute >= LUNCH[0]) { S.lunchDone = true; const c = CANTEEN[S.canteen]; spend(c.meal * headcount() / 10); S.morale += c.mor; log(`Almoço no Refeitório (${c.n.toLowerCase()}): +${c.mor} moral.`); }
    // acontecimentos
    if (S.clock >= S.nextEventAt) { S.nextEventAt = S.clock + rand(180, 320); openEvent(pick(EVENTS)); }
    S.morale = clamp(S.morale, 0, 100); S.rep = clamp(S.rep, 0, 100);
    checkGoals();
    if (S.minute >= DAY_END) endDay();
    if (S.money < BANKRUPT && !S.over) { S.over = true; S.running = false; log('A fábrica faliu.', 'bad'); if (!sim) showBankrupt(); }
  }
  function endDay() {
    S.running = false; S.lunchDone = false;
    const wages = Object.keys(STAFF).reduce((a, r) => a + STAFF[r].wage * S.staff[r], 0);
    spend(wages + FIXED);
    for (const r in RES) S.prices[r] = +(RES[r].base * rand(.85, 1.2)).toFixed(2);
    const rep = { day: S.day, ...S.today, wages: wages + FIXED, money: S.money };
    S.history.unshift(rep); S.history.length = Math.min(S.history.length, 14);
    log(`Fim do dia ${S.day}: produziu ${int(S.today.produced)} lápis, entregou ${S.today.orders} pedido(s). Salários e custos fixos: ${money(wages + FIXED)}.`);
    S.day++; S.minute = DAY_START;
    if (!sim) { NF.setNight && NF.setNight(true); showDay(rep); }
  }
  function checkGoals() { GOALS.forEach((g, i) => { if (!S.goals[i] && g.c(S)) { S.goals[i] = 1; if (g.r) earn(g.r); log(`Meta cumprida: ${g.t}${g.r ? ' (+' + money(g.r) + ')' : ''}.`, 'good'); if (!sim) toast(`🏆 Meta: ${g.t}`, 'good'); } }); }

  /* ---------- gerente geral: decide sozinho ---------- */
  function bestOffer() {
    let best = null, sc = -1e9;
    for (const o of S.offers) {
      const P = PRODUCTS[o.p], r = Math.max(.01, Math.min(...P.r.map(k => BASE_RATE * LEVEL_RATE[S.st[k].level] * (1 + .2 * S.staff.operator))));
      const backlog = S.active.filter(a => PRODUCTS[a.p].r.some(k => P.r.includes(k))).reduce((a, x) => a + (x.amount - x.done), 0) / r;
      if (backlog + o.amount / r > o.deadline * .9) continue;
      const mat = Object.keys(RES).reduce((a, k) => a + Math.max(0, P.use[k] * o.amount - S.stock[k]) * S.prices[k], 0);
      if (mat > S.money - 100) continue;
      const v = (o.reward - mat) / (o.amount / r); if (v > sc) { sc = v; best = o; }
    }
    return best;
  }
  function buyer(force) {
    const c = cap();
    for (const r in RES) {
      const need = S.active.reduce((a, o) => a + PRODUCTS[o.p].use[r] * (o.amount - o.done), 0);
      const target = Math.min(c * .95, Math.max(need * 1.1, c * .25));
      if (S.stock[r] >= (force ? target : c * .2)) continue;
      let lots = Math.max(1, Math.min(4, Math.ceil((target - S.stock[r]) / RES[r].lot)));
      while (lots > 1 && RES[r].lot * lots * S.prices[r] > S.money - 100) lots--;
      if (RES[r].lot * lots * S.prices[r] > S.money - 50) continue;
      buy(r, lots); return true;
    }
    return false;
  }
  function managerLoop() {
    if (!S.staff.manager || S.over) return;
    const P = S.prefs;
    if (eventOpen && P.events) { if (sim || Date.now() - eventOpen.at > 2500) chooseEvent(eventOpen.ev.o.findIndex(o => !o.cost || o.cost <= S.money), true); return; }
    if (modal === 'day' && P.events) { if (sim || Date.now() - modalAt > 3000) { closeModal(); startShift(); log('👔 Gerente abriu o turno.'); } return; }
    if (!S.running) { if (!modal) { startShift(); log('👔 Gerente abriu o turno.'); } return; }
    if (P.machines) {
      for (const k in ST) { const x = S.st[k]; if (!available(k)) continue; if (x.broken && !x.repair && (S.staff.tech || S.money >= REPAIR_COST)) { repair(k); log(`👔 Gerente mandou consertar a ${ST[k].s}.`); return; } if (!x.broken && !S.staff.tech && x.wear >= 60 && S.money >= MAINT_COST + 50) { maint(k); log(`👔 Gerente fez preventiva na ${ST[k].s}.`); return; } }
      const b = S.boiler;
      if (b.broken && !b.repair && S.money >= 200) { repairBoiler(); log('👔 Gerente chamou o conserto da caldeira.'); return; }
      if (!b.broken && b.wear >= 65 && S.money >= 90) { maintBoiler(); return; }
      const needSteam = S.active.some(o => PRODUCTS[o.p].r.some(k => ST[k].steam));
      if (needSteam && !b.on && !b.broken && !b.repair) { toggleBoiler(); log('👔 Gerente acendeu a caldeira.'); return; }
      if (!S.active.length && b.on) { toggleBoiler(); return; }
      const need = new Set(S.active.flatMap(o => PRODUCTS[o.p].r));
      for (const k in ST) { const x = S.st[k]; if (x.broken || !available(k)) continue; const want = need.has(k); if (x.on !== want) { x.on = want; if (want) log(`👔 Gerente ligou a ${ST[k].s}.`); } }
    }
    if (P.orders && S.active.length < 4 && S.offers.length) { const o = bestOffer(); if (o) { accept(o.id); log(`👔 Gerente aceitou o pedido de ${o.client} (${money(o.reward)}).`); return; } }
    if (P.buy && !S.staff.buyer) buyer(true);
  }

  /* ---------- com a página fechada ---------- */
  function catchUp() {
    if (!S.staff.manager || S.over) return;
    const away = Math.min((Date.now() - (S.lastSeen || Date.now())) / 1000, 12 * 3600);
    if (away < 30) return;
    const before = { money: S.money, prod: S.stats.produced, done: S.stats.done, day: S.day };
    sim = true; const n = Math.floor(away * .5);
    try { for (let i = 0; i < n && !S.over; i++) { managerLoop(); if (S.staff.buyer) buyer(false); step(MIN_PER_SEC); } } finally { sim = false; }
    closeModal(); if (eventOpen) { const ev = eventOpen.ev; eventOpen = null; setTimeout(() => openEvent(ev), 400); }
    const h = away >= 3600 ? `${Math.floor(away / 3600)}h${String(Math.floor(away % 3600 / 60)).padStart(2, '0')}` : `${Math.round(away / 60)} min`;
    showModal(`<div class="ey">ENQUANTO VOCÊ ESTAVA FORA · ${h}</div><h3>👔 O gerente cuidou da fábrica</h3>
      <div class="gr"><div><span>Caixa</span><b class="${S.money >= before.money ? 'up' : 'dn'}">${S.money >= before.money ? '+' : ''}${money(S.money - before.money)}</b></div><div><span>Lápis produzidos</span><b>${int(S.stats.produced - before.prod)}</b></div><div><span>Pedidos entregues</span><b>${S.stats.done - before.done}</b></div><div><span>Dias trabalhados</span><b>${S.day - before.day}</b></div></div>
      <p class="mut">Longe de você o gerente rende metade. O diário mostra tudo o que ele decidiu.</p>`, [['Continuar', () => closeModal()]]);
  }

  /* ---------- interface ---------- */
  const css = document.createElement('style');
  css.textContent = `
  #gHud[hidden],#gPan[hidden],#gMarks[hidden],#gModal[hidden]{display:none!important}
  #gHud{position:absolute;left:14px;top:14px;z-index:8;display:flex;gap:6px;align-items:center;flex-wrap:wrap;max-width:calc(100% - 28px);font:600 13px/1 system-ui,-apple-system,"Segoe UI",sans-serif;color:#e8eaed}
  #gHud .pill{background:rgba(32,33,36,.94);border-radius:20px;padding:8px 12px;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;gap:6px;align-items:center;white-space:nowrap;font-variant-numeric:tabular-nums}
  #gHud .money b{color:#f2c230}#gHud .money b.neg{color:#ff8a80}
  #gHud button{background:#2f6a4a;color:#fff;border:0;border-radius:20px;padding:8px 13px;font:600 13px system-ui,sans-serif;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.35)}
  #gHud button.sec{background:rgba(32,33,36,.94)}#gHud button.on{background:#f2c230;color:#1b1b1b}
  #gHud .spd{display:flex;background:rgba(32,33,36,.94);border-radius:20px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.35)}#gHud .spd button{box-shadow:none;border-radius:0;background:none;padding:8px 10px}#gHud .spd button.on{background:#3a3c40;color:#f2c230}
  body.ger #prodInfo{top:64px}
  body.ger #hint{display:none!important}
  #gPan{position:absolute;right:14px;top:14px;bottom:96px;width:370px;max-width:calc(100% - 28px);z-index:9;background:rgba(24,26,28,.97);color:#e8eaed;border-radius:16px;box-shadow:0 8px 28px rgba(0,0,0,.5);display:flex;flex-direction:column;font:13px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;overflow:hidden}
  #gPan .hd{display:flex;align-items:center;gap:8px;padding:12px 14px 8px}#gPan .hd b{font-size:15px;flex:1}#gPan .x{background:none;border:0;color:#e8eaed;font-size:18px;cursor:pointer}
  #gPan .tabs{display:flex;gap:4px;padding:0 10px 8px;overflow-x:auto;scrollbar-width:none}#gPan .tabs button{flex:none;background:#2a2c30;color:#c9ccd1;border:0;border-radius:16px;padding:6px 11px;font:600 12px system-ui,sans-serif;cursor:pointer}#gPan .tabs button.on{background:#2f6a4a;color:#fff}
  #gPan{user-select:none;-webkit-user-select:none}#gPan .bd{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:4px 14px 14px;-webkit-overflow-scrolling:touch;touch-action:pan-y;scrollbar-width:thin;scrollbar-color:#5f6368 transparent;cursor:grab}#gPan .bd.drag{cursor:grabbing}#gPan .bd::-webkit-scrollbar{width:8px}#gPan .bd::-webkit-scrollbar-thumb{background:#5f6368;border-radius:4px}
  #gPan .card{background:#222428;border:1px solid #33363b;border-radius:12px;padding:10px 12px;margin:8px 0}
  #gPan .card h4{margin:0 0 4px;font-size:13.5px;display:flex;justify-content:space-between;gap:8px}#gPan .mut{color:#9aa0a6;font-size:12px;margin:2px 0}
  #gPan .row{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}#gPan .row button,#gModal button{background:#2f6a4a;color:#fff;border:0;border-radius:16px;padding:6px 11px;font:600 12px system-ui,sans-serif;cursor:pointer}
  #gPan .row button.sec,#gModal button.sec{background:#3a3c40}#gPan .row button:disabled{opacity:.45;cursor:default}
  #gPan .bar2{height:6px;background:#33363b;border-radius:3px;overflow:hidden;margin:6px 0 2px}#gPan .bar2 i{display:block;height:100%;background:#3fae5a;border-radius:3px}#gPan .bar2 i.w{background:#f2a33a}#gPan .bar2 i.r{background:#e8554a}
  #gPan .tag{font-size:11px;border-radius:10px;padding:2px 8px;font-weight:700;white-space:nowrap}.t-ok{background:#1f5a3a;color:#bff0cf}.t-off{background:#3a3c40;color:#c9ccd1}.t-bad{background:#6a1f1b;color:#ffc9c3}.t-warn{background:#6a4c12;color:#ffe3a8}
  #gPan .kv{display:grid;grid-template-columns:1fr auto;gap:4px 10px;font-variant-numeric:tabular-nums}#gPan .kv span{color:#9aa0a6}
  #gPan .log div{padding:5px 0;border-bottom:1px solid #2a2c30;font-size:12px}#gPan .log .good{color:#9fe0b4}#gPan .log .bad{color:#ffb4ab}#gPan .log small{color:#80868b;margin-right:6px}
  #gPan label.sw{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 0}
  #gToast{position:absolute;left:50%;top:64px;transform:translateX(-50%);z-index:12;display:flex;flex-direction:column;gap:6px;align-items:center;pointer-events:none}
  #gToast div{background:rgba(32,33,36,.96);color:#e8eaed;border-radius:12px;padding:8px 14px;font:600 13px system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.4);animation:gT .25s ease}
  #gToast .good{border-left:4px solid #3fae5a}#gToast .bad{border-left:4px solid #e8554a}#gToast .warn{border-left:4px solid #f2c230}
  @keyframes gT{from{opacity:0;transform:translateY(-6px)}}
  #gMarks{position:absolute;inset:0;pointer-events:none;z-index:5;overflow:hidden}
  #gMarks div{position:absolute;left:0;top:0;transform:translate(-50%,-100%);font:700 11px/1 system-ui,sans-serif;padding:5px 8px;border-radius:12px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.35);pointer-events:auto;cursor:pointer}
  #gMarks .ok{background:#2f6a4a;color:#fff}#gMarks .off{background:#5f6368;color:#fff}#gMarks .bad{background:#c62828;color:#fff;outline:2px solid #ffcdd2}#gMarks .lock{background:#3a3c40;color:#c9ccd1}
  #gModal{position:absolute;inset:0;z-index:20;background:rgba(0,0,0,.45);display:grid;place-items:center;padding:16px}
  #gModal .box{background:#1f2124;color:#e8eaed;border-radius:18px;padding:20px;max-width:440px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,.6);font:14px/1.5 system-ui,sans-serif;max-height:calc(100% - 32px);overflow-y:auto}
  #gModal h3{margin:4px 0 10px;font-size:19px;text-wrap:balance}#gModal .ey{font:700 11px system-ui,sans-serif;letter-spacing:.08em;color:#9fd3b0}#gModal .mut{color:#9aa0a6;font-size:12.5px}
  #gModal .gr{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}#gModal .gr div{background:#2a2c30;border-radius:10px;padding:8px 10px}#gModal .gr span{display:block;color:#9aa0a6;font-size:11.5px}#gModal .gr b{font-size:16px;font-variant-numeric:tabular-nums}#gModal .up{color:#9fe0b4}#gModal .dn{color:#ffb4ab}
  #gModal .bts{display:flex;flex-direction:column;gap:8px;margin-top:14px}#gModal .bts button{padding:11px 14px;font-size:14px;border-radius:12px;text-align:left}
  #gModal .modes{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}#gModal .modes button{display:flex;flex-direction:column;gap:6px;align-items:flex-start;text-align:left;padding:14px;border-radius:14px;font:600 15px system-ui,sans-serif}#gModal .modes button small{font-weight:400;font-size:12.5px;line-height:1.4;opacity:.85}
  @media (max-width:640px){
   #gHud{left:8px;top:8px;gap:5px;font-size:12px;max-width:calc(100% - 16px)}#gHud .pill{padding:7px 9px}#gHud button{padding:7px 10px;font-size:12px}#gHud .hide-m{display:none}
   body.ger #prodInfo{top:auto;bottom:calc(12px + env(safe-area-inset-bottom,0px))}
   #gPan{left:0;right:0;top:auto;bottom:0;width:auto;max-width:none;max-height:58%;border-radius:16px 16px 0 0;padding-bottom:env(safe-area-inset-bottom,0px)}
   #walkUI:not([hidden])~#gHud{top:56px}
   #gToast{top:96px;width:calc(100% - 24px)}#gToast div{text-align:center}
   #gModal .modes{grid-template-columns:1fr}}
  `;
  document.head.appendChild(css);
  const wrap = NF.wrap;
  const hud = document.createElement('div'); hud.id = 'gHud'; hud.hidden = true; wrap.appendChild(hud);
  const pan = document.createElement('div'); pan.id = 'gPan'; pan.hidden = true; wrap.appendChild(pan);
  const toastBox = document.createElement('div'); toastBox.id = 'gToast'; wrap.appendChild(toastBox);
  const marks = document.createElement('div'); marks.id = 'gMarks'; marks.hidden = true; wrap.appendChild(marks);
  const mod = document.createElement('div'); mod.id = 'gModal'; mod.hidden = true; wrap.appendChild(mod);
  function toast(t, k) { if (sim) return; const d = document.createElement('div'); d.className = k || ''; d.textContent = t; toastBox.appendChild(d); while (toastBox.children.length > 3) toastBox.firstChild.remove(); setTimeout(() => d.remove(), 3200); }
  let modalAt = 0;
  function showModal(html, buttons, kind) {
    modal = kind || 'info'; modalAt = Date.now();
    mod.innerHTML = `<div class="box">${html}<div class="bts"></div></div>`; const bts = mod.querySelector('.bts');
    (buttons || []).forEach(([l, f, cls, dis]) => { const b = document.createElement('button'); b.textContent = l; if (cls) b.className = cls; if (dis) b.disabled = true; b.onclick = f; bts.appendChild(b); });
    mod.hidden = false;
  }
  function closeModal() { mod.hidden = true; modal = null; }
  function openEvent(ev) {
    eventOpen = { ev, at: Date.now() };
    if (sim) return;
    showModal(`<div class="ey">ACONTECIMENTO · ${clock()}</div><h3>${ev.t}</h3><p>${ev.d}</p>${S.staff.manager && S.prefs.events ? '<p class="mut">👔 Se você não escolher, o gerente decide em instantes.</p>' : ''}`,
      ev.o.map((o, i) => [o.l, () => chooseEvent(i), i ? 'sec' : '', o.cost && o.cost > S.money]), 'event');
  }
  function chooseEvent(i, byMgr) {
    if (!eventOpen) return; const ev = eventOpen.ev, o = ev.o[i < 0 ? ev.o.length - 1 : i];
    if (o.cost) { if (o.cost > S.money) return; spend(o.cost); }
    o.f(S); log(`${byMgr ? '👔 Gerente decidiu' : 'Você decidiu'}: “${o.l}” (${ev.t}).`); eventOpen = null; closeModal(); render();
  }
  function showDay(r) {
    showModal(`<div class="ey">FIM DO DIA ${r.day}</div><h3>🌙 A fábrica fechou o turno</h3>
      <div class="gr"><div><span>Receitas</span><b class="up">${money(r.income)}</b></div><div><span>Gastos do dia</span><b class="dn">${money(r.spent)}</b></div><div><span>Lápis produzidos</span><b>${int(r.produced)}</b></div><div><span>Pedidos entregues</span><b>${r.orders}${r.failed ? ` · ${r.failed} atrasado(s)` : ''}</b></div></div>
      <p class="mut">Inclui salários e custos fixos (${money(r.wages)}). Caixa agora: <b style="color:#f2c230">${money(r.money)}</b>. Os preços da matéria-prima mudaram.</p>${S.staff.manager && S.prefs.events ? '<p class="mut">👔 O gerente abre o próximo turno sozinho.</p>' : ''}`,
      [[`☀️ Começar o dia ${S.day}`, () => { closeModal(); startShift(); }]], 'day');
  }
  function showBankrupt() {
    showModal(`<div class="ey">FIM DE JOGO</div><h3>💸 A fábrica faliu</h3><p>O caixa passou de ${money(BANKRUPT)}. Você chegou ao dia ${S.day} com ${S.stats.done} pedidos entregues e ${int(S.stats.produced)} lápis produzidos.</p>`,
      [['Começar de novo', () => { S = fresh(); save(); closeModal(); render(); }]], 'over');
  }

  /* painel */
  let tab = 'ped', focus = null;
  pan.innerHTML = `<div class="hd"><b id="gTitle">Painel do gerente</b><button class="x" id="gX" aria-label="Fechar">✕</button></div><div class="tabs" id="gTabs"></div><div class="bd" id="gBody"></div>`;
  const TABS = [['ped', '📋 Pedidos'], ['set', '🏭 Setores'], ['est', '📦 Almoxarifado'], ['eq', '👥 Equipe'], ['meta', '🏆 Metas'], ['dia', '📰 Diário']];
  $('gX').onclick = () => { pan.hidden = true; focus = null; render(true); };
  const gTabs = $('gTabs'); TABS.forEach(([k, l]) => { const b = document.createElement('button'); b.textContent = l; b.dataset.k = k; b.onclick = () => { tab = k; focus = null; render(true); }; gTabs.appendChild(b); });
  const H = { click: {} }; let hid = 0;
  const btn = (label, fn, cls, dis) => { const id = 'g' + (hid++); H.click[id] = fn; return `<button data-g="${id}" class="${cls || ''}" ${dis ? 'disabled' : ''}>${label}</button>`; };
  pan.addEventListener('click', e => { const b = e.target.closest('button[data-g]'); if (b && H.click[b.dataset.g]) { H.click[b.dataset.g](); render(true); } });
  const wearBar = w => `<div class="bar2"><i class="${w > 70 ? 'r' : w > 45 ? 'w' : ''}" style="width:${Math.round(w)}%"></i></div>`;
  function stTag(k) { const x = S.st[k]; if (!available(k)) return '<span class="tag t-off">🔒 bloqueada</span>'; if (x.broken) return `<span class="tag t-bad">${x.repair ? '🔧 consertando' : '⚠️ quebrada'}</span>`; if (!x.on) return '<span class="tag t-off">⏸ desligada</span>'; if (x.busy === S.clock && S.running) return '<span class="tag t-ok">⚙️ produzindo</span>'; return `<span class="tag t-warn">${lunch() && S.running ? '🍽 almoço' : '⏳ sem pedido'}</span>`; }
  function stCard(k, full) {
    const x = S.st[k], d = ST[k];
    if (!available(k)) return `<div class="card"><h4><span>${d.i} ${d.n}</span>${stTag(k)}</h4><p class="mut">${d.d}</p><div class="row">${btn(`Ativar linha (${money(d.lock)})`, () => unlock(k), '', S.money < d.lock)}${btn('🔍 Ver por dentro', () => inside(k), 'sec')}</div></div>`;
    return `<div class="card"><h4><span>${d.i} ${d.n}</span>${stTag(k)}</h4><p class="mut">${d.d}</p>
      <div class="kv"><span>Nível</span><b>${x.level} de 3</b><span>Ritmo</span><b>${(BASE_RATE * LEVEL_RATE[x.level] * (1 + .2 * S.staff.operator) * 60).toFixed(0)} lápis/h</b><span>Desgaste</span><b>${Math.round(x.wear)}%</b></div>${wearBar(x.wear)}
      <div class="row">${x.broken ? btn(x.repair ? `Consertando… ${Math.ceil(x.repair)} min` : (S.staff.tech ? 'Chamar o técnico' : `Consertar (${money(REPAIR_COST)})`), () => repair(k), '', !!x.repair) : btn(x.on ? '⏸ Desligar' : '▶ Ligar', () => toggleSt(k), x.on ? 'sec' : '')}
      ${btn(`Manutenção (${money(MAINT_COST)})`, () => maint(k), 'sec', x.broken || x.wear < 5)}${x.level < 3 ? btn(`Melhorar p/ nível ${x.level + 1} (${money(UPGRADE[x.level + 1])})`, () => upgrade(k), 'sec', S.money < UPGRADE[x.level + 1]) : ''}${full ? btn('🔍 Ver por dentro', () => inside(k), 'sec') : ''}</div></div>`;
  }
  function boilerCard() {
    const b = S.boiler, ok = steamOk();
    return `<div class="card"><h4><span>♨️ Caldeira</span><span class="tag ${b.broken ? 't-bad' : !b.on ? 't-off' : ok ? 't-ok' : 't-warn'}">${b.broken ? (b.repair ? '🔧 consertando' : '⚠️ quebrada') : !b.on ? 'apagada' : ok ? 'vapor ok' : 'aquecendo'}</span></h4>
      <p class="mut">Queima lenha do Almoxarifado e manda vapor para o CIC e os Cosméticos (+25% no ritmo). Sem vapor, eles rendem 20% menos.</p>
      <div class="kv"><span>Pressão</span><b>${Math.round(b.p)} psi</b><span>Desgaste</span><b>${Math.round(b.wear)}%</b></div>${wearBar(b.wear)}
      <div class="row">${b.broken ? btn(b.repair ? `Consertando… ${Math.ceil(b.repair)} min` : 'Consertar (R$ 120)', repairBoiler, '', !!b.repair) : btn(b.on ? 'Apagar' : '🔥 Acender', toggleBoiler, b.on ? 'sec' : '')}${btn('Manutenção (R$ 40)', maintBoiler, 'sec', b.broken || b.wear < 5)}</div></div>`;
  }
  function offerCard(o, act) {
    const P = PRODUCTS[o.p], left = act ? o.due - S.clock : o.exp - S.clock, pct = act ? o.done / o.amount * 100 : 0;
    const route = P.r.map(k => `<span class="tag ${S.st[k].broken ? 't-bad' : S.st[k].on ? 't-ok' : 't-off'}">${ST[k].s}</span>`).join(' ');
    return `<div class="card"><h4><span>${o.urgent ? '⚡ ' : ''}${o.amount} × ${P.n}</span><b style="color:#f2c230">${money(o.reward)}</b></h4><p class="mut">${o.client} · ${act ? `prazo em ${Math.max(0, Math.round(left / 60 * 10) / 10)} h` : `oferta some em ${Math.max(0, Math.round(left))} min · prazo ${Math.round(o.deadline / 60 * 10) / 10} h`}</p>
      <div class="row" style="margin-top:4px">${route}</div>${act ? `<div class="bar2"><i style="width:${pct}%"></i></div><p class="mut">${int(o.done)} de ${o.amount} prontos</p>` : ''}
      <div class="row">${act ? (S.active[0] !== o ? btn('⬆ Fazer primeiro', () => first(o.id), 'sec') : '') : btn('Aceitar', () => accept(o.id), '', !S.running) + btn('Recusar', () => decline(o.id), 'sec')}</div></div>`;
  }
  const SUPPORT = {
    'Almoxarifado': () => { tab = 'est'; return null; },
    'Caldeira': () => boilerCard(),
    'ADM': () => { tab = 'eq'; return null; },
    'Mecânica Máquinas': () => `<div class="card"><h4><span>🔧 Mecânica Máquinas</span></h4><p class="mut">Aqui ficam os técnicos. Com técnico contratado, os consertos são de graça e a preventiva é automática.</p><div class="kv"><span>Técnicos</span><b>${S.staff.tech} de ${STAFF.tech.max}</b></div><div class="row">${btn(`Contratar técnico (${money(STAFF.tech.wage)}/dia)`, () => hire('tech'), '', S.staff.tech >= STAFF.tech.max)}${btn('Preventiva em tudo', () => Object.keys(ST).forEach(k => available(k) && S.st[k].wear > 5 && maint(k)), 'sec')}</div></div>`,
    'Refeitório': () => { const c = CANTEEN[S.canteen], n = CANTEEN[S.canteen + 1]; return `<div class="card"><h4><span>🍽 Refeitório</span></h4><p class="mut">Das 12h às 13h30 a produção para para o almoço. Comida melhor deixa a equipe mais animada, e isso aumenta o ritmo e diminui quebras.</p><div class="kv"><span>Serviço</span><b>${c.n}</b><span>Moral por almoço</span><b>+${c.mor}</b><span>Moral da equipe</span><b>${Math.round(S.morale)}</b></div><div class="row">${n ? btn(`Melhorar para ${n.n} (${money(n.cost)})`, upCanteen, '', S.money < n.cost) : ''}</div></div>`; },
    'Laboratório': () => { const c = LAB[S.lab], n = LAB[S.lab + 1]; return `<div class="card"><h4><span>🔬 Laboratório</span></h4><p class="mut">Controle de qualidade melhor faz os clientes pagarem mais por pedido.</p><div class="kv"><span>Nível</span><b>${c.n}</b><span>Bônus nos pedidos</span><b>+${Math.round(c.bonus * 100)}%</b></div><div class="row">${n ? btn(`Investir: ${n.n} (${money(n.cost)})`, upLab, '', S.money < n.cost) : ''}</div></div>`; },
    'Anfiteatro Palestra': () => `<div class="card"><h4><span>🎤 Anfiteatro</span></h4><p class="mut">Palestra de segurança: +5 de moral e 40% menos quebras durante o dia.</p><div class="row">${btn('Fazer palestra (R$ 300)', talk, '', S.money < 300)}</div></div>`,
    'Enfermaria': () => `<div class="card"><h4><span>🩺 Enfermaria</span></h4><p class="mut">Atende a equipe nos acidentes. Com palestras de segurança em dia, acontecem menos.</p><div class="kv"><span>Moral da equipe</span><b>${Math.round(S.morale)}</b></div></div>`
  };
  const PKEY = {}; Object.keys(ST).forEach(k => PKEY[ST[k].n] = k);
  function inside(k) { const i = NF.PROD.findIndex(P => P.n === ST[k].n); if (i >= 0) NF.enterProd(i); }
  function openBuilding(i) {
    const P = NF.PROD[i]; if (!P) return;
    focus = P.n; pan.hidden = false; NF.fly && NF.fly(i); render(true);
  }
  function renderFocus() {
    const P = NF.PROD.find(q => q.n === focus), i = NF.PROD.indexOf(P);
    const k = PKEY[focus];
    if (k) return stCard(k, true) + (S.active.some(o => PRODUCTS[o.p].r.includes(k)) ? '<p class="mut">Pedidos que passam por aqui:</p>' + S.active.filter(o => PRODUCTS[o.p].r.includes(k)).map(o => offerCard(o, true)).join('') : '');
    const f = SUPPORT[focus];
    if (f) { const h = f(); if (h === null) { focus = null; return null; } return h + `<div class="row">${btn('🔍 Ver por dentro', () => NF.enterProd(i), 'sec')}</div>`; }
    return `<div class="card"><h4><span>${P.n}</span></h4><p class="mut">${P.i}</p><p class="mut">Setor de apoio: não entra no roteiro dos pedidos.</p><div class="row">${btn('🔍 Ver por dentro', () => NF.enterProd(i), 'sec')}</div></div>`;
  }
  function body() {
    if (focus) { const h = renderFocus(); if (h !== null) { $('gTitle').textContent = focus; return h; } }
    $('gTitle').textContent = 'Painel do gerente';
    if (tab === 'ped') {
      return (S.running ? '' : `<div class="card"><h4><span>☀️ Turno fechado</span></h4><p class="mut">Abra o turno para os pedidos começarem a chegar e as máquinas trabalharem (08h às 18h).</p><div class="row">${btn('▶ Abrir o turno', startShift, '', S.over)}</div></div>`)
        + `<p class="mut"><b>Em produção</b> (${S.active.length}/4)</p>` + (S.active.length ? S.active.map(o => offerCard(o, true)).join('') : '<p class="mut">Nenhum pedido em produção.</p>')
        + `<p class="mut" style="margin-top:12px"><b>Ofertas</b></p>` + (S.offers.length ? S.offers.map(o => offerCard(o, false)).join('') : '<p class="mut">Nenhuma oferta agora. Elas chegam ao longo do turno.</p>');
    }
    if (tab === 'set') return `<div class="row">${btn('▶ Ligar tudo', () => allOn(true))}${btn('⏸ Desligar tudo', () => allOn(false), 'sec')}</div>` + boilerCard() + Object.keys(ST).map(k => stCard(k, true)).join('');
    if (tab === 'est') return `<div class="card"><h4><span>📦 Almoxarifado</span><span class="tag t-off">${ALMOX_CAP[S.almox]} por item</span></h4><p class="mut">Madeira, grafite, tintas e pigmentos chegam aqui e as empilhadeiras levam para cada setor.</p>
      ${Object.keys(RES).map(r => `<div style="margin-top:10px"><div class="kv"><span>${RES[r].i} ${RES[r].n}</span><b>${int(S.stock[r])} ${RES[r].u}</b></div>${wearBar(S.stock[r] / cap() * 100).replace(/class="[rw]?"/, 'class=""')}<div class="row">${btn(`+${RES[r].lot} por ${money(Math.ceil(RES[r].lot * S.prices[r]))}`, () => buy(r, 1), '', S.money < RES[r].lot * S.prices[r])}${btn(`+${RES[r].lot * 3}`, () => buy(r, 3), 'sec', S.money < RES[r].lot * 3 * S.prices[r])}</div></div>`).join('')}
      <div class="row" style="margin-top:12px">${S.almox < 3 ? btn(`Ampliar para ${ALMOX_CAP[S.almox + 1]} (${money(ALMOX_UP[S.almox + 1])})`, upAlmox, 'sec', S.money < ALMOX_UP[S.almox + 1]) : ''}</div></div>
      <p class="mut">Consumo por lápis: ${Object.keys(PRODUCTS).filter(k => !PRODUCTS[k].need || S.unlock[PRODUCTS[k].need]).map(k => `${PRODUCTS[k].n} ${Object.keys(RES).filter(r => PRODUCTS[k].use[r]).map(r => RES[r].i + PRODUCTS[k].use[r]).join(' ')}`).join(' · ')}</p>`;
    if (tab === 'eq') return Object.keys(STAFF).map(r => `<div class="card"><h4><span>${STAFF[r].i} ${STAFF[r].n}</span><span class="tag t-off">${S.staff[r]}/${STAFF[r].max}</span></h4><p class="mut">${STAFF[r].d}</p><p class="mut">Salário: ${money(STAFF[r].wage)} por dia</p><div class="row">${btn('Contratar', () => hire(r), '', S.staff[r] >= STAFF[r].max)}${btn('Demitir', () => fire(r), 'sec', !S.staff[r])}</div></div>`).join('')
      + (S.staff.manager ? `<div class="card"><h4><span>👔 O que o gerente pode decidir</span></h4>${[['orders', 'Aceitar pedidos'], ['buy', 'Comprar matéria-prima'], ['machines', 'Ligar, consertar e manter máquinas e caldeira'], ['events', 'Decidir acontecimentos e abrir o turno']].map(([k, l]) => `<label class="sw"><span>${l}</span><input type="checkbox" data-pref="${k}" ${S.prefs[k] ? 'checked' : ''}></label>`).join('')}</div>` : '')
      + `<div class="card"><h4><span>😊 Moral da equipe</span><b>${Math.round(S.morale)}</b></h4>${wearBar(S.morale).replace(/class="[rw]?"/, 'class=""')}<p class="mut">Moral alta deixa a produção até 10% mais rápida e reduz quebras. Suba com almoço melhor (Refeitório) e palestras (Anfiteatro).</p></div>`;
    if (tab === 'meta') return GOALS.map((g, i) => `<div class="card" style="${S.goals[i] ? 'opacity:.6' : ''}"><h4><span>${S.goals[i] ? '✅' : '⬜'} ${g.t}</span>${g.r ? `<b style="color:#f2c230">${money(g.r)}</b>` : ''}</h4></div>`).join('');
    if (tab === 'dia') return (S.history.length ? `<div class="card"><h4><span>Últimos dias</span></h4><div class="kv">${S.history.slice(0, 5).map(h => `<span>Dia ${h.day}: ${int(h.produced)} lápis · ${h.orders} pedido(s)</span><b class="${h.income - h.spent >= 0 ? '' : ''}" style="color:${h.income - h.spent >= 0 ? '#9fe0b4' : '#ffb4ab'}">${h.income - h.spent >= 0 ? '+' : ''}${money(h.income - h.spent)}</b>`).join('')}</div></div>` : '')
      + `<div class="log">${S.log.map(l => `<div class="${l.k}"><small>D${l.d} ${l.h}</small>${l.t}</div>`).join('') || '<p class="mut">Nada ainda.</p>'}</div>
      <div class="row" style="margin-top:14px">${btn('Recomeçar do zero', () => showModal('<h3>Recomeçar a fábrica?</h3><p>Todo o progresso do modo gerente será apagado.</p>', [['Sim, recomeçar', () => { S = fresh(); save(); closeModal(); render(); }], ['Cancelar', closeModal, 'sec']]), 'sec')}</div>`;
    return '';
  }
  ['wheel', 'touchstart', 'touchmove', 'pointerdown', 'scroll'].forEach(ev => pan.addEventListener(ev, () => { touchT = performance.now(); }, { passive: true, capture: true }));
  // no computador dá para rolar a lista arrastando com o mouse, como no celular
  { const bd = $('gBody'); let d = null, moved = false;
    bd.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button !== 0) return; d = { y: e.clientY, s: bd.scrollTop }; moved = false; });
    addEventListener('pointermove', e => { if (!d) return; const dy = e.clientY - d.y; if (!moved && Math.abs(dy) > 5) { moved = true; bd.classList.add('drag'); } if (moved) { bd.scrollTop = d.s - dy; touchT = performance.now(); } });
    addEventListener('pointerup', () => { if (d) { d = null; bd.classList.remove('drag'); } });
    bd.addEventListener('click', e => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true); }
  pan.addEventListener('change', e => { const k = e.target.dataset.pref; if (k) { S.prefs[k] = e.target.checked; save(); } });

  /* HUD */
  function renderHud() {
    const tl = !S.running ? (S.over ? 'Falência' : 'Turno fechado') : lunch() ? '🍽 Almoço' : S.blackout > 0 ? '⚡ Sem energia' : 'Trabalhando';
    hud.innerHTML = `<div class="pill money">💰 <b class="${S.money < 0 ? 'neg' : ''}">${money(S.money)}</b></div><div class="pill">📅 Dia ${S.day} · ${clock()}<span class="hide-m" style="color:#9aa0a6;font-weight:500">· ${tl}</span></div><div class="pill hide-m">⭐ ${Math.round(S.rep)}%</div><div class="pill hide-m">😊 ${Math.round(S.morale)}</div>${S.staff.manager ? '<div class="pill hide-m" title="O gerente está tocando a fábrica">👔 Gerente</div>' : ''}
      ${S.running ? `<div class="spd">${[1, 2, 4].map(v => `<button data-s="${v}" class="${S.speed === v ? 'on' : ''}">${v}×</button>`).join('')}</div>` : `<button data-a="start" ${S.over ? 'disabled' : ''}>▶ Abrir turno</button>`}<button data-a="pan" class="sec ${pan.hidden ? '' : 'on'}">📋 Painel</button>`;
  }
  hud.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.s) { S.speed = +b.dataset.s; renderHud(); } if (b.dataset.a === 'start') startShift(); if (b.dataset.a === 'pan') { pan.hidden = !pan.hidden; focus = null; render(true); } });
  let lastBody = '', touchT = 0, lastView = '';
  // só troca os cartões que mudaram; rolagem e botões sob o dedo ficam onde estão
  function patchBody(h) {
    const el = $('gBody'), view = (focus || '') + '|' + tab, tpl = document.createElement('div'); tpl.innerHTML = h;
    if (view !== lastView) { el.innerHTML = h; el.scrollTop = 0; lastView = view; return; }
    const sc = el.scrollTop, a = [...el.children], b = [...tpl.children];
    b.forEach((n, i) => { const o = a[i]; if (!o) el.appendChild(n); else if (o.outerHTML !== n.outerHTML) { if (o.tagName === n.tagName && o.className === n.className && o.children.length === n.children.length && o.firstElementChild && n.firstElementChild) morph(o, n); else el.replaceChild(n, o); } });
    for (let i = b.length; i < a.length; i++) a[i].remove();
    el.scrollTop = sc;
  }
  function morph(o, n) { // troca só os filhos diferentes dentro do cartão
    const a = [...o.children], b = [...n.children];
    if (a.length !== b.length) { o.innerHTML = n.innerHTML; return; }
    b.forEach((c, i) => { if (a[i].outerHTML !== c.outerHTML) o.replaceChild(c, a[i]); });
    [...n.attributes].forEach(at => { if (o.getAttribute(at.name) !== at.value) o.setAttribute(at.name, at.value); });
  }
  function render(force) {
    if (!on) return;
    renderHud();
    if (!pan.hidden) {
      hid = 0; H.click = {}; const h = body();
      [...gTabs.children].forEach(b => b.classList.toggle('on', !focus && b.dataset.k === tab));
      if (h !== lastBody && (force || performance.now() - touchT > 900)) { patchBody(h); lastBody = h; }
    }
    if (Date.now() - savedAt > 4000) { savedAt = Date.now(); save(); }
  }
  let savedAt = 0;

  /* marcadores 3D sobre os prédios de produção */
  const mk = {};
  Object.keys(ST).forEach(k => { const i = NF.PROD.findIndex(P => P.n === ST[k].n); if (i < 0) return; const [x1, y1, x2, y2] = NF.PROD[i].b; const el = document.createElement('div'); el.onclick = () => openBuilding(i); marks.appendChild(el); mk[k] = { el, v: new THREE.Vector3(NF.wx((x1 + x2) / 2), 11, NF.wz((y1 + y2) / 2)), i }; });
  { const i = NF.PROD.findIndex(P => P.n === 'Caldeira'); if (i >= 0) { const [x1, y1, x2, y2] = NF.PROD[i].b; const el = document.createElement('div'); el.onclick = () => openBuilding(i); marks.appendChild(el); mk._b = { el, v: new THREE.Vector3(NF.wx((x1 + x2) / 2), 14, NF.wz((y1 + y2) / 2)), i }; } }
  function markText(k) {
    if (k === '_b') { const b = S.boiler; return b.broken ? ['bad', '♨️ quebrada'] : b.on ? [steamOk() ? 'ok' : 'off', `♨️ ${Math.round(b.p)} psi`] : ['off', '♨️ apagada']; }
    const x = S.st[k]; if (!available(k)) return ['lock', `🔒 ${ST[k].s}`];
    if (x.broken) return ['bad', `⚠️ ${ST[k].s} quebrada`];
    if (!x.on) return ['off', `⏸ ${ST[k].s}`];
    return [x.busy === S.clock && S.running ? 'ok' : 'off', `${x.busy === S.clock && S.running ? '⚙️' : '⏳'} ${ST[k].s} · nv ${x.level}`];
  }
  const pv = new THREE.Vector3(); let mf = 0;
  function placeMarks() {
    requestAnimationFrame(placeMarks);
    if (!on || (mf++ % 2)) return;
    const hideAll = NF.inside() || (window.WALK && window.WALK.on);
    marks.style.display = hideAll ? 'none' : ''; if (hideAll) return;
    const W = wrap.clientWidth, Hh = wrap.clientHeight;
    for (const k in mk) { const m = mk[k]; pv.copy(m.v).project(NF.cam); const vis = pv.z < 1 && Math.abs(pv.x) < 1.1 && Math.abs(pv.y) < 1.1; m.el.style.display = vis ? '' : 'none'; if (!vis) continue; const [c, t] = markText(k); if (m.el.className !== c) m.el.className = c; if (m.el.textContent !== t) m.el.textContent = t; m.el.style.transform = `translate(${(pv.x * .5 + .5) * W}px,${(-pv.y * .5 + .5) * Hh}px) translate(-50%,-100%)`; }
  }
  requestAnimationFrame(placeMarks);

  // no modo gerente as máquinas do interior param quando a etapa está desligada, quebrada, no almoço ou fora do turno
  window.NFPAUSE = pi => { if (!on) return false; const P = NF.PROD[pi]; const k = P && PKEY[P.n]; if (!k) return false; const x = S.st[k]; return !S.running || lunch() || x.broken || !x.on || !available(k); };
  NF.onBuildingClick = i => { if (!on) return false; openBuilding(i); return true; };

  /* ---------- relógio ---------- */
  let acc = 0, mgrT = 0, rT = 0, lastT = performance.now();
  setInterval(() => {
    const now = performance.now(), dt = Math.min(2, (now - lastT) / 1000); lastT = now;
    if (!on || modal && modal !== 'event' && !(modal === 'day')) { return; }
    if (S.running && !eventOpen && !(modal === 'day')) { const dm = MIN_PER_SEC * S.speed * dt; const n = Math.ceil(dm / 3.5); for (let i = 0; i < n; i++) step(dm / n); }
    mgrT += dt; if (mgrT >= .9) { mgrT = 0; managerLoop(); if (S.staff.buyer) buyer(false); }
    rT += dt; if (rT >= .5) { rT = 0; render(); }
  }, 250);
  addEventListener('pagehide', save); document.addEventListener('visibilitychange', () => { if (document.hidden) save(); else if (on) { catchUp(); render(); } });

  /* ---------- escolha do modo ---------- */
  let on = false;
  const bModo = document.createElement('button'); bModo.id = 'bModo';
  const fo = document.querySelector('.focos'); if (fo) fo.insertBefore(bModo, fo.firstChild);
  function setMode(m, keep) {
    on = m === 'ger'; if (keep !== false) try { localStorage.setItem(MODE, m); } catch (e) { }
    document.body.classList.toggle('ger', on);
    hud.hidden = !on; marks.hidden = !on; if (!on) { pan.hidden = true; closeModal(); }
    bModo.innerHTML = on ? '🎟 Mudar para visitante' : '👔 Gerenciar a fábrica';
    if (on) { catchUp(); render(); } else save();
  }
  bModo.onclick = () => chooser();
  function chooser() {
    showModal(`<div class="ey">NOVA FÁBRICA 3D · SÃO CARLOS</div><h3>Como você quer entrar na fábrica?</h3><p class="mut">Dá para trocar depois pelo menu.</p>
      <div class="modes"><button class="sec" id="gmV">🎟 Visitante<small>Passeie, faça a visita guiada com a instrutora e conheça cada setor por dentro.</small></button><button id="gmG">👔 Gerente<small>Tome conta da produção: aceite pedidos, compre matéria-prima, cuide das máquinas, contrate equipe e faça a fábrica dar lucro.</small></button></div>`, [], 'mode');
    $('gmV').onclick = () => { closeModal(); setMode('vis'); };
    $('gmG').onclick = () => { closeModal(); setMode('ger'); if (S.day === 1 && !S.running && !S.stats.produced) { pan.hidden = false; tab = 'ped'; render(); toast('Abra o turno e aceite o primeiro pedido.', 'warn'); } };
  }
  let saved = null; try { saved = localStorage.getItem(MODE); } catch (e) { }
  if (saved === 'ger') setMode('ger'); else if (saved === 'vis') setMode('vis'); else { setMode('vis', false); chooser(); }
  window.GER = { get on() { return on; }, state: () => S };
})();
