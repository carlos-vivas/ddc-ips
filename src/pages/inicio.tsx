import { useEffect, useState } from "react";
import Navbar from "../components/navbar";
import Footer from "../components/footer";

const servicios = [
  {
    tag: "TAB",
    titulo: "Transporte Asistencial Básico",
    desc: "Trasladamos pacientes que requieren acompañamiento asistencial durante su recorrido, brindando atención segura, oportuna y humanizada.",
    specs: ["Auxiliar de enfermería", "Conductor"],
  },
  {
    tag: "TAM",
    titulo: "Transporte Asistencial Medicalizado",
    desc: "Trasladamos pacientes que requieren atención médica y soporte asistencial durante el recorrido, con los recursos necesarios para una atención segura y continua.",
    specs: ["Médico", "Auxiliar de enfermería", "Conductor"],
  },
  {
    tag: "Ambulancias",
    titulo: "Ambulancias",
    lead: "Seguridad en cada traslado",
    desc: "Nuestras ambulancias cuentan con la dotación y condiciones necesarias para brindar una atención segura y de calidad durante cada traslado.",
    specs: ["Dotación completa", "Bioseguridad", "Habilitación vigente"],
  },
];

const pilares = [
  {
    label: "Misión",
    quote: "Traslado oportuno, seguro y humanizado en cada despacho.",
    body: "Ofrecer servicios de transporte asistencial básico y transporte asistencial medicalizado, basado en un servicio humanizado, comprometidos con la salud de nuestros usuarios y el cumplimiento de estándares de calidad por medio de un talento humano idóneo, responsable y con alta vocación de servicio.",
  },
  {
    label: "Visión",
    quote: "Institución líder a nivel nacional en transporte asistencial.",
    body: "Ser reconocidos como una institución líder a nivel nacional en la prestación de servicios de transporte asistencial básico y medicalizado, dando respuesta oportuna con estándares de calidad que evidencian el buen servicio por medio de un talento humano idóneo para que los usuarios se sientan respetados, acogidos y cuidados.",
  },
];

const tickerItems = [
  "Transporte Asistencial Básico (TAB)",
  "Transporte Asistencial Medicalizado (TAM)",
  "Ambulancias",
];

function StarOfLife({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 1.2 14.1 7h6.3l-5.1 3.7 1.9 5.9L12 13.8 6.8 16.6l1.9-5.9L3.6 7h6.3L12 1.2Z" />
      <path fill="#fff" d="M11.15 8.2h1.7v2.15h2.15v1.7H12.85v2.15h-1.7V12.05H9v-1.7h2.15V8.2Z" />
    </svg>
  );
}

function EcgLine({ className = "" }: { className?: string }) {
  return (
    <svg className={`h-10 w-full ${className}`} viewBox="0 0 300 40" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M0 20 H55 L63 20 L69 8 L75 32 L81 20 H135 L143 20 L149 8 L155 32 L161 20 H215 L223 20 L229 8 L235 32 L241 20 H300"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        className="text-slate-900/10"
      />
      <path
        d="M0 20 H55 L63 20 L69 8 L75 32 L81 20 H135 L143 20 L149 8 L155 32 L161 20 H215 L223 20 L229 8 L235 32 L241 20 H300"
        fill="none"
        stroke="#1a9b52"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray="46 254"
        className="animate-ecg"
      />
    </svg>
  );
}

export default function Home() {
  const [visitas, setVisitas] = useState<number | null>(null);
  const [visitasView, setVisitasView] = useState(0);

  useEffect(() => {
    try {
      const key = "ddc-ips-visitas";
      const actual = Number(window.localStorage.getItem(key) ?? "0") || 0;
      const siguiente = actual + 1;
      window.localStorage.setItem(key, String(siguiente));
      setVisitas(siguiente);
    } catch {
      setVisitas(null);
    }
  }, []);

  useEffect(() => {
    if (visitas === null) return;
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      visitas <= 1
    ) {
      setVisitasView(visitas);
      return;
    }
    if (visitas > 500) {
      let raf = 0;
      const inicio = performance.now();
      const duracion = 1400;
      const animar = (ahora: number) => {
        const t = Math.min(1, (ahora - inicio) / duracion);
        const eased = 1 - Math.pow(1 - t, 3);
        setVisitasView(Math.round(eased * visitas));
        if (t < 1) raf = requestAnimationFrame(animar);
      };
      raf = requestAnimationFrame(animar);
      return () => cancelAnimationFrame(raf);
    }
    setVisitasView(0);
    let actual = 0;
    const paso = Math.max(40, Math.min(160, Math.floor(1200 / visitas)));
    const id = window.setInterval(() => {
      actual += 1;
      setVisitasView(actual);
      if (actual >= visitas) window.clearInterval(id);
    }, paso);
    return () => window.clearInterval(id);
  }, [visitas]);

  useEffect(() => {
    document.title = "DDC IPS SAS · Transporte asistencial";
    const hash = window.location.hash;
    if (hash) {
      requestAnimationFrame(() => {
        document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, []);

  return (
    <>
      <Navbar />

      <main id="inicio" className="bg-white text-ink">
        <section className="relative overflow-hidden bg-[#1a1214]">
          <div className="relative min-h-[60vh] md:min-h-[72vh]">
            <img
              src="/header_principal"
              alt=""
              className="absolute inset-0 size-full object-cover object-[center_22%]"
            />
            <div
              className="absolute inset-0 bg-black/45"
              aria-hidden="true"
            />
            <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-20 md:py-28">
              <div className="max-w-3xl border-l-[6px] border-life pl-6 md:pl-8 text-white">
                <h1 className="font-display text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
                  DDC IPS SAS
                </h1>
                <p className="mt-4 font-display text-2xl md:text-3xl font-medium leading-snug text-white">
                  Protegemos lo que más quieres.
                </p>
                <p className="mt-5 text-lg text-white/85 max-w-xl">
                  Institución Prestadora de Servicios de Salud, habilitada para
                  transporte asistencial básico (TAB) y transporte asistencial
                  medicalizado (TAM).
                </p>
                <div className="mt-8">
                  <a
                    href="#nosotros"
                    className="inline-flex items-center gap-2 border border-white/70 text-white font-bold px-6 py-3.5 rounded-xl hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    Sobre la institución
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="relative border-y border-accent-deep/25 bg-accent text-white overflow-hidden">
            <div className="flex w-max animate-ticker items-center gap-8 py-3 pr-8 hover:[animation-play-state:paused] mask-[linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
              {[...tickerItems, ...tickerItems].map((item, i) => (
                <span
                  key={i}
                  aria-hidden={i >= tickerItems.length}
                  className="flex items-center gap-8 text-sm font-bold uppercase tracking-widest whitespace-nowrap"
                >
                  {item}
                  <StarOfLife className="size-4 text-white/80" />
                </span>
              ))}
            </div>
          </div>
        </section>

        <section id="servicios" className="relative bg-white scroll-mt-32">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-20 md:py-28">
            <div>
              <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1]">
                Servicios habilitados
              </h2>
            </div>

            <div className="mt-14">
              {servicios.map((s) => (
                <article
                  key={s.tag}
                  className="py-10 md:py-12 border-t border-slate-200 first:border-t-0"
                >
                  <div className="border-l-[6px] border-life pl-5 md:pl-8 grid gap-6 lg:grid-cols-[minmax(12rem,20rem)_1fr_15rem] lg:gap-12 lg:items-start">
                    <p className="font-display text-3xl md:text-4xl font-semibold tracking-tight leading-none text-accent">
                      {s.tag}
                    </p>
                    <div>
                      {s.tag !== s.titulo && (
                        <h3 className="font-extrabold text-xl md:text-2xl tracking-tight leading-tight">
                          {s.titulo}
                        </h3>
                      )}
                      {s.tag === s.titulo && (
                        <h3 className="sr-only">{s.titulo}</h3>
                      )}
                      {"lead" in s && (s as { lead?: string }).lead ? (
                        <p
                          className={`${s.tag !== s.titulo ? "mt-1" : ""} ${
                            s.tag === "Ambulancias" ? "font-bold text-ink" : "text-muted"
                          }`}
                        >
                          {(s as { lead?: string }).lead}
                        </p>
                      ) : null}
                      <p className="mt-4 leading-relaxed text-slate-600">{s.desc}</p>
                    </div>
                    <div className="lg:pt-1">
                      {(s.tag === "TAB" || s.tag === "TAM") && (
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
                          Tripulación
                        </p>
                      )}
                      <ul className="list-disc marker:text-life pl-5 space-y-1 text-sm text-ink/80 mt-2">
                        {s.specs.map((spec) => (
                          <li key={spec}>{spec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          aria-label="Contador de visitas"
          className="relative overflow-hidden bg-accent-deep text-white"
        >
          <div
            aria-hidden="true"
            className="absolute -top-28 left-1/2 size-96 -translate-x-1/2 rounded-full bg-white/10 blur-3xl"
          />
          <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-14 text-center">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.28em] text-white/80 ring-1 ring-white/20">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
                aria-hidden="true"
              >
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Contador de visitas
            </p>
            <div
              className="mt-6 flex items-center justify-center gap-2"
              role="status"
              aria-label={`${visitas ?? 0} visitas`}
            >
              {(visitas === null
                ? ["—"]
                : String(visitasView).padStart(4, "0").split("")
              ).map((d, i) => (
                <span
                  key={i}
                  className="min-w-11 md:min-w-16 rounded-lg bg-black/40 px-2.5 py-2.5 md:py-3 text-center font-mono text-3xl md:text-5xl font-bold tabular-nums text-white ring-1 ring-white/25 shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]"
                >
                  {d}
                </span>
              ))}
            </div>
            <p className="mt-3 text-base text-white/80 max-w-xl mx-auto">
              Gracias por visitar a DDC IPS SAS. Cada visita nos impulsa a
              seguir mejorando.
            </p>
          </div>
        </section>

        <section id="nosotros" className="relative bg-white text-ink scroll-mt-32 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-20 md:py-28">
            <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1] max-w-3xl">
              Misión, visión y política institucional
            </h2>

            <EcgLine className="mt-10 text-ink" />

            <div className="mt-12 grid lg:grid-cols-2 gap-12 lg:gap-16 lg:items-start">
              {pilares.map((p) => (
                <article key={p.label} className="border-l-[6px] border-life pl-5 md:pl-7">
                  <h3 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
                    {p.label}
                  </h3>
                  <blockquote className="mt-4 font-display text-xl md:text-2xl font-medium leading-snug tracking-tight text-ink">
                    {p.quote}
                  </blockquote>
                  <p className="mt-5 text-[15px] text-slate-600 leading-relaxed">
                    {p.body}
                  </p>
                </article>
              ))}
            </div>

            <article className="mt-16 border-l-[6px] border-life pl-5 md:pl-7">
              <h3 className="font-display text-2xl md:text-3xl font-medium tracking-tight">
                Política de seguridad del paciente
              </h3>
              <p className="mt-4 text-[15px] leading-relaxed text-slate-600 max-w-4xl">
                La política de Seguridad del Paciente en DDC IPS SAS contempla
                el conjunto de prácticas institucionales tendientes a aumentar
                los niveles de seguridad en la prestación del servicio
                protegiendo con ello al paciente de riesgos evitables derivados
                de la atención en salud.
              </p>
              <p className="mt-4 text-[15px] leading-relaxed text-slate-600 max-w-4xl">
                Nuestro objetivo es el de desarrollar la cultura de seguridad
                para el usuario, fomentando en nuestros colaboradores, en
                nuestros usuarios y en sus familias el desarrollo de acciones de
                identificación, prevención y gestión de riesgos relacionados con
                el proceso de atención. Nuestras acciones se encaminan en la
                búsqueda de la satisfacción de nuestro usuario y su familia
                “Juntos construyendo una atención segura”.
              </p>
            </article>

            <div className="mt-20">
              <h3 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
                Valores institucionales
              </h3>
              <ul className="mt-6 list-disc marker:text-life pl-5 space-y-3 text-[17px] text-slate-700 max-w-2xl leading-relaxed">
                <li>
                  <span className="font-bold text-ink">Solidaridad.</span> Apoyo y cercanía con cada usuario y su familia.
                </li>
                <li>
                  <span className="font-bold text-ink">Eficiencia.</span> Respuesta oportuna y traslados bien ejecutados.
                </li>
                <li>
                  <span className="font-bold text-ink">Responsabilidad.</span> Cumplimos cada traslado con rigor y bioseguridad.
                </li>
                <li>
                  <span className="font-bold text-ink">Respeto.</span> Trato digno, acogedor y humano siempre.
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
