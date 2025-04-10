import { toError } from "../_utils.js";
import { Context } from "@dotrex/core/context";
import { PipelineStatuses } from "@dotrex/core/enums";
import { JobContext, JobResult, jobs as globalJobs } from "@dotrex/core/jobs";
import { Pipeline } from "@dotrex/core/pipelines";
export class JobPipelineContext extends JobContext {
    constructor(ctx, job, model) {
        super(ctx, model);
        this.bus = ctx.services.require("Bus").unwrap();
        this.result = new JobResult(job.id);
        this.status = PipelineStatuses.Running;
        this.job = job;
    }
    job;
    result;
    bus;
    status;
}
export class JobPipelineMiddleware {
}
export class JobPipeline extends Pipeline {
    constructor() {
        super();
    }
    use(middleware) {
        if (middleware instanceof JobPipelineMiddleware) {
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
export class JobsPipelineContext extends Context {
    constructor(ctx, targets, jobs) {
        super(ctx);
        this.targets = targets;
        this.bus = ctx.services.require("Bus").unwrap();
        this.results = [];
        this.status = PipelineStatuses.Running;
        this.jobs = jobs ?? ctx.services.get("Jobs") ?? globalJobs();
    }
    jobs;
    targets;
    results;
    bus;
    status;
    error;
}
export class JobsPipelineMiddleware {
}
export class SequentialJobsPipeline extends Pipeline {
    constructor() {
        super();
    }
    use(middleware) {
        if (middleware instanceof JobsPipelineMiddleware) {
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
