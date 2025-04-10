import type { Next } from "@dotrex/core/pipelines";
import { TaskPipelineContext, TaskPipelineMiddleware, type TasksPipelineContext, TasksPipelineMiddleware } from "./pipelines.js";
export declare class ApplyTaskContext extends TaskPipelineMiddleware {
    run(ctx: TaskPipelineContext, next: Next): Promise<void>;
}
export declare class TaskExecution extends TaskPipelineMiddleware {
    run(ctx: TaskPipelineContext, next: Next): Promise<void>;
}
export declare class SequentialTaskExecution extends TasksPipelineMiddleware {
    run(ctx: TasksPipelineContext, next: Next): Promise<void>;
}
