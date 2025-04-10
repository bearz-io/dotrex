import { dirname } from "jsr:@std/path@1";
import { exists, readDirSync } from "jsr:@bearz/fs";
import { join, resolve } from "jsr:@bearz/path";

const __dirname = import.meta.dirname!;
const pwd = dirname(__dirname);
const scopeVersion = JSON.parse(Deno.readTextFileSync(`${pwd}/version.json`).trim())
    .version as string;

for (const child of readDirSync(join(__dirname!, "..", "jsr"))) {
    if (child.name === "node_modules") {
        continue;
    }
    const dir = resolve(join(__dirname!, "..", "jsr", child.name));
    if (!child.isDirectory) {
        continue;
    }

    const config = join(dir, "deno.json");
    if (!await exists(config)) {
        continue;
    }

    const cfg = JSON.parse(Deno.readTextFileSync(config));
    cfg.version = scopeVersion;
    Deno.writeTextFileSync(config, JSON.stringify(cfg, null, 4));
}
