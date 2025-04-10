import { join, resolve } from "jsr:@bearz/path";
import { cmd, setLogger } from "jsr:@bearz/exec"
import { readDirSync } from "jsr:@bearz/fs"

setLogger((f, a) => {
    console.log(f, a);
});

const args = Deno.args;
const __dirname = import.meta.dirname;

if (args.includes("publish")) {
    for (const child of readDirSync(join(__dirname!,"..", "npm"))) {
        if (child.name === "node_modules") {
            continue;
        }
        const dir = resolve(join(__dirname!, "..", "npm", child.name));
        if (!child.isDirectory) {
            continue;
        }

        if (args.includes("--dry-run")) {
            const o = await cmd("npm", ["publish", "--dry-run"], {
                cwd: dir,
            }).run();
            if (o.code !== 0) {
                console.error("Error running npm publish --dry-run");
                Deno.exit(o.code);
            }
        } else {
            const o = await cmd("npm", ["publish"], { cwd: dir }).run();
            if (o.code !== 0) {
                console.error("Error running npm publish");
                Deno.exit(o.code);
            }
        }
       
    }   
}




if (args.includes("audit")) {
    for (const child of readDirSync(join(__dirname!,"..", "npm"))) {
        if (child.name === "node_modules") {
            continue;
        }
        const dir = resolve(join(__dirname!, "..", "npm", child.name));
        if (!child.isDirectory) {
            continue;
        }

        const o = await cmd("npm", ["audit"], { cwd: dir }).run();
        if (o.code !== 0) {
            console.error("Error running npm publish");
            Deno.exit(o.code);
        }
       
    }   
}



if (args.includes("test")) {
    for (const child of readDirSync(join(__dirname!,"..", "npm"))) {
        if (child.name === "node_modules") {
            continue;
        }

        const dir = resolve(join(__dirname!, "..", "npm", child.name));
        if (!child.isDirectory) {
            continue;
        }

        console.log(dir);
        const o = await cmd("npm", ["run", "test"], { cwd: dir }).run();
        if (o.code !== 0) {
            console.error("Error running npm test");
            Deno.exit(o.code);
        }
       
    }   
}


