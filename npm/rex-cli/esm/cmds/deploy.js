import { Command } from "@dotrex/command";
import { Runner } from "@dotrex/runtime";
import { VERSION } from "../version.js";
import { getDeployments } from "../discovery.js";
import { logLevels, parseLogLevel } from "./types.js";
import { onExit } from "../globals.js";
import { exit } from "@bearz/process/exit";
const cmd = new Command()
    .name("rex-deploy")
    .description("Deploys a single deployment from a rexfile.")
    .version(VERSION)
    .type("loglevel", logLevels)
    .arguments("[target:string[]:deployments] [...args]")
    .complete("deployments", async () => {
    return await getDeployments();
})
    .option("-f, --file <file:file>", "The rexfile to run")
    .option("-v --log-level <log-level:loglevel>", "Enable debug mode", { default: "info" })
    .option("-t, --timeout <timeout:number>", "Set the timeout for the job")
    .option("-c --context <context:string>", "The context (environment) name. Defaults to 'default'", { default: "default" })
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
    const options = {
        file: file,
        targets: targets ?? ["default"],
        command: "deploy",
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
export const deployCommand = cmd;
