#!/usr/bin/env bun
import "./_dnt.polyfills.js";
import { globals } from "./globals.js";
import { cmd } from "@bearz/exec";
import { get, joinPath, set } from "@bearz/env";
import { args } from "@bearz/process/args";
import { exit } from "@bearz/process/exit";
set("NODE_CALL", "1");
if (!globals.Deno && !globals.Bun) {
    if (!globals.process.execArgv.includes("--experimental-transform-types")) {
        // Get the node binary
        if (!get("NODE_PATH")) {
            const o = await cmd("npm", ["root", "-g"]).output();
            let r = o.text().trim();
            const h = get("HOME") ?? get("USERPROFILE");
            if (h) {
                r = joinPath([r, `${h}/.node_modules`, `${h}/.local/node_modules`]);
            }
            set("NODE_PATH", r);
        }
        const splat = [
            "--experimental-transform-types",
            "--no-warnings",
            import.meta.filename,
            ...args,
        ];
        const o = await cmd("node", splat).run();
        exit(o.code);
    }
}
await import("./main.js");
