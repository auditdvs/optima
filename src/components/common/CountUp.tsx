import { useInView, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef } from "react";

interface CountUpProps {
  to: number;
  from?: number;
  direction?: "up" | "down";
  delay?: number;
  duration?: number;
  className?: string;
  startWhen?: boolean;
  separator?: string;
  onStart?: () => void;
  onEnd?: () => void;
  skipAnimation?: boolean; // New prop to skip animation (for cached data)
}

export default function CountUp({
  to,
  from = 0,
  direction = "up",
  delay = 0,
  duration = 2,
  className = "",
  startWhen = true,
  separator = "",
  onStart,
  onEnd,
  skipAnimation = false, // Default to false (animate)
}: CountUpProps) {
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

  // Format number helper
  const formatNumber = (value: number) => {
    const options = {
      useGrouping: !!separator,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    };
    const formattedNumber = Intl.NumberFormat("en-US", options).format(
      Number(value.toFixed(0))
    );
    return separator ? formattedNumber.replace(/,/g, separator) : formattedNumber;
  };

  // Set initial value
  useEffect(() => {
    if (ref.current) {
      if (skipAnimation) {
        // If skipping animation, show final value immediately
        ref.current.textContent = formatNumber(to);
      } else {
        ref.current.textContent = String(direction === "down" ? to : from);
      }
    }
  }, [from, to, direction, skipAnimation]);

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
        ref.current.textContent = formatNumber(latest);
      }
    });

    return () => unsubscribe();
  }, [springValue, separator, skipAnimation]);

  return <span className={`${className}`} ref={ref} />;
}

