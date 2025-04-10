import { Context } from "@dotrex/core/context";
import type { LoggingMessageBus } from "../bus/mod.ts";
import { toError } from "../_utils.ts";
import { type PipelineStatus, PipelineStatuses } from "@dotrex/core/enums";
import {
    type Deployment,
    DeploymentContext,
    type DeploymentMap,
    type DeploymentModel,
    DeploymentResult,
    deployments as globalDeployments,
} from "@dotrex/core/deployments";
import { type Next, Pipeline } from "@dotrex/core/pipelines";

export class DeploymentPipelineContext extends DeploymentContext {
    constructor(ctx: Context, deployment: Deployment, model: DeploymentModel) {
        super(ctx, model);
        this.bus = ctx.services.require<LoggingMessageBus>("Bus").unwrap();
        this.result = new DeploymentResult(deployment.id);
        this.status = PipelineStatuses.Running;
        this.deployment = deployment;
    }

    deployment: Deployment;
    result: DeploymentResult;
    bus: LoggingMessageBus;
    status: PipelineStatus;
}

export interface DeploymentPipelineContext extends DeploymentContext {
    result: DeploymentResult;
    deployment: Deployment;
    bus: LoggingMessageBus;
    status: PipelineStatus;
}

export abstract class DeploymentPipelineMiddleware {
    abstract run(ctx: DeploymentPipelineContext, next: Next): Promise<void>;
}

export class DeploymentPipeline extends Pipeline<DeploymentResult, DeploymentPipelineContext> {
    constructor() {
        super();
    }

    override use(
        middleware:
            | DeploymentPipelineMiddleware
            | ((ctx: DeploymentPipelineContext, next: Next) => void | Promise<void>),
    ): this {
        if (middleware instanceof DeploymentPipelineMiddleware) {
            return super.use(middleware.run.bind(middleware));
        }

        return super.use(middleware);
    }

    override async run(ctx: DeploymentPipelineContext): Promise<DeploymentResult> {
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

export class DeploymentsPipelineContext extends Context {
    constructor(ctx: Context, targets: string[], deployments?: DeploymentMap) {
        super(ctx);
        this.targets = targets;
        this.bus = ctx.services.require<LoggingMessageBus>("Bus").unwrap();
        this.results = [];
        this.status = PipelineStatuses.Running;
        this.deployments = deployments ?? ctx.services.get<DeploymentMap>("Deployments") ??
            globalDeployments();
    }

    deployments: DeploymentMap;
    results: DeploymentResult[];
    status: PipelineStatus;
    error?: Error;
    bus: LoggingMessageBus;
    targets: string[];
}

export interface DeploymentsSummary extends Record<string, unknown> {
    results: DeploymentResult[];
    error?: Error;
    status: PipelineStatus;
}

export abstract class DeploymentsPipelineMiddleware {
    abstract run(ctx: DeploymentsPipelineContext, next: Next): Promise<void>;
}

export class SequentialDeploymentsPipeline
    extends Pipeline<DeploymentsSummary, DeploymentsPipelineContext> {
    constructor() {
        super();
    }

    override use(
        middleware:
            | DeploymentsPipelineMiddleware
            | ((ctx: DeploymentsPipelineContext, next: Next) => void | Promise<void>),
    ): this {
        if (middleware instanceof DeploymentsPipelineMiddleware) {
            return super.use(middleware.run.bind(middleware));
        }

        return super.use(middleware);
    }

    override async run(ctx: DeploymentsPipelineContext): Promise<DeploymentsSummary> {
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
