import type { EventUpdatePlayers, Player } from "@/types"

export type PlayerView = Player & { isCurrent: boolean }

// Applies an onUpdatePlayers delta (added / removed / updated) without mutating the input list.
export const mergePlayers = (players: readonly Player[], update: EventUpdatePlayers): Player[] => {
  const removed = new Set(update.removed)
  const updated = new Map(update.updated.map(player => [player.id, player]))

  const merged: Player[] = [...players]
  for (const added of update.added) {
    const index = merged.findIndex(player => player.id === added.id)
    if (index >= 0) {
      merged[index] = { ...merged[index], ...added }
    } else {
      merged.push(added)
    }
  }

  return merged
    .filter(player => !removed.has(player.id))
    .map(player => {
      const patch = updated.get(player.id)
      return patch ? { ...player, ...patch } : player
    })
}

// Marks the player who is choosing the next question.
export const withCurrent = (players: readonly Player[], currentSelector: string | null): PlayerView[] =>
  players.map(player => ({ ...player, isCurrent: player.id === currentSelector }))
