import { FC } from "react";
import { FitText } from "@/components/FitText";
import { formatPageText } from "@/utils/utils";

const STAGGER_MS = 90;
const MAX_DELAY_MS = 2200;

const columnsFor = (count: number): number => {
  if (count <= 5) {
    return 1;
  }
  if (count <= 12) {
    return 2;
  }
  if (count <= 27) {
    return 3;
  }
  if (count <= 48) {
    return 4;
  }
  return 5;
};

const ThemesList: FC<{ themes: string[] }> = ({ themes }) => {
  const columns = columnsFor(themes.length);
  const rows = Math.max(1, Math.ceil(themes.length / columns));

  return (
    <div className="h-full w-full tv-stage px-[3vw] py-[3vh]">
      <div
        className="grid h-full w-full gap-[1.2vmin]"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {themes.map((theme, index) => (
          <div
            key={index}
            className="min-w-0 min-h-0 rounded-xl border border-white/25 bg-blue-950/35 px-[1.2vmin] py-[0.4vmin] animate-themeAppear"
            style={{ animationDelay: `${Math.min(index * STAGGER_MS, MAX_DELAY_MS)}ms` }}
          >
            <FitText className="text-white text-[length:min(7vh,4.4vw)]">{formatPageText(theme)}</FitText>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ThemesList;
