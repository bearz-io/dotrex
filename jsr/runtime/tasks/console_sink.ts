import { groupSymbol, writer } from "../host/writer.ts";
import { LogLevel, type LogMessage, type Message } from "../bus/mod.ts";
import type {
    CyclicalTaskReferences,
    MissingTaskDependencies,
    TaskCompleted,
    TaskFailed,
    TaskSkipped,
    TaskStarted,
} from "./messages.ts";
import { green, red, reset } from "@bearz/ansi/styles";
import { AnsiModes, AnsiSettings } from "@bearz/ansi";

export function tasksConsoleSink(message: Message): void {
    switch (message.kind) {
        case "log":
            {
                const logMessage = message as LogMessage;
                if (!logMessage.error && !logMessage.message) {
                    return;
                }

                switch (message.level) {
                    case LogLevel.Trace:
                        if (logMessage.error) {
                            writer.trace(logMessage.error, logMessage.message, message.args);
                        } else if (logMessage.message) {
                            writer.trace(logMessage.message, message.args);
                        }

                        return;

                    case LogLevel.Fatal:
                        if (logMessage.error) {
                            writer.error(logMessage.error, logMessage.message, message.args);
                        } else if (logMessage.message) {
                            writer.error(logMessage.message, message.args);
                        }

                        return;
                    case LogLevel.Info:
                        if (logMessage.message) {
                            writer.info(logMessage.message, message.args);
                        }

                        return;
                    case LogLevel.Debug:
                        if (logMessage.error) {
                            writer.debug(logMessage.error, logMessage.message, message.args);
                        } else if (logMessage.message) {
                            writer.debug(logMessage.message, message.args);
                        }

                        return;

                    case LogLevel.Warn:
                        if (logMessage.error) {
                            writer.warn(logMessage.error, logMessage.message, message.args);
                        } else if (logMessage.message) {
                            writer.warn(logMessage.message, message.args);
                        }

                        return;

                    case LogLevel.Error:
                        if (logMessage.error) {
                            writer.error(logMessage.error, logMessage.message, message.args);
                        } else if (logMessage.message) {
                            writer.error(logMessage.message, message.args);
                        }

                        return;
                }
            }

            return;

        case "task:missing-dependencies": {
            const msg = message as MissingTaskDependencies;
            writer.error(`Missing the following job dependencies ${msg.tasks.join(",")}`);
            return;
        }

        case "task:cyclical-references": {
            const msg = message as CyclicalTaskReferences;
            writer.error(`Found job cyclical references ${msg.tasks.join(",")}`);
            return;
        }

        case "task:started": {
            writer.writeLine("");
            const msg = message as TaskStarted;
            let name = msg.task.name ?? msg.task.id;
            if (name.length === 0) {
                name = msg.task.id;
            }
            writer.startGroup(`${name}`);
            return;
        }

        case "task:skipped": {
            writer.writeLine("");
            const msg = message as TaskSkipped;
            const name = msg.task.name ?? msg.task.id;
            writer.skipGroup(name);
            return;
        }

        case "task:failed": {
            const msg = message as TaskFailed;
            const name = msg.task.name ?? msg.task.id;
            writer.error(msg.error);
            if (AnsiSettings.current.mode === AnsiModes.TwentyFourBit) {
                writer.write(groupSymbol).write(reset(" "));
                writer.writeLine(`${name} ${red("failed")}`);
            } else if (AnsiSettings.current.mode === AnsiModes.None) {
                writer.error(`❯❯❯❯❯ ${name} failed`);
            } else {
                writer.error(red(`❯❯❯❯❯ ${name} failed`));
            }

            writer.endGroup();
            writer.writeLine("");
            return;
        }

        case "task:completed": {
            const msg = message as TaskCompleted;
            const duration = msg.result.finishedAt.getTime() - msg.result.startedAt.getTime();
            const ms = duration % 1000;
            const s = Math.floor(duration / 1000) % 60;
            const m = Math.floor(duration / 60000) % 60;

            if (AnsiSettings.current.mode === AnsiModes.TwentyFourBit) {
                // rexWriter.write(groupSymbol)
                writer.write(groupSymbol);
                writer.writeLine(
                    ` ${msg.task.name} completed sucessfully in ${green(m.toString())}m ${
                        green(s.toString())
                    }s ${green(ms.toString())}ms`,
                );
            } else {
                writer.success(
                    `${msg.task.name ?? msg.task.id} completed in ${m}m ${s}s ${ms}ms`,
                );
            }

            writer.endGroup();
            return;
        }
    }
}
