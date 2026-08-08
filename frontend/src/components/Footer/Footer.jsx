import { FaInstagram, FaWhatsapp } from "react-icons/fa";
import { HiSparkles } from "react-icons/hi2";

const Footer = () => {
  return (
    <footer className="mt-auto px-4 pb-6 md:px-6">
      <div className="relative mx-auto max-w-[1200px] overflow-hidden rounded-box border border-base-300/80 bg-base-100/90 shadow-sm backdrop-blur">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-24 h-40 bg-gradient-to-b from-primary/10 to-transparent blur-2xl"
        />

        <div className="relative flex flex-col gap-6 px-6 py-8 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <p className="font-display text-xl italic font-semibold tracking-wide text-base-content">
              Aura Beauty
            </p>
            <p className="text-[11px] uppercase tracking-[0.35em] text-base-content/50">
              Productos de maquillaje
            </p>
            <p className="mt-2 text-sm text-base-content/60">
              © {new Date().getFullYear()} Aura Beauty. Cosmética y maquillaje.
            </p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <span className="flex items-center gap-2 text-base-content/60">
              <span className="h-px w-8 bg-gradient-to-r from-transparent to-primary/50" />
              <HiSparkles className="text-primary/70" size={19} />
              <span className="font-display text-s italic tracking-wide">
                Seguinos
              </span>
              <HiSparkles className="text-primary/70" size={19} />
              <span className="h-px w-8 bg-gradient-to-l from-transparent to-primary/50" />
            </span>
            <div className="flex flex-wrap items-center gap-4 text-sm text-base-content/70">
              <a
                aria-label="Instagram de Aura Beauty (@aura_beauty2625)"
                className="btn btn-ghost btn-sm gap-2"
                href="https://instagram.com/aura_beauty2625"
                rel="noreferrer"
                target="_blank"
              >
                <FaInstagram size={18} /> @aura_beauty2625
              </a>
              <a
                aria-label="WhatsApp de Aura Beauty (+54 346 459-4165)"
                className="btn btn-ghost btn-sm gap-2"
                href="https://wa.me/543464594165"
                rel="noreferrer"
                target="_blank"
              >
                <FaWhatsapp size={18} /> 3464594165
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;