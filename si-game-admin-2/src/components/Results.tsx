
import { memo, FC, useMemo } from "react";
import { ResultsPlayer } from "./ResultsPlayer";
import { Player } from "@/types";

type PlayerWithPlace =  Player & {place: number}
// eslint-disable-next-line react/display-name
export const Results: FC<{ players: Player[] }> = memo(({ players }) => {

  const playersWithPlace = useMemo(() => {
    return players.sort((p1, p2) => p2.score - p1.score).map((p, index) => ({ ...p, place: index + 1 }))
  }, [players])
  const [row1Count, row2Count] = distributeRows(playersWithPlace.length - 3)
  const [row1, row2] = distributePlayers(playersWithPlace, row1Count, row2Count)
  return (
    <>
      <div className='h-screen bg-blue-700 shadow-[0_0_400px_230px_rgba(0,0,0,0.40)_inset] border-solid border-2 border-blue-800 border-b-gray-700  flex justify-center items-center'>
        <div className="flex justify-center items-center h-screen w-full text-white text-6xl  overflow-hidden relative">
          <div className="flex h-[80vh] items-center flex-col">
            <div className="m-4 h-[600px] flex">
              <ResultsPlayer player={playersWithPlace[0]} />
            </div>

            <div className="m-4 w-full h-[600px] flex justify-evenly">
              <ResultsPlayer player={playersWithPlace[1]} />
              <ResultsPlayer player={playersWithPlace[2]} />
            </div>

            <div className="flex m-4  h-[600px] w-[80vw]  justify-around">
              {row1.map((p) => {
                return (
                  <ResultsPlayer key={p.id} player={p}/>
                )
              })}
            </div>
            <div className="flex m-4  h-[600px] w-[80vw]  justify-around">
              {row2.map((p) => {
                return (
                  <ResultsPlayer key={p.id} player={p}/>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
});
function distributeRows(count: number): [number, number] {
  if (count <= 0) {
    return [0, 0]
  }
  if (count <= 4) {
    return [count, 0]
  }
  if (count > 4 && count <= 6) {
    return [2, count - 2]
  }
  if (count > 6 && count <= 8) {
    return [3, count - 3]
  }
  if (count > 8 && count <= 10) {
    return [4, count - 4]
  }
  if (count > 10 && count <= 12) {
    return [5, count - 5]
  }
  return [6, 6]
}

function distributePlayers(players: PlayerWithPlace[], q1: number, q2: number): [PlayerWithPlace[], PlayerWithPlace[]] {
  return [
    players.slice(0 + 3, q1 + 3),
    players.slice(q1 + 3, q1 + 3 + q2)
  ]
}

