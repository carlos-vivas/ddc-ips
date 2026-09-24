import { createServer } from "node:http";

const PORT = process.env.PORT || 3001;
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const MAIL_FROM = process.env.MAIL_FROM || "no-reply@ddcips.com";
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || "DDC IPS";
const MAIL_TO = process.env.MAIL_TO || "recursoshumanos.ddcipssas@gmail.com";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

const CORS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", ...CORS });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) reject(new Error("Payload demasiado grande"));
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function rowsToHtml(data) {
  return Object.entries(data)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => {
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      const content = Array.isArray(value) ? value.join(", ") : String(value);
      return `<tr>
        <td style="padding:8px 12px;font-weight:bold;background:#f4f1ec;border:1px solid #e4dccf;">${label}</td>
        <td style="padding:8px 12px;border:1px solid #e4dccf;">${content.replace(/\n/g, "<br>")}</td>
      </tr>`;
    })
    .join("");
}

async function sendWithBrevo(data) {
  const subject = data.asunto || data.subject || "Nuevo formulario web";
  const radicado = data.radicado || data.id;
  const radicadoBlock = radicado
    ? `<div style="font-family:sans-serif;margin:0 0 16px;padding:12px 16px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px">
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#4338ca">Radicado</div>
        <div style="font-size:20px;font-weight:bold;color:#1e1b4b">${radicado}</div>
      </div>`
    : "";
  const html = `<h2 style="font-family:sans-serif">${subject}</h2>
    ${radicadoBlock}
    <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">${rowsToHtml(data)}</table>`;

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { email: MAIL_FROM, name: MAIL_FROM_NAME },
      to: [{ email: MAIL_TO }],
      replyTo: data.correo || data.email ? { email: data.correo || data.email } : undefined,
      subject,
      htmlContent: html,
    }),
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

  if (req.method === "GET" && req.url === "/health") {
    return send(res, 200, { ok: true });
  }

  if (req.method !== "POST" || !req.url.startsWith("/api/contacto")) {
    return send(res, 404, { ok: false, error: "Ruta no encontrada" });
  }

  if (!BREVO_API_KEY) {
    return send(res, 500, { ok: false, error: "Falta BREVO_API_KEY" });
  }

  try {
    const raw = await readBody(req);
    const data = JSON.parse(raw || "{}");
    const result = await sendWithBrevo(data);
    return send(res, 200, { ok: true, messageId: result.messageId });
  } catch (error) {
    console.error("Error al enviar:", error.message);
    return send(res, 500, { ok: false, error: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`Servidor de correos escuchando en http://localhost:${PORT}`);
});
