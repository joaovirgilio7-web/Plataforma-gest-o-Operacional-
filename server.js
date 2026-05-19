const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { Readable } = require("node:stream");
const { URLSearchParams } = require("node:url");

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");
const FLAGS_FILE = path.join(DATA_DIR, "flags.json");
const OCCURRENCES_FILE = path.join(DATA_DIR, "occurrences.json");
const FORUM_FILE = path.join(DATA_DIR, "forum.json");
const OCCURRENCE_UPLOADS_DIR = path.join(DATA_DIR, "occurrence-pdfs");
const SESSION_COOKIE = "praias_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 10;
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-only-change-this-secret";
const IS_PROD = process.env.NODE_ENV === "production";

const beaches = [
  { name: "Castelo de Neiva", area: "Castelo do Neiva, Viana do Castelo", lat: 41.6272, lng: -8.8178, type: "Praia", color: "#007b8a" },
  { name: "Amorosa Sul", area: "Chafe / Amorosa, Viana do Castelo", lat: 41.642, lng: -8.8231, type: "Praia", color: "#007b8a" },
  { name: "Amorosa Norte", area: "Chafe / Amorosa, Viana do Castelo", lat: 41.6528, lng: -8.8246, type: "Praia", color: "#007b8a" },
  { name: "Rodanho", area: "Anha, Viana do Castelo", lat: 41.6675, lng: -8.8219, type: "Praia", color: "#007b8a" },
  { name: "Cabedelo Sul", area: "Darque, Viana do Castelo", lat: 41.676, lng: -8.8267, type: "Praia", color: "#007b8a" },
  { name: "Cabedelo Norte", area: "Darque, Viana do Castelo", lat: 41.6833, lng: -8.8328, type: "Praia", color: "#007b8a" },
  { name: "Foz do Lima", area: "Estuário do Rio Lima, Viana do Castelo", lat: 41.6877, lng: -8.8353, type: "Praia", color: "#007b8a" },
  { name: "Argaçosa", area: "Viana do Castelo", lat: 41.6982, lng: -8.8367, type: "Praia", color: "#007b8a" },
  { name: "Norte", area: "Praia Norte, Viana do Castelo", lat: 41.7007, lng: -8.8522, type: "Praia", color: "#007b8a" },
  { name: "Carreço", area: "Carreço, Viana do Castelo", lat: 41.7423, lng: -8.8757, type: "Praia", color: "#007b8a" },
  { name: "Arda", area: "Afife, Viana do Castelo", lat: 41.7715, lng: -8.8757, type: "Praia", color: "#007b8a" },
  { name: "Afife", area: "Afife, Viana do Castelo", lat: 41.7802, lng: -8.871, type: "Praia", color: "#007b8a" },
  { name: "Insúa", area: "Afife / Âncora", lat: 41.7901, lng: -8.8706, type: "Praia", color: "#007b8a" },
  { name: "Paço", area: "Carreço, Viana do Castelo", lat: 41.7537, lng: -8.8792, type: "Praia", color: "#007b8a" },
  { name: "Vilar de Mouros", area: "Rio Coura, Caminha", lat: 41.8855, lng: -8.7878, type: "Praia fluvial", color: "#007b8a" },
  { name: "Praia da Lenta", area: "Caminha", lat: 41.8758, lng: -8.8515, type: "Praia", color: "#007b8a" },
  { name: "Foz do Rio Minho", area: "Caminha / Camarido", lat: 41.8758, lng: -8.8692, type: "Praia", color: "#007b8a" },
  { name: "Pedras Ruivas", area: "Moledo / Caminha", lat: 41.8625, lng: -8.8717, type: "Praia", color: "#007b8a" },
  { name: "Praia Gelfa", area: "Âncora, Caminha", lat: 41.8065, lng: -8.8702, type: "Praia", color: "#007b8a" },
  { name: "Foz do Minho Mar", area: "Caminha / Camarido", lat: 41.8796, lng: -8.874, type: "Praia", color: "#007b8a" },
  { name: "Barcos", area: "Cabedelo", lat: 41.68374602005917, lng: -8.83146849721844, type: "Ponto KML", color: "#f57c00" },
  { name: "Posto Avançado do Cabedelo", area: "Cabedelo", lat: 41.68439338581121, lng: -8.832592851750178, type: "Ponto KML", color: "#d32f2f" },
  { name: "Entradas para embarcação", area: "Cabedelo", lat: 41.68455558313251, lng: -8.832511725072923, type: "Ponto KML", color: "#303f9f" },
  { name: "Entradas para meios terrestres", area: "Cabedelo", lat: 41.68073126341484, lng: -8.835624387866627, type: "Ponto KML", color: "#388e3c" },
  { name: "Entradas para meios terrestres", area: "Cabedelo", lat: 41.68368276827853, lng: -8.83382626875324, type: "Ponto KML", color: "#388e3c" },
  { name: "Entradas para meios terrestres", area: "Cabedelo", lat: 41.68273835484214, lng: -8.832371914397505, type: "Ponto KML", color: "#388e3c" },
  { name: "Posto Vodafone", area: "Cabedelo", lat: 41.67834893270112, lng: -8.831186634972047, type: "Ponto KML", color: "#d32f2f" }
];

const information = [
  { title: "Contactos operacionais", body: "Área reservada para contactos de emergência, equipas, meios disponíveis e responsáveis por zona." },
  { title: "Procedimentos", body: "Área reservada para normas de atuação, entradas de meios terrestres, apoio a embarcações e pontos de encontro." },
  { title: "Avisos e estado das zonas", body: "Área reservada para avisos sazonais, condicionamentos, observações no terreno e atualizações rápidas." }
];

const materialDocs = {
  listas: [
    { title: "Lista de material frente de praia", file: "documents/material-socorrismo/listas/lista-material-frente-praia.pdf" },
    { title: "Lista de material malas de primeiros socorros", file: "documents/material-socorrismo/listas/lista-material-malas-primeiros-socorros.pdf" },
    { title: "Lista de material mala de primeiros socorros Stakar", file: "documents/material-socorrismo/listas/lista-material-mala-primeiros-socorros-stakar.pdf" }
  ],
  materiais: [
    { title: "Material da Frente de Praia", file: "documents/material-socorrismo/materiais/material-frente-praia.pdf" },
    { title: "Material da mala primeiros socorros Strakar", file: "documents/material-socorrismo/materiais/material-mala-primeiros-socorros-strakar.pdf" },
    { title: "Material das malas primeiros socorros", file: "documents/material-socorrismo/materiais/material-malas-primeiros-socorros.pdf" }
  ]
};

const flagTypes = [
  { value: "verde", label: "Verde", color: "#2e7d32" },
  { value: "amarela", label: "Amarela", color: "#f9a825" },
  { value: "vermelha", label: "Vermelha", color: "#c62828" }
];

const beachOptions = beaches
  .filter((point) => point.type === "Praia" || point.type === "Praia fluvial")
  .map((point) => point.name);

const occurrenceTypes = [
  { value: "trauma", label: "Trauma", color: "#c62828" },
  { value: "doenca-subita", label: "Doença súbita", color: "#6a1b9a" },
  { value: "salvamento-aquatico", label: "Salvamento Aquático", color: "#0277bd" },
  { value: "resgate-aquatico", label: "Resgate Aquático", color: "#00838f" }
];

const smallOccurrenceTypes = [
  "Picada de peixe aranha",
  "Pequenas Escoriações",
  "Pequenos Traumas",
  "Apoio na Água"
];

const localMeansTypes = [
  "Moto 4x4",
  "Barco",
  "Mota de Água",
  "Carrinha de salvamento"
];

const externalEntityTypes = [
  "ISN",
  "Polícia Marítima",
  "Bombeiros",
  "Cruz Vermelha",
  "INEM"
];

async function ensureDataFiles() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(OCCURRENCE_UPLOADS_DIR, { recursive: true });
  await ensureJson(USERS_FILE, []);
  await ensureJson(SESSIONS_FILE, {});
  await ensureJson(FLAGS_FILE, []);
  await ensureJson(OCCURRENCES_FILE, []);
  await ensureJson(FORUM_FILE, []);
}

async function ensureJson(file, fallback) {
  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(file, JSON.stringify(fallback, null, 2));
  }
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(file, value) {
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2));
  await fs.rename(tmp, file);
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(header.split(";").filter(Boolean).map((part) => {
    const [key, ...rest] = part.trim().split("=");
    return [decodeURIComponent(key), decodeURIComponent(rest.join("="))];
  }));
}

function sign(value) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
}

function makeCookie(value, maxAgeSeconds) {
  const signed = `${value}.${sign(value)}`;
  const secure = IS_PROD ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(signed)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}${secure}`;
}

function clearCookie() {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

function readSignedSession(req) {
  const raw = parseCookies(req)[SESSION_COOKIE];
  if (!raw) return null;
  const [id, mac] = raw.split(".");
  if (!id || !mac) return null;
  return crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(sign(id))) ? id : null;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("base64url")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("base64url");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const actual = crypto.scryptSync(password, salt, 64).toString("base64url");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(actual));
}

async function currentUser(req) {
  const sessionId = readSignedSession(req);
  if (!sessionId) return null;
  const sessions = await readJson(SESSIONS_FILE, {});
  const session = sessions[sessionId];
  if (!session || session.expiresAt < Date.now()) return null;
  const users = await readJson(USERS_FILE, []);
  return users.find((user) => user.id === session.userId) || null;
}

async function createSession(userId) {
  const sessions = await readJson(SESSIONS_FILE, {});
  const id = crypto.randomBytes(32).toString("base64url");
  sessions[id] = { userId, expiresAt: Date.now() + SESSION_TTL_MS };
  await writeJson(SESSIONS_FILE, sessions);
  return id;
}

async function destroySession(req) {
  const sessionId = readSignedSession(req);
  if (!sessionId) return;
  const sessions = await readJson(SESSIONS_FILE, {});
  delete sessions[sessionId];
  await writeJson(SESSIONS_FILE, sessions);
}

async function sendProtectedFile(res, file) {
  const allowedFiles = Object.values(materialDocs).flat().map((doc) => doc.file);
  if (!allowedFiles.includes(file)) {
    send(res, 404, "<h1>Ficheiro não encontrado</h1>");
    return;
  }
  const fullPath = path.join(__dirname, file);
  const data = await fs.readFile(fullPath);
  res.writeHead(200, {
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="${path.basename(file)}"`,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, max-age=300"
  });
  res.end(data);
}

async function sendOccurrencePdf(res, user, fileName) {
  if (!user || user.role !== "admin") {
    send(res, 403, "<h1>Sem acesso</h1>");
    return;
  }
  const entries = await readJson(OCCURRENCES_FILE, []);
  const match = entries.find((entry) => entry.pdf && entry.pdf.fileName === fileName);
  if (!match) {
    send(res, 404, "<h1>Ficheiro não encontrado</h1>");
    return;
  }
  const safeName = path.basename(fileName);
  const data = await fs.readFile(path.join(OCCURRENCE_UPLOADS_DIR, safeName));
  res.writeHead(200, {
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="${safeName}"`,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, max-age=300"
  });
  res.end(data);
}

async function removeOccurrencePdf(entry) {
  if (!entry || !entry.pdf || !entry.pdf.fileName) return;
  const safeName = path.basename(entry.pdf.fileName);
  try {
    await fs.unlink(path.join(OCCURRENCE_UPLOADS_DIR, safeName));
  } catch {
    // The record can still be deleted if the file was already missing.
  }
}

async function requestBuffer(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function body(req) {
  return new URLSearchParams((await requestBuffer(req)).toString("utf8"));
}

async function multipartBody(req) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) headers.set(key, value.join(", "));
    else if (value) headers.set(key, value);
  }
  const fields = {};
  const files = {};

  const webRequest = new Request("http://localhost/upload", {
    method: req.method,
    headers,
    body: Readable.toWeb(req),
    duplex: "half"
  });
  const form = await webRequest.formData();
  for (const [name, value] of form.entries()) {
    if (value && typeof value.arrayBuffer === "function") {
      files[name] = {
        originalName: value.name || "",
        contentType: value.type || "application/octet-stream",
        data: Buffer.from(await value.arrayBuffer())
      };
    } else {
      if (!fields[name]) fields[name] = [];
      fields[name].push(String(value));
    }
  }

  return { fields, files };
}

function one(fields, name) {
  return fields[name] ? fields[name][0] : "";
}

function many(fields, name) {
  return fields[name] || [];
}

function send(res, status, html, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' https://unpkg.com 'unsafe-inline'; style-src 'self' https://unpkg.com 'unsafe-inline'; img-src 'self' data: https://*.tile.openstreetmap.org; connect-src 'self' https://*.tile.openstreetmap.org;",
    ...headers
  });
  res.end(html);
}

function redirect(res, location, headers = {}) {
  res.writeHead(303, { Location: location, ...headers });
  res.end();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

function layout({ title, user, active, content, fullMap = false }) {
  return `<!doctype html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} · Plataforma Praias</title>
  <link rel="stylesheet" href="/assets/style.css">
  ${fullMap ? '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">' : ""}
  ${fullMap ? '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>' : ""}
</head>
<body class="${fullMap ? "map-body" : ""}">
  ${user ? `<nav class="topbar">
    <a class="brand" href="/dashboard">Plataforma Praias</a>
    <div class="navlinks">
      ${navLink("/dashboard", "Dashboard", active)}
      ${navLink("/mapa", "Mapa", active)}
      ${navLink("/informacoes", "Informações", active)}
      ${navLink("/material-socorrismo", "Material de socorrismo", active)}
      ${navLink("/bandeiras", "Bandeiras", active)}
      ${user.role === "admin" ? navLink("/admin/bandeiras", "Análise bandeiras", active) : ""}
      ${navLink("/ocorrencias", "Ocorrências", active)}
      ${user.role === "admin" ? navLink("/admin/ocorrencias", "Análise ocorrências", active) : ""}
      ${navLink("/forum", "Fórum", active)}
      ${user.role === "admin" ? navLink("/utilizadores", "Utilizadores", active) : ""}
    </div>
    <form method="post" action="/logout"><button class="ghost" type="submit">Sair</button></form>
  </nav>` : ""}
  ${content}
</body>
</html>`;
}

function navLink(href, label, active) {
  return `<a class="${active === href ? "active" : ""}" href="${href}">${label}</a>`;
}

function authPage(mode, error = "") {
  const isSetup = mode === "setup";
  return layout({
    title: isSetup ? "Criar administrador" : "Entrar",
    user: null,
    content: `<main class="auth-shell">
      <section class="auth-panel">
        <p class="eyebrow">${isSetup ? "Primeira configuração" : "Acesso reservado"}</p>
        <h1>${isSetup ? "Criar administrador" : "Entrar na plataforma"}</h1>
        <p class="muted">${isSetup ? "Cria a primeira conta para proteger o mapa e os conteúdos informativos." : "Usa as tuas credenciais para aceder ao mapa e à informação operacional."}</p>
        ${error ? `<div class="alert">${escapeHtml(error)}</div>` : ""}
        <form method="post" action="${isSetup ? "/setup" : "/login"}" class="form">
          <label>Nome<input name="name" ${isSetup ? "required" : ""} autocomplete="name"></label>
          <label>Email<input name="email" type="email" required autocomplete="email"></label>
          <label>Palavra-passe<input name="password" type="password" required minlength="8" autocomplete="${isSetup ? "new-password" : "current-password"}"></label>
          <button type="submit">${isSetup ? "Criar administrador" : "Entrar"}</button>
        </form>
      </section>
    </main>`
  });
}

function dashboardPage(user) {
  return layout({
    title: "Dashboard",
    user,
    active: "/dashboard",
    content: `<main class="page">
      <section class="hero">
        <p class="eyebrow">Operação costeira</p>
        <h1>Mapa, pontos críticos e informação num só local.</h1>
        <p class="muted">Bem-vindo, ${escapeHtml(user.name)}. A plataforma está pronta para receber conteúdos reais, documentos e contas de equipa.</p>
      </section>
      <section class="stats">
        <article><strong>20</strong><span>Praias</span></article>
        <article><strong>7</strong><span>Pontos KML</span></article>
        <article><strong>1</strong><span>Mapa protegido</span></article>
      </section>
      <section class="grid">
        <a class="panel" href="/mapa"><h2>Mapa interativo</h2><p>Consultar praias, entradas, postos e pontos operacionais.</p></a>
        <a class="panel" href="/informacoes"><h2>Informações</h2><p>Organizar procedimentos, contactos, avisos e notas de serviço.</p></a>
        <a class="panel" href="/material-socorrismo"><h2>Material de socorrismo</h2><p>Aceder às listas e aos materiais de frente de praia e primeiros socorros.</p></a>
        <a class="panel" href="/bandeiras"><h2>Bandeiras</h2><p>Registar a bandeira colocada em cada praia, com data e hora.</p></a>
        <a class="panel" href="/ocorrencias"><h2>Ocorrências</h2><p>Registar ocorrências, meios no local, entidades externas, descrição e anexos PDF.</p></a>
        <a class="panel" href="/forum"><h2>Fórum</h2><p>Conversas de formação e consulta diária de bandeiras e ocorrências.</p></a>
      </section>
    </main>`
  });
}

function mapPage(user) {
  return layout({
    title: "Mapa",
    user,
    active: "/mapa",
    fullMap: true,
    content: `<main class="map-app">
      <aside class="map-side">
        <header>
          <h1>Mapa operacional</h1>
          <p>Praias e pontos importados do KML.</p>
        </header>
        <div class="controls">
          <input id="search" type="search" placeholder="Procurar ponto" autocomplete="off">
          <button id="fit" type="button">Ver tudo</button>
        </div>
        <div id="list" class="map-list"></div>
      </aside>
      <div id="map"></div>
    </main>
    <script>
      const points = ${JSON.stringify(beaches)};
      const map = L.map("map", { zoomControl: true, scrollWheelZoom: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
      }).addTo(map);
      const group = L.featureGroup().addTo(map);
      const list = document.getElementById("list");
      const rows = new Map();
      const markers = new Map();
      function icon(color) {
        return L.divIcon({
          className: "custom-marker",
          html: '<span style="display:block;width:18px;height:18px;border-radius:50%;background:' + color + ';border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.28)"></span>',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
          popupAnchor: [0, -10]
        });
      }
      points.forEach((point, index) => {
        const key = "p-" + index;
        const marker = L.marker([point.lat, point.lng], { icon: icon(point.color) }).addTo(group);
        marker.bindPopup('<strong>' + point.name + '</strong><br>' + point.type + ' · ' + point.area + '<br>' + point.lat.toFixed(5) + ', ' + point.lng.toFixed(5));
        const row = document.createElement("button");
        row.type = "button";
        row.className = "map-row";
        row.dataset.search = (point.name + " " + point.area + " " + point.type).toLowerCase();
        row.innerHTML = '<span class="dot" style="background:' + point.color + '">' + (index + 1) + '</span><span><strong>' + point.name + '</strong><small>' + point.type + ' · ' + point.area + '</small></span>';
        row.addEventListener("click", () => {
          map.setView(marker.getLatLng(), 15, { animate: true });
          marker.openPopup();
          setActive(key);
        });
        marker.on("click", () => setActive(key));
        list.appendChild(row);
        rows.set(key, row);
        markers.set(key, marker);
      });
      function setActive(key) {
        rows.forEach(row => row.classList.remove("active"));
        const row = rows.get(key);
        if (row) {
          row.classList.add("active");
          row.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      }
      function fitAll() {
        map.fitBounds(group.getBounds().pad(0.12));
      }
      document.getElementById("fit").addEventListener("click", fitAll);
      document.getElementById("search").addEventListener("input", (event) => {
        const term = event.target.value.trim().toLowerCase();
        rows.forEach(row => {
          row.style.display = row.dataset.search.includes(term) ? "grid" : "none";
        });
      });
      fitAll();
    </script>`
  });
}

function infoPage(user) {
  return layout({
    title: "Informações",
    user,
    active: "/informacoes",
    content: `<main class="page">
      <section class="section-head">
        <h1>Informações</h1>
        <p class="muted">Espaço preparado para conteúdos internos, procedimentos e notas operacionais.</p>
      </section>
      <section class="grid">
        ${information.map((item) => `<article class="panel"><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.body)}</p></article>`).join("")}
      </section>
    </main>`
  });
}

function materialHomePage(user) {
  return layout({
    title: "Material de socorrismo",
    user,
    active: "/material-socorrismo",
    content: `<main class="page">
      <section class="section-head">
        <h1>Material de socorrismo</h1>
        <p class="muted">Documentos organizados em dois caminhos: listas de verificação e materiais de apoio.</p>
      </section>
      <section class="grid">
        <a class="panel material-path" href="/material-socorrismo/listas">
          <span class="path-label">Caminho 1</span>
          <h2>Listas</h2>
          <p>Listas de material da frente de praia, malas de primeiros socorros e mala Stakar.</p>
        </a>
        <a class="panel material-path" href="/material-socorrismo/materiais">
          <span class="path-label">Caminho 2</span>
          <h2>Materiais</h2>
          <p>Documentos com material da frente de praia e malas de primeiros socorros.</p>
        </a>
      </section>
    </main>`
  });
}

function materialListPage(user, kind) {
  const isListas = kind === "listas";
  const docs = materialDocs[kind] || [];
  return layout({
    title: isListas ? "Listas" : "Materiais",
    user,
    active: "/material-socorrismo",
    content: `<main class="page">
      <section class="section-head">
        <a class="back-link" href="/material-socorrismo">Voltar ao Material de socorrismo</a>
        <h1>${isListas ? "Listas" : "Materiais"}</h1>
        <p class="muted">${isListas ? "Listas de verificação e controlo de material." : "Documentos de referência sobre os materiais disponíveis."}</p>
      </section>
      <section class="doc-list">
        ${docs.map((doc) => `<article class="doc-card">
          <div>
            <h2>${escapeHtml(doc.title)}</h2>
            <p>PDF protegido por login.</p>
          </div>
          <a class="button-link" href="/ficheiros/${encodeURIComponent(doc.file)}" target="_blank" rel="noopener">Abrir PDF</a>
        </article>`).join("")}
      </section>
    </main>`
  });
}

function flagFormPage(user, options = {}) {
  const now = new Date();
  const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  return layout({
    title: "Bandeiras",
    user,
    active: "/bandeiras",
    content: `<main class="page">
      <section class="section-head">
        <h1>Bandeiras</h1>
        <p class="muted">Regista a praia, a data/hora e o tipo de bandeira colocada.</p>
      </section>
      ${options.success ? '<div class="success">Registo submetido com sucesso.</div>' : ""}
      ${options.error ? `<div class="alert">${escapeHtml(options.error)}</div>` : ""}
      <section class="split">
        <form method="post" action="/bandeiras" class="panel form">
          <h2>Novo registo</h2>
          <label>Data e hora
            <input name="dateTime" type="datetime-local" required value="${escapeHtml(options.dateTime || localDateTime)}">
          </label>
          <label>Praia onde estão
            <select name="beachName" required>
              <option value="">Selecionar praia</option>
              ${beachOptions.map((name) => `<option value="${escapeHtml(name)}" ${options.beachName === name ? "selected" : ""}>${escapeHtml(name)}</option>`).join("")}
            </select>
          </label>
          <fieldset class="flag-field">
            <legend>Tipo de bandeira colocada</legend>
            ${flagTypes.map((flag) => `<label class="flag-choice">
              <input type="radio" name="flag" value="${flag.value}" ${options.flag === flag.value ? "checked" : ""} required>
              <span style="--flag-color:${flag.color}">${flag.label}</span>
            </label>`).join("")}
          </fieldset>
          <button type="submit">Submeter registo</button>
        </form>
        <section class="panel">
          <h2>Como fica registado</h2>
          <p>O registo fica associado ao teu utilizador e entra automaticamente nas estatísticas anuais disponíveis apenas para administradores.</p>
          ${user.role === "admin" ? '<a class="button-link" href="/admin/bandeiras">Ver análise de administrador</a>' : ""}
        </section>
      </section>
    </main>`
  });
}

async function flagAdminPage(user, selectedYear) {
  const entries = await readJson(FLAGS_FILE, []);
  const years = [...new Set(entries.map((entry) => new Date(entry.dateTime).getFullYear()).filter(Boolean))].sort((a, b) => b - a);
  const currentYear = new Date().getFullYear();
  const year = Number(selectedYear) || years[0] || currentYear;
  const filtered = entries.filter((entry) => new Date(entry.dateTime).getFullYear() === year);
  const totals = Object.fromEntries(flagTypes.map((flag) => [flag.value, filtered.filter((entry) => entry.flag === flag.value).length]));
  const grouped = beachOptions.map((beachName) => {
    const beachEntries = filtered.filter((entry) => entry.beachName === beachName);
    const total = beachEntries.length;
    const counts = Object.fromEntries(flagTypes.map((flag) => [flag.value, beachEntries.filter((entry) => entry.flag === flag.value).length]));
    return { beachName, total, counts };
  }).filter((row) => row.total > 0);

  return layout({
    title: "Análise bandeiras",
    user,
    active: "/admin/bandeiras",
    content: `<main class="page">
      <section class="section-head">
        <h1>Análise bandeiras</h1>
        <p class="muted">Percentagem de incidência de cada bandeira por praia ao longo do ano.</p>
      </section>
      <form class="filter-bar" method="get" action="/admin/bandeiras">
        <label>Ano
          <select name="ano">
            ${[...new Set([currentYear, ...years])].sort((a, b) => b - a).map((item) => `<option value="${item}" ${item === year ? "selected" : ""}>${item}</option>`).join("")}
          </select>
        </label>
        <button type="submit">Filtrar</button>
      </form>
      <section class="stats">
        <article><strong>${filtered.length}</strong><span>Registos em ${year}</span></article>
        <article><strong>${grouped.length}</strong><span>Praias com registos</span></article>
        <article><strong>${entries.length}</strong><span>Registos totais</span></article>
      </section>
      ${filtered.length ? pieSection("Distribuição anual das bandeiras", filtered.length, flagTypes, totals) : ""}
      ${grouped.length ? `<section class="analysis-list">
        ${grouped.map((row) => analysisRow(row)).join("")}
      </section>` : `<section class="panel"><h2>Sem dados para ${year}</h2><p class="muted">Quando forem submetidos registos de bandeiras, o gráfico aparece aqui automaticamente.</p></section>`}
      <section class="section-head compact-head"><h2>Registos submetidos</h2></section>
      ${filtered.length ? `<section class="doc-list">${filtered.map((entry) => flagRecord(entry, year)).join("")}</section>` : ""}
    </main>`
  });
}

function analysisRow(row) {
  return `<article class="analysis-card">
    <div class="analysis-head">
      <h2>${escapeHtml(row.beachName)}</h2>
      <span>${row.total} registo${row.total === 1 ? "" : "s"}</span>
    </div>
    <div class="bar-stack">
      ${flagTypes.map((flag) => {
        const count = row.counts[flag.value] || 0;
        const percentage = row.total ? Math.round((count / row.total) * 100) : 0;
        return `<div class="bar-line">
          <div class="bar-label"><span>${flag.label}</span><strong>${percentage}%</strong></div>
          <div class="bar-track"><span style="width:${percentage}%; background:${flag.color}"></span></div>
          <small>${count} de ${row.total}</small>
        </div>`;
      }).join("")}
    </div>
  </article>`;
}

function flagRecord(entry, year) {
  const flag = flagTypes.find((item) => item.value === entry.flag);
  return `<article class="doc-card">
    <div>
      <h2>${escapeHtml(entry.beachName)} · ${escapeHtml(flag ? flag.label : entry.flag)}</h2>
      <p>${escapeHtml(entry.dateTime.replace("T", " "))} · ${escapeHtml(entry.userName || "Utilizador")}</p>
    </div>
    <form method="post" action="/admin/bandeiras/eliminar" class="inline-delete">
      <input type="hidden" name="id" value="${escapeHtml(entry.id)}">
      <input type="hidden" name="ano" value="${escapeHtml(year)}">
      <button class="danger" type="submit">Eliminar</button>
    </form>
  </article>`;
}

function pieSection(title, total, items, counts) {
  let start = 0;
  const slices = items.map((item) => {
    const count = counts[item.value] || 0;
    const end = start + (total ? (count / total) * 100 : 0);
    const segment = `${item.color} ${start}% ${end}%`;
    start = end;
    return segment;
  }).join(", ");
  const background = total ? `conic-gradient(${slices})` : "#e7eef0";
  return `<section class="pie-panel">
    <div>
      <h2>${escapeHtml(title)}</h2>
      <p>${total} registo${total === 1 ? "" : "s"} no ano selecionado.</p>
    </div>
    <div class="pie-wrap">
      <div class="pie" style="background:${background}"></div>
      <div class="pie-legend">
        ${items.map((item) => {
          const count = counts[item.value] || 0;
          const percentage = total ? Math.round((count / total) * 100) : 0;
          return `<span><i style="background:${item.color}"></i>${item.label}: <strong>${percentage}%</strong> <small>(${count})</small></span>`;
        }).join("")}
      </div>
    </div>
  </section>`;
}

function occurrenceFormPage(user, options = {}) {
  const now = new Date();
  const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const checked = (name, value) => (options[name] || []).includes(value) ? "checked" : "";
  return layout({
    title: "Ocorrências",
    user,
    active: "/ocorrencias",
    content: `<main class="page">
      <section class="section-head">
        <h1>Ocorrências</h1>
        <p class="muted">Regista a ocorrência, os meios no local, entidades externas, descrição e anexo PDF opcional.</p>
      </section>
      ${options.success ? '<div class="success">Ocorrência submetida com sucesso.</div>' : ""}
      ${options.error ? `<div class="alert">${escapeHtml(options.error)}</div>` : ""}
      <form method="post" action="/ocorrencias" enctype="multipart/form-data" class="panel form wide-form">
        <section class="form-grid">
          <label>Data e hora
            <input name="dateTime" type="datetime-local" required value="${escapeHtml(options.dateTime || localDateTime)}">
          </label>
          <label>Praia onde estão
            <select name="beachName" required>
              <option value="">Selecionar praia</option>
              ${beachOptions.map((name) => `<option value="${escapeHtml(name)}" ${options.beachName === name ? "selected" : ""}>${escapeHtml(name)}</option>`).join("")}
            </select>
          </label>
        </section>
        <fieldset class="flag-field">
          <legend>Tipo de ocorrência</legend>
          ${occurrenceTypes.map((item) => `<label class="flag-choice">
            <input type="radio" name="occurrenceType" value="${item.value}" ${options.occurrenceType === item.value ? "checked" : ""} required>
            <span style="--flag-color:${item.color}">${item.label}</span>
          </label>`).join("")}
        </fieldset>
        <fieldset class="check-grid">
          <legend>Pequenas ocorrências</legend>
          ${smallOccurrenceTypes.map((item) => checkBox("smallOccurrences", item, checked("smallOccurrences", item))).join("")}
        </fieldset>
        <fieldset class="check-grid">
          <legend>Tipo de meios no local</legend>
          ${localMeansTypes.map((item) => checkBox("localMeans", item, checked("localMeans", item))).join("")}
        </fieldset>
        <fieldset class="check-grid">
          <legend>Entidades externas no local</legend>
          ${externalEntityTypes.map((item) => checkBox("externalEntities", item, checked("externalEntities", item))).join("")}
        </fieldset>
        <label>Descrição da ocorrência
          <textarea name="description" rows="6" required placeholder="Descreve o que aconteceu">${escapeHtml(options.description || "")}</textarea>
        </label>
        <label>PDF da ocorrência, opcional
          <input name="pdf" type="file" accept="application/pdf,.pdf">
        </label>
        <div class="form-actions">
          <button type="submit">Submeter ocorrência</button>
          ${user.role === "admin" ? '<a class="button-link" href="/admin/ocorrencias">Ver análise de administrador</a>' : ""}
        </div>
      </form>
    </main>`
  });
}

function checkBox(name, value, checkedAttr) {
  return `<label class="check-choice">
    <input type="checkbox" name="${name}" value="${escapeHtml(value)}" ${checkedAttr}>
    <span>${escapeHtml(value)}</span>
  </label>`;
}

async function occurrenceAdminPage(user, selectedYear) {
  const entries = await readJson(OCCURRENCES_FILE, []);
  const years = [...new Set(entries.map((entry) => new Date(entry.dateTime).getFullYear()).filter(Boolean))].sort((a, b) => b - a);
  const currentYear = new Date().getFullYear();
  const year = Number(selectedYear) || years[0] || currentYear;
  const filtered = entries.filter((entry) => new Date(entry.dateTime).getFullYear() === year);
  const totals = Object.fromEntries(occurrenceTypes.map((type) => [type.value, filtered.filter((entry) => entry.occurrenceType === type.value).length]));
  const byBeach = beachOptions.map((beachName) => {
    const beachEntries = filtered.filter((entry) => entry.beachName === beachName);
    const total = beachEntries.length;
    const counts = Object.fromEntries(occurrenceTypes.map((type) => [type.value, beachEntries.filter((entry) => entry.occurrenceType === type.value).length]));
    return { beachName, total, counts };
  }).filter((row) => row.total > 0);
  const meansRows = localMeansTypes.map((mean) => {
    const total = filtered.filter((entry) => entry.localMeans.includes(mean)).length;
    const counts = Object.fromEntries(occurrenceTypes.map((type) => [
      type.value,
      filtered.filter((entry) => entry.localMeans.includes(mean) && entry.occurrenceType === type.value).length
    ]));
    return { name: mean, total, counts };
  }).filter((row) => row.total > 0);

  return layout({
    title: "Análise ocorrências",
    user,
    active: "/admin/ocorrencias",
    content: `<main class="page">
      <section class="section-head">
        <h1>Análise ocorrências</h1>
        <p class="muted">Percentagens por praia, tipo de ocorrência e meios no local ao longo do ano.</p>
      </section>
      <form class="filter-bar" method="get" action="/admin/ocorrencias">
        <label>Ano
          <select name="ano">
            ${[...new Set([currentYear, ...years])].sort((a, b) => b - a).map((item) => `<option value="${item}" ${item === year ? "selected" : ""}>${item}</option>`).join("")}
          </select>
        </label>
        <button type="submit">Filtrar</button>
      </form>
      <section class="stats">
        <article><strong>${filtered.length}</strong><span>Ocorrências em ${year}</span></article>
        <article><strong>${byBeach.length}</strong><span>Praias com ocorrências</span></article>
        <article><strong>${filtered.filter((entry) => entry.pdf).length}</strong><span>PDFs anexados</span></article>
      </section>
      ${filtered.length ? pieSection("Distribuição anual das ocorrências", filtered.length, occurrenceTypes, totals) : ""}
      <section class="section-head compact-head"><h2>Incidência por praia</h2></section>
      ${byBeach.length ? `<section class="analysis-list">${byBeach.map((row) => occurrenceAnalysisRow(row)).join("")}</section>` : emptyPanel(year)}
      <section class="section-head compact-head"><h2>Meios no local por tipo de ocorrência</h2></section>
      ${meansRows.length ? `<section class="analysis-list">${meansRows.map((row) => occurrenceAnalysisRow({ beachName: row.name, total: row.total, counts: row.counts })).join("")}</section>` : emptyPanel(year)}
      <section class="section-head compact-head"><h2>Registos e PDFs</h2></section>
      ${filtered.length ? `<section class="doc-list">${filtered.map((entry) => occurrenceRecord(entry, year)).join("")}</section>` : emptyPanel(year)}
    </main>`
  });
}

function occurrenceAnalysisRow(row) {
  return `<article class="analysis-card">
    <div class="analysis-head">
      <h2>${escapeHtml(row.beachName)}</h2>
      <span>${row.total} ocorrência${row.total === 1 ? "" : "s"}</span>
    </div>
    <div class="bar-stack">
      ${occurrenceTypes.map((type) => {
        const count = row.counts[type.value] || 0;
        const percentage = row.total ? Math.round((count / row.total) * 100) : 0;
        return `<div class="bar-line">
          <div class="bar-label"><span>${type.label}</span><strong>${percentage}%</strong></div>
          <div class="bar-track"><span style="width:${percentage}%; background:${type.color}"></span></div>
          <small>${count} de ${row.total}</small>
        </div>`;
      }).join("")}
    </div>
  </article>`;
}

function occurrenceRecord(entry, year) {
  const type = occurrenceTypes.find((item) => item.value === entry.occurrenceType);
  return `<article class="doc-card">
    <div>
      <h2>${escapeHtml(entry.beachName)} · ${escapeHtml(type ? type.label : entry.occurrenceType)}</h2>
      <p>${escapeHtml(entry.dateTime.replace("T", " "))} · ${escapeHtml(entry.userName || "Utilizador")} · Meios: ${escapeHtml(entry.localMeans.join(", ") || "Sem registo")}</p>
    </div>
    <div class="record-actions">
      ${entry.pdf ? `<a class="button-link" href="/admin/ocorrencias/pdf/${encodeURIComponent(entry.pdf.fileName)}" target="_blank" rel="noopener">Abrir PDF</a>` : '<span class="muted">Sem PDF</span>'}
      <form method="post" action="/admin/ocorrencias/eliminar" class="inline-delete">
        <input type="hidden" name="id" value="${escapeHtml(entry.id)}">
        <input type="hidden" name="ano" value="${escapeHtml(year)}">
        <button class="danger" type="submit">Eliminar</button>
      </form>
    </div>
  </article>`;
}

function emptyPanel(year) {
  return `<section class="panel"><h2>Sem dados para ${year}</h2><p class="muted">Quando forem submetidas ocorrências, a análise aparece aqui automaticamente.</p></section>`;
}

function todayLocalDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function dateLabel(value) {
  return String(value || "").replace("T", " ");
}

async function forumPage(user, options = {}) {
  const topics = await readJson(FORUM_FILE, []);
  const flags = await readJson(FLAGS_FILE, []);
  const occurrences = await readJson(OCCURRENCES_FILE, []);
  const today = todayLocalDate();
  const todayFlags = flags.filter((entry) => String(entry.dateTime || "").slice(0, 10) === today)
    .sort((a, b) => String(b.dateTime).localeCompare(String(a.dateTime)));
  const todayOccurrences = occurrences.filter((entry) => String(entry.dateTime || "").slice(0, 10) === today)
    .sort((a, b) => String(b.dateTime).localeCompare(String(a.dateTime)));

  return layout({
    title: "Fórum",
    user,
    active: "/forum",
    content: `<main class="page">
      <section class="section-head">
        <h1>Fórum</h1>
        <p class="muted">Três grupos: formação e treino, estado das bandeiras do dia e ocorrências do dia.</p>
      </section>
      ${options.success ? `<div class="success">${escapeHtml(options.success)}</div>` : ""}
      ${options.error ? `<div class="alert">${escapeHtml(options.error)}</div>` : ""}
      <section class="forum-tabs">
        <a href="#formacao">Formação e treino</a>
        <a href="#bandeiras-dia">Bandeiras</a>
        <a href="#ocorrencias-dia">Ocorrências</a>
      </section>

      <section id="formacao" class="forum-section">
        <div class="section-head compact-head">
          <h2>Formação e treino</h2>
          <p class="muted">O administrador lança perguntas ou curiosidades. Os utilizadores podem responder e trocar ideias.</p>
        </div>
        ${user.role === "admin" ? `<form method="post" action="/forum/formacao/topico" class="panel form forum-form">
          <h2>Novo tópico</h2>
          <label>Título<input name="title" required maxlength="120"></label>
          <label>Pergunta ou curiosidade<textarea name="body" rows="4" required></textarea></label>
          <button type="submit">Publicar tópico</button>
        </form>` : ""}
        <section class="forum-list">
          ${topics.length ? topics.map((topic) => forumTopic(topic)).join("") : '<article class="panel"><h2>Ainda sem tópicos</h2><p class="muted">Quando o administrador publicar uma pergunta ou curiosidade, aparece aqui.</p></article>'}
        </section>
      </section>

      <section id="bandeiras-dia" class="forum-section">
        <div class="section-head compact-head">
          <h2>Bandeiras</h2>
          <p class="muted">Consulta da bandeira registada em cada praia hoje. Informação recolhida do questionário Bandeiras.</p>
        </div>
        <section class="doc-list">
          ${todayFlags.length ? todayFlags.map((entry) => flagConsultationCard(entry)).join("") : `<article class="panel"><h2>Sem bandeiras registadas hoje</h2><p class="muted">Os registos aparecem aqui assim que forem submetidos no separador Bandeiras.</p></article>`}
        </section>
      </section>

      <section id="ocorrencias-dia" class="forum-section">
        <div class="section-head compact-head">
          <h2>Ocorrências</h2>
          <p class="muted">Consulta das ocorrências registadas hoje. Informação recolhida do questionário Ocorrências.</p>
        </div>
        <section class="doc-list">
          ${todayOccurrences.length ? todayOccurrences.map((entry) => occurrenceConsultationCard(entry)).join("") : `<article class="panel"><h2>Sem ocorrências registadas hoje</h2><p class="muted">Os registos aparecem aqui assim que forem submetidos no separador Ocorrências.</p></article>`}
        </section>
      </section>
    </main>`
  });
}

function forumTopic(topic) {
  return `<article class="forum-topic">
    <div class="forum-topic-head">
      <div>
        <h2>${escapeHtml(topic.title)}</h2>
        <p>${escapeHtml(topic.userName || "Administrador")} · ${escapeHtml(dateLabel(topic.createdAt?.slice(0, 16)))}</p>
      </div>
    </div>
    <p class="topic-body">${escapeHtml(topic.body)}</p>
    <div class="reply-list">
      ${(topic.replies || []).length ? topic.replies.map((reply) => `<div class="reply"><strong>${escapeHtml(reply.userName || "Utilizador")}</strong><span>${escapeHtml(dateLabel(reply.createdAt?.slice(0, 16)))}</span><p>${escapeHtml(reply.body)}</p></div>`).join("") : '<p class="muted">Ainda sem respostas.</p>'}
    </div>
    <form method="post" action="/forum/formacao/responder" class="reply-form">
      <input type="hidden" name="topicId" value="${escapeHtml(topic.id)}">
      <label>Responder<textarea name="body" rows="3" required></textarea></label>
      <button type="submit">Responder</button>
    </form>
  </article>`;
}

function flagConsultationCard(entry) {
  const flag = flagTypes.find((item) => item.value === entry.flag);
  return `<article class="doc-card">
    <div>
      <h2>${escapeHtml(entry.beachName)}</h2>
      <p>${escapeHtml(dateLabel(entry.dateTime))} · Bandeira ${escapeHtml(flag ? flag.label : entry.flag)} · Registado por ${escapeHtml(entry.userName || "Utilizador")}</p>
    </div>
    <span class="status-pill" style="--pill-color:${flag ? flag.color : "#60727a"}">${escapeHtml(flag ? flag.label : entry.flag)}</span>
  </article>`;
}

function occurrenceConsultationCard(entry) {
  const type = occurrenceTypes.find((item) => item.value === entry.occurrenceType);
  return `<article class="doc-card">
    <div>
      <h2>${escapeHtml(entry.beachName)} · ${escapeHtml(type ? type.label : entry.occurrenceType)}</h2>
      <p>${escapeHtml(dateLabel(entry.dateTime))} · Meios: ${escapeHtml((entry.localMeans || []).join(", ") || "Sem registo")} · Entidades: ${escapeHtml((entry.externalEntities || []).join(", ") || "Sem registo")}</p>
      <p>${escapeHtml(entry.description || "")}</p>
    </div>
    <span class="status-pill" style="--pill-color:${type ? type.color : "#60727a"}">${escapeHtml(type ? type.label : "Ocorrência")}</span>
  </article>`;
}

async function usersPage(user, error = "") {
  const users = await readJson(USERS_FILE, []);
  return layout({
    title: "Utilizadores",
    user,
    active: "/utilizadores",
    content: `<main class="page">
      <section class="section-head">
        <h1>Utilizadores</h1>
        <p class="muted">Criar contas para acesso real à plataforma.</p>
      </section>
      ${error ? `<div class="alert">${escapeHtml(error)}</div>` : ""}
      <section class="split">
        <form method="post" action="/utilizadores" class="panel form">
          <h2>Novo utilizador</h2>
          <label>Nome<input name="name" required></label>
          <label>Email<input name="email" type="email" required></label>
          <label>Palavra-passe<input name="password" type="password" required minlength="8"></label>
          <label>Perfil<select name="role"><option value="user">Utilizador</option><option value="admin">Administrador</option></select></label>
          <button type="submit">Criar conta</button>
        </form>
        <section class="panel">
          <h2>Contas existentes</h2>
          <div class="user-list">
            ${users.map((item) => `<div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.email)} · ${escapeHtml(item.role)}</span></div>`).join("")}
          </div>
        </section>
      </section>
    </main>`
  });
}

async function handle(req, res) {
  await ensureDataFiles();
  const url = new URL(req.url, `http://${req.headers.host}`);
  const users = await readJson(USERS_FILE, []);
  const user = await currentUser(req);

  if (url.pathname === "/assets/style.css") {
    const css = await fs.readFile(path.join(__dirname, "assets", "style.css"), "utf8");
    res.writeHead(200, { "Content-Type": "text/css; charset=utf-8" });
    res.end(css);
    return;
  }

  if (url.pathname === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("ok");
    return;
  }

  if (!users.length && url.pathname !== "/setup") {
    redirect(res, "/setup");
    return;
  }

  if (req.method === "GET" && url.pathname === "/setup") {
    if (users.length) return redirect(res, "/login");
    send(res, 200, authPage("setup"));
    return;
  }

  if (req.method === "POST" && url.pathname === "/setup") {
    if (users.length) return redirect(res, "/login");
    const form = await body(req);
    const name = form.get("name");
    const email = String(form.get("email") || "").toLowerCase().trim();
    const password = String(form.get("password") || "");
    if (!name || !email || password.length < 8) {
      send(res, 400, authPage("setup", "Preenche todos os campos. A palavra-passe deve ter pelo menos 8 caracteres."));
      return;
    }
    const admin = { id: crypto.randomUUID(), name, email, role: "admin", passwordHash: hashPassword(password), createdAt: new Date().toISOString() };
    await writeJson(USERS_FILE, [admin]);
    const sessionId = await createSession(admin.id);
    redirect(res, "/dashboard", { "Set-Cookie": makeCookie(sessionId, SESSION_TTL_MS / 1000) });
    return;
  }

  if (req.method === "GET" && url.pathname === "/login") {
    if (user) return redirect(res, "/dashboard");
    send(res, 200, authPage("login"));
    return;
  }

  if (req.method === "POST" && url.pathname === "/login") {
    const form = await body(req);
    const email = String(form.get("email") || "").toLowerCase().trim();
    const password = String(form.get("password") || "");
    const found = users.find((item) => item.email === email);
    if (!found || !verifyPassword(password, found.passwordHash)) {
      send(res, 401, authPage("login", "Credenciais inválidas."));
      return;
    }
    const sessionId = await createSession(found.id);
    redirect(res, "/dashboard", { "Set-Cookie": makeCookie(sessionId, SESSION_TTL_MS / 1000) });
    return;
  }

  if (req.method === "POST" && url.pathname === "/logout") {
    await destroySession(req);
    redirect(res, "/login", { "Set-Cookie": clearCookie() });
    return;
  }

  if (!user) {
    redirect(res, "/login");
    return;
  }

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/dashboard")) return send(res, 200, dashboardPage(user));
  if (req.method === "GET" && url.pathname === "/mapa") return send(res, 200, mapPage(user));
  if (req.method === "GET" && url.pathname === "/informacoes") return send(res, 200, infoPage(user));
  if (req.method === "GET" && url.pathname === "/material-socorrismo") return send(res, 200, materialHomePage(user));
  if (req.method === "GET" && url.pathname === "/material-socorrismo/listas") return send(res, 200, materialListPage(user, "listas"));
  if (req.method === "GET" && url.pathname === "/material-socorrismo/materiais") return send(res, 200, materialListPage(user, "materiais"));
  if (req.method === "GET" && url.pathname === "/forum") return send(res, 200, await forumPage(user, {
    success: url.searchParams.get("ok") === "topico" ? "Tópico publicado com sucesso." : url.searchParams.get("ok") === "resposta" ? "Resposta publicada com sucesso." : ""
  }));
  if (req.method === "POST" && url.pathname === "/forum/formacao/topico") {
    if (user.role !== "admin") return send(res, 403, layout({ title: "Sem acesso", user, content: '<main class="page"><h1>Sem acesso</h1></main>' }));
    const form = await body(req);
    const title = String(form.get("title") || "").trim();
    const topicBody = String(form.get("body") || "").trim();
    if (!title || !topicBody) return send(res, 400, await forumPage(user, { error: "Preenche o título e a pergunta antes de publicar." }));
    const topics = await readJson(FORUM_FILE, []);
    topics.unshift({
      id: crypto.randomUUID(),
      title,
      body: topicBody,
      userId: user.id,
      userName: user.name,
      createdAt: new Date().toISOString(),
      replies: []
    });
    await writeJson(FORUM_FILE, topics);
    redirect(res, "/forum?ok=topico#formacao");
    return;
  }
  if (req.method === "POST" && url.pathname === "/forum/formacao/responder") {
    const form = await body(req);
    const topicId = String(form.get("topicId") || "");
    const replyBody = String(form.get("body") || "").trim();
    const topics = await readJson(FORUM_FILE, []);
    const topic = topics.find((item) => item.id === topicId);
    if (!topic || !replyBody) return send(res, 400, await forumPage(user, { error: "Não foi possível publicar a resposta. Confirma o texto e tenta novamente." }));
    topic.replies = topic.replies || [];
    topic.replies.push({
      id: crypto.randomUUID(),
      body: replyBody,
      userId: user.id,
      userName: user.name,
      createdAt: new Date().toISOString()
    });
    await writeJson(FORUM_FILE, topics);
    redirect(res, "/forum?ok=resposta#formacao");
    return;
  }
  if (req.method === "GET" && url.pathname === "/bandeiras") {
    return send(res, 200, flagFormPage(user, { success: url.searchParams.get("ok") === "1" }));
  }
  if (req.method === "POST" && url.pathname === "/bandeiras") {
    const form = await body(req);
    const dateTime = String(form.get("dateTime") || "").trim();
    const beachName = String(form.get("beachName") || "").trim();
    const flag = String(form.get("flag") || "").trim();
    const validFlag = flagTypes.some((item) => item.value === flag);
    if (!dateTime || Number.isNaN(new Date(dateTime).getTime()) || !beachOptions.includes(beachName) || !validFlag) {
      return send(res, 400, flagFormPage(user, {
        error: "Confirma a data/hora, a praia e a bandeira antes de submeter.",
        dateTime,
        beachName,
        flag
      }));
    }
    const entries = await readJson(FLAGS_FILE, []);
    entries.push({
      id: crypto.randomUUID(),
      dateTime,
      beachName,
      flag,
      userId: user.id,
      userName: user.name,
      createdAt: new Date().toISOString()
    });
    await writeJson(FLAGS_FILE, entries);
    redirect(res, "/bandeiras?ok=1");
    return;
  }
  if (req.method === "GET" && url.pathname === "/admin/bandeiras") {
    if (user.role !== "admin") return send(res, 403, layout({ title: "Sem acesso", user, content: '<main class="page"><h1>Sem acesso</h1></main>' }));
    return send(res, 200, await flagAdminPage(user, url.searchParams.get("ano")));
  }
  if (req.method === "POST" && url.pathname === "/admin/bandeiras/eliminar") {
    if (user.role !== "admin") return send(res, 403, layout({ title: "Sem acesso", user, content: '<main class="page"><h1>Sem acesso</h1></main>' }));
    const form = await body(req);
    const id = String(form.get("id") || "");
    const year = String(form.get("ano") || "");
    const entries = await readJson(FLAGS_FILE, []);
    await writeJson(FLAGS_FILE, entries.filter((entry) => entry.id !== id));
    redirect(res, `/admin/bandeiras${year ? `?ano=${encodeURIComponent(year)}` : ""}`);
    return;
  }
  if (req.method === "GET" && url.pathname === "/ocorrencias") {
    return send(res, 200, occurrenceFormPage(user, { success: url.searchParams.get("ok") === "1" }));
  }
  if (req.method === "POST" && url.pathname === "/ocorrencias") {
    const parsed = await multipartBody(req);
    const dateTime = one(parsed.fields, "dateTime").trim();
    const beachName = one(parsed.fields, "beachName").trim();
    const occurrenceType = one(parsed.fields, "occurrenceType").trim();
    const smallOccurrences = many(parsed.fields, "smallOccurrences").filter((item) => smallOccurrenceTypes.includes(item));
    const localMeans = many(parsed.fields, "localMeans").filter((item) => localMeansTypes.includes(item));
    const externalEntities = many(parsed.fields, "externalEntities").filter((item) => externalEntityTypes.includes(item));
    const description = one(parsed.fields, "description").trim();
    const validOccurrence = occurrenceTypes.some((item) => item.value === occurrenceType);
    const keep = { dateTime, beachName, occurrenceType, smallOccurrences, localMeans, externalEntities, description };
    if (!dateTime || Number.isNaN(new Date(dateTime).getTime()) || !beachOptions.includes(beachName) || !validOccurrence || !description) {
      return send(res, 400, occurrenceFormPage(user, { ...keep, error: "Confirma a data/hora, a praia, o tipo e a descrição antes de submeter." }));
    }
    const pdf = parsed.files.pdf && parsed.files.pdf.originalName ? parsed.files.pdf : null;
    let savedPdf = null;
    if (pdf && pdf.data.length > 0) {
      if (pdf.contentType !== "application/pdf" && !pdf.originalName.toLowerCase().endsWith(".pdf")) {
        return send(res, 400, occurrenceFormPage(user, { ...keep, error: "O anexo tem de ser um ficheiro PDF." }));
      }
      if (!pdf.data.slice(0, 5).toString("utf8").startsWith("%PDF-")) {
        return send(res, 400, occurrenceFormPage(user, { ...keep, error: "O ficheiro enviado não parece ser um PDF válido." }));
      }
      const fileName = `${crypto.randomUUID()}.pdf`;
      await fs.writeFile(path.join(OCCURRENCE_UPLOADS_DIR, fileName), pdf.data);
      savedPdf = { fileName, originalName: pdf.originalName, size: pdf.data.length };
    }
    const entries = await readJson(OCCURRENCES_FILE, []);
    entries.push({
      id: crypto.randomUUID(),
      dateTime,
      beachName,
      occurrenceType,
      smallOccurrences,
      localMeans,
      externalEntities,
      description,
      pdf: savedPdf,
      userId: user.id,
      userName: user.name,
      createdAt: new Date().toISOString()
    });
    await writeJson(OCCURRENCES_FILE, entries);
    redirect(res, "/ocorrencias?ok=1");
    return;
  }
  if (req.method === "GET" && url.pathname === "/admin/ocorrencias") {
    if (user.role !== "admin") return send(res, 403, layout({ title: "Sem acesso", user, content: '<main class="page"><h1>Sem acesso</h1></main>' }));
    return send(res, 200, await occurrenceAdminPage(user, url.searchParams.get("ano")));
  }
  if (req.method === "POST" && url.pathname === "/admin/ocorrencias/eliminar") {
    if (user.role !== "admin") return send(res, 403, layout({ title: "Sem acesso", user, content: '<main class="page"><h1>Sem acesso</h1></main>' }));
    const form = await body(req);
    const id = String(form.get("id") || "");
    const year = String(form.get("ano") || "");
    const entries = await readJson(OCCURRENCES_FILE, []);
    const entry = entries.find((item) => item.id === id);
    await removeOccurrencePdf(entry);
    await writeJson(OCCURRENCES_FILE, entries.filter((item) => item.id !== id));
    redirect(res, `/admin/ocorrencias${year ? `?ano=${encodeURIComponent(year)}` : ""}`);
    return;
  }
  if (req.method === "GET" && url.pathname.startsWith("/admin/ocorrencias/pdf/")) {
    const fileName = decodeURIComponent(url.pathname.slice("/admin/ocorrencias/pdf/".length));
    await sendOccurrencePdf(res, user, fileName);
    return;
  }
  if (req.method === "GET" && url.pathname.startsWith("/ficheiros/")) {
    const file = decodeURIComponent(url.pathname.slice("/ficheiros/".length));
    await sendProtectedFile(res, file);
    return;
  }

  if (url.pathname === "/utilizadores") {
    if (user.role !== "admin") return send(res, 403, layout({ title: "Sem acesso", user, content: '<main class="page"><h1>Sem acesso</h1></main>' }));
    if (req.method === "GET") return send(res, 200, await usersPage(user));
    if (req.method === "POST") {
      const form = await body(req);
      const name = String(form.get("name") || "").trim();
      const email = String(form.get("email") || "").toLowerCase().trim();
      const password = String(form.get("password") || "");
      const role = form.get("role") === "admin" ? "admin" : "user";
      if (!name || !email || password.length < 8) return send(res, 400, await usersPage(user, "Preenche todos os campos. A palavra-passe deve ter pelo menos 8 caracteres."));
      if (users.some((item) => item.email === email)) return send(res, 409, await usersPage(user, "Já existe uma conta com esse email."));
      users.push({ id: crypto.randomUUID(), name, email, role, passwordHash: hashPassword(password), createdAt: new Date().toISOString() });
      await writeJson(USERS_FILE, users);
      redirect(res, "/utilizadores");
      return;
    }
  }

  send(res, 404, layout({ title: "Não encontrado", user, content: '<main class="page"><h1>Página não encontrada</h1></main>' }));
}

http.createServer((req, res) => {
  handle(req, res).catch((error) => {
    console.error(error);
    send(res, 500, "<h1>Erro interno</h1>");
  });
}).listen(PORT, () => {
  console.log(`Plataforma pronta em http://localhost:${PORT}`);
});
