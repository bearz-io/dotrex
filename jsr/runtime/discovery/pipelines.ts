import { type Next, Pipeline } from "@dotrex/core/pipelines";
import { Context } from "@dotrex/core/context";
import type { LoggingMessageBus } from "../bus/types.ts";
import { type TaskMap, tasks } from "@dotrex/core/tasks";
import { type JobMap, jobs } from "@dotrex/core/jobs";
import { type DeploymentMap, deployments } from "@dotrex/core/deployments";

export class DiscoveryPipelineContext extends Context {
    constructor(ctx: Context) {
        super(ctx);
        this.bus = ctx.services.require<LoggingMessageBus>("Bus").unwrap();
        this.tasks = ctx.services.get<TaskMap>("Tasks") ?? tasks();
        this.jobs = ctx.services.get<JobMap>("Jobs") ?? jobs();
        this.deployments = ctx.services.get<DeploymentMap>("Deployments") ?? deployments();
    }

    tasks: TaskMap;
    jobs: JobMap;
    deployments: DeploymentMap;
    file?: string;
    setup?: (ctx: Context) => Promise<void> | void;
    teardown?: (ctx: Context) => Promise<void> | void;
    bus: LoggingMessageBus;
    error?: Error;
}

export interface DicoveryPipelineResult {
    tasks: TaskMap;
    jobs: JobMap;
    deployments: DeploymentMap;
    error?: Error;
    file: string;
}

export abstract class DiscoveryPipelineMiddleware {
    abstract run(ctx: DiscoveryPipelineContext, next: Next): Promise<void>;
}

export class DiscoveryPipeline extends Pipeline<DicoveryPipelineResult, DiscoveryPipelineContext> {
    constructor() {
        super();
    }

    override use(
        middleware:
            | DiscoveryPipelineMiddleware
            | ((ctx: DiscoveryPipelineContext, next: Next) => void | Promise<void>),
    ): this {
        if (middleware instanceof DiscoveryPipelineMiddleware) {
            return super.use(middleware.run.bind(middleware));
        }

        return super.use(middleware);
    }

    override async run(context: DiscoveryPipelineContext): Promise<DicoveryPipelineResult> {
        try {
            const ctx = await this.pipe(context);
            return {
                tasks: ctx.tasks,
                jobs: ctx.jobs,
                deployments: ctx.deployments,
                file: ctx.file ?? "",
                error: ctx.error,
            };
        } catch (error) {
            let e: Error;
            if (error instanceof Error) {
                e = error;
            } else {
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
