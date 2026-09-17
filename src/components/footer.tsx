export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white text-sm text-slate-600">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 grid gap-10 md:grid-cols-2">
        <div>
          <div className="flex items-center">
            <img
              src="/logo.jpeg"
              alt="DDC IPS"
              className="h-16 w-auto"
            />
          </div>
          <p className="mt-4 font-display text-lg text-ink leading-snug">
            Protegemos lo que más quieres.
          </p>
          <p className="mt-3 leading-relaxed max-w-sm">
            Institución Prestadora de Servicios de Salud. Transporte
            asistencial básico y medicalizado.
          </p>
        </div>

        <nav aria-label="Mapa del sitio">
          <p className="font-bold text-slate-900 uppercase text-xs tracking-[0.14em]">Menú</p>
          <ul className="mt-4 space-y-2.5 font-medium">
            <li><a href="/" className="hover:text-accent">Inicio</a></li>
            <li><a href="/#servicios" className="hover:text-accent">Servicios</a></li>
            <li><a href="/#nosotros" className="hover:text-accent">Nosotros</a></li>
            <li><a href="/trabaja-con-nosotros" className="hover:text-accent">Trabaja con nosotros</a></li>
            <li><a href="/pqrs" className="hover:text-accent">PQRS</a></li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 flex flex-col sm:flex-row justify-between gap-2 text-xs text-slate-500">
          <p>© 2026 DDC IPS · Todos los derechos reservados</p>
          <p>Habilitación vigente</p>
        </div>
      </div>
    </footer>
  );
}
