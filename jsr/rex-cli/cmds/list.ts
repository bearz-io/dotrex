import { Command } from "@dotrex/command";
import { Runner, type RunnerOptions } from "@dotrex/runtime";
import { VERSION } from "../version.ts";

export const listCommand = new Command()
    .name("rex-list")
    .description("List the tasks, jobs, and deployments in a rexfile")
    .version(VERSION)
    .option("-f, --file <file:string>", "The rexfile to run")
    .action(async ({ file }) => {
        const runner = new Runner();

        const options: RunnerOptions = {
            file: file,
            targets: ["default"],
            command: "list",
        };
        await runner.run(options);
    });
