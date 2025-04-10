// deno-lint-ignore-file no-explicit-any
import { dim } from "@bearz/ansi/styles";
import { NodeRuntime } from "./node_runtime.js";
export class BunRuntime extends NodeRuntime {
  async execute(cmdArgs, isJsr, logger) {
    // dnt-shim-ignore
    const Bun = globalThis.Bun;
    // dnt-shim-ignore
    const process = globalThis.process;
    cmdArgs = isJsr
      ? [`${process.execPath}x`, "jsr", ...cmdArgs]
      : [process.execPath, ...cmdArgs];
    logger?.log(dim("$ %s"), cmdArgs.join(" "));
    const proc = Bun.spawn(cmdArgs, { stdout: "pipe", stderr: "pipe" });
    await proc.exited;
    if (proc.exitCode) {
      const stderr = await new Response(proc.stderr).text();
      throw new Error(stderr.trim());
    }
  }
}
