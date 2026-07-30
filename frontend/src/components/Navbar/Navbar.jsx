import { useEffect, useMemo, useRef, useState } from "react";
import { FaInstagram, FaWhatsapp } from "react-icons/fa";
import { Link } from "react-router";
import { useUser } from "../../context/UserContext";
import AuthButtons from "./AuthButtons";
import Cart from "./Cart";
import UserDropDown from "./UserDropDown";

const Navbar = () => {
  const { isAuthenticated, userInfo, loading } = useUser();
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY <= 24) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollYRef.current) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const headerClassName = useMemo(
    () =>
      `sticky top-4 z-40 pt-2 transition-all duration-300 ease-out ${
        isVisible
          ? "translate-y-0 opacity-100"
          : "-translate-y-6 opacity-0 pointer-events-none"
      }`,
    [isVisible],
  );

  return (
    <header className={headerClassName}>
      <div className="relative z-30 mb-3 rounded-box border border-base-300/80 bg-base-100/90 p-3 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-base-content/60">
              Aura Beauty
            </p>
            <p className="text-sm text-base-content/70">Productos cosméticos</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 self-end lg:self-auto">
            {loading ? (
              <span className="loading loading-spinner loading-sm text-primary" />
            ) : isAuthenticated ? (
              <>
                <div className="hidden text-right md:block">
                  <p className="text-sm font-semibold">
                    Hola, {userInfo?.username}
                  </p>
                  <p className="text-xs text-base-content/60">
                    Tu sesión está activa
                  </p>
                </div>
                <UserDropDown />
              </>
            ) : (
              <AuthButtons />
            )}
          </div>
        </div>
      </div>

      <nav className="relative z-20 navbar rounded-box border border-base-300/80 bg-base-100/90 shadow-sm backdrop-blur">
        <div className="navbar-start">
          <Link
            className="btn btn-ghost text-xl font-black tracking-wide"
            to="/"
          >
            Aura Beauty
          </Link>
        </div>
        <div className="navbar-center hidden md:flex">
          <ul className="menu menu-horizontal px-1 text-sm font-medium">
            <li>
              <Link to="/">Inicio</Link>
            </li>
            <li>
              <Link to="/cart">Carrito</Link>
            </li>
            <li>
              <Link to="/products">Productos</Link>
            </li>
            {isAuthenticated && (
              <li>
                <Link to="/mis-compras">Mis compras</Link>
              </li>
            )}
            {userInfo?.isAdmin && (
              <li>
                <Link to="/admin">Panel de administrador</Link>
              </li>
            )}
          </ul>
        </div>
        <div className="navbar-end gap-1">
          <a
            aria-label="Instagram Aura Beauty"
            className="btn btn-ghost btn-circle"
            href="https://instagram.com/aura_beauty2625"
            rel="noreferrer"
            target="_blank"
          >
            <FaInstagram size={22} />
          </a>
          <a
            aria-label="WhatsApp Aura Beauty"
            className="btn btn-ghost btn-circle"
            href="https://wa.me/543464594165"
            rel="noreferrer"
            target="_blank"
          >
            <FaWhatsapp size={22} />
          </a>
          <Cart />
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
