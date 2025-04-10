import { deploySymbol, writer } from "../host/writer.js";
import { cyan, green, red } from "@bearz/ansi/styles";
import { AnsiModes, AnsiSettings } from "@bearz/ansi";
import { capitalize } from "@bearz/strings/capitalize";
export function deployConsoleSink(message) {
    switch (message.kind) {
        case "deployment:missing-dependencies": {
            const msg = message;
            writer.error(`Missing the following deployment dependencies ${msg.deployments.join(",")}`);
            return;
        }
        case "deployment:cyclical-references": {
            const msg = message;
            writer.error(`Found deployment cyclical references ${msg.deployments.join(",")}`);
            return;
        }
        case "deployment:started": {
            const msg = message;
            const name = msg.state.name ?? msg.state.id;
            const directive = capitalize(msg.action);
            let emoji = "🚀";
            if (msg.directive === "rollback") {
                emoji = "🪂";
            }
            else if (msg.directive === "destroy") {
                emoji = "💥";
            }
            if (AnsiSettings.current.mode === AnsiModes.TwentyFourBit) {
                writer.write(deploySymbol);
                writer.writeLine(` ${emoji} ${directive} ${name} `);
            }
            else if (AnsiSettings.current.stdout) {
                writer.write(cyan(`❯❯❯❯❯ ${directive} ${name}`));
            }
            else {
                writer.writeLine(`❯❯❯❯❯ ${directive} ${name}`);
            }
            return;
        }
        case "deployment:skipped": {
            const msg = message;
            const name = msg.state.name ?? msg.state.id;
            const directive = capitalize(msg.action);
            let emoji = "🚀";
            if (msg.directive === "rollback") {
                emoji = "🪂";
            }
            else if (msg.directive === "destroy") {
                emoji = "💥";
            }
            if (AnsiSettings.current.mode === AnsiModes.TwentyFourBit) {
                writer.write(deploySymbol);
                writer.writeLine(` ${emoji} ${directive} ${name} (Skipped)`);
            }
            else if (AnsiSettings.current.stdout) {
                writer.write(cyan(`❯❯❯❯❯ ${directive} ${name} (Skipped)`));
            }
            else {
                writer.writeLine(`❯❯❯❯❯ ${directive} ${name} (Skipped)`);
            }
            return;
        }
        case "deployment:failed": {
            const msg = message;
            const name = msg.state.name ?? msg.state.id;
            const directive = capitalize(msg.action);
            let emoji = "🚀";
            if (msg.directive === "rollback") {
                emoji = "🪂";
            }
            else if (msg.directive === "destroy") {
                emoji = "💥";
            }
            writer.error(msg.error);
            if (AnsiSettings.current.mode === AnsiModes.TwentyFourBit) {
                writer.write(deploySymbol);
                writer.writeLine(` ${emoji} ${directive} ${name} ${red("failed")}`);
            }
            else if (AnsiSettings.current.mode === AnsiModes.None) {
                writer.error(`❯❯❯❯❯ ${directive} ${name} failed`);
            }
            else {
                writer.error(red(`❯❯❯❯❯ ${directive} ${name} failed`));
            }
            writer.endGroup();
            return;
        }
        case "deployment:completed": {
            const msg = message;
            const duration = msg.result.finishedAt.getTime() - msg.result.startedAt.getTime();
            const ms = duration % 1000;
            const s = Math.floor(duration / 1000) % 60;
            const m = Math.floor(duration / 60000) % 60;
            const directive = capitalize(msg.action);
            let emoji = "🚀";
            if (msg.directive === "rollback") {
                emoji = "🪂";
            }
            else if (msg.directive === "destroy") {
                emoji = "💥";
            }
            if (AnsiSettings.current.mode === AnsiModes.TwentyFourBit) {
                // rexWriter.write(deploySymbol)
                writer.write(deploySymbol);
                writer.writeLine(` ${emoji} ${directive} ${msg.state.name} completed sucessfully in ${green(m.toString())}m ${green(s.toString())}s ${green(ms.toString())}ms`);
            }
            else {
                writer.success(`${directive} ${msg.state.name ?? msg.state.id} completed in ${m}m ${s}s ${ms}ms`);
            }
            writer.endGroup();
            return;
        }
    }
}
