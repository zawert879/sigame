import { FC } from "react";
import { FitText } from "@/components/FitText";
import { formatPageText } from "@/utils/utils";

const ThemeRound: FC<{ themeName: string }> = ({ themeName }) => {
  return (
    <div className="h-full w-full tv-stage px-[7vw] py-[7vh]">
      <FitText className="text-white text-[length:min(16vh,10vw)]" style={{ textShadow: "0.04em 0.04em 0.12em rgba(0,0,0,0.55)" }}>
        {formatPageText(themeName)}
      </FitText>
    </div>
  );
};

export default ThemeRound;
