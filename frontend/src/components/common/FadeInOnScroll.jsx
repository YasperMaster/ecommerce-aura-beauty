import { useEffect, useRef, useState } from "react";

const FadeInOnScroll = ({
  children,
  delay = 0,
  className = "",
  once = true,
  threshold = 0.1,
  translateY = 20,
}) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Bail out if IntersectionObserver isn't available (SSR / old browsers)
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) {
              observer.unobserve(entry.target);
            }
          } else if (!once) {
            setVisible(false);
          }
        });
      },
      { threshold },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [once, threshold]);

  const style = {
    transitionDelay: `${delay}ms`,
  };

  return (
    <div
      ref={ref}
      className={`scroll-animate ${visible ? "scroll-animate-visible" : ""} ${className}`}
      style={{ ...style, transform: visible ? undefined : `translateY(${translateY}px)` }}
    >
      {children}
    </div>
  );
};

export default FadeInOnScroll;
