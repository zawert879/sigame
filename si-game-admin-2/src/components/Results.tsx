import { memo, FC, useMemo } from "react";
import { ResultsPlayer } from "./ResultsPlayer";
import { FitText } from "./FitText";
import { Player } from "@/types";
import { convertToRoman, formatAnswerCounts, formatScore } from "@/utils/utils";

type PlayerWithPlace = Player & { place: number }

const MAX_ROW_SIZE = 5
const PODIUM_HEIGHT: Record<number, string> = { 1: '100%', 2: '86%', 3: '74%' }

export const Results: FC<{ players: Player[], isLastRound: boolean, compact?: boolean }> = memo(function Results({ players, isLastRound, compact }) {

  const playersWithPlace = useMemo<PlayerWithPlace[]>(() => {
    return [...players].sort((p1, p2) => p2.score - p1.score).map((p, index) => ({ ...p, place: index + 1 }))
  }, [players])
  const podium = useMemo(
    () => [playersWithPlace[1], playersWithPlace[0], playersWithPlace[2]].filter((p): p is PlayerWithPlace => !!p),
    [playersWithPlace]
  )
  const rows = useMemo(() => distributeRows(playersWithPlace.slice(3)), [playersWithPlace])
  const title = isLastRound ? 'Итоги игры' : 'Итоги раунда'

  if (compact) {
    return (
      <div className="h-full overflow-auto bg-blue-700 text-white p-3 sm:p-4">
        <div className="text-3xl text-center mb-3 sm:mb-4">{title}</div>
        <table className="w-full max-w-3xl mx-auto text-sm sm:text-xl">
          <thead>
            <tr className="border-b border-blue-400 text-xs font-semibold uppercase tracking-wide text-blue-200 sm:text-sm">
              <th scope="col" className="w-12 py-1 pr-2 text-center font-semibold sm:w-16 sm:pr-4">Место</th>
              <th scope="col" className="py-1 pr-2 text-left font-semibold sm:pr-4">Игрок</th>
              <th scope="col" className="py-1 pr-2 text-right font-semibold sm:pr-4">Очки</th>
              <th scope="col" className="w-20 py-1 text-right font-semibold sm:w-auto">Верно / неверно</th>
            </tr>
          </thead>
          <tbody>
            {playersWithPlace.map(player => (
              <tr key={player.id} className="border-b border-blue-500">
                <td className="py-1.5 pr-2 text-center sm:pr-4">{convertToRoman(player.place)}</td>
                <td className="py-1.5 pr-2 break-words hyphens-auto sm:pr-4">{player.name}</td>
                <td className="whitespace-nowrap py-1.5 pr-2 text-right tabular-nums sm:pr-4">{formatScore(player.score)}</td>
                <td className="whitespace-nowrap py-1.5 text-right tabular-nums text-blue-100" title={formatAnswerCounts(player.win, player.lose)}>
                  {player.win} / {player.lose}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="h-full w-full tv-stage text-white flex flex-col items-center px-[3vw] py-[2vh] gap-[2vh]">
      <div className="shrink-0 w-full h-[11%]">
        <FitText className="text-[length:min(8vh,6vw)]">{title}</FitText>
      </div>
      {podium.length > 0 && (
        <div className="w-full min-h-0 flex justify-center items-end gap-[2vw]" style={{ flex: '6 1 0%' }}>
          {podium.map(player => (
            <div key={player.id} className="min-w-0 w-[min(26vw,48vh)]" style={{ height: PODIUM_HEIGHT[player.place] }}>
              <ResultsPlayer player={player} />
            </div>
          ))}
        </div>
      )}
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="w-full min-h-0 flex justify-center gap-[1.5vw]" style={{ flex: '3.4 1 0%' }}>
          {row.map(player => (
            <div key={player.id} className="min-w-0 h-full w-[min(18vw,34vh)]">
              <ResultsPlayer player={player} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
});

function distributeRows(players: PlayerWithPlace[]): PlayerWithPlace[][] {
  const count = players.length
  if (count === 0) {
    return []
  }
  const rowsCount = Math.ceil(count / MAX_ROW_SIZE)
  const base = Math.floor(count / rowsCount)
  const extra = count % rowsCount
  const rows: PlayerWithPlace[][] = []
  let offset = 0
  for (let rowIndex = 0; rowIndex < rowsCount; rowIndex++) {
    const size = base + (rowIndex < extra ? 1 : 0)
    rows.push(players.slice(offset, offset + size))
    offset += size
  }
  return rows
}
