import { type Next, Pipeline } from "@dotrex/core/pipelines";
import { Context } from "@dotrex/core/context";
import type { LoggingMessageBus } from "../bus/types.js";
import { type TaskMap } from "@dotrex/core/tasks";
import { type JobMap } from "@dotrex/core/jobs";
import { type DeploymentMap } from "@dotrex/core/deployments";
export declare class DiscoveryPipelineContext extends Context {
    constructor(ctx: Context);
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
export declare abstract class DiscoveryPipelineMiddleware {
    abstract run(ctx: DiscoveryPipelineContext, next: Next): Promise<void>;
}
export declare class DiscoveryPipeline extends Pipeline<DicoveryPipelineResult, DiscoveryPipelineContext> {
    constructor();
    use(middleware: DiscoveryPipelineMiddleware | ((ctx: DiscoveryPipelineContext, next: Next) => void | Promise<void>)): this;
    run(context: DiscoveryPipelineContext): Promise<DicoveryPipelineResult>;
}
