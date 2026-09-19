import React from "react";

export interface ProgressValue {
  value: number;
  total: number;
}

export interface ProgressProps {
  game: ProgressValue;
  round: ProgressValue;
  question: ProgressValue;
}

const percentOf = ({ value, total }: ProgressValue): number =>
  total > 0 ? Math.min(100, Math.max(0, Math.round((value / total) * 100))) : 0;

const ProgressRow: React.FC<{ label: string; progress: ProgressValue }> = ({ label, progress }) => (
  <div className="flex min-w-0 items-center gap-1.5 text-xs leading-4">
    <span className="w-12 shrink-0 text-blue-100">{label}</span>
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={progress.total}
      aria-valuenow={progress.value}
      className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/20"
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-sky-400 to-lime-300"
        style={{ width: `${percentOf(progress)}%` }}
      />
    </div>
    <span className="w-14 shrink-0 text-right tabular-nums">{progress.total > 0 ? `${progress.value}/${progress.total}` : "—"}</span>
  </div>
);

export const Progress: React.FC<ProgressProps> = ({ game, round, question }) => (
  <div className="grid w-full grid-cols-1 gap-0.5 sm:grid-cols-3 sm:gap-4">
    <ProgressRow label="Игра" progress={game} />
    <ProgressRow label="Раунд" progress={round} />
    <ProgressRow label="Вопрос" progress={question} />
  </div>
);
