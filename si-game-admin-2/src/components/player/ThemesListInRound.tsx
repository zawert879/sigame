import { FC, useState } from "react";
import { FitText } from "@/components/FitText";
import { formatPageText } from "@/utils/utils";

const ThemesListInRound: FC<{ themes: string[] }> = ({ themes }) => {
  const [themeIndex, setThemeIndex] = useState(0)

  const onAnimationIteration = () => {
    if (themeIndex <= themes.length - 1) {
      setThemeIndex(themeIndex + 1)
    }
  };

  return (
    <div className="h-full w-full tv-stage overflow-hidden px-[8vw] py-[8vh]">
      <div className="h-full w-full animate-themePulse" onAnimationIteration={onAnimationIteration}>
        <FitText className="text-white text-[length:min(13vh,8vw)]" style={{ textShadow: "0.04em 0.04em 0.12em rgba(0,0,0,0.55)" }}>
          {formatPageText(themes[themeIndex])}
        </FitText>
      </div>
    </div>
  );
};

export default ThemesListInRound;
