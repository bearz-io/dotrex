import { Context } from "@dotrex/core/context";
import type { LoggingMessageBus } from "../bus/mod.js";
import { type PipelineStatus } from "@dotrex/core/enums";
import { type Deployment, DeploymentContext, type DeploymentMap, type DeploymentModel, DeploymentResult } from "@dotrex/core/deployments";
import { type Next, Pipeline } from "@dotrex/core/pipelines";
export declare class DeploymentPipelineContext extends DeploymentContext {
    constructor(ctx: Context, deployment: Deployment, model: DeploymentModel);
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
export declare abstract class DeploymentPipelineMiddleware {
    abstract run(ctx: DeploymentPipelineContext, next: Next): Promise<void>;
}
export declare class DeploymentPipeline extends Pipeline<DeploymentResult, DeploymentPipelineContext> {
    constructor();
    use(middleware: DeploymentPipelineMiddleware | ((ctx: DeploymentPipelineContext, next: Next) => void | Promise<void>)): this;
    run(ctx: DeploymentPipelineContext): Promise<DeploymentResult>;
}
export declare class DeploymentsPipelineContext extends Context {
    constructor(ctx: Context, targets: string[], deployments?: DeploymentMap);
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
export declare abstract class DeploymentsPipelineMiddleware {
    abstract run(ctx: DeploymentsPipelineContext, next: Next): Promise<void>;
}
export declare class SequentialDeploymentsPipeline extends Pipeline<DeploymentsSummary, DeploymentsPipelineContext> {
    constructor();
    use(middleware: DeploymentsPipelineMiddleware | ((ctx: DeploymentsPipelineContext, next: Next) => void | Promise<void>)): this;
    run(ctx: DeploymentsPipelineContext): Promise<DeploymentsSummary>;
}
