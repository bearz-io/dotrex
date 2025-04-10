import { Context } from "@dotrex/core/context";
import type { LoggingMessageBus } from "../bus/mod.js";
import { type PipelineStatus } from "@dotrex/core/enums";
import { type Job, JobContext, type JobMap, type JobModel, JobResult } from "@dotrex/core/jobs";
import { type Next, Pipeline } from "@dotrex/core/pipelines";
export declare class JobPipelineContext extends JobContext {
    constructor(ctx: Context, job: Job, model: JobModel);
    job: Job;
    result: JobResult;
    bus: LoggingMessageBus;
    status: PipelineStatus;
}
export declare abstract class JobPipelineMiddleware {
    abstract run(ctx: JobPipelineContext, next: Next): Promise<void>;
}
export declare class JobPipeline extends Pipeline<JobResult, JobPipelineContext> {
    constructor();
    use(middleware: JobPipelineMiddleware | ((ctx: JobPipelineContext, next: Next) => void | Promise<void>)): this;
    run(ctx: JobPipelineContext): Promise<JobResult>;
}
export declare class JobsPipelineContext extends Context {
    constructor(ctx: Context, targets: string[], jobs?: JobMap);
    jobs: JobMap;
    targets: string[];
    results: JobResult[];
    bus: LoggingMessageBus;
    status: PipelineStatus;
    error?: Error;
}
export interface JobsSummary extends Record<string, unknown> {
    results: JobResult[];
    error?: Error;
    status: PipelineStatus;
}
export declare abstract class JobsPipelineMiddleware {
    abstract run(ctx: JobsPipelineContext, next: Next): Promise<void>;
}
export declare class SequentialJobsPipeline extends Pipeline<JobsSummary, JobsPipelineContext> {
    constructor();
    use(middleware: JobsPipelineMiddleware | ((ctx: JobsPipelineContext, next: Next) => void | Promise<void>)): this;
    run(ctx: JobsPipelineContext): Promise<JobsSummary>;
}
