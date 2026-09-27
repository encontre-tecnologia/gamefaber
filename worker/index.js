/* Fábrica de Lápis — Worker do site público.
   Serve os arquivos estáticos e mantém as "salas" de visita ao vivo (uma por código),
   em que o CEO transmite a fábrica e os visitantes mandam onde estão andando.
   Usa a hibernação de WebSocket: sem mensagens, a sala sai da memória e não gasta tempo
   de execução; ela acorda sozinha quando alguém entra ou manda alguma coisa. */

export class Sala {
  constructor(state, env) {
    this.state = state; this.env = env;
    this.frames = new Map();   // ws -> última fábrica transmitida pelo CEO (só em memória; o CEO reenvia quando alguém entra)
    this.secret = undefined;
  }
  async fetch(req) {
    const url = new URL(req.url);
    if (req.headers.get("Upgrade") !== "websocket") return new Response("sala da Fábrica de Lápis", { status: 200 });
    const role = url.searchParams.get("role") === "host" ? "host" : "guest";
    const secret = (url.searchParams.get("secret") || "").slice(0, 80);
    const name = (url.searchParams.get("name") || "").replace(/[<>&"'`]/g, "").slice(0, 24);
    if (role === "host") {
      if (this.secret === undefined) this.secret = (await this.state.storage.get("secret")) ?? null;
      if (!secret) return new Response("sem segredo", { status: 403 });
      if (this.secret == null) { this.secret = secret; await this.state.storage.put("secret", secret); }
      else if (this.secret !== secret) return new Response("este código já pertence a outra fábrica", { status: 403 });
    }
    if (this.sessions().length >= 24) return new Response("sala cheia", { status: 429 });
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const meta = { id: "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), role, name: name || (role === "host" ? "CEO" : "Visitante"), p: {}, updatedAt: Date.now() };
    server.serializeAttachment(meta);
    this.state.acceptWebSocket(server);
    this.broadcast();
    return new Response(null, { status: 101, webSocket: client });
  }
  sessions() {
    return this.state.getWebSockets().filter(ws => ws.readyState === 1).map(ws => ({ ws, meta: ws.deserializeAttachment() || { id: "?", role: "guest", name: "Visitante", p: {}, updatedAt: 0 } }));
  }
  webSocketMessage(ws, data) {
    let m; try { m = JSON.parse(typeof data === "string" ? data : ""); } catch (_) { return; }
    if (!m || m.t !== "p" || !m.p || typeof m.p !== "object") return;
    if (JSON.stringify(m.p).length > 6000) return;
    const meta = ws.deserializeAttachment() || { id: "?", role: "guest", name: "Visitante", p: {}, updatedAt: 0 };
    if (meta.role !== "host") { delete m.p.h; delete m.p.f; }   // só o CEO transmite a fábrica
    if ("f" in m.p) { this.frames.set(ws, m.p.f); delete m.p.f; }   // a fábrica é grande: fica só em memória
    Object.assign(meta.p, m.p); meta.updatedAt = Date.now();
    ws.serializeAttachment(meta);
    this.broadcast();
  }
  webSocketClose(ws) { this.frames.delete(ws); try { ws.close(); } catch (_) { } this.broadcast(); }
  webSocketError(ws) { this.frames.delete(ws); try { ws.close(); } catch (_) { } this.broadcast(); }
  broadcast() {
    const all = this.sessions();
    const list = all.map(s => ({ id: s.meta.id, name: s.meta.name, role: s.meta.role, presence: this.frames.has(s.ws) ? { ...s.meta.p, f: this.frames.get(s.ws) } : s.meta.p, updatedAt: s.meta.updatedAt }));
    for (const s of all) {
      try { s.ws.send(JSON.stringify({ t: "peers", me: s.meta.id, peers: list })); } catch (_) { }
    }
  }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/sala/ws") {
      const code = (url.searchParams.get("sala") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
      if (code.length < 4) return new Response("código de sala inválido", { status: 400 });
      return env.SALA.get(env.SALA.idFromName(code)).fetch(req);
    }
    return env.ASSETS.fetch(req);
  }
};
