import { Progress as ProgressAnt, Space } from "antd/lib";
import React from "react";

export interface ProgressProps {
  round: number;
  question: number;
  reflection: number;
}

export const Progress: React.FC<ProgressProps> = ({
  question,
  reflection,
  round,
}) => (
  <Space.Compact block direction="vertical" className="pr-4">
    <Space.Compact block>
      <p className="w-28 mx-2 text-right">Раунд</p>
      <ProgressAnt
        percent={question ?? 0 }
        status="active"
        strokeColor={{ from: "#108ee9", to: "#87d068" }}
      />
    </Space.Compact>
    <Space.Compact block>
      <p className="w-28 mx-2 text-right">Вопрос</p>
      <ProgressAnt
        percent={reflection ?? 0 }
        status="active"
        strokeColor={{ from: "#108ee9", to: "#87d068" }}
      />
    </Space.Compact>{" "}
    <Space.Compact block>
      <p className="w-28 mx-2 text-right">Размышление</p>
      <ProgressAnt
        percent={round ?? 0 }
        status="active"
        strokeColor={{ from: "#108ee9", to: "#87d068" }}
      />
    </Space.Compact>
  </Space.Compact>
);
