import { Progress as ProgressAnt, Space } from "antd";
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
  <Space.Compact block>
    <p className="w-28 mx-2 text-right">{label}</p>
    <ProgressAnt
      percent={percentOf(progress)}
      format={() => (progress.total > 0 ? `${progress.value}/${progress.total}` : "—")}
      status="active"
      strokeColor={{ from: "#108ee9", to: "#87d068" }}
    />
  </Space.Compact>
);

export const Progress: React.FC<ProgressProps> = ({ game, round, question }) => (
  <Space.Compact block direction="vertical" className="pr-4">
    <ProgressRow label="Игра" progress={game} />
    <ProgressRow label="Раунд" progress={round} />
    <ProgressRow label="Вопрос" progress={question} />
  </Space.Compact>
);
