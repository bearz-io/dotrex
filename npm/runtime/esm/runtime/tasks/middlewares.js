import {
    CyclicalTaskReferences,
    MissingTaskDependencies,
    TaskCancelled,
    TaskCompleted,
    TaskFailed,
    TaskSkipped,
    TaskStarted,
} from "./messages.js";
import {
    TaskPipelineContext,
    TaskPipelineMiddleware,
    TasksPipelineMiddleware,
} from "./pipelines.js";
import { underscore } from "@bearz/strings/underscore";
import { TaskResult } from "@dotrex/core/tasks";
import { Inputs, Outputs, StringMap } from "@dotrex/core/collections";
import { setCiVariable } from "@bearz/ci-env/vars";
import { PipelineStatuses } from "../../core/enums.js";
import { toError } from "../_utils.js";
export class ApplyTaskContext extends TaskPipelineMiddleware {
    async run(ctx, next) {
        const meta = ctx.model;
        const task = ctx.task;
        try {
            meta.env ??= new StringMap();
            meta.env.merge(ctx.env);
            if (typeof task.cwd === "string") {
                meta.cwd = task.cwd;
            } else if (typeof task.cwd === "function") {
                meta.cwd = await task.cwd(ctx);
            }
            if (typeof task.timeout === "number") {
                meta.timeout = task.timeout;
            } else if (typeof task.timeout === "function") {
                meta.timeout = await task.timeout(ctx);
            }
            if (typeof task.force === "boolean") {
                meta.force = task.force;
            } else if (typeof task.force === "function") {
                meta.force = await task.force(ctx);
            }
            if (typeof task.if === "boolean") {
                meta.if = task.if;
            } else if (typeof task.if === "function") {
                meta.if = await task.if(ctx);
            }
            if (typeof task.env === "function") {
                const e = await task.env(ctx);
                meta.env.merge(e);
            } else if (typeof task.env === "object") {
                const e = task.env;
                meta.env.merge(e);
            }
            if (typeof task.with === "function") {
                meta.inputs = await task.with(ctx);
            } else if (typeof task.with !== "undefined") {
                meta.inputs = task.with;
            }
            await next();
        } catch (e) {
            ctx.result.stop();
            if (!(e instanceof Error)) {
                const e2 = new Error(`Unknown error: ${e}`);
                ctx.result.fail(e2);
                ctx.bus.send(new TaskFailed(meta, e2));
                return;
            }
            ctx.result.fail(e);
            ctx.bus.send(new TaskFailed(meta, e));
            return;
        }
    }
}
export class TaskExecution extends TaskPipelineMiddleware {
    async run(ctx, next) {
        const { model } = ctx;
        if (ctx.signal.aborted) {
            ctx.result.cancel();
            ctx.result.stop();
            ctx.bus.send(new TaskCancelled(model));
            return;
        }
        if (
            ctx.status === PipelineStatuses.Failed ||
            ctx.status === PipelineStatuses.Cancelled && !model.force
        ) {
            ctx.result.skip();
            ctx.result.stop();
            ctx.bus.send(new TaskSkipped(model));
            return;
        }
        if (model.if === false) {
            ctx.result.skip();
            ctx.result.stop();
            ctx.bus.send(new TaskSkipped(model));
            return;
        }
        let timeout = model.timeout;
        if (timeout === 0) {
            timeout = ctx.services.get("timeout") ?? (60 * 1000) * 3;
        } else {
            timeout = timeout * 1000;
        }
        const controller = new AbortController();
        const onAbort = () => {
            controller.abort();
        };
        ctx.signal.addEventListener("abort", onAbort, { once: true });
        const signal = controller.signal;
        const listener = () => {
            ctx.result.cancel();
            ctx.result.stop();
            ctx.bus.send(new TaskCancelled(model));
        };
        signal.addEventListener("abort", listener, { once: true });
        const handle = setTimeout(() => {
            controller.abort();
        }, timeout);
        try {
            ctx.result.start();
            if (ctx.signal.aborted) {
                ctx.result.cancel();
                ctx.result.stop();
                ctx.bus.send(new TaskCancelled(model));
                return;
            }
            ctx.bus.send(new TaskStarted(model));
            try {
                const result = await ctx.task.run(ctx);
                ctx.result.stop();
                let outputs = new Outputs();
                if (result instanceof Outputs) {
                    outputs = result;
                }
                if (ctx.signal.aborted) {
                    ctx.result.cancel();
                    ctx.result.stop();
                    ctx.bus.send(new TaskCancelled(model));
                    return;
                }
                ctx.result.success();
                ctx.result.outputs = outputs;
                ctx.bus.send(new TaskCompleted(model, ctx.result));
            } catch (e) {
                const err = toError(e);
                ctx.result.stop();
                ctx.result.fail(err);
                ctx.bus.send(new TaskFailed(model, err));
                return;
            }
        } finally {
            clearTimeout(handle);
            signal.removeEventListener("abort", listener);
            ctx.signal.removeEventListener("abort", onAbort);
        }
        await next();
    }
}
export class SequentialTaskExecution extends TasksPipelineMiddleware {
    async run(ctx, next) {
        const { tasks } = ctx;
        const targets = ctx.targets;
        ctx.writer.debug(`task targets: ${targets.join(", ")}`);
        const cyclesRes = tasks.findCyclycalReferences();
        if (cyclesRes.length > 0) {
            ctx.bus.send(new CyclicalTaskReferences(cyclesRes));
            ctx.status = PipelineStatuses.Failed;
            ctx.error = new Error(
                `Cyclical task references found: ${cyclesRes.map((o) => o.id).join(", ")}`,
            );
        }
        const missingDeps = tasks.missingDependencies();
        if (missingDeps.length > 0) {
            ctx.bus.send(new MissingTaskDependencies(missingDeps));
            ctx.status = PipelineStatuses.Failed;
            ctx.error = new Error("Tasks are missing dependencies");
        }
        const targetTasks = [];
        for (const target of targets) {
            const task = tasks.get(target);
            if (task) {
                targetTasks.push(task);
            } else {
                ctx.status = PipelineStatuses.Failed;
                ctx.error = new Error(`Task not found: ${target}`);
                return;
            }
        }
        const flattenedResult = tasks.flatten(targetTasks);
        if (flattenedResult.isError) {
            ctx.status = PipelineStatuses.Failed;
            ctx.error = flattenedResult.unwrapError();
            return;
        }
        const taskSet = flattenedResult.unwrap();
        for (const task of taskSet) {
            const result = new TaskResult(task.id);
            if (
                ctx.status === PipelineStatuses.Failed || ctx.status === PipelineStatuses.Cancelled
            ) {
                if (task.force === undefined || task.force === false) {
                    result.skip();
                    ctx.results.push(result);
                    continue;
                }
            }
            const envData = new StringMap();
            envData.merge(ctx.env);
            const outputs = new Outputs();
            outputs.merge(ctx.outputs);
            const nextContext = new TaskPipelineContext(ctx, task, {
                id: task.id,
                name: task.name === undefined || task.name.length === 0 ? task.id : task.name,
                env: envData,
                outputs,
                cwd: ctx.cwd,
                description: task.description ?? "",
                force: false,
                if: true,
                timeout: 0,
                inputs: new Inputs(),
                needs: [],
                uses: "",
            });
            const taskPipeline = ctx.services.get("TaskPipeline");
            if (!taskPipeline) {
                ctx.error = new Error(`Service not found: task-pipeline`);
                ctx.bus.error(ctx.error);
                ctx.status = PipelineStatuses.Failed;
                return;
            }
            const r = await taskPipeline.run(nextContext);
            const normalized = underscore(task.id.replace(/:/g, "_"));
            ctx.outputs.set(`task.${normalized}`, r.outputs);
            ctx.outputs.set(normalized, r.outputs);
            for (const [key, value] of nextContext.secrets) {
                if (ctx.secrets.has(key)) {
                    const old = ctx.secrets.get(key);
                    if (old !== value) {
                        ctx.writer.debug(`Secret ${key} has changed in task ${task.id}`);
                        ctx.secrets.set(key, value);
                        ctx.writer.secretMasker.add(value);
                        const envName = underscore(key, { screaming: true });
                        ctx.env.set(envName, value);
                        setCiVariable(envName, value, { secret: true });
                    }
                } else {
                    ctx.writer.debug(`Secret ${key} was added in task ${task.id}`);
                    ctx.secrets.set(key, value);
                    ctx.writer.secretMasker.add(value);
                    const envName = underscore(key, { screaming: true });
                    ctx.env.set(envName, value);
                    setCiVariable(envName, value, { secret: true });
                }
            }
            for (const [key, value] of nextContext.env) {
                if (ctx.env.has(key)) {
                    const old = ctx.env.get(key);
                    if (old !== value) {
                        ctx.writer.debug(`Env ${key} has changed in task ${task.id}`);
                        ctx.env.set(key, value);
                        setCiVariable(key, value);
                    }
                } else {
                    ctx.writer.debug(`Env ${key} has changed in task ${task.id}`);
                    ctx.env.set(key, value);
                    setCiVariable(key, value);
                }
            }
            ctx.results.push(r);
            if (ctx.status !== PipelineStatuses.Failed) {
                if (r.status === PipelineStatuses.Failed) {
                    ctx.status = PipelineStatuses.Failed;
                    ctx.error = r.error;
                    break;
                }
                if (r.status === PipelineStatuses.Cancelled) {
                    ctx.status = PipelineStatuses.Cancelled;
                    break;
                }
            }
        }
        await next();
    }
}
