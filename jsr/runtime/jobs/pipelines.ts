import { toError } from "../_utils.ts";
import { Context } from "@dotrex/core/context";
import type { LoggingMessageBus } from "../bus/mod.ts";
import { type PipelineStatus, PipelineStatuses } from "@dotrex/core/enums";
import {
    type Job,
    JobContext,
    type JobMap,
    type JobModel,
    JobResult,
    jobs as globalJobs,
} from "@dotrex/core/jobs";
import { type Next, Pipeline } from "@dotrex/core/pipelines";

export class JobPipelineContext extends JobContext {
    constructor(ctx: Context, job: Job, model: JobModel) {
        super(ctx, model);
        this.bus = ctx.services.require<LoggingMessageBus>("Bus").unwrap();
        this.result = new JobResult(job.id);
        this.status = PipelineStatuses.Running;
        this.job = job;
    }

    job: Job;
    result: JobResult;
    bus: LoggingMessageBus;
    status: PipelineStatus;
}

export abstract class JobPipelineMiddleware {
    abstract run(ctx: JobPipelineContext, next: Next): Promise<void>;
}

export class JobPipeline extends Pipeline<JobResult, JobPipelineContext> {
    constructor() {
        super();
    }

    override use(
        middleware:
            | JobPipelineMiddleware
            | ((ctx: JobPipelineContext, next: Next) => void | Promise<void>),
    ): this {
        if (middleware instanceof JobPipelineMiddleware) {
            return super.use(middleware.run.bind(middleware));
        }

        return super.use(middleware);
    }

    override async run(ctx: JobPipelineContext): Promise<JobResult> {
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

export class JobsPipelineContext extends Context {
    constructor(ctx: Context, targets: string[], jobs?: JobMap) {
        super(ctx);
        this.targets = targets;
        this.bus = ctx.services.require<LoggingMessageBus>("Bus").unwrap();
        this.results = [];
        this.status = PipelineStatuses.Running;
        this.jobs = jobs ?? ctx.services.get<JobMap>("Jobs") ?? globalJobs();
    }

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

export abstract class JobsPipelineMiddleware {
    abstract run(ctx: JobsPipelineContext, next: Next): Promise<void>;
}

export class SequentialJobsPipeline extends Pipeline<JobsSummary, JobsPipelineContext> {
    constructor() {
        super();
    }

    override use(
        middleware:
            | JobsPipelineMiddleware
            | ((ctx: JobsPipelineContext, next: Next) => void | Promise<void>),
    ): this {
        if (middleware instanceof JobsPipelineMiddleware) {
            return super.use(middleware.run.bind(middleware));
        }

        return super.use(middleware);
    }

    override async run(ctx: JobsPipelineContext): Promise<JobsSummary> {
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
