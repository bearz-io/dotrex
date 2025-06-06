import { JobMap, jobs } from "@dotrex/core/jobs";
import { TaskMap, tasks } from "@dotrex/core/tasks";
import { DeploymentMap, deployments } from "@dotrex/core";
import { LogLevel } from "../bus/types.js";
import { DiscoveryPipelineMiddleware } from "./pipelines.js";
import { exists, realPath } from "@bearz/fs";
import { isAbsolute, join } from "@bearz/path";
export class RexfileDiscovery extends DiscoveryPipelineMiddleware {
    async run(context, next) {
        const ctx = context;
        try {
            const { writer } = ctx;
            writer.trace("Discovering tasks");
            const globalTasks = tasks();
            const globalJobs = jobs();
            const globalDeployments = deployments();
            let file = ctx.file;
            if (file && !file.endsWith(".ts")) {
                ctx.bus.warn(`Tasks file ${ctx.file} must be a typescript file.`);
                return;
            }
            let cwd = ctx.cwd;
            if (cwd.startsWith("http")) {
                const url = new URL(cwd);
                cwd = url.pathname;
                writer.debug(`CWD: ${cwd}`);
            }
            if (file === undefined || file === null || file === "") {
                file = join(cwd, ".rex.ts");
                if (writer.enabled(LogLevel.Trace)) {
                    writer.trace(`No tasks file specified.  Using ${file}`);
                }
            }
            if (!isAbsolute(file)) {
                if (writer.enabled(LogLevel.Trace)) {
                    writer.trace(`Resolving relative path ${file}`);
                }
                file = await realPath(file);
            }
            if (!await exists(file)) {
                file = join(cwd, ".rex", "main.ts");
            }
            if (!await exists(file)) {
                ctx.bus.warn(`No tasks file found at ${file}`);
                return;
            }
            if (!file.startsWith("http")) {
                file = `file://${file}`;
            }
            ctx.file = file;
            const mod = await import(file);
            if (!mod.tasks) {
                if (globalTasks.size === 0) {
                    ctx.bus.debug(
                        `No tasks found in ${file}.  Task file must export a variable called tasks is type TaskMap.`,
                    );
                } else {
                    for (const [key, value] of globalTasks.entries()) {
                        ctx.tasks.set(key, value);
                    }
                }
            } else {
                if (!(mod.tasks instanceof TaskMap)) {
                    ctx.bus.error(
                        new Error(`Tasks in ${file} must be of type TaskMap`),
                        "Error collecting tasks",
                    );
                    return;
                }
                for (const [key, value] of mod.tasks.entries()) {
                    ctx.tasks.set(key, value);
                }
            }
            if (!mod.deployments) {
                if (globalDeployments.size === 0) {
                    ctx.bus.debug(
                        `No deployments found in ${file}.  Rexfile file must export a variable called deployments is type DeploymentMap.`,
                    );
                } else {
                    for (const [key, value] of globalDeployments.entries()) {
                        ctx.deployments.set(key, value);
                    }
                }
            } else {
                if (!(mod.deployments instanceof DeploymentMap)) {
                    ctx.bus.error(
                        new Error(`Deployments in ${file} must be of type DeploymentMap`),
                        "Error collecting tasks",
                    );
                    return;
                }
                for (const [key, value] of mod.deployments.entries()) {
                    ctx.deployments.set(key, value);
                }
            }
            if (!mod.jobs) {
                if (globalJobs.size === 0) {
                    ctx.bus.debug(
                        `No jobs found in ${file}.  Rexfile file must export a variable called jobs is type JobMap.`,
                    );
                } else {
                    for (const [key, value] of globalJobs.entries()) {
                        ctx.jobs.set(key, value);
                    }
                }
            } else {
                if (!(mod.jobs instanceof JobMap)) {
                    ctx.bus.error(
                        new Error(`Jobs in ${file} must be of type JobMap`),
                        "Error collecting tasks",
                    );
                    return;
                }
                for (const [key, value] of mod.jobs.entries()) {
                    ctx.jobs.set(key, value);
                }
            }
            if (mod.setup && typeof mod.setup === "function") {
                ctx.setup = mod.setup;
            }
            if (mod.teardown && typeof mod.teardown === "function") {
                ctx.teardown = mod.teardown;
            }
            await next();
        } catch (e) {
            if (!(e instanceof Error)) {
                // deno-lint-ignore no-ex-assign
                e = new Error(String(e));
            }
            ctx.error = e;
        }
    }
}
