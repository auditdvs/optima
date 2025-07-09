import {
    useEffect,
    useId,
    useMemo,
    useRef,
    useState
} from "react";

interface MotivationalCurvedLoopProps {
  marqueeText?: string;
  speed?: number;
  className?: string;
  curveAmount?: number;
  direction?: "left" | "right";
  interactive?: boolean;
}

const MotivationalCurvedLoop = ({
  marqueeText = "",
  speed = 1,
  className,
  curveAmount = 150,
  direction = "left",
  interactive = true,
}: MotivationalCurvedLoopProps) => {
  const text = useMemo(() => {
    const hasTrailing = /\s|\u00A0$/.test(marqueeText);
    return (
      (hasTrailing ? marqueeText.replace(/\s+$/, "") : marqueeText) + "\u00A0"
    );
  }, [marqueeText]);

  const measureRef = useRef<SVGTextElement>(null);
  const tspansRef = useRef<SVGTSpanElement[]>([]);
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLength, setPathLength] = useState(0);
  const [spacing, setSpacing] = useState(0);
  const uid = useId();
  const pathId = `curve-${uid}`;
  const pathD = `M-120,14 L1320,14`; // Centered in 28px height viewBox

  const dragRef = useRef(false);
  const lastXRef = useRef(0);
  const dirRef = useRef(direction);
  const velRef = useRef(0);

  useEffect(() => {
    if (measureRef.current)
      setSpacing(measureRef.current.getComputedTextLength());
  }, [text, className]);

  useEffect(() => {
    if (pathRef.current) setPathLength(pathRef.current.getTotalLength());
  }, [curveAmount]);

  useEffect(() => {
    if (!spacing) return;
    let frame = 0;
    const step = () => {
      tspansRef.current.forEach((t) => {
        if (!t) return;
        let x = parseFloat(t.getAttribute("x") || "0");
        if (!dragRef.current) {
          const delta =
            dirRef.current === "right" ? Math.abs(speed) : -Math.abs(speed);
          x += delta;
        }
        const maxX = (tspansRef.current.length - 1) * spacing;
        if (x < -spacing) x = maxX;
        if (x > maxX) x = -spacing;
        t.setAttribute("x", x.toString());
      });
      frame = requestAnimationFrame(step);
    };
    step();
    return () => cancelAnimationFrame(frame);
  }, [spacing, speed]);

  const repeats =
    pathLength && spacing ? Math.ceil(pathLength / spacing) + 2 : 0;
  const ready = pathLength > 0 && spacing > 0;

  const onPointerDown = (e: React.PointerEvent) => {
    if (!interactive) return;
    dragRef.current = true;
    lastXRef.current = e.clientX;
    velRef.current = 0;
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!interactive || !dragRef.current) return;
    const dx = e.clientX - lastXRef.current;
    lastXRef.current = e.clientX;
    velRef.current = dx;
    tspansRef.current.forEach((t) => {
      if (!t) return;
      let x = parseFloat(t.getAttribute("x") || "0");
      x += dx;
      const maxX = (tspansRef.current.length - 1) * spacing;
      if (x < -spacing) x = maxX;
      if (x > maxX) x = -spacing;
      t.setAttribute("x", x.toString());
    });
  };

  const endDrag = () => {
    if (!interactive) return;
    dragRef.current = false;
    dirRef.current = velRef.current > 0 ? "right" : "left";
  };

  const cursorStyle = interactive
    ? dragRef.current
      ? "grabbing"
      : "grab"
    : "auto";

  return (
    <div
      className="flex items-center justify-center w-full overflow-hidden"
      style={{ 
        height: "28px",
        minHeight: "28px",
        maxHeight: "28px",
        lineHeight: "28px",
        visibility: ready ? "visible" : "hidden", 
        cursor: cursorStyle 
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
    >
      <svg
        className="select-none w-full block text-sm font-medium tracking-[0.5px] leading-none"
        viewBox="0 0 1200 28"
        style={{ height: "28px", width: "100%", display: "block" }}
        preserveAspectRatio="xMidYMid slice"
      >
        <text
          ref={measureRef}
          xmlSpace="preserve"
          style={{ visibility: "hidden", opacity: 0, pointerEvents: "none" }}
        >
          {text}
        </text>
        <defs>
          <path
            ref={pathRef}
            id={pathId}
            d={pathD}
            fill="none"
            stroke="transparent"
          />
        </defs>
        {ready && (
          <text xmlSpace="preserve" className={`fill-current ${className ?? ""}`} style={{ overflow: "hidden" }}>
            <textPath href={`#${pathId}`} xmlSpace="preserve">
              {Array.from({ length: repeats }).map((_, i) => (
                <tspan
                  key={i}
                  x={i * spacing}
                  ref={(el) => {
                    if (el) tspansRef.current[i] = el;
                  }}
                >
                  {text}
                </tspan>
              ))}
            </textPath>
          </text>
        )}
      </svg>
    </div>
  );
};

export default MotivationalCurvedLoop;
