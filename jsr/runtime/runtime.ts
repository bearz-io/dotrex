import { chdir, cwd as getCwd, exit } from "@bearz/process";
import { dirname, isAbsolute, join, resolve } from "@bearz/path";

import { type LogLevel, LogLevels } from "@dotrex/core/host";
import { writer } from "./host/writer.ts";
import { Inputs, Outputs, StringMap } from "@dotrex/core/collections";
import { DefaultLoggingMessageBus } from "./bus/mod.ts";
import { tasksConsoleSink } from "./tasks/console_sink.ts";
import { jobsConsoleSink } from "./jobs/console_sink.ts";
import { deployConsoleSink } from "./deployments/console_sink.ts";
import { SequentialTasksPipeline, TaskPipeline, TasksPipelineContext } from "./tasks/pipelines.ts";
import { PipelineStatuses } from "@dotrex/core/enums";
import * as env from "@bearz/env";
import { DiscoveryPipeline, DiscoveryPipelineContext } from "./discovery/pipelines.ts";
import { RexfileDiscovery } from "./discovery/middlewares.ts";
import { ApplyTaskContext, SequentialTaskExecution, TaskExecution } from "./tasks/middlewares.ts";
import { JobsPipelineContext, SequentialJobsPipeline } from "./jobs/pipelines.ts";
import { ApplyJobContext, JobsExcution, RunJob } from "./jobs/middlewares.ts";
import { JobPipeline } from "./jobs/pipelines.ts";
import { DeploymentPipeline, DeploymentPipelineContext } from "./deployments/pipelines.ts";
import { parse } from "@bearz/dotenv";
import { load } from "@bearz/dotenv/load";
import { readTextFile } from "@bearz/fs";
import { ApplyDeploymentContext, RunDeployment } from "./deployments/middleware.ts";
import { Context } from "@dotrex/core/context";
import { ServicesContainer } from "./di/mod.ts";

export interface RunnerOptions {
    file?: string;
    cwd?: string;
    command?: string;
    targets?: string[];
    timeout?: number;
    logLevel?: LogLevel;
    context?: string;
    env?: string[];
    envFile?: string[];
    signal?: AbortSignal;
    args?: string[];
}

export class Runner {
    constructor() {
    }

    async run(options: RunnerOptions) {
        let { file, cwd, command, targets, timeout, logLevel } = options;

        writer.setLogLevel(logLevel ?? LogLevels.Info);

        writer.debug(`log level: ${writer.level}`);
        writer.trace(`log level: ${writer.level}`);
        writer.trace(`file: ${file}`);
        writer.trace(`command: ${command}`);

        cwd ??= getCwd();

        if (file) {
            if (!isAbsolute(file)) {
                file = resolve(file);
            }

            const dir = dirname(file);
            if (dir) {
                cwd = dir;
                chdir(cwd);
            }
        }

        if (options.envFile) {
            for (const file of options.envFile) {
                const content = await readTextFile(file);
                const records = parse(content);
                load(records);
            }
        }

        if (options.env) {
            for (const e of options.env) {
                const [key, value] = e.split("=");
                if (value.startsWith("'")) {
                    env.set(key, value.slice(1, value.length - 1));
                } else if (value.startsWith('"')) {
                    env.set(key, value.slice(1, value.length - 1));
                } else {
                    env.set(key, value);
                }
            }
        }

        writer.trace(`CWD: ${cwd}`);

        file ??= join(cwd!, ".rex.ts");
        writer.trace(`Rexfile: ${file}`);

        timeout ??= 60 * 60;
        if (timeout < 1) {
            timeout = 60 * 3;
        }

        const controller = new AbortController();

        if (options.signal) {
            options.signal.addEventListener("abort", () => {
                controller.abort();
            }, { once: true });
        }

        let handle = -1;

        if (timeout > 0) {
            handle = setTimeout(() => {
                controller.abort();
            }, timeout * 1000) as unknown as number;
        }

        const signal = controller.signal;

        try {
            signal.addEventListener("abort", () => {
                writer.error(`Timeout of ${timeout} seconds exceeded.`);
                exit(1);
            }, { once: true });

            command ??= "run";
            targets ??= ["default"];

            const bus = new DefaultLoggingMessageBus();
            bus.addListener(tasksConsoleSink);
            bus.addListener(jobsConsoleSink);
            bus.addListener(deployConsoleSink);

            const container = new ServicesContainer();
            container.registerSingleton("Bus", () => bus);
            container.set("RexWriter", writer);

            const ctx = new Context(container, options.context ?? "local");
            ctx.args = options.args;

            if (options.signal) {
                ctx.signal = options.signal;
            }

            ctx.env.set("REX_ENVIRONMENT", ctx.name);
            ctx.env.set("REX_CONTEXT", ctx.name);

            const discoveryPipeline = new DiscoveryPipeline();
            discoveryPipeline.use(new RexfileDiscovery());
            const taskPipeline = new TaskPipeline();
            // first will execute the last.
            taskPipeline.use(new TaskExecution());
            taskPipeline.use(new ApplyTaskContext());

            const tasksPipeline = new SequentialTasksPipeline();
            tasksPipeline.use(new SequentialTaskExecution());

            const jobsPipeline = new SequentialJobsPipeline();
            jobsPipeline.use(new JobsExcution());

            const jobPipeline = new JobPipeline();
            jobPipeline.use(new RunJob());
            jobPipeline.use(new ApplyJobContext());

            const deploymentPipeline = new DeploymentPipeline();
            deploymentPipeline.use(new RunDeployment());
            deploymentPipeline.use(new ApplyDeploymentContext());

            container.set("TasksPipeline", tasksPipeline);
            container.set("SequentialTasksPipeline", tasksPipeline);
            container.set("TaskPipeline", taskPipeline);
            container.set("JobsPipeline", jobsPipeline);
            container.set("SequentialJobsPipeline", jobsPipeline);
            container.set("JobPipeline", jobPipeline);
            container.set("DeploymentPipeline", deploymentPipeline);

            for (const [key, value] of Object.entries(env.toObject())) {
                if (value !== undefined) {
                    ctx.env.set(key, value);
                }
            }

            const discoveryContext = new DiscoveryPipelineContext(ctx);
            discoveryContext.file = file;
            discoveryContext.cwd = cwd;

            writer.trace("Running discovery pipeline");
            const res = await discoveryPipeline.run(discoveryContext);
            writer.trace(`Rexfile ${res.file} discovered`);
            if (res.error) {
                writer.error(res.error);
                exit(1);
            }

            if (res.tasks.size === 0 && res.jobs.size === 0 && res.deployments.size === 0) {
                writer.error("No tasks, jobs, or deployments found.");
                exit(1);
            }

            if (!command || command === "run") {
                if (targets.length > 0) {
                    if (res.tasks.has(targets[0])) {
                        command = "task";
                    }

                    if (res.jobs.has(targets[0])) {
                        if (command !== "run") {
                            writer.error(
                                "Tasks, jobs, and/or deployments have a target named `${targets[0]}`.  Please specify use the task, job, or deploy subcomands.",
                            );
                            exit(1);
                        } else {
                            command = "job";
                        }
                    }

                    if (res.deployments.has(targets[0])) {
                        if (command !== "run") {
                            writer.error(
                                "Tasks, jobs, and/or deployments have a target named `${targets[0]}`.  Please specify use the task, job, or deploy subcomands.",
                            );
                            exit(1);
                        } else {
                            command = "deploy";
                        }
                    }
                }
            }

            switch (command) {
                case "task":
                case "run":
                    {
                        const tasksCtx = new TasksPipelineContext(ctx, targets, res.tasks);
                        const results = await tasksPipeline.run(
                            tasksCtx as unknown as TasksPipelineContext,
                        );
                        if (results.error) {
                            writer.error(results.error);
                            exit(1);
                        }

                        if (results.status === PipelineStatuses.Failed) {
                            writer.error("Pipeline failed");
                            exit(1);
                        }
                        exit(0);
                    }

                    break;
                case "job":
                    {
                        const jobsCtx = new JobsPipelineContext(ctx, targets, res.jobs);
                        const results = await jobsPipeline.run(jobsCtx);
                        if (results.error) {
                            writer.error(results.error);
                            exit(1);
                        }

                        if (results.status === PipelineStatuses.Failed) {
                            writer.error("Pipeline failed");
                            exit(1);
                        }
                        exit(0);
                    }
                    break;
                case "list":
                    if (res.tasks.size) {
                        writer.writeLine("TASKS:");
                    }

                    for (const [key, _] of res.tasks.entries()) {
                        writer.writeLine(`  ${key}  ${_.description ?? ""}`);
                    }

                    if (res.jobs.size) {
                        writer.writeLine("");
                        writer.writeLine("JOBS:");
                    }

                    for (const [key, _] of res.jobs.entries()) {
                        writer.writeLine(`  ${key}  ${_.description ?? ""}`);
                    }

                    if (res.deployments.size) {
                        writer.writeLine("");
                        writer.writeLine("DEPLOYMENTS:");
                    }

                    for (const [key, _] of res.deployments.entries()) {
                        writer.writeLine(`  ${key}  ${_.description ?? ""}`);
                    }
                    break;
                case "rollback":
                case "destroy":
                case "deploy":
                    {
                        if (targets.length > 1) {
                            writer.error("Deploy command does not support multiple targets yet.");
                            exit(1);
                        }

                        const deployment = res.deployments.get(targets[0]);
                        if (!deployment) {
                            writer.error(`Deployment ${targets[0]} not found`);
                            exit(1);
                            return;
                        }

                        if (deployment.needs && deployment.needs.length > 0) {
                            writer.warn(`Deployment needs are are not supported yet`);
                        }

                        const deploymentsCtx = new DeploymentPipelineContext(ctx, deployment, {
                            id: deployment.id,
                            name: deployment.name ?? deployment.id,
                            action: command,
                            inputs: new Inputs(),
                            outputs: new Outputs(),
                            cwd: cwd ?? "",
                            env: new StringMap(),
                            description: deployment.description ?? "",
                            eventHandlers: {},
                            secrets: new StringMap(),
                            timeout: 0,
                            eventTasks: {},
                            force: false,
                            if: true,
                            needs: [],
                            uses: "",
                        });

                        const results = await deploymentPipeline.run(deploymentsCtx);
                        if (results.error) {
                            writer.error(results.error);
                            exit(1);
                        }

                        if (results.status === PipelineStatuses.Failed) {
                            writer.error("Pipeline failed");
                            exit(1);
                        }
                        exit(0);
                    }
                    break;

                default:
                    writer.error(`Unknown command: ${command}`);
                    exit(1);
            }
        } catch (error) {
            const e = error as Error;
            writer.error(e);
            exit(1);
        } finally {
            if (handle !== -1) {
                clearTimeout(handle);
            }
        }
    }
}
