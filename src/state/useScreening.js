import { useStore } from './useStore'
import { DEFAULT_SCREENING } from './defaults'

// The user-configurable screening field (decision 11B). Merges stored
// settings over defaults so partially-edited configs stay complete.
export function useScreening() {
  const { state } = useStore()
  const stored = state.settings?.screening
  if (!stored) return DEFAULT_SCREENING
  return {
    ...DEFAULT_SCREENING,
    ...stored,
    statuses: { ...DEFAULT_SCREENING.statuses, ...(stored.statuses || {}) },
  }
}
