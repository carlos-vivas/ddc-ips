import { useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";
import type { FormEvent } from "react";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import Turnstile from "../components/turnstile";
import { CARGOS, TIPOS_ARCHIVO, esquemaTrabaja, erroresPorCampo, errorDeCampo } from "../lib/formularios.js";

function ErrorCampo({ mensaje }: { mensaje?: string }) {
  if (!mensaje) return null;
  return <p className="mt-1 text-xs font-medium text-red-600">{mensaje}</p>;
}

const inputClass =
  "w-full rounded-xl bg-white px-4 py-2.5 text-[15px] text-ink ring-1 ring-[#e4dccf] placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent";

const MAX_MB = 5;

function formatearTamano(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function validarArchivo(archivo: File) {
  if (archivo.size > MAX_MB * 1024 * 1024) {
    throw new Error(`La hoja de vida supera los ${MAX_MB} MB permitidos.`);
  }
  const ext = archivo.name.split(".").pop()?.toLowerCase();
  const tipoOk = !archivo.type || TIPOS_ARCHIVO.includes(archivo.type);
  const extOk = ext && ["pdf", "doc", "docx"].includes(ext);
  if (!tipoOk && !extOk) {
    throw new Error("Formato no permitido. Sube tu hoja de vida en PDF, DOC o DOCX.");
  }
}

function archivoABase64(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const resultado = String(reader.result || "");
      // quitamos el prefijo "data:...;base64,"
      const base64 = resultado.includes(",") ? resultado.split(",").pop() || "" : resultado;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(archivo);
  });
}

export default function Trabaja() {
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  // Token de Cloudflare Turnstile; `intento` vuelve a montar el widget para pedir otro.
  const [token, setToken] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  // Avisa apenas el usuario sale de un campo; si ya tenía error, lo quita al corregir.
  function revisarCampo(event: { target: EventTarget }, soloSiHayError = false) {
    const campo = event.target as HTMLInputElement;
    if (!campo.name || campo.type === "file" || campo.type === "checkbox") return;
    if (soloSiHayError && !errores[campo.name]) return;
    const mensaje = errorDeCampo(esquemaTrabaja, campo.name, campo.value);
    setErrores((prev) => ({ ...prev, [campo.name]: mensaje }));
  }
  const [archivo, setArchivo] = useState<File | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const inputArchivoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = "Trabaja con nosotros · DDC IPS";
    window.scrollTo(0, 0);
  }, []);

  function elegirArchivo(nuevo: File | undefined | null) {
    if (!nuevo) return;
    try {
      validarArchivo(nuevo);
      setError(null);
      setArchivo(nuevo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Archivo no válido");
      setArchivo(null);
      if (inputArchivoRef.current) inputArchivoRef.current.value = "";
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setArrastrando(false);
    const caido = event.dataTransfer.files?.[0];
    elegirArchivo(caido);
  }

  function quitarArchivo() {
    setArchivo(null);
    if (inputArchivoRef.current) inputArchivoRef.current.value = "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!token) {
      setError("Completa la verificación de seguridad (la casilla de Cloudflare).");
      return;
    }
    setEnviando(true);

    try {
      const form = event.currentTarget;
      const formData = new FormData(form);

      if (!archivo || archivo.size === 0) {
        throw new Error("Arrastra tu hoja de vida o haz clic para seleccionarla (PDF, DOC o DOCX).");
      }
      validarArchivo(archivo);

      const validado = esquemaTrabaja.safeParse({
        nombre: formData.get("nombre"),
        telefono: formData.get("telefono"),
        correo: formData.get("correo"),
        cargo: formData.get("cargo"),
        mensaje: formData.get("mensaje") ?? "",
        archivoNombre: archivo.name,
        archivoTipo: archivo.type,
        archivoBase64: await archivoABase64(archivo),
      });
      if (!validado.success) {
        const campos = erroresPorCampo(validado.error);
        setErrores(campos);
        throw new Error(campos.archivoNombre || campos.archivoBase64 || "Revisa los campos marcados.");
      }
      setErrores({});

      const response = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...validado.data, "cf-turnstile-response": token }),
      });

      const result = await response.json().catch(() => ({}));
      if (response.status === 400 && result.campos) setErrores(result.campos);
      if (!response.ok) throw new Error(result.error || "No se pudo enviar tu hoja de vida");
      setEnviado(true);
      form.reset();
      quitarArchivo();
      window.scrollTo(0, 0);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No pudimos enviar tu hoja de vida. Intenta de nuevo o escríbenos por correo.",
      );
    } finally {
      setEnviando(false);
      // El token ya se gastó: pedimos uno nuevo para el próximo envío.
      setToken(null);
      setIntento((n) => n + 1);
    }
  }

  return (
    <>
      <Navbar />

      <main className="bg-white text-ink">
        <section className="grid lg:grid-cols-2 min-h-[calc(100svh-7.5rem)]">
          <figure className="relative min-h-[36vh] lg:min-h-full overflow-hidden bg-[#1a1214]">
            <img
              src="/trabaja_nosotros.jpeg"
              alt="Equipo de ambulancia junto a un vehículo de traslado asistencial"
              className="absolute inset-0 size-full object-cover"
            />
            <div
              className="absolute inset-0 bg-linear-to-t from-[#1a1214]/80 via-[#1a1214]/15 to-transparent"
              aria-hidden="true"
            />
            <figcaption className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-life">
                Talento humano
              </p>
              <p className="mt-2 font-display text-2xl md:text-3xl text-white font-medium leading-snug max-w-md">
                Talento humano de la institución.
              </p>
            </figcaption>
          </figure>

          <div className="relative flex flex-col justify-center px-6 py-8 md:px-10 lg:px-12 paper-grain bg-paper">
            <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight leading-[1.08]">
              Trabaja con nosotros
            </h1>
            <p className="mt-3 font-display text-xl md:text-2xl font-medium leading-snug text-ink max-w-2xl">
              ¡Queremos conocerte!
            </p>
            <p className="mt-2 text-[15px] text-muted leading-relaxed max-w-2xl">
              Si tienes vocación de servicio y quieres ser parte de nuestro
              equipo, completa el formulario y adjunta tu hoja de vida.
            </p>

            {enviado ? (
              <div
                role="status"
                className="mt-6 max-w-2xl rounded-2xl bg-white p-6 ring-1 ring-life/30"
              >
                <p className="font-display text-2xl font-semibold tracking-tight text-ink">
                  ¡Hoja de vida recibida!
                </p>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
                  Gracias por tu interés en ser parte de DDC IPS SAS. Hemos
                  recibido tu información y si tu perfil se ajusta a nuestras
                  vacantes, te contactaremos.
                </p>
                <button
                  type="button"
                  onClick={() => setEnviado(false)}
                  className="mt-5 rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-white hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Enviar otra hoja de vida
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                onBlur={(e) => revisarCampo(e)}
                onChange={(e) => revisarCampo(e, true)}
                className="mt-6 w-full rounded-2xl bg-white/70 p-5 md:p-6 ring-1 ring-[#e4dccf]"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block sm:col-span-1">
                    <span className="mb-1.5 block text-sm font-bold text-ink">
                      Nombre completo <span className="text-red-600">*</span>
                    </span>
                    <input
                      required
                      type="text"
                      name="nombre" maxLength={80}
                      autoComplete="name"
                      placeholder="Nombres y apellidos"
                      className={inputClass}
                    />
                    <ErrorCampo mensaje={errores.nombre} />
                  </label>

                  <label className="block sm:col-span-1">
                    <span className="mb-1.5 block text-sm font-bold text-ink">
                      Teléfono <span className="text-red-600">*</span>
                    </span>
                    <input
                      required
                      type="tel"
                      name="telefono" inputMode="tel" maxLength={20}
                      autoComplete="tel"
                      placeholder="Celular, ej. 300 123 4567"
                      className={inputClass}
                    />
                    <ErrorCampo mensaje={errores.telefono} />
                  </label>

                  <label className="block sm:col-span-1">
                    <span className="mb-1.5 block text-sm font-bold text-ink">
                      Correo electrónico <span className="text-red-600">*</span>
                    </span>
                    <input
                      required
                      type="email"
                      name="correo" maxLength={120}
                      autoComplete="email"
                      placeholder="correo@ejemplo.com"
                      className={inputClass}
                    />
                    <ErrorCampo mensaje={errores.correo} />
                  </label>

                  <label className="block sm:col-span-1">
                    <span className="mb-1.5 block text-sm font-bold text-ink">
                      Cargo al que aplicas <span className="text-red-600">*</span>
                    </span>
                    <select required name="cargo" defaultValue="" className={inputClass}>
                      <option value="" disabled>
                        Selecciona…
                      </option>
                      {CARGOS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <ErrorCampo mensaje={errores.cargo} />
                  </label>

                  <div className="block sm:col-span-2">
                    <span className="mb-1.5 block text-sm font-bold text-ink">
                      Hoja de vida (PDF, DOC o DOCX, máx. 5 MB){" "}
                      <span className="text-red-600">*</span>
                    </span>
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label="Adjuntar hoja de vida. Arrastra el archivo o haz clic para seleccionarlo"
                      onClick={() => inputArchivoRef.current?.click()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          inputArchivoRef.current?.click();
                        }
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setArrastrando(true);
                      }}
                      onDragLeave={() => setArrastrando(false)}
                      onDrop={handleDrop}
                      className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                        arrastrando
                          ? "border-accent bg-accent/10 scale-[1.01] shadow-lg"
                          : archivo
                            ? "border-life/60 bg-life/10"
                            : "border-[#d8cfbd] bg-white hover:border-accent hover:bg-accent/5"
                      }`}
                    >
                      <input
                        ref={inputArchivoRef}
                        type="file"
                        name="hojaVida"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={(e) => elegirArchivo(e.target.files?.[0])}
                        className="sr-only"
                      />
                      {!archivo ? (
                        <>
                          <span
                            className={`grid size-14 place-items-center rounded-full transition-colors ${
                              arrastrando
                                ? "bg-accent text-white"
                                : "bg-ink text-white group-hover:bg-accent"
                            }`}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="size-6"
                              aria-hidden="true"
                            >
                              <path d="M12 16V4m0 0 4 4m-4-4-4 4" />
                              <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                            </svg>
                          </span>
                          <span className="mt-4 text-[15px] font-bold text-ink">
                            {arrastrando
                              ? "¡Suelta tu hoja de vida aquí!"
                              : "Arrastra tu hoja de vida aquí"}
                          </span>
                          <span className="mt-1 text-sm text-slate-600">
                            o{" "}
                            <span className="font-bold text-accent underline underline-offset-2">
                              haz clic para seleccionar
                            </span>
                          </span>
                          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ink/5 px-3 py-1 text-xs font-semibold text-slate-600">
                            PDF · DOC · DOCX — máx. 5 MB
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="grid size-14 place-items-center rounded-full bg-life/20 text-green-700">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="size-6"
                              aria-hidden="true"
                            >
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <path d="M14 2v6h6" />
                              <path d="m9 15 2 2 4-4" />
                            </svg>
                          </span>
                          <span className="mt-4 max-w-full truncate px-2 text-[15px] font-bold text-ink">
                            📎 {archivo.name}
                          </span>
                          <span className="mt-1 text-sm text-slate-600">
                            {formatearTamano(archivo.size)} · listo para enviar
                          </span>
                          <span className="mt-3 inline-flex items-center gap-2">
                            <span className="rounded-full bg-ink px-4 py-1.5 text-xs font-bold text-white group-hover:bg-accent">
                              Cambiar archivo
                            </span>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                quitarArchivo();
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.stopPropagation();
                                  quitarArchivo();
                                }
                              }}
                              className="rounded-full bg-red-50 px-4 py-1.5 text-xs font-bold text-red-600 ring-1 ring-red-200 hover:bg-red-100"
                            >
                              Quitar
                            </span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-sm font-bold text-ink">
                      Mensaje o presentación (opcional)
                    </span>
                    <textarea
                      name="mensaje" maxLength={2000}
                      rows={3}
                      placeholder="Cuéntanos brevemente tu experiencia, disponibilidad…"
                      className={`${inputClass} resize-none`}
                    />
                    <ErrorCampo mensaje={errores.mensaje} />
                  </label>

                  <label className="flex items-start gap-3 sm:col-span-2">
                    <input
                      required
                      type="checkbox"
                      className="mt-1 size-4 accent-[#25408f]"
                    />
                    <span className="text-sm leading-relaxed text-slate-600">
                      Autorizo el tratamiento de mis datos personales para el
                      proceso de selección. <span className="text-red-600">*</span>
                    </span>
                  </label>
                </div>

                <Turnstile key={intento} accion="trabaja" onToken={setToken} />

                {error && (
                  <p
                    role="alert"
                    className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200"
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={enviando}
                  className="mt-5 w-full rounded-full bg-accent px-6 py-3 text-sm font-bold uppercase tracking-widest text-white hover:bg-accent-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-60"
                >
                  {enviando ? "Enviando…" : "Enviar hoja de vida"}
                </button>
              </form>
            )}

            <p className="mt-6 text-sm text-muted">
              ¿Prefieres el correo? Envíanos tu hoja de vida a:{" "}
              <a
                href="mailto:recursoshumanos.ddcipssas@gmail.com"
                className="font-semibold text-ink break-all underline underline-offset-4 decoration-accent/40 hover:text-accent hover:decoration-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
              >
                recursoshumanos.ddcipssas@gmail.com
              </a>
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
