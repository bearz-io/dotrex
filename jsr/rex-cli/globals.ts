// deno-lint-ignore no-explicit-any
export const globals: typeof globalThis & Record<string | symbol, any> = globalThis;

export function onExit(handler: () => void) {
    if (globals.Deno) {
        globals.Deno.addSignalListener("SIGINT", handler);
    } else if (globals.process) {
        globals.process.on("SIGINT", handler);
    }
}
