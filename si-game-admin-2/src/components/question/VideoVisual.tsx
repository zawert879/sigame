import { FC } from "react";

const HOLES = [0, 1, 2, 3];

export const VideoVisual: FC<{ className?: string }> = ({ className }) => {
  return (
    <svg
      viewBox="0 0 200 200"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Видео"
      className={`block w-full h-full ${className ?? ""}`}
    >
      <defs>
        <radialGradient id="sigame-video-disc" cx="50%" cy="40%" r="65%">
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
      <circle cx="100" cy="100" r="80" fill="url(#sigame-video-disc)" stroke="#fde68a" strokeWidth="4" />
      <rect x="54" y="66" width="92" height="68" rx="9" fill="none" stroke="#fef3c7" strokeWidth="5" />
      {HOLES.map(index => (
        <g key={index} fill="#fef3c7">
          <rect x="61" y={73 + index * 15} width="7" height="8" rx="1.5" />
          <rect x="132" y={73 + index * 15} width="7" height="8" rx="1.5" />
        </g>
      ))}
      <path d="M89 81 L119 100 L89 119 Z" fill="#fde68a" strokeLinejoin="round" stroke="#fde68a" strokeWidth="4" />
    </svg>
  );
};
