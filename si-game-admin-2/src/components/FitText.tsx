import { CSSProperties, FC, ReactNode, useCallback, useEffect, useLayoutEffect, useRef } from "react";

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

type FitTextProps = {
  children: ReactNode;
  max?: number;
  min?: number;
  className?: string;
  innerClassName?: string;
  style?: CSSProperties;
  align?: "center" | "left";
};

export const FitText: FC<FitTextProps> = ({
  children,
  max = 160,
  min = 14,
  className = "",
  innerClassName = "",
  style,
  align = "center",
}) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const fit = useCallback(() => {
    const box = boxRef.current;
    const text = textRef.current;
    if (!box || !text) {
      return;
    }

    const width = box.clientWidth;
    const height = box.clientHeight;
    if (width === 0 || height === 0) {
      return;
    }

    const fits = (size: number) => {
      text.style.fontSize = `${size}px`;
      return text.scrollWidth <= width + 1 && text.scrollHeight <= height + 1;
    };

    box.style.overflowY = "hidden";
    let low = min;
    let high = max;
    if (fits(high)) {
      return;
    }
    if (!fits(low)) {
      box.style.overflowY = "auto";
      return;
    }
    while (high - low > 0.5) {
      const mid = (low + high) / 2;
      if (fits(mid)) {
        low = mid;
      } else {
        high = mid;
      }
    }
    text.style.fontSize = `${Math.floor(low * 2) / 2}px`;
  }, [max, min]);

  useIsomorphicLayoutEffect(() => {
    fit();
  });

  useEffect(() => {
    const box = boxRef.current;
    if (!box || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(() => fit());
    observer.observe(box);
    document.fonts?.ready.then(() => fit()).catch(() => undefined);
    return () => observer.disconnect();
  }, [fit]);

  return (
    <div
      ref={boxRef}
      className={`w-full h-full min-w-0 min-h-0 flex ${align === "center" ? "items-center justify-center text-center" : "items-center justify-start text-left"} ${className}`}
      style={style}
    >
      <div
        ref={textRef}
        className={`max-w-full leading-tight whitespace-pre-line ${innerClassName}`}
        style={{ overflowWrap: "anywhere", hyphens: "auto", margin: "auto 0" }}
      >
        {children}
      </div>
    </div>
  );
};
