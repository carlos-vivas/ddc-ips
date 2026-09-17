import { useEffect } from "react";
import Navbar from "../components/navbar";
import Footer from "../components/footer";

export default function Trabaja() {
  useEffect(() => {
    document.title = "Trabaja con nosotros · DDC IPS";
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Navbar />

      <main className="bg-white text-ink">
        <section className="grid lg:grid-cols-2 min-h-[calc(100svh-7.5rem)]">
          <figure className="relative min-h-[52vh] lg:min-h-full overflow-hidden bg-[#1a1214]">
            <img
              src="/images/trabaja.jpg"
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

          <div className="relative flex flex-col justify-center px-6 py-16 md:px-12 lg:px-16 xl:px-20 paper-grain bg-paper">
            <h1 className="mt-4 font-display text-4xl md:text-5xl font-semibold tracking-tight leading-[1.08]">
              Trabaja con nosotros
            </h1>
            <p className="mt-5 font-display text-2xl md:text-3xl font-medium leading-snug text-ink max-w-md">
              ¡Queremos conocerte!
            </p>
            <p className="mt-3 text-lg text-muted leading-relaxed max-w-md">
              Si tienes vocación de servicio y quieres ser parte de nuestro
              equipo, envíanos tu hoja de vida.
            </p>

            <ul className="mt-6 list-disc marker:text-life pl-6 space-y-2 text-lg text-ink max-w-md">
              {["Conductores", "Auxiliares de enfermería", "Técnico APH", "Médico"].map((rol) => (
                <li key={rol}>{rol}</li>
              ))}
            </ul>

            <p className="mt-10 text-sm text-muted">
              Enviar hojas de vida al correo:{" "}
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
