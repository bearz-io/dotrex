import { TasksPipelineContext } from "../tasks/pipelines.js";
import {
  CyclicalJobReferences,
  JobCancelled,
  JobCompleted,
  JobFailed,
  JobSkipped,
  JobStarted,
  MissingJobDependencies,
} from "./messages.js";
import {
  JobPipelineContext,
  JobPipelineMiddleware,
  JobsPipelineMiddleware,
} from "./pipelines.js";
import { TaskMap } from "@dotrex/core/tasks";
import { JobResult } from "@dotrex/core/jobs";
import { Inputs, Outputs, StringMap } from "@dotrex/core/collections";
import { underscore } from "@bearz/strings/underscore";
import { PipelineStatuses } from "../../core/enums.js";
export class ApplyJobContext extends JobPipelineMiddleware {
  async run(ctx, next) {
    const meta = ctx.model;
    const task = ctx.job;
    try {
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
        ctx.bus.send(new JobFailed(meta, e2));
        return;
      }
      ctx.result.fail(e);
      ctx.bus.send(new JobFailed(meta, e));
      return;
    }
  }
}
export class RunJob extends JobPipelineMiddleware {
  async run(ctx, next) {
    const { model } = ctx;
    if (ctx.signal.aborted) {
      ctx.result.cancel();
      ctx.result.stop();
      ctx.bus.send(new JobCancelled(model));
      return;
    }
    if (
      ctx.status === PipelineStatuses.Failed ||
      ctx.status === PipelineStatuses.Cancelled && !model.force
    ) {
      ctx.result.skip();
      ctx.result.stop();
      ctx.bus.send(new JobSkipped(model));
      return;
    }
    if (model.if === false) {
      ctx.result.skip();
      ctx.result.stop();
      ctx.bus.send(new JobSkipped(model));
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
      ctx.bus.send(new JobCancelled(model));
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
        ctx.bus.send(new JobCancelled(model));
        return;
      }
      ctx.bus.send(new JobStarted(model));
      const tasksPipeline = ctx.services.get("SequentialTasksPipeline");
      if (!tasksPipeline) {
        throw new Error(`Service 'tasks-pipeline' not found.`);
      }
      const tasks = new TaskMap();
      for (const [_, task] of ctx.job.tasks) {
        tasks.set(task.id, task);
      }
      const targets = ctx.job.tasks.values().map((t) => t.id).toArray();
      const tasksCtx = new TasksPipelineContext(ctx, targets, tasks);
      const summary = await tasksPipeline.run(tasksCtx);
      ctx.result.stop();
      if (summary.error) {
        ctx.result.fail(summary.error);
        ctx.bus.send(new JobFailed(model, summary.error));
        return;
      }
      const normalized = underscore(ctx.job.id.replace(/:/g, "_"));
      // only outputs are synced between jobs
      for (const [key, value] of tasksCtx.outputs) {
        if (key.startsWith("tasks.")) {
          ctx.outputs.set(`jobs.${normalized}.${key}`, value);
        }
      }
      ctx.result.success();
      ctx.bus.send(new JobCompleted(model, ctx.result));
    } finally {
      clearTimeout(handle);
      signal.removeEventListener("abort", listener);
      ctx.signal.removeEventListener("abort", onAbort);
    }
    await next();
  }
}
export class JobsExcution extends JobsPipelineMiddleware {
  async run(ctx, next) {
    const jobs = ctx.jobs;
    const targets = ctx.targets;
    const cyclesRes = jobs.findCyclycalReferences();
    if (cyclesRes.length > 0) {
      ctx.status = PipelineStatuses.Failed;
      ctx.error = new Error(
        `Cyclical job references found: ${
          cyclesRes.map((o) => o.id).join(", ")
        }`,
      );
      ctx.bus.send(new CyclicalJobReferences(cyclesRes));
      return;
    }
    const missingDeps = jobs.missingDependencies();
    if (missingDeps.length > 0) {
      ctx.bus.send(new MissingJobDependencies(missingDeps));
      ctx.status = PipelineStatuses.Failed;
      ctx.error = new Error("Jobs are missing dependencies");
      return;
    }
    const targetJobs = [];
    for (const target of targets) {
      const job = jobs.get(target);
      if (job) {
        targetJobs.push(job);
      } else {
        ctx.status = PipelineStatuses.Failed;
        ctx.error = new Error(`Task not found: ${target}`);
        return;
      }
    }
    const flattenedResult = jobs.flatten(targetJobs);
    if (flattenedResult.isError) {
      ctx.status = PipelineStatuses.Failed;
      ctx.error = flattenedResult.unwrapError();
      return;
    }
    const jobSet = flattenedResult.unwrap();
    const outputs = new Outputs().merge(ctx.outputs);
    for (const job of jobSet) {
      const result = new JobResult(job.id);
      const jobPipeline = ctx.services.get("JobPipeline");
      if (!jobPipeline) {
        ctx.error = new Error(`Service not found: job-pipeline`);
        ctx.bus.error(ctx.error);
        ctx.status = PipelineStatuses.Failed;
        return;
      }
      const nextContext = new JobPipelineContext(ctx, job, {
        id: job.id,
        env: new StringMap(),
        inputs: new Inputs(),
        outputs: new Outputs(),
        if: true,
        name: job.name ?? job.id,
        needs: [],
        status: PipelineStatuses.Pending,
        timeout: 0,
        tasks: new TaskMap(),
      });
      nextContext.result = result;
      const r = await jobPipeline.run(nextContext);
      // only outputs are synced between jobs
      for (const [key, value] of nextContext.outputs) {
        if (key.startsWith("jobs.")) {
          if (!ctx.outputs.has(key)) {
            outputs.set(key, value);
          }
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
