import { Pipeline } from "@dotrex/core/pipelines";
import { Context } from "@dotrex/core/context";
import { tasks } from "@dotrex/core/tasks";
import { jobs } from "@dotrex/core/jobs";
import { deployments } from "@dotrex/core/deployments";
export class DiscoveryPipelineContext extends Context {
    constructor(ctx) {
        super(ctx);
        this.bus = ctx.services.require("Bus").unwrap();
        this.tasks = ctx.services.get("Tasks") ?? tasks();
        this.jobs = ctx.services.get("Jobs") ?? jobs();
        this.deployments = ctx.services.get("Deployments") ?? deployments();
    }
    tasks;
    jobs;
    deployments;
    file;
    setup;
    teardown;
    bus;
    error;
}
export class DiscoveryPipelineMiddleware {
}
export class DiscoveryPipeline extends Pipeline {
    constructor() {
        super();
    }
    use(middleware) {
        if (middleware instanceof DiscoveryPipelineMiddleware) {
            return super.use(middleware.run.bind(middleware));
        }
        return super.use(middleware);
    }
    async run(context) {
        try {
            const ctx = await this.pipe(context);
            return {
                tasks: ctx.tasks,
                jobs: ctx.jobs,
                deployments: ctx.deployments,
                file: ctx.file ?? "",
                error: ctx.error,
            };
        }
        catch (error) {
            let e;
            if (error instanceof Error) {
                e = error;
            }
            else {
                e = new Error(String(error));
            }
            return {
                tasks: context.tasks,
                jobs: context.jobs,
                deployments: context.deployments,
                error: e,
                file: context.file ?? "",
            };
        }
    }
}
