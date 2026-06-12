import { FaInstagram, FaWhatsapp } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="mt-auto border-t border-base-300/80 bg-base-100/80">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3 px-4 py-6 text-sm text-base-content/70 md:flex-row md:items-center md:justify-between md:px-6">
        <p>
          © {new Date().getFullYear()} Aura Beauty. Cosmética y skincare
          premium.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <a
            className="inline-flex items-center gap-2 transition hover:text-primary"
            href="https://instagram.com/aura_beauty2625"
            rel="noreferrer"
            target="_blank"
          >
            <FaInstagram /> @aura_beauty2625
          </a>
          <a
            className="inline-flex items-center gap-2 transition hover:text-primary"
            href="https://wa.me/543464594165"
            rel="noreferrer"
            target="_blank"
          >
            <FaWhatsapp /> 3464 594165
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
