
import { memo, FC, useMemo } from "react";
import { ResultsPlayer } from "./ResultsPlayer";
import { Player } from "@/types";
import { convertToRoman } from "@/utils/utils";

type PlayerWithPlace = Player & { place: number }

// players beyond the podium are laid out in rows of at most this many cards
const MAX_ROW_SIZE = 6

// eslint-disable-next-line react/display-name
export const Results: FC<{ players: Player[], isLastRound: boolean, compact?: boolean }> = memo(({ players, isLastRound, compact }) => {

  const playersWithPlace = useMemo<PlayerWithPlace[]>(() => {
    return [...players].sort((p1, p2) => p2.score - p1.score).map((p, index) => ({ ...p, place: index + 1 }))
  }, [players])
  const rows = useMemo(() => distributeRows(playersWithPlace.slice(3)), [playersWithPlace])
  const title = isLastRound ? 'Итоги игры' : 'Итоги раунда'

  if (compact) {
    return (
      <div className="h-full overflow-auto bg-blue-700 text-white p-4">
        <div className="text-3xl text-center mb-4">{title}</div>
        <table className="w-full max-w-3xl mx-auto text-xl">
          <tbody>
            {playersWithPlace.map(player => (
              <tr key={player.id} className="border-b border-blue-500">
                <td className="py-1 pr-4 w-16 text-center">{convertToRoman(player.place)}</td>
                <td className="py-1 pr-4">{player.name}</td>
                <td className="py-1 pr-4 text-right">{player.score} очков</td>
                <td className="py-1 text-right text-base text-blue-100">{player.win} / {player.lose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <>
      <div className='h-screen bg-blue-700 shadow-[0_0_400px_230px_rgba(0,0,0,0.40)_inset] border-solid border-2 border-blue-800 border-b-gray-700  flex justify-center items-center'>
        <div className="flex justify-center items-center h-screen w-full text-white text-6xl  overflow-hidden relative">
          <div className="flex h-[80vh] items-center flex-col">
            <div className="mb-2 text-center">{title}</div>
            <div className="m-4 h-[600px] min-h-0 flex">
              <ResultsPlayer player={playersWithPlace[0]} />
            </div>

            <div className="m-4 w-full h-[600px] min-h-0 flex justify-evenly">
              <ResultsPlayer player={playersWithPlace[1]} />
              <ResultsPlayer player={playersWithPlace[2]} />
            </div>

            {rows.map((row, rowIndex) => (
              <div key={rowIndex} className="flex m-4 h-[600px] min-h-0 w-[80vw] justify-around">
                {row.map((p) => {
                  return (
                    <ResultsPlayer key={p.id} player={p} />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
});

// Splits the players below the podium into rows: up to 4 in one row, otherwise at least two rows of at most
// MAX_ROW_SIZE, the lower rows getting the extra players.
function distributeRows(players: PlayerWithPlace[]): PlayerWithPlace[][] {
  const count = players.length
  if (count === 0) {
    return []
  }
  if (count <= 4) {
    return [players]
  }
  const rowsCount = Math.max(2, Math.ceil(count / MAX_ROW_SIZE))
  const base = Math.floor(count / rowsCount)
  const extra = count % rowsCount
  const rows: PlayerWithPlace[][] = []
  let offset = 0
  for (let rowIndex = 0; rowIndex < rowsCount; rowIndex++) {
    const size = base + (rowIndex >= rowsCount - extra ? 1 : 0)
    rows.push(players.slice(offset, offset + size))
    offset += size
  }
  return rows
}
