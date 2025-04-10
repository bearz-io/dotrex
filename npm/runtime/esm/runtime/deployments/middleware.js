import { Outputs } from "@dotrex/core/collections";
import { TasksPipelineContext } from "../tasks/pipelines.js";
import {
  DeploymentCancelled,
  DeploymentCompleted,
  DeploymentFailed,
  DeploymentSkipped,
  DeploymentStarted,
} from "./messages.js";
import { DeploymentPipelineMiddleware } from "./pipelines.js";
import { underscore } from "@bearz/strings/underscore";
import { setCiVariable } from "@bearz/ci-env/vars";
import { PipelineStatuses } from "../../core/enums.js";
import { toError } from "../_utils.js";
export class ApplyDeploymentContext extends DeploymentPipelineMiddleware {
  async run(ctx, next) {
    const meta = ctx.model;
    const task = ctx.deployment;
    const directive = ctx.action;
    try {
      meta.env.merge(ctx.env);
      meta.eventTasks = task.events;
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
        ctx.bus.send(new DeploymentFailed(meta, e2, directive));
        return;
      }
      ctx.result.fail(e);
      ctx.bus.send(new DeploymentFailed(meta, e, directive));
      return;
    }
  }
}
export class RunDeployment extends DeploymentPipelineMiddleware {
  async run(ctx, next) {
    const { model } = ctx;
    const directive = ctx.action;
    console.log(ctx.deployment);
    if (!ctx.deployment || !ctx.model) {
      ctx.result.error = new Error("No deployment found");
      ctx.result.stop();
      ctx.bus.send(
        new DeploymentFailed(
          model,
          new Error("No deployment found"),
          directive,
        ),
      );
      return;
    }
    if (ctx.signal.aborted) {
      ctx.result.cancel();
      ctx.result.stop();
      ctx.bus.send(new DeploymentCancelled(model, directive));
      return;
    }
    if (
      ctx.status === PipelineStatuses.Failed ||
      ctx.status === PipelineStatuses.Cancelled && !model.force
    ) {
      ctx.result.skip();
      ctx.result.stop();
      ctx.bus.send(new DeploymentSkipped(model, directive));
      return;
    }
    if (model.if === false) {
      ctx.result.skip();
      ctx.result.stop();
      ctx.bus.send(new DeploymentSkipped(model, directive));
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
      ctx.bus.send(new DeploymentCancelled(model, directive));
    };
    signal.addEventListener("abort", listener, { once: true });
    const handle = setTimeout(() => {
      controller.abort();
    }, timeout);
    model.eventTasks ??= {};
    for (const key of Object.keys(model.eventTasks)) {
      const tasks = model.eventTasks[key];
      if (!tasks || tasks.size === 0) {
        continue;
      }
      model.eventHandlers[key] = async (c) => {
        const map = tasks;
        const targets = map.values().map((t) => t.id).toArray();
        const tasksCtx = new TasksPipelineContext(ctx, targets, map);
        const pipeline = ctx.services.get("SequentialTasksPipeline");
        if (!pipeline) {
          throw new Error(`Service 'SequentialTasksPipeline' not found.`);
        }
        const results = await pipeline.run(tasksCtx);
        for (const [key, value] of tasksCtx.secrets) {
          if (ctx.secrets.has(key)) {
            const old = ctx.secrets.get(key);
            if (old !== value) {
              ctx.writer.debug(
                `Secret ${key} has changed in deployment ${c.model.id}`,
              );
              ctx.secrets.set(key, value);
              ctx.writer.secretMasker.add(value);
              const envName = underscore(key, { screaming: true });
              ctx.env.set(envName, value);
              setCiVariable(envName, value, { secret: true });
            }
          } else {
            ctx.writer.debug(
              `Secret ${key} was added in deployment ${c.model.id}`,
            );
            ctx.secrets.set(key, value);
            ctx.writer.secretMasker.add(value);
            const envName = underscore(key, { screaming: true });
            ctx.env.set(envName, value);
            setCiVariable(envName, value, { secret: true });
          }
        }
        for (const [key, value] of tasksCtx.env) {
          if (ctx.env.has(key)) {
            const old = ctx.env.get(key);
            if (old !== value) {
              ctx.writer.debug(
                `Env ${key} has changed in deployment ${c.model.id}`,
              );
              ctx.env.set(key, value);
              setCiVariable(key, value);
            }
          } else {
            ctx.writer.debug(
              `Env ${key} has changed in deployment ${c.model.id}`,
            );
            ctx.env.set(key, value);
            setCiVariable(key, value);
          }
        }
        return {
          status: results.status,
          results: results.results,
          error: results.error,
        };
      };
    }
    ctx.model = model;
    try {
      ctx.result.start();
      if (ctx.signal.aborted) {
        ctx.result.cancel();
        ctx.result.stop();
        ctx.bus.send(new DeploymentCancelled(model, directive));
        return;
      }
      ctx.bus.send(new DeploymentStarted(model, directive));
      try {
        const result = await ctx.deployment.run(ctx);
        ctx.result.stop();
        if (ctx.signal.aborted) {
          ctx.result.cancel();
          ctx.result.stop();
          ctx.bus.send(new DeploymentCancelled(model, directive));
          return;
        }
        let outputs = new Outputs();
        if (result instanceof Outputs) {
          outputs = result;
        }
        ctx.result.success();
        ctx.result.outputs = outputs;
        ctx.bus.send(new DeploymentCompleted(model, ctx.result, directive));
      } catch (e) {
        ctx.result.stop();
        const err = toError(e);
        ctx.result.fail(err);
        ctx.bus.send(new DeploymentFailed(model, err, directive));
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
