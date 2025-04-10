// deno-lint-ignore no-explicit-any
import * as dntShim from "./_dnt.shims.js";
export const globals = dntShim.dntGlobalThis;
export function onExit(handler) {
  if (globals.Deno) {
    globals.Deno.addSignalListener("SIGINT", handler);
  } else if (globals.process) {
    globals.process.on("SIGINT", handler);
  }
}
