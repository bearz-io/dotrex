import type { Next } from "@dotrex/core/pipelines";
import { type DeploymentPipelineContext, DeploymentPipelineMiddleware } from "./pipelines.js";
export declare class ApplyDeploymentContext extends DeploymentPipelineMiddleware {
    run(ctx: DeploymentPipelineContext, next: Next): Promise<void>;
}
export declare class RunDeployment extends DeploymentPipelineMiddleware {
    run(ctx: DeploymentPipelineContext, next: Next): Promise<void>;
}
