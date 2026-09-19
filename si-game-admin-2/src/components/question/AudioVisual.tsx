import { FC } from "react";

const BARS = [0.55, 0.9, 0.7, 1, 0.65, 0.85, 0.5];
const BAR_WIDTH = 8;
const BAR_GAP = 5;
const BARS_LEFT = 100 - (BARS.length * BAR_WIDTH + (BARS.length - 1) * BAR_GAP) / 2;

export const AudioVisual: FC<{ className?: string }> = ({ className }) => {
  return (
    <svg
      viewBox="0 0 200 200"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Аудио"
      className={`block w-full h-full ${className ?? ""}`}
    >
      <defs>
        <radialGradient id="sigame-audio-disc" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#172554" />
        </radialGradient>
      </defs>
      <circle
        cx="100"
        cy="100"
        r="84"
        fill="none"
        stroke="#fde68a"
        strokeWidth="3"
        className="animate-audioRing"
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      />
      <circle cx="100" cy="100" r="80" fill="url(#sigame-audio-disc)" stroke="#fde68a" strokeWidth="4" />
      <path
        transform="translate(64 99) scale(0.075)"
        fill="#fef3c7"
        d="M400-120q-66 0-113-47t-47-113q0-66 47-113t113-47q23 0 42.5 5.5T480-418v-422h240v160H560v400q0 66-47 113t-113 47Z"
      />
      {BARS.map((height, index) => (
        <rect
          key={index}
          x={BARS_LEFT + index * (BAR_WIDTH + BAR_GAP)}
          y={150 - 44 * height}
          width={BAR_WIDTH}
          height={44 * height}
          rx="3"
          fill="#fde68a"
          className="animate-audioBar"
          style={{ transformBox: "fill-box", transformOrigin: "bottom", animationDelay: `${index * 0.14}s` }}
        />
      ))}
    </svg>
  );
};
