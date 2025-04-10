import { dim } from "@bearz/ansi/styles";
import { Runtime } from "../runtime.js";
import { globals } from "../../globals.js";
/** Deno runtime upgrade handler. */
export class DenoRuntime extends Runtime {
  async upgrade(
    { provider, name, main, to, importMap, verbose, logger, args = [] },
  ) {
    const specifier = provider.getSpecifier(name, to, main);
    const cmdArgs = ["install", `--name=${name}`, "--global", "--force"];
    if (!verbose) {
      cmdArgs.push("--quiet");
    }
    if (args.length) {
      cmdArgs.push(...args);
    }
    if (importMap) {
      const importJson = new URL(importMap, specifier).href;
      cmdArgs.push(`--import-map=${importJson}`);
    }
    cmdArgs.push(specifier);
    await this.execute(cmdArgs, logger);
  }
  async execute(cmdArgs, logger) {
    logger?.log(dim("$ %s %s"), globals.Deno.execPath(), cmdArgs.join(" "));
    const cmd = new globals.Deno.Command(globals.Deno.execPath(), {
      args: cmdArgs,
      stdout: "piped",
      stderr: "piped",
    });
    const { success, stderr } = await cmd.output();
    if (!success) {
      throw new Error(new TextDecoder().decode(stderr).trim());
    }
  }
}
