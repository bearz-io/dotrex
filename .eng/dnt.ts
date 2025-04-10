import { dirname, fromFileUrl } from "jsr:@std/path@1";
import { build, emptyDir, type EntryPoint } from "jsr:@deno/dnt";
import { exists } from "@bearz/fs/exists";

const __dirname = dirname(fromFileUrl(import.meta.url));
const pwd = dirname(__dirname);
Deno.chdir(`${pwd}/jsr`);

const content = Deno.readTextFileSync(`${pwd}/.git/config`);
const lines = content.split(/\r?\n/);
let url = lines.find((line) => line.includes("url"))?.split("=")[1].trim();

const scopeVersion = JSON.parse(Deno.readTextFileSync(`${pwd}/version.json`).trim())
    .version as string;

if (!url) {
    throw new Error("Could not find git url in .git/config");
}

if (url.startsWith("git@")) {
    url = url.replace(":", "/").replace("git@", "https://");
}
const bugsUrl = url.replace(".git", "/discussions");

const rootConfig = JSON.parse(Deno.readTextFileSync(`${pwd}/deno.json`));
const importMap: Record<string, string> = rootConfig.imports as Record<string, string>;

const projects = [
    "core",
    "table",
    "flags",
    "file",
    "command",
    "runtime",
    "rex-cli",
];

interface DenoJson {
    name: string;
    version: string;
    exports: Record<string, string>;
    imports: Record<string, string>;
    dnt?: {
        description?: string;
        keywords?: string[];
        dependencies: string[];
        devDependencies: string[];
        bin?: Record<string, string>;
    };
}

const common: Record<string, string> = {
    "@types/node": "^22.14.0",
};

for (const project of projects) {
    console.log("");
    console.log("syncing project", project);

    await emptyDir(`../npm/${project}`);

    const denoJson = JSON.parse(
        Deno.readTextFileSync(`${pwd}/jsr/${project}/deno.json`),
    ) as DenoJson;
    const entryPoints: Array<string | EntryPoint> = [];
    for (const key of Object.keys(denoJson.exports)) {
        if (key == ".") {
            entryPoints.push({ name: ".", path: denoJson.exports[key] });
        } else {
            entryPoints.push({ name: key, path: denoJson.exports[key] });
        }
    }

    const deps: Record<string, string> = {};
    const devDeps: Record<string, string> = {};

    for (const dep of denoJson.dnt?.dependencies ?? []) {
        if (dep.startsWith("@dotrex")) {
            deps[dep] = "^" + scopeVersion;
            continue;
        }

        let version = importMap[dep];
        if (version) {
            version = version.substring(version.lastIndexOf("@") + 1);
            deps[dep] = version;
        } else if (common[dep]) {
            deps[dep] = common[dep];
        }
    }

    for (const dep of denoJson.dnt?.devDependencies ?? []) {
        if (dep.startsWith("@dotrex")) {
            devDeps[dep] = "^" + scopeVersion;
            continue;
        }
        let version = importMap[dep];
        if (version) {
            version = version.substring(version.lastIndexOf("@") + 1);
            devDeps[dep] = version;
        } else if (common[dep]) {
            devDeps[dep] = common[dep];
        }
    }

    Deno.chdir(`${pwd}/jsr/${project}`);

    console.log("dev", devDeps);

    console.log("deps", deps);

    await build({
        entryPoints: entryPoints,
        outDir: "../../npm/" + project,
        declaration: project !== "rex-cli" ? "separate" : false,
        esModule: true,
        shims: { deno: false },
        scriptModule: false,
        skipSourceOutput: true,
        compilerOptions: {
            lib: ["ES2023.Collection", "ES2023.Array", "ES2015.Iterable", "ES2023"],
            target: "ES2023",
            "skipLibCheck": true,
        },
        packageManager: "bun",
        package: {
            // package.json properties
            name: denoJson.name,
            version: denoJson.version,
            description: denoJson.dnt?.description,
            keywords: denoJson.dnt?.keywords,
            license: "MIT",
            authors: [{
                name: "jolt9dev",
                email: "dev@jolt9.com",
            }],
            scripts: {
                "test": "node --test",
                "test:bun": "bun test",
            },
            repository: {
                type: "git",
                url: `git+${url}`,
            },
            bugs: {
                url: bugsUrl,
            },
            homepage: "bearz.io",
            engines: {
                "node": ">=22",
            },
            type: "module",
            dependencies: deps,
            devDependencies: devDeps,
            bin: denoJson?.dnt?.bin,
        },
        async postBuild() {
            // steps to run after building and before running the tests
            await Deno.copyFile(
                `${pwd}/jsr/${project}/LICENSE.md`,
                `${pwd}/npm/${project}/LICENSE.md`,
            );
            await Deno.copyFile(
                `${pwd}/jsr/${project}/README.md`,
                `${pwd}/npm/${project}/README.md`,
            );
            //await import("./replace-dnt-shim.ts");
        },
    });

    const file = `${pwd}/npm/${project}/test_runner.js`;

    if (await exists(file)) {
        await Deno.remove(file);
    }

    await Deno.writeTextFile(
        `${pwd}/npm/${project}/.npmignore`,
        `vite.config.ts
    .artifacts/**
    node_modules/**
    bun.lock
    bun.lockb`,
        { append: true },
    );

    //await import("./fmt-npm.ts");
}

let content2 = Deno.readTextFileSync(`${pwd}/npm/rex-cli/esm/main_node.js`);
content2 = `#!/usr/bin/env node
${content2}`;
Deno.writeTextFileSync(`${pwd}/npm/rex-cli/esm/main_node.js`, content2);

const cmd = new Deno.Command("bun", {
    args: ["run", "npm", "install", "--package-lock-only"],
    stdout: "inherit",
    stderr: "inherit",
    cwd: `${pwd}/npm`,
});

const o = await cmd.output();
if (o.code !== 0) {
    throw new Error("Failed to run yarn install --package-lock-only");
}

await Deno.chmod(`${pwd}/npm/rex-cli/esm/main_node.js`, 0o777);

await import("./fmt-npm.ts");
