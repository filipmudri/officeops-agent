import { tools } from "./tools";

export async function executor(plan: any, state: any = {}) {
  for (const step of plan.steps) {
    const fn = tools[step.action];
    if (fn) {
      await fn(state, ...(step.args || []));
    }
  }
  return state;
}