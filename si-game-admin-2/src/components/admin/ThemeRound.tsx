import { FC } from "react";
import { FitText } from "../FitText";

const ThemeRound: FC<{ themeName: string }> = ({ themeName }) => {
  return (
    <div className="h-full w-full p-3 sm:p-5">
      <FitText min={12} className="text-4xl font-bold sm:text-5xl lg:text-7xl">{themeName}</FitText>
    </div>
  );
};

export default ThemeRound;
