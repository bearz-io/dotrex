import { TaskContext, TaskResult, tasks as globalTasks } from "@dotrex/core/tasks";
import { PipelineStatuses } from "@dotrex/core/enums";
import { Pipeline } from "@dotrex/core/pipelines";
import { toError } from "../_utils.js";
import { Context } from "@dotrex/core/context";
export class TaskPipelineContext extends TaskContext {
    constructor(ctx, task, model) {
        super(ctx, model ?? { id: task.id });
        this.task = task;
        this.bus = ctx.services.require("Bus").unwrap();
        this.result = new TaskResult(this.task.id);
        this.status = PipelineStatuses.Running;
    }
    result;
    task;
    bus;
    status;
}
export class TaskPipelineMiddleware {
}
export class TaskPipeline extends Pipeline {
    constructor() {
        super();
    }
    use(middleware) {
        if (middleware instanceof TaskPipelineMiddleware) {
            return super.use(middleware.run.bind(middleware));
        }
        return super.use(middleware);
    }
    async run(ctx) {
        try {
            await this.pipe(ctx);
            return ctx.result;
        } catch (error) {
            ctx.status = PipelineStatuses.Failed;
            const e = toError(error);
            ctx.result.fail(e);
            ctx.bus.error(e);
            return ctx.result;
        }
    }
}
export class TasksPipelineContext extends Context {
    constructor(ctx, targets, tasks) {
        super(ctx);
        this.bus = ctx.services.require("Bus").unwrap();
        this.tasks = tasks ?? ctx.services.get("Tasks") ?? globalTasks();
        this.results = [];
        this.status = PipelineStatuses.Running;
        this.targets = targets;
    }
    tasks;
    results;
    status;
    error;
    bus;
    targets;
}
export class TasksPipelineMiddleware {
}
export class SequentialTasksPipeline extends Pipeline {
    constructor() {
        super();
    }
    use(middleware) {
        if (middleware instanceof TasksPipelineMiddleware) {
            return super.use(middleware.run.bind(middleware));
        }
        return super.use(middleware);
    }
    async run(ctx) {
        try {
            await this.pipe(ctx);
            return {
                results: ctx.results,
                status: ctx.status,
                error: ctx.error,
            };
        } catch (error) {
            ctx.status = PipelineStatuses.Failed;
            const e = toError(error);
            ctx.error = e;
            return {
                results: ctx.results,
                status: ctx.status,
                error: e,
            };
        }
    }
}
