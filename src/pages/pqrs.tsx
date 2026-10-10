import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import Turnstile from "../components/turnstile";
import { esquemaPqrs, erroresPorCampo, errorDeCampo, TIPOS_SOLICITUD } from "../lib/formularios.js";

function ErrorCampo({ mensaje }: { mensaje?: string }) {
  if (!mensaje) return null;
  return <p className="mt-1 text-xs font-medium text-red-600">{mensaje}</p>;
}

const inputClass =
  "w-full rounded-xl bg-white px-4 py-2.5 text-[15px] text-ink ring-1 ring-[#e4dccf] placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent";

export default function Pqrs() {
  const [radicado, setRadicado] = useState<string | null>(null);
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
    const mensaje = errorDeCampo(esquemaPqrs, campo.name, campo.value);
    setErrores((prev) => ({ ...prev, [campo.name]: mensaje }));
  }

  useEffect(() => {
    document.title = "PQRS · DDC IPS";
    window.scrollTo(0, 0);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const validado = esquemaPqrs.safeParse(Object.fromEntries(new FormData(form)));
    if (!validado.success) {
      setErrores(erroresPorCampo(validado.error));
      setError("Revisa los campos marcados.");
      return;
    }
    setErrores({});
    if (!token) {
      setError("Completa la verificación de seguridad (la casilla de Cloudflare).");
      return;
    }
    setEnviando(true);

    try {
      // El servidor asigna el radicado (al azar y único, ej. PQRS-2026-483920).
      const response = await fetch("/api/pqrs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...validado.data, "cf-turnstile-response": token }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 400 && result.campos) {
        setErrores(result.campos);
        setError("Revisa los campos marcados.");
        return;
      }
      if (!response.ok || !result.radicado) {
        throw new Error("No se pudo enviar la solicitud");
      }
      setRadicado(result.radicado);
      form.reset();
      window.scrollTo(0, 0);
    } catch {
      setError(
        "No pudimos enviar tu solicitud. Intenta de nuevo o escríbenos por correo.",
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
              src="/pqrs.jpeg"
              alt="Atención al usuario en la institución"
              className="absolute inset-0 size-full object-cover"
            />
            <div
              className="absolute inset-0 bg-linear-to-t from-[#1a1214]/80 via-[#1a1214]/15 to-transparent"
              aria-hidden="true"
            />
            <figcaption className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-life">
                Atención al usuario
              </p>
              <p className="mt-2 font-display text-2xl md:text-3xl text-white font-medium leading-snug max-w-md">
                Peticiones, quejas, reclamos y sugerencias.
              </p>
            </figcaption>
          </figure>

          <div className="relative flex flex-col justify-center px-6 py-8 md:px-10 lg:px-12 paper-grain bg-paper">
            <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight leading-[1.08]">
              PQRS
            </h1>
            <p className="mt-3 font-display text-xl md:text-2xl font-medium leading-snug text-ink max-w-2xl">
              Tu opinión es importante para nosotros
            </p>
            <p className="mt-2 text-[15px] text-muted leading-relaxed max-w-2xl">
              Queremos escucharte y seguir mejorando. A través de este canal
              puedes presentar tus peticiones, quejas, reclamos o sugerencias
              relacionadas con nuestros servicios.
            </p>

            {radicado ? (
              <div
                role="status"
                className="mt-6 max-w-2xl rounded-2xl bg-white p-6 ring-1 ring-life/30"
              >
                <p className="font-display text-2xl font-semibold tracking-tight text-ink">
                  Solicitud radicada
                </p>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
                  Hemos recibido tu solicitud. Tu número de radicado es{" "}
                  <span className="font-bold text-ink">{radicado}</span>.
                  La institución dará respuesta por los medios indicados en el
                  formulario.
                </p>
                <button
                  type="button"
                  onClick={() => setRadicado(null)}
                  className="mt-5 rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-white hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Radicar otra solicitud
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
                      Tipo de solicitud <span className="text-red-600">*</span>
                    </span>
                    <select required name="tipo" defaultValue="" className={inputClass}>
                      <option value="" disabled>
                        Selecciona…
                      </option>
                      {TIPOS_SOLICITUD.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <ErrorCampo mensaje={errores.tipo} />
                  </label>

                  <label className="block sm:col-span-1">
                    <span className="mb-1.5 block text-sm font-bold text-ink">
                      Nombre completo <span className="text-red-600">*</span>
                    </span>
                    <input
                      required
                      type="text"
                      name="nombre"
                      autoComplete="name"
                      maxLength={80}
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
                      name="telefono"
                      autoComplete="tel"
                      inputMode="tel"
                      maxLength={20}
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
                      name="correo"
                      autoComplete="email"
                      maxLength={120}
                      placeholder="correo@ejemplo.com"
                      className={inputClass}
                    />
                    <ErrorCampo mensaje={errores.correo} />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-sm font-bold text-ink">
                      Descripción de la solicitud <span className="text-red-600">*</span>
                    </span>
                    <textarea
                      required
                      name="descripcion"
                      rows={3}
                      maxLength={3000}
                      placeholder="Describe los hechos, fecha y lugar relacionados con tu solicitud…"
                      className={`${inputClass} resize-none`}
                    />
                    <ErrorCampo mensaje={errores.descripcion} />
                  </label>

                  <label className="flex items-start gap-3 sm:col-span-2">
                    <input
                      required
                      type="checkbox"
                      className="mt-1 size-4 accent-[#25408f]"
                    />
                    <span className="text-sm leading-relaxed text-slate-600">
                      Autorizo el tratamiento de mis datos personales para la
                      atención de esta solicitud. <span className="text-red-600">*</span>
                    </span>
                  </label>
                </div>

                <Turnstile key={intento} accion="pqrs" onToken={setToken} />

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
                  {enviando ? "Enviando…" : "Enviar PQRS"}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
