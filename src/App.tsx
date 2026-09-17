import { useEffect, useState } from "react";
import Home from "./pages/inicio";
import Trabaja from "./pages/trabaja";
import Pqrs from "./pages/pqrs";

const pageRoutes = new Set(["/", "/trabaja-con-nosotros", "/trabaja", "/pqrs"]);

function normalizePath(pathname: string) {
  const path = pathname.replace(/\/+$/, "");
  return path === "" ? "/" : path;
}

function currentPath() {
  return normalizePath(window.location.pathname);
}

export default function App() {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const onPop = () => setPath(currentPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest("a");
      if (!target || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      if (target.target === "_blank" || target.hasAttribute("download")) return;

      const href = target.getAttribute("href");
      if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      const url = new URL(target.href, window.location.origin);
      if (url.origin !== window.location.origin) return;

      const nextPath = normalizePath(url.pathname);
      const samePageHash =
        nextPath === currentPath() && url.hash !== "" && url.hash !== window.location.hash;

      if (samePageHash) return;

      if (!pageRoutes.has(nextPath)) return;

      event.preventDefault();
      const canonicalPath = nextPath === "/trabaja" ? "/trabaja-con-nosotros" : nextPath;
      window.history.pushState({}, "", `${canonicalPath}${url.hash}`);
      setPath(canonicalPath);

      if (url.hash) {
        requestAnimationFrame(() => {
          document.querySelector(url.hash)?.scrollIntoView({ behavior: "smooth" });
        });
      } else {
        window.scrollTo(0, 0);
      }
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (path === "/trabaja") {
      window.history.replaceState({}, "", "/trabaja-con-nosotros");
      setPath("/trabaja-con-nosotros");
    }
  }, [path]);

  if (path === "/trabaja-con-nosotros" || path === "/trabaja") {
    return <Trabaja />;
  }

  if (path === "/pqrs") {
    return <Pqrs />;
  }

  return <Home />;
}
