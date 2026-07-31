import { useCallback, useEffect, useState } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

/**
 * Modern image carousel with smooth fade transitions, chevron icon
 * navigation buttons that appear on hover, and a clean thumbnail strip.
 */
export default function ImageCarousel({ images = [] }) {
  const [index, setIndex] = useState(0);

  // Clamp the index if the images array changes (e.g. switching products)
  useEffect(() => {
    if (index > images.length - 1) setIndex(0);
  }, [images.length, index]);

  const goTo = useCallback(
    (i) => setIndex((i + images.length) % images.length),
    [images.length],
  );
  const prev = useCallback((e) => {
    e?.stopPropagation();
    setIndex((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);
  const next = useCallback((e) => {
    e?.stopPropagation();
    setIndex((i) => (i + 1) % images.length);
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    if (images.length <= 1) return;
    const handler = (e) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [images.length, prev, next]);

  if (!images || images.length === 0) {
    return (
      <div className="bg-base-200 flex aspect-[4/3] items-center justify-center rounded-2xl">
        <span className="text-base-content/40">Sin imagen</span>
      </div>
    );
  }

  const hasMultiple = images.length > 1;

  return (
    <div className="group">
      {/* ── Main image stage ───────────────────────────────────────── */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-base-200">
        {/* Stacked images with opacity transition for a smooth fade */}
        <div className="relative h-full w-full">
          {images.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`Imagen ${i + 1} del producto`}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ease-in-out ${
                i === index ? "opacity-100" : "opacity-0"
              }`}
              draggable={false}
            />
          ))}
        </div>

        {/* ── Navigation buttons (visible on hover) ────────────────── */}
        {hasMultiple && (
          <>
            <button
              aria-label="Imagen anterior"
              className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-base-100/80 text-base-content shadow-lg backdrop-blur-sm transition-all duration-300 hover:bg-base-100 hover:scale-110 opacity-0 group-hover:opacity-100 focus:opacity-100"
              onClick={prev}
              type="button"
            >
              <FaChevronLeft size={16} />
            </button>
            <button
              aria-label="Imagen siguiente"
              className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-base-100/80 text-base-content shadow-lg backdrop-blur-sm transition-all duration-300 hover:bg-base-100 hover:scale-110 opacity-0 group-hover:opacity-100 focus:opacity-100"
              onClick={next}
              type="button"
            >
              <FaChevronRight size={16} />
            </button>
          </>
        )}

        {/* ── Dot indicators (bottom center) ──────────────────────── */}
        {hasMultiple && (
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                aria-label={`Ir a imagen ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === index
                    ? "w-6 bg-primary"
                    : "w-2 bg-base-content/30 hover:bg-base-content/50"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  goTo(i);
                }}
                type="button"
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Thumbnail strip ─────────────────────────────────────────── */}
      {hasMultiple && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={i}
              aria-label={`Miniatura ${i + 1}`}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl transition-all duration-300 ${
                i === index
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-base-100"
                  : "opacity-60 hover:opacity-100"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                goTo(i);
              }}
              type="button"
            >
              <img
                src={src}
                alt={`Miniatura ${i + 1}`}
                className="h-full w-full object-cover"
                draggable={false}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}