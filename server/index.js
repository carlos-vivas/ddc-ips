import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, normalize, extname } from "node:path";
import { Pool } from "pg";

// Carpeta del frontend compilado (vite build). Si no existe (dev local),
// el servidor solo responde la API y Vite sirve la página.
const DIST = join(import.meta.dirname, "..", "dist");
const HAY_DIST = existsSync(join(DIST, "index.html"));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
};

async function servirEstatico(req, res, ruta) {
  // Solo archivos dentro de dist (anti path-traversal) y solo lectura.
  let rel = decodeURIComponent(ruta);
  if (rel === "/") rel = "/index.html";
  const archivo = normalize(join(DIST, rel));
  if (!archivo.startsWith(DIST)) {
    res.writeHead(403);
    return res.end();
  }
  try {
    const info = await stat(archivo);
    if (!info.isFile()) throw new Error("no es archivo");
    const ext = extname(archivo).toLowerCase();
    const esIndex = archivo === join(DIST, "index.html");
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      // Assets con hash: caché larga. index.html: siempre fresco (SPA).
      "Cache-Control": esIndex ? "no-cache" : "public, max-age=31536000, immutable",
    });
    if (req.method === "HEAD") return res.end();
    res.end(await readFile(archivo));
  } catch {
    // Fallback SPA: cualquier ruta no-API devuelve index.html
    // (así /trabaja-con-nosotros y /pqrs funcionan al recargar).
    try {
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
      });
      if (req.method === "HEAD") return res.end();
      res.end(await readFile(join(DIST, "index.html")));
    } catch {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "No encontrado" }));
    }
  }
}

const PORT = process.env.PORT || 3001;
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const MAIL_FROM = process.env.MAIL_FROM || "no-reply@ddcips.com";
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || "DDC IPS";
const MAIL_TO = process.env.MAIL_TO || "recursoshumanos.ddcipssas@gmail.com";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const DATABASE_URL = process.env.DB || process.env.DATABASE_URL || "";

const CORS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function send(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    ...CORS,
  });
  res.end(JSON.stringify(body));
}

function readBody(req, limite = 12_000_000) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > limite) {
        req.destroy();
        reject(new Error("Payload demasiado grande"));
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

// ---------------------------------------------------------------------------
// Anti-abuso: rate limit en memoria por IP (ventana deslizante simple).
// No es un WAF completo, pero frena F5 compulsivo y spam de formularios.
// ---------------------------------------------------------------------------
const buckets = new Map(); // clave -> { inicio, conteo }
// Fallback en memoria del contador (si la BD se cae, el sitio sigue contando).
const memoria = { total: 0, vistas: new Map() };

function excedeLimite(clave, max, ventanaMs) {
  const ahora = Date.now();
  const actual = buckets.get(clave);
  if (!actual || ahora - actual.inicio > ventanaMs) {
    buckets.set(clave, { inicio: ahora, conteo: 1 });
    return false;
  }
  actual.conteo += 1;
  return actual.conteo > max;
}

// Limpieza periódica para no crecer en memoria sin control.
setInterval(() => {
  const ahora = Date.now();
  for (const [clave, valor] of buckets) {
    if (ahora - valor.inicio > 10 * 60 * 1000) buckets.delete(clave);
  }
  // Limpieza del fallback en memoria del contador (huellas > 30 días).
  for (const [huella, visto] of memoria.vistas) {
    if (ahora - visto > 30 * 24 * 60 * 60 * 1000) memoria.vistas.delete(huella);
  }
}, 5 * 60 * 1000).unref();

function ipDe(req) {
  // Detrás de Cloudflare la IP real viene en CF-Connecting-IP (X-Forwarded-For
  // trae IPs internas de Cloudflare por los saltos intermedios).
  const cf = req.headers["cf-connecting-ip"];
  if (typeof cf === "string" && cf.length > 0) {
    return cf.trim().slice(0, 64);
  }
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) {
    return fwd.split(",")[0].trim().slice(0, 64);
  }
  return (req.socket?.remoteAddress || "desconocida").slice(0, 64);
}

// ---------------------------------------------------------------------------
// Contador de visitas: Postgres como fuente de verdad, memoria como fallback
// para que el sitio nunca colapse si la BD se cae.
// ---------------------------------------------------------------------------
const VENTANA_CONTEO_MS = 24 * 60 * 60 * 1000; // 1 visita contada por visitante/día

let pool = null;
let bdLista = false;

if (DATABASE_URL) {
  const forzarSSL = process.env.DB_SSL === "1" || DATABASE_URL.includes("sslmode=require");
  pool = new Pool({
    connectionString: DATABASE_URL,
    max: 5, // pool pequeño: el endpoint es liviano y así no saturamos la BD
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 8_000,
    ...(forzarSSL ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  pool.on("error", (err) => {
    bdLista = false;
    console.error("Error en pool de BD (paso a memoria):", err.message);
  });
}

async function initBD() {
  if (!pool || bdLista) return;
  try {
    await pool.query(
      "CREATE TABLE IF NOT EXISTS visitas_contador (id INT PRIMARY KEY, total BIGINT NOT NULL DEFAULT 0)",
    );
    await pool.query(
      "INSERT INTO visitas_contador (id, total) VALUES (1, 0) ON CONFLICT (id) DO NOTHING",
    );
    await pool.query(
      "CREATE TABLE IF NOT EXISTS visitas_vistas (huella TEXT PRIMARY KEY, visto_en TIMESTAMPTZ NOT NULL DEFAULT now())",
    );
    bdLista = true;
    console.log("Contador de visitas: BD conectada");
  } catch (err) {
    bdLista = false;
    console.error("BD no disponible, contador en memoria:", err.message);
  }
}

async function obtenerTotal() {
  if (!pool || !bdLista) return memoria.total;
  const r = await pool.query("SELECT total FROM visitas_contador WHERE id = 1");
  return Number(r.rows[0]?.total ?? 0);
}

async function registrarVisita(huella) {
  // Sin BD: misma regla (1/día por huella) pero en memoria.
  if (!pool || !bdLista) {
    const ahora = Date.now();
    const ultima = memoria.vistas.get(huella) || 0;
    if (ahora - ultima < VENTANA_CONTEO_MS) {
      return { total: memoria.total, contada: false };
    }
    memoria.vistas.set(huella, ahora);
    memoria.total += 1;
    return { total: memoria.total, contada: true };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existe = await client.query(
      "SELECT 1 FROM visitas_vistas WHERE huella = $1 AND visto_en > now() - interval '24 hours'",
      [huella],
    );
    if (existe.rowCount > 0) {
      const r = await client.query("SELECT total FROM visitas_contador WHERE id = 1");
      await client.query("COMMIT");
      return { total: Number(r.rows[0]?.total ?? 0), contada: false };
    }
    await client.query(
      "INSERT INTO visitas_vistas (huella) VALUES ($1) ON CONFLICT (huella) DO UPDATE SET visto_en = now()",
      [huella],
    );
    const r = await client.query(
      "UPDATE visitas_contador SET total = total + 1 WHERE id = 1 RETURNING total",
    );
    await client.query("COMMIT");
    // Limpieza oportunista (2% de las visitas) para que la tabla no crezca sin fin.
    if (Math.random() < 0.02) {
      pool
        .query("DELETE FROM visitas_vistas WHERE visto_en < now() - interval '30 days'")
        .catch(() => {});
    }
    return { total: Number(r.rows[0]?.total ?? 0), contada: true };
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    throw err;
  } finally {
    client.release();
  }
}

function limpiarSid(sid) {
  if (typeof sid !== "string") return "sin-sid";
  const limpio = sid.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 64);
  return limpio || "sin-sid";
}

// ---------------------------------------------------------------------------
// Correos (Brevo) — sin cambios de lógica, solo rate limit en la ruta.
// ---------------------------------------------------------------------------
const ETIQUETAS = {
  nombre: "Nombre",
  telefono: "Teléfono",
  correo: "Correo electrónico",
  email: "Correo electrónico",
  tipo: "Tipo de solicitud",
  cargo: "Cargo al que aplica",
  mensaje: "Mensaje",
  descripcion: "Descripción",
  archivonombre: "Hoja de vida adjunta",
};

const CAMPOS_OCULTOS = new Set([ 
  "asunto",
  "subject",
  "radicado",
  "id",
  "archivobase64",
  "archivonombre",
  "archivotipo",
  "attachment",
]);

function escapar(valor) {
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatearValor(valor) {
  return escapar(Array.isArray(valor) ? valor.join(", ") : valor).replace(
    /\n/g,
    "<br>",
  );
}

function rowsToHtml(data) {
  return Object.entries(data)
    .filter(
      ([key, value]) =>
        !CAMPOS_OCULTOS.has(key.toLowerCase()) &&
        value !== undefined &&
        value !== null &&
        value !== "",
    )
    .map(([key, value]) => {
      const label = ETIQUETAS[key.toLowerCase()] || key;
      return `<tr>
        <td style="padding:12px 16px;font-weight:600;color:#5c5663;background:#f4f1ec;border-bottom:1px solid #ebe4d8;width:180px;vertical-align:top">${escapar(label)}</td>
        <td style="padding:12px 16px;color:#141018;border-bottom:1px solid #ebe4d8;vertical-align:top">${formatearValor(value)}</td>
      </tr>`;
    })
    .join("");
}

async function sendWithBrevo(data) {
  const subject = data.asunto || data.subject || "Nuevo formulario web";
  const radicado = data.radicado || data.id;
  const archivoNombre = data.archivoNombre;
  const archivoTipo = data.archivoTipo;
  const archivoBase64 = data.archivoBase64;

  const filas = rowsToHtml(data);
  const radicadoBlock = radicado
    ? `<div style="margin:0 0 24px;padding:16px 20px;background:#eef2ff;border-left:4px solid #25408f;border-radius:6px">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#25408f">Radicado</div>
        <div style="margin-top:4px;font-size:22px;font-weight:700;color:#141018">${escapar(radicado)}</div>
      </div>`
    : "";
  const adjuntoBlock = archivoNombre
    ? `<div style="margin:0 0 24px;padding:16px 20px;background:#f0fdf4;border-left:4px solid #16a34a;border-radius:6px">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#16a34a">Adjunto</div>
        <div style="margin-top:4px;font-size:15px;font-weight:700;color:#141018">📎 ${escapar(archivoNombre)}</div>
      </div>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapar(subject)}</title>
</head>
<body style="margin:0;padding:24px;background:#f4efe7;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #ebe4d8">
    <div style="padding:24px 28px;background:#25408f">
      <div style="font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#bcd0ff">DDC IPS SAS</div>
      <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#ffffff">${escapar(subject)}</h1>
    </div>
    <div style="padding:28px">
      ${radicadoBlock}
      ${adjuntoBlock}
      <table role="presentation" style="border-collapse:collapse;width:100%;font-size:14px;line-height:1.5">
        <tbody>${filas}</tbody>
      </table>
    </div>
    <div style="padding:16px 28px;background:#f4f1ec;border-top:1px solid #ebe4d8;font-size:12px;color:#5c5663">
      Este correo fue generado automáticamente desde el formulario web de DDC IPS SAS.
    </div>
  </div>
</body>
</html>`;

  const payload = {
    sender: { email: MAIL_FROM, name: MAIL_FROM_NAME },
    to: [{ email: MAIL_TO }],
    replyTo: data.correo || data.email ? { email: data.correo || data.email } : undefined,
    subject,
    htmlContent: html,
  };

  // Adjunto (hoja de vida): Brevo espera [{ name, content: base64 }]
  if (archivoBase64 && archivoNombre) {
    const limpio = String(archivoBase64).includes(",")
      ? String(archivoBase64).split(",").pop()
      : String(archivoBase64);
    payload.attachment = [{ name: archivoNombre, content: limpio }];
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || `Brevo respondió ${response.status}`);
  }
  return result;
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    return res.end();
  }

  const ruta = (req.url || "/").split("?")[0];
  const ip = ipDe(req);

  // Freno global: 120 peticiones/min por IP a la API (frena scripts tontos).
  if (ruta.startsWith("/api/") && excedeLimite(`g:${ip}`, 120, 60_000)) {
    return send(res, 429, { ok: false, error: "Demasiadas solicitudes, intenta en un minuto" });
  }

  if (req.method === "GET" && ruta === "/health") {
    return send(res, 200, { ok: true, bd: bdLista });
  }

  // Solo lectura del total (no suma). Lo usa la página al pintar.
  if (req.method === "GET" && ruta === "/api/visitas") {
    try {
      const total = await obtenerTotal();
      return send(res, 200, { ok: true, total });
    } catch (err) {
      console.error("Error al leer visitas:", err.message);
      return send(res, 200, { ok: true, total: memoria.total, degradado: true });
    }
  }

  // Suma 1 visita (con deduplicación: 1 por visitante cada 24 h).
  if (req.method === "POST" && ruta === "/api/visitas") {
    // Freno específico: 20 conteos/min por IP (el chistoso del F5 recibe 429
    // y, aunque pase, la deduplicación impide que el número suba).
    if (excedeLimite(`v:${ip}`, 20, 60_000)) {
      return send(res, 429, { ok: false, error: "Demasiadas solicitudes, intenta en un minuto" });
    }
    try {
      const raw = await readBody(req, 10_000);
      const { sid } = JSON.parse(raw || "{}");
      const huella = createHash("sha256").update(`${ip}|${limpiarSid(sid)}`).digest("hex");
      const { total, contada } = await registrarVisita(huella);
      return send(res, 200, { ok: true, total, contada });
    } catch (err) {
      console.error("Error al contar visita:", err.message);
      return send(res, 200, { ok: true, total: memoria.total, degradado: true });
    }
  }

  if (req.method !== "POST" || ruta !== "/api/contacto") {
    // Frontend compilado (mismo puerto = adiós 405 y adiós CORS en prod).
    if ((req.method === "GET" || req.method === "HEAD") && HAY_DIST) {
      return servirEstatico(req, res, ruta);
    }
    return send(res, 404, { ok: false, error: "Ruta no encontrada" });
  }

  // Freno anti-spam del formulario: 8 envíos por IP cada 10 min.
  if (excedeLimite(`c:${ip}`, 8, 10 * 60_000)) {
    return send(res, 429, { ok: false, error: "Has enviado muchos formularios, intenta más tarde" });
  }

  if (!BREVO_API_KEY) {
    return send(res, 500, { ok: false, error: "Falta BREVO_API_KEY" });
  }

  try {
    const raw = await readBody(req);
    const data = JSON.parse(raw || "{}");

    // Validación del adjunto (hoja de vida)
    if (data.archivoBase64) {
      const base64 = String(data.archivoBase64).includes(",")
        ? String(data.archivoBase64).split(",").pop()
        : String(data.archivoBase64);
      // ~5 MB en binario ≈ 6.8 MB en base64
      if (base64.length > 7_000_000) {
        return send(res, 413, { ok: false, error: "La hoja de vida supera los 5 MB permitidos" });
      }
      const permitidos = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (data.archivoTipo && !permitidos.includes(data.archivoTipo)) {
        return send(res, 400, { ok: false, error: "Formato no permitido. Sube PDF, DOC o DOCX" });
      }
      data.archivoBase64 = base64;
    }

    const result = await sendWithBrevo(data);
    return send(res, 200, { ok: true, messageId: result.messageId });
  } catch (error) {
    console.error("Error al enviar:", error.message);
    return send(res, 500, { ok: false, error: error.message });
  }
});

server.on("clientError", (err, socket) => {
  try {
    socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
  } catch {}
});

initBD();
// Si la BD estaba caída al arrancar, reintenta cada minuto sin reiniciar.
setInterval(() => {
  if (!bdLista) initBD();
}, 60_000).unref();

server.listen(PORT, () => {
  console.log(`Servidor de correos escuchando en http://localhost:${PORT}`);
  console.log(`Contador de visitas: ${DATABASE_URL ? "Postgres" : "memoria (sin DB en .env)"}`);
});
