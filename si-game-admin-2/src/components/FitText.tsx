import { CSSProperties, FC, ReactNode, RefObject, useCallback, useEffect, useLayoutEffect, useRef } from "react";

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const BREAK_GAIN = 1.35;
const PRECISION = 0.5;

type FitTextProps = {
  children: ReactNode;
  max?: number;
  min?: number;
  className?: string;
  innerClassName?: string;
  style?: CSSProperties;
  align?: "center" | "left";
};

const searchLargest = (fits: (size: number) => boolean, min: number, max: number): number | null => {
  if (fits(max)) {
    return max;
  }
  if (!fits(min)) {
    return null;
  }
  let low = min;
  let high = max;
  while (high - low > PRECISION) {
    const mid = (low + high) / 2;
    if (fits(mid)) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return Math.floor(low / PRECISION) * PRECISION;
};

const contentBox = (element: HTMLElement) => {
  const style = getComputedStyle(element);
  return {
    width: element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
    height: element.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom),
    fontSize: parseFloat(style.fontSize),
  };
};

const setWrapping = (element: HTMLElement, breakWords: boolean) => {
  element.style.overflowWrap = breakWords ? "anywhere" : "normal";
  element.style.hyphens = breakWords ? "auto" : "manual";
};

const useFontsReady = (callback: () => void) => {
  useEffect(() => {
    let active = true;
    document.fonts?.ready.then(() => {
      if (active) {
        callback();
      }
    }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [callback]);
};

export const FitText: FC<FitTextProps> = ({
  children,
  max,
  min = 12,
  className = "",
  innerClassName = "",
  style,
  align = "center",
}) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const lastKey = useRef("");

  const fit = useCallback((force = false) => {
    const box = boxRef.current;
    const text = textRef.current;
    if (!box || !text) {
      return;
    }

    const { width, height, fontSize } = contentBox(box);
    if (width <= 0 || height <= 0) {
      return;
    }

    const upper = Math.max(min, max ?? fontSize);
    const key = `${width}x${height}|${upper}|${min}|${text.className}|${text.textContent}`;
    if (!force && key === lastKey.current) {
      return;
    }
    lastKey.current = key;

    const fits = (size: number) => {
      text.style.fontSize = `${size}px`;
      return text.scrollWidth <= width + 1 && text.scrollHeight <= height + 1;
    };

    box.style.overflowY = "hidden";
    setWrapping(text, false);
    let size = searchLargest(fits, min, upper);
    let breakWords = false;

    const tooWide = (candidate: number) => {
      text.style.fontSize = `${candidate}px`;
      return text.scrollWidth > width + 1;
    };
    if (size === null || (size < upper && tooWide(size + PRECISION * 2))) {
      setWrapping(text, true);
      const broken = searchLargest(fits, min, upper);
      if (broken !== null && (size === null || broken > size * BREAK_GAIN)) {
        size = broken;
        breakWords = true;
      }
    }

    setWrapping(text, breakWords);
    if (size === null) {
      setWrapping(text, true);
      text.style.fontSize = `${min}px`;
      box.style.overflowY = "auto";
      return;
    }
    text.style.fontSize = `${size}px`;
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
    return () => observer.disconnect();
  }, [fit]);

  useFontsReady(useCallback(() => fit(true), [fit]));

  return (
    <div
      ref={boxRef}
      className={`w-full h-full min-w-0 min-h-0 flex ${align === "center" ? "justify-center text-center" : "justify-start text-left"} ${className}`}
      style={style}
    >
      <div
        ref={textRef}
        className={`max-w-full leading-tight whitespace-pre-line ${innerClassName}`}
        style={{ margin: "auto 0" }}
      >
        {children}
      </div>
    </div>
  );
};

export const useUniformFit = (containerRef: RefObject<HTMLElement>, selector: string, min = 12, max?: number) => {
  const lastKey = useRef("");

  const fit = useCallback((force = false) => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const items = Array.from(container.querySelectorAll<HTMLElement>(selector));
    if (!items.length || container.clientWidth <= 0 || container.clientHeight <= 0) {
      return;
    }

    const upper = Math.max(min, max ?? parseFloat(getComputedStyle(container).fontSize));
    const key = `${container.clientWidth}x${container.clientHeight}|${upper}|${min}|${items.map(item => item.textContent).join("\u0001")}`;
    if (!force && key === lastKey.current) {
      return;
    }
    lastKey.current = key;

    const apply = (size: number) => {
      for (const item of items) {
        item.style.fontSize = `${size}px`;
      }
    };
    const fits = (size: number) => {
      apply(size);
      return items.every(item => item.scrollWidth <= item.clientWidth + 1 && item.scrollHeight <= item.clientHeight + 1);
    };
    const wrap = (breakWords: boolean) => {
      for (const item of items) {
        setWrapping(item, breakWords);
      }
    };

    wrap(false);
    let size = searchLargest(fits, min, upper);
    if (size === null) {
      wrap(true);
      size = searchLargest(fits, min, upper);
    }
    apply(size ?? min);
  }, [containerRef, selector, min, max]);

  useIsomorphicLayoutEffect(() => {
    fit();
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(() => fit());
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, fit]);

  useFontsReady(useCallback(() => fit(true), [fit]));
};
