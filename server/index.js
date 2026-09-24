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

const ETIQUETAS = {
  nombre: "Nombre",
  telefono: "Teléfono",
  correo: "Correo electrónico",
  email: "Correo electrónico",
  tipo: "Tipo de solicitud",
  descripcion: "Descripción",
  mensaje: "Mensaje",
};

const CAMPOS_OCULTOS = new Set(["asunto", "subject", "radicado", "id"]);

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
  const filas = rowsToHtml(data);
  const radicadoBlock = radicado
    ? `<div style="margin:0 0 24px;padding:16px 20px;background:#eef2ff;border-left:4px solid #25408f;border-radius:6px">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#25408f">Radicado</div>
        <div style="margin-top:4px;font-size:22px;font-weight:700;color:#141018">${escapar(radicado)}</div>
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
