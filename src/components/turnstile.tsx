import { useEffect, useRef } from "react";

// Site key pública del widget. En local se toma de VITE_TURNSTILE_SITEKEY
// (.env, widget que permite localhost); en producción, la de ddc-ips.com.
const SITEKEY =
  import.meta.env.VITE_TURNSTILE_SITEKEY || "0x4AAAAAAFTD8k3upFGPSAg7";

type OpcionesTurnstile = {
  sitekey: string;
  action: string;
  language: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opciones: OpcionesTurnstile) => string;
      remove: (id: string) => void;
    };
  }
}

// Cada token sirve una sola vez: para pedir uno nuevo, el formulario vuelve a
// montar este componente cambiándole la `key`.
export default function Turnstile({
  accion,
  onToken,
}: {
  accion: string;
  onToken: (token: string | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let id: string | undefined;
    let espera: number | undefined;
    let cancelado = false;

    function montar() {
      if (cancelado || !ref.current) return;
      // El script carga con async: esperamos a que esté listo.
      if (!window.turnstile) {
        espera = window.setTimeout(montar, 200);
        return;
      }
      id = window.turnstile.render(ref.current, {
        sitekey: SITEKEY,
        action: accion,
        language: "es",
        callback: (token) => onToken(token),
        "expired-callback": () => onToken(null),
        "error-callback": () => onToken(null),
      });
    }

    montar();
    return () => {
      cancelado = true;
      window.clearTimeout(espera);
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, [accion, onToken]);

  // El widget de Cloudflare mide 300px fijos: en móviles muy angostos
  // (<380px) lo escalamos para que no genere scroll lateral.
  return (
    <div className="mt-4 w-full max-w-full overflow-hidden">
      <div
        ref={ref}
        className="min-h-[65px] max-w-full origin-top-left scale-[0.85] min-[380px]:scale-100"
      />
    </div>
  );
}
