// Illustrative volumes and flow rates; not a plumbing specification.
export const waterDefaults = Object.freeze({capacities: Object.freeze({main: 20, small: 6}), inflow: .24, drain: .4});

/** Create independent bowl states and a shared tap, without touching room options. */
export function createWaterState() {
  return {tapOn: false, target: 'small', bowls: {main: {plugged: false, litres: 0, spilling: false}, small: {plugged: false, litres: 0, spilling: false}}, spilled: 0, drained: 0, supplied: 0, spilling: false};
}

/** Route incoming water to the selected bowl while both open drains keep operating. */
export function stepWater(state, seconds, rates = waterDefaults) {
  if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError('Elapsed time must be finite and non-negative.');
  if (!Object.hasOwn(state.bowls,state.target)) throw new RangeError('Unknown tap destination.');
  if (!Number.isFinite(rates.inflow) || rates.inflow < 0 || !Number.isFinite(rates.drain) || rates.drain < 0) throw new RangeError('Flow rates must be finite and non-negative.');
  for(const id of Object.keys(state.bowls))if(!Number.isFinite(rates.capacities[id]) || rates.capacities[id]<=0)throw new RangeError('Bowl capacities must be positive.');
  state.spilling=false;
  for(const [id,bowl] of Object.entries(state.bowls)){
    const incoming=state.tapOn && state.target===id ? seconds*rates.inflow : 0;
    const available=bowl.litres+incoming;
    const drained=bowl.plugged?0:Math.min(available,seconds*rates.drain);
    const overflow=Math.max(0,available-drained-rates.capacities[id]);
    bowl.litres=Math.min(rates.capacities[id],Math.max(0,available-drained));
    bowl.spilling=overflow>0;state.spilling ||= bowl.spilling;
    state.supplied+=incoming;state.drained+=drained;state.spilled+=overflow;
  }
  return state;
}

/** Clear both bowls and floor water, leaving both plugs out and the spout where it was. */
export function resetWater(state) {
  const target=state.target;
  Object.assign(state,createWaterState());
  state.target=target;
}
