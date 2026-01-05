import { useInView, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef } from "react";

interface CurrencyCountUpProps {
  to: number;
  from?: number;
  direction?: "up" | "down";
  delay?: number;
  duration?: number;
  className?: string;
  startWhen?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  currency?: 'IDR' | 'USD';
  locale?: string;
  skipAnimation?: boolean; // New prop to skip animation (for cached data)
}

export default function CurrencyCountUp({
  to,
  from = 0,
  direction = "up",
  delay = 0,
  duration = 2,
  className = "",
  startWhen = true,
  onStart,
  onEnd,
  currency = 'IDR',
  locale = 'id-ID',
  skipAnimation = false, // Default to false (animate)
}: CurrencyCountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  
  // If skipAnimation is true, start directly at the target value
  const initialValue = skipAnimation 
    ? to 
    : (direction === "down" ? to : from);
  
  const motionValue = useMotionValue(initialValue);

  const damping = 20 + 40 * (1 / duration);
  const stiffness = 100 * (1 / duration);

  const springValue = useSpring(motionValue, {
    damping,
    stiffness,
  });

  const isInView = useInView(ref, { once: true, margin: "0px" });

  // Format currency helper
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Set initial value
  useEffect(() => {
    if (ref.current) {
      if (skipAnimation) {
        // If skipping animation, show final value immediately
        ref.current.textContent = formatCurrency(to);
      } else {
        ref.current.textContent = formatCurrency(direction === "down" ? to : from);
      }
    }
  }, [from, to, direction, currency, locale, skipAnimation]);

  useEffect(() => {
    // Skip animation logic - just call callbacks immediately
    if (skipAnimation) {
      if (typeof onStart === "function") onStart();
      if (typeof onEnd === "function") onEnd();
      return;
    }

    if (isInView && startWhen) {
      if (typeof onStart === "function") {
        onStart();
      }

      const timeoutId = setTimeout(() => {
        motionValue.set(direction === "down" ? from : to);
      }, delay * 1000);

      const durationTimeoutId = setTimeout(
        () => {
          if (typeof onEnd === "function") {
            onEnd();
          }
        },
        delay * 1000 + duration * 1000
      );

      return () => {
        clearTimeout(timeoutId);
        clearTimeout(durationTimeoutId);
      };
    }
  }, [
    isInView,
    startWhen,
    motionValue,
    direction,
    from,
    to,
    delay,
    onStart,
    onEnd,
    duration,
    skipAnimation,
  ]);

  useEffect(() => {
    // If skipping animation, don't subscribe to spring changes
    if (skipAnimation) return;

    const unsubscribe = springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = formatCurrency(Number(latest.toFixed(0)));
      }
    });

    return () => unsubscribe();
  }, [springValue, currency, locale, skipAnimation]);

  return <span className={`${className}`} ref={ref} />;
}

