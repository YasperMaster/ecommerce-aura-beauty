import React, { useState } from "react";

export default function ImageCarousel({ images = [] }) {
  const [index, setIndex] = useState(0);
  if (!images || images.length === 0) {
    return <div className="bg-base-200 aspect-[4/3] flex items-center justify-center">No image</div>;
  }

  const hasMultiple = images.length > 1;

  function prev() {
    setIndex((i) => (i - 1 + images.length) % images.length);
  }
  function next() {
    setIndex((i) => (i + 1) % images.length);
  }

  return (
    <div>
      <div className="relative aspect-[4/3] bg-base-100 overflow-hidden rounded-lg">
        {hasMultiple && (
          <button
            aria-label="Anterior"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 btn btn-sm btn-circle"
          >
            {"<"}
          </button>
        )}

        <img
          src={images[index]}
          alt={`product image ${index + 1}`}
          className="w-full h-full object-cover"
        />

        {hasMultiple && (
          <button
            aria-label="Siguiente"
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 btn btn-sm btn-circle"
          >
            {">"}
          </button>
        )}
      </div>

      {hasMultiple && (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`border rounded-md overflow-hidden ${i === index ? "ring ring-primary" : ""}`}
              aria-label={`thumbnail ${i + 1}`}
            >
              <img src={src} alt={`thumb ${i + 1}`} className="w-20 h-20 object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
