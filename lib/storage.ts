
export const stateStore = new Map<string, any>();

export function saveState(id: string, state: any) {
  stateStore.set(id, state);
}

export function getState(id: string) {
  return stateStore.get(id);
}
