import type { LoggingMessageBus } from "../bus/types.ts";
import {
    type Task,
    TaskContext,
    type TaskMap,
    type TaskModel,
    TaskResult,
    tasks as globalTasks,
} from "@dotrex/core/tasks";
import { type PipelineStatus, PipelineStatuses } from "@dotrex/core/enums";
import { type Next, Pipeline } from "@dotrex/core/pipelines";
import { toError } from "../_utils.ts";
import { Context } from "@dotrex/core/context";

export class TaskPipelineContext extends TaskContext {
    constructor(ctx: Context, task: Task, model?: TaskModel) {
        super(ctx, model ?? ({ id: task.id } as TaskModel));
        this.task = task;
        this.bus = ctx.services.require<LoggingMessageBus>("Bus").unwrap();
        this.result = new TaskResult(this.task.id);
        this.status = PipelineStatuses.Running;
    }

    result: TaskResult;
    task: Task;
    bus: LoggingMessageBus;
    status: PipelineStatus;
}

export abstract class TaskPipelineMiddleware {
    abstract run(ctx: TaskPipelineContext, next: Next): Promise<void>;
}

export class TaskPipeline extends Pipeline<TaskResult, TaskPipelineContext> {
    constructor() {
        super();
    }

    override use(
        middleware:
            | TaskPipelineMiddleware
            | ((ctx: TaskPipelineContext, next: Next) => void | Promise<void>),
    ): this {
        if (middleware instanceof TaskPipelineMiddleware) {
            return super.use(middleware.run.bind(middleware));
        }

        return super.use(middleware);
    }

    override async run(ctx: TaskPipelineContext): Promise<TaskResult> {
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
    constructor(ctx: Context, targets: string[], tasks?: TaskMap) {
        super(ctx);
        this.bus = ctx.services.require<LoggingMessageBus>("Bus").unwrap();
        this.tasks = tasks ?? ctx.services.get<TaskMap>("Tasks") ?? globalTasks();
        this.results = [];
        this.status = PipelineStatuses.Running;
        this.targets = targets;
    }

    tasks: TaskMap;
    results: TaskResult[];
    status: PipelineStatus;
    error?: Error;
    bus: LoggingMessageBus;
    targets: string[];
}

export interface TasksSummary extends Record<string, unknown> {
    results: TaskResult[];
    error?: Error;
    status: PipelineStatus;
}

export abstract class TasksPipelineMiddleware {
    abstract run(ctx: TasksPipelineContext, next: Next): Promise<void>;
}

export class SequentialTasksPipeline extends Pipeline<TasksSummary, TasksPipelineContext> {
    constructor() {
        super();
    }

    override use(
        middleware:
            | TasksPipelineMiddleware
            | ((ctx: TasksPipelineContext, next: Next) => void | Promise<void>),
    ): this {
        if (middleware instanceof TasksPipelineMiddleware) {
            return super.use(middleware.run.bind(middleware));
        }

        return super.use(middleware);
    }

    override async run(ctx: TasksPipelineContext): Promise<TasksSummary> {
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
