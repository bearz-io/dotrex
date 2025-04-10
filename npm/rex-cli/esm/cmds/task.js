import { Command } from "@dotrex/command";
import { Runner } from "@dotrex/runtime";
import { VERSION } from "../version.js";
import { getTasks } from "../discovery.js";
import { logLevels, parseLogLevel } from "./types.js";
import { onExit } from "../globals.js";
import { exit } from "@bearz/process/exit";
export const taskCommand = new Command()
  .name("rex-task")
  .description("Runs one or more tasks from a rexfile.")
  .type("loglevel", logLevels)
  .version(VERSION)
  .option("-f, --file <file:file>", "The rexfile to run")
  .option("-v --log-level <log-level:loglevel>", "Enable debug mode", {
    default: "info",
  })
  .option(
    "-t, --timeout <timeout:number>",
    "Set the timeout for the task in minutes.",
  )
  .complete("names", async () => {
    const tasks = await getTasks();
    return tasks;
  })
  .option(
    "-c --context <context:string>",
    "The context (environment) name. Defaults to 'local'",
    { default: "default" },
  )
  .option("-e --env <env:string>", "Sets an environment variable", {
    collect: true,
  })
  .option(
    "--env-file, --ef <env-file:file>",
    "Sets an environment variable from a file",
    {
      collect: true,
    },
  )
  .arguments("[target:string[]:names] [...args]")
  .stopEarly()
  .action(
    async (
      { file, logLevel, timeout, env, envFile, context },
      targets,
      ...args
    ) => {
      const runner = new Runner();
      const controller = new AbortController();
      onExit(() => {
        controller.abort();
        exit(2);
      });
      const options = {
        file: file,
        targets: targets ?? ["default"],
        command: "task",
        timeout: timeout,
        logLevel: parseLogLevel(logLevel),
        env: env,
        envFile: envFile,
        context: context,
        signal: controller.signal,
        args: args,
      };
      await runner.run(options);
    },
  );
