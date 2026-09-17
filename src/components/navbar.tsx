import { useState, useEffect, useRef } from 'react';

const links = [
  { label: 'Inicio', href: '/' },
  { label: 'Servicios', href: '/#servicios' },
  { label: 'Nosotros', href: '/#nosotros' },
  { label: 'Trabaja con nosotros', href: '/trabaja-con-nosotros' },
  { label: 'PQRS', href: '/pqrs' },
];

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

  const openMenu = () => {
    lastFocusedElementRef.current = document.activeElement as HTMLElement | null;
    setIsMenuOpen(true);
    setTimeout(() => menuRef.current?.focus(), 0);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    setTimeout(() => lastFocusedElementRef.current?.focus(), 0);
  };

  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen) closeMenu();
    };
    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isMenuOpen]);

  return (
    <header className="sticky top-0 z-30">
      <div className="bg-accent-deep text-white text-xs sm:text-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-2 flex items-center justify-center gap-3">
          <p className="flex items-center gap-2 font-medium">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
            </span>
            Protegemos lo que más quieres
          </p>
        </div>
      </div>

      <nav
        className="bg-white/95 backdrop-blur border-b border-slate-200 shadow-[0_1px_0_rgba(0,0,0,0.02)]"
        aria-label="Navegación principal"
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 min-h-[72px] flex items-center justify-between gap-4">
            <a href="/" className="flex items-center rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <img
              src="/logo.jpeg"
              alt="DDC IPS"
              className="h-12 md:h-14 w-auto"
            />
          </a>

          <ul className="hidden lg:flex items-center gap-8 font-semibold text-sm text-slate-700">
            {links.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  className="hover:text-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <button
            type="button"
            aria-controls="collapseMenu"
            aria-expanded={isMenuOpen}
            onClick={openMenu}
            className="lg:hidden grid place-items-center size-11 rounded-xl border border-slate-200 text-slate-900 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span className="sr-only">Abrir menú</span>
            <svg className="size-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div
          id="collapseMenu"
          ref={menuRef}
          tabIndex={-1}
          className={`${isMenuOpen ? 'block' : 'hidden'} lg:hidden border-t border-slate-200 bg-white outline-none`}
        >
          <ul className="px-4 md:px-8 py-4 flex flex-col font-semibold text-slate-800">
            {links.map((l) => (
              <li key={l.label} className="border-b border-slate-100 last:border-0">
                <a
                  href={l.href}
                  onClick={closeMenu}
                  className="block py-3.5 hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  );
}
