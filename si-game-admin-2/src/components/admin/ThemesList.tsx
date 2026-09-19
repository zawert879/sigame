import { CSSProperties, FC } from "react";
import { FitText } from "../FitText";

const columnsFor = (count: number): number => (count <= 6 ? 1 : count <= 16 ? 2 : 3);

const ThemesList: FC<{ themes: string[] }> = ({ themes }) => {
  const columns = columnsFor(themes.length);
  const rows = Math.max(1, Math.ceil(themes.length / columns));
  const style = { "--theme-columns": columns, "--theme-rows": rows } as CSSProperties;

  return (
    <div className="h-full min-h-0 overflow-y-auto p-2 sm:p-3">
      <ol
        className="m-0 grid list-none auto-rows-[3rem] grid-cols-1 gap-1.5 p-0 sm:grid-cols-2 lg:h-full lg:[grid-template-columns:repeat(var(--theme-columns),minmax(0,1fr))] lg:[grid-template-rows:repeat(var(--theme-rows),minmax(2.5rem,1fr))]"
        style={style}
      >
        {themes.map((theme, index) => (
          <li key={index} className="flex min-w-0 items-center gap-1.5 rounded-lg bg-blue-950/40 px-1.5">
            <span className="w-5 shrink-0 text-right text-xs tabular-nums text-blue-200">{index + 1}</span>
            <div className="h-full min-w-0 flex-1 py-0.5">
              <FitText align="left" min={11} className="text-base font-semibold lg:text-3xl">{theme}</FitText>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default ThemesList;
