// Shared guard: any stage change away from current stage on an "avoid" opportunity
// must be confirmed by the user before it's applied.
export function needsHalalConfirm(opp, newStage) {
  return opp.halalStatus === 'avoid' && newStage !== opp.stage
}
