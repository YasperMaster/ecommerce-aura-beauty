import { useEffect, useMemo, useRef, useState } from "react";
import { FaInstagram, FaWhatsapp } from "react-icons/fa";
import { HiSparkles } from "react-icons/hi2";
import { Link } from "react-router";
import { useUser } from "../../context/UserContext";
import AuthButtons from "./AuthButtons";
import Cart from "./Cart";
import UserDropDown from "./UserDropDown";

const OWNER_FULL_NAME = "Pilar Yasparra";

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
      <div className="relative z-30 mb-3 rounded-box border border-base-300/80 bg-base-100/90 px-4 py-3 shadow-sm backdrop-blur sm:px-5">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-box">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 -top-24 h-40 bg-gradient-to-b from-primary/10 to-transparent blur-2xl"
          />
        </div>

        <div className="relative grid grid-cols-1 items-center gap-3 lg:grid-cols-[1fr_auto_1fr]">
          <div>
            <p className="font-display text-xl italic font-semibold tracking-wide text-base-content sm:text-2xl">
              Aura Beauty
            </p>
            <p className="text-[11px] uppercase tracking-[0.35em] text-base-content/50">
              Productos cosméticos
            </p>
          </div>

          <div className="hidden items-center justify-self-center gap-3 text-base-content/60 lg:flex">
            <span className="h-px w-10 bg-gradient-to-r from-transparent via-primary/40 to-primary/60" />
            <span className="flex items-center gap-2 whitespace-nowrap font-display text-sm italic tracking-wide">
              <HiSparkles className="text-primary/70" size={16} />
              Un espacio creado por{" "}
              <span className="font-semibold not-italic text-base-content/80">
                {OWNER_FULL_NAME}
              </span>
              <HiSparkles className="text-primary/70" size={16} />
            </span>

            <span className="h-px w-10 bg-gradient-to-l from-transparent via-primary/40 to-primary/60" />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 justify-self-end">
            {loading ? (
              <span className="loading loading-spinner loading-sm text-primary" />
            ) : isAuthenticated ? (
              <>
                <div className="hidden text-right md:block">
                  <p className="text-sm font-semibold">
                    Hola, {userInfo?.fullName}
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

        <div className="relative mt-2 flex items-center justify-center gap-2 text-base-content/60 lg:hidden">
          <span className="h-px w-6 bg-gradient-to-r from-transparent to-primary/50" />
          <span className="flex items-center gap-1.5 font-display text-xs italic tracking-wide">
            <HiSparkles className="text-primary/70" size={13} />
            Creado por{" "}
            <span className="font-semibold not-italic text-base-content/80">
              {OWNER_FULL_NAME}
            </span>
          </span>
          <span className="h-px w-6 bg-gradient-to-l from-transparent to-primary/50" />
        </div>
      </div>

      <nav className="relative z-20 navbar rounded-box border border-base-300/80 bg-base-100/90 shadow-sm backdrop-blur">
        <div className="navbar-start">
          <Link
            className="btn btn-ghost font-display text-2xl italic font-semibold tracking-wide"
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
