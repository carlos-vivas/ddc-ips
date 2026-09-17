import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Navbar from "../components/navbar";
import Footer from "../components/footer";

const tiposSolicitud = ["Petición", "Queja", "Reclamo", "Sugerencia"];

const inputClass =
  "w-full rounded-xl bg-white px-4 py-2.5 text-[15px] text-ink ring-1 ring-[#e4dccf] placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent";

export default function Pqrs() {
  const [radicado, setRadicado] = useState<string | null>(null);

  useEffect(() => {
    document.title = "PQRS · DDC IPS";
    window.scrollTo(0, 0);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numero = `PQRS-${new Date().getFullYear()}-${Math.floor(
      1000 + Math.random() * 9000,
    )}`;
    setRadicado(numero);
    window.scrollTo(0, 0);
  }

  return (
    <>
      <Navbar />

      <main className="bg-white text-ink">
        <section className="grid lg:grid-cols-2 min-h-[calc(100svh-7.5rem)]">
          <figure className="relative min-h-[36vh] lg:min-h-full overflow-hidden bg-[#1a1214]">
            <img
              src="/images/pqrs.jpg"
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
                className="mt-6 w-full rounded-2xl bg-white/70 p-5 md:p-6 ring-1 ring-[#e4dccf]"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block sm:col-span-1">
                    <span className="mb-1.5 block text-sm font-bold text-ink">
                      Tipo de solicitud <span className="text-red-600">*</span>
                    </span>
                    <select required defaultValue="" className={inputClass}>
                      <option value="" disabled>
                        Selecciona…
                      </option>
                      {tiposSolicitud.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block sm:col-span-1">
                    <span className="mb-1.5 block text-sm font-bold text-ink">
                      Nombre completo <span className="text-red-600">*</span>
                    </span>
                    <input
                      required
                      type="text"
                      autoComplete="name"
                      placeholder="Nombres y apellidos"
                      className={inputClass}
                    />
                  </label>

                  <label className="block sm:col-span-1">
                    <span className="mb-1.5 block text-sm font-bold text-ink">
                      Teléfono <span className="text-red-600">*</span>
                    </span>
                    <input
                      required
                      type="tel"
                      autoComplete="tel"
                      placeholder="300 000 0000"
                      className={inputClass}
                    />
                  </label>

                  <label className="block sm:col-span-1">
                    <span className="mb-1.5 block text-sm font-bold text-ink">
                      Correo electrónico <span className="text-red-600">*</span>
                    </span>
                    <input
                      required
                      type="email"
                      autoComplete="email"
                      placeholder="correo@ejemplo.com"
                      className={inputClass}
                    />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-sm font-bold text-ink">
                      Descripción de la solicitud <span className="text-red-600">*</span>
                    </span>
                    <textarea
                      required
                      rows={3}
                      placeholder="Describe los hechos, fecha y lugar relacionados con tu solicitud…"
                      className={`${inputClass} resize-none`}
                    />
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

                <button
                  type="submit"
                  className="mt-5 w-full rounded-full bg-accent px-6 py-3 text-sm font-bold uppercase tracking-widest text-white hover:bg-accent-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                >
                  Enviar PQRS
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
