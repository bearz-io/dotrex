import type { LoggingMessageBus } from "../bus/types.js";
import { type Task, TaskContext, type TaskMap, type TaskModel, TaskResult } from "@dotrex/core/tasks";
import { type PipelineStatus } from "@dotrex/core/enums";
import { type Next, Pipeline } from "@dotrex/core/pipelines";
import { Context } from "@dotrex/core/context";
export declare class TaskPipelineContext extends TaskContext {
    constructor(ctx: Context, task: Task, model?: TaskModel);
    result: TaskResult;
    task: Task;
    bus: LoggingMessageBus;
    status: PipelineStatus;
}
export declare abstract class TaskPipelineMiddleware {
    abstract run(ctx: TaskPipelineContext, next: Next): Promise<void>;
}
export declare class TaskPipeline extends Pipeline<TaskResult, TaskPipelineContext> {
    constructor();
    use(middleware: TaskPipelineMiddleware | ((ctx: TaskPipelineContext, next: Next) => void | Promise<void>)): this;
    run(ctx: TaskPipelineContext): Promise<TaskResult>;
}
export declare class TasksPipelineContext extends Context {
    constructor(ctx: Context, targets: string[], tasks?: TaskMap);
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
export declare abstract class TasksPipelineMiddleware {
    abstract run(ctx: TasksPipelineContext, next: Next): Promise<void>;
}
export declare class SequentialTasksPipeline extends Pipeline<TasksSummary, TasksPipelineContext> {
    constructor();
    use(middleware: TasksPipelineMiddleware | ((ctx: TasksPipelineContext, next: Next) => void | Promise<void>)): this;
    run(ctx: TasksPipelineContext): Promise<TasksSummary>;
}
