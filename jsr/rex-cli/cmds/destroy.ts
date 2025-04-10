import { Command } from "@dotrex/command";
import { Runner, type RunnerOptions } from "@dotrex/runtime";
import { VERSION } from "../version.ts";
import { getDeployments } from "../discovery.ts";
import { logLevels, parseLogLevel } from "./types.ts";
import { onExit } from "../globals.ts";
import { exit } from "@bearz/process/exit";

export const destroyCommand = new Command()
    .name("rex-destroy")
    .description(
        "Destroys a single deployment from a rexfile.",
    )
    .type("loglevel", logLevels)
    .version(VERSION)
    .arguments("[target:string[]:rollback] [...args]")
    .complete("deployments", async () => {
        return await getDeployments();
    })
    .option("-f, --file <file:file>", "The rexfile to run")
    .option("-v --log-level <log-level:loglevel>", "Enable debug mode", { default: "info" })
    .option("-t, --timeout <timeout:number>", "Set the timeout for the job")
    .option(
        "-c --context <context:string>",
        "The context (environment) name. Defaults to 'default'",
        { default: "default" },
    )
    .option("-e --env <env:string>", "Sets an environment variable", { collect: true })
    .option("--env-file, --ef <env-file:file>", "Sets an environment variable from a file", {
        collect: true,
    })
    .stopEarly()
    .action(async ({ file, logLevel, timeout, context, env, envFile }, targets, ...args) => {
        const runner = new Runner();
        const controller = new AbortController();
        onExit(() => {
            controller.abort();
            exit(2);
        });
        const options: RunnerOptions = {
            file: file,
            targets: targets ?? ["default"],
            command: "destroy",
            timeout: timeout,
            logLevel: parseLogLevel(logLevel),
            context: context,
            env: env,
            envFile: envFile,
            signal: controller.signal,
            args,
        };
        await runner.run(options);
    });
