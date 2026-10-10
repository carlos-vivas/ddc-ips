// Reglas de validación de los formularios (PQRS y Trabaja con nosotros).
// Las usan la página (avisa antes de enviar) y el servidor (rechaza lo que
// llegue por fuera de la página). Es .js para que Node lo importe sin compilar.
import { z } from "zod";

export const TIPOS_SOLICITUD = ["Petición", "Queja", "Reclamo", "Sugerencia"];

export const CARGOS = [
  "Conductores",
  "Auxiliares de enfermería",
  "Técnico APH",
  "Médico",
  "Otro",
];

export const TIPOS_ARCHIVO = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// Quita caracteres de control (invisibles) y espacios repetidos.
function limpiar(valor) {
  return String(valor ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

// Texto libre: sin < ni > (así no se puede meter HTML ni <script>) y sin
// "javascript:" ni atributos tipo onclick=.
const SIN_CODIGO = /^[^<>]*$/;
const PELIGROSO = /javascript:|data:text\/html|\bon\w+\s*=/i;

function textoLibre(campo, min, max) {
  return z
    .string()
    .transform(limpiar)
    .pipe(
      z
        .string()
        .min(min, `${campo} debe tener al menos ${min} caracteres`)
        .max(max, `${campo} no puede superar ${max} caracteres`)
        .regex(SIN_CODIGO, `${campo} no puede contener los caracteres < o >`)
        .refine((v) => !PELIGROSO.test(v), `${campo} contiene texto no permitido`),
    );
}

// Nombre real: solo letras (con tildes y ñ), espacios, punto, apóstrofo y
// guion; mínimo nombre y apellido.
const nombre = z
  .string()
  .transform((v) => limpiar(v).replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(5, "Escribe tu nombre completo")
      .max(80, "El nombre no puede superar 80 caracteres")
      .regex(/^\p{L}[\p{L} .'-]*$/u, "El nombre solo puede tener letras y espacios")
      .refine((v) => v.split(" ").filter((p) => p.length >= 2).length >= 2, "Escribe nombre y apellido"),
  );

// Celular colombiano: 10 dígitos empezando por 3 (3xx xxx xxxx).
// Acepta espacios, guiones, paréntesis y el prefijo +57; se guarda solo dígitos.
const telefono = z
  .string()
  .transform((v) => limpiar(v).replace(/[\s().-]/g, "").replace(/^(\+?57)(?=\d{10}$)/, ""))
  .pipe(
    z
      .string()
      .regex(/^\d+$/, "El celular solo puede tener números")
      .regex(/^3/, "Debe ser un número de celular (empieza por 3)")
      .length(10, "El celular debe tener 10 dígitos (ej. 300 123 4567)")
      .refine((v) => !/(\d)\1{6,}/.test(v), "Escribe un número de celular real"),
  );

const correo = z
  .string()
  .transform((v) => limpiar(v).toLowerCase())
  .pipe(z.email("Escribe un correo electrónico válido").max(120, "El correo es demasiado largo"));

export const esquemaPqrs = z.object({
  tipo: z.enum(TIPOS_SOLICITUD, "Selecciona el tipo de solicitud"),
  nombre,
  telefono,
  correo,
  descripcion: textoLibre("La descripción", 10, 3000),
});

export const esquemaTrabaja = z.object({
  nombre,
  telefono,
  correo,
  cargo: z.enum(CARGOS, "Selecciona el cargo al que aplicas"),
  mensaje: z.union([z.literal(""), textoLibre("El mensaje", 10, 2000)]).optional(),
  archivoNombre: z
    .string()
    .max(150, "El nombre del archivo es demasiado largo")
    .regex(/^[^<>/\\]+\.(pdf|docx?)$/i, "Sube tu hoja de vida en PDF, DOC o DOCX"),
  archivoTipo: z.union([z.literal(""), z.enum(TIPOS_ARCHIVO)]).optional(),
  // ~5 MB en binario ≈ 6.8 MB en base64
  archivoBase64: z
    .string()
    .min(1, "Adjunta tu hoja de vida")
    .max(7_000_000, "La hoja de vida supera los 5 MB permitidos"),
});

// Primer mensaje de error de cada campo, para mostrarlo en la página.
/** @returns {Record<string, string>} */
export function erroresPorCampo(error) {
  /** @type {Record<string, string>} */
  const errores = {};
  for (const issue of error.issues) {
    const campo = String(issue.path[0] ?? "formulario");
    if (!errores[campo]) errores[campo] = issue.message;
  }
  return errores;
}

// Valida un solo campo (al salir de él). Devuelve el mensaje de error o "".
/** @returns {string} */
export function errorDeCampo(esquema, campo, valor) {
  const regla = esquema.shape[campo];
  if (!regla) return "";
  const r = regla.safeParse(valor);
  return r.success ? "" : r.error.issues[0].message;
}
