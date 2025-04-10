import { JobMap } from "@dotrex/core/jobs";
import { TaskMap } from "@dotrex/core/tasks";
import { DeploymentMap } from "@dotrex/core";
import type { Context } from "@dotrex/core/context";
import type { Next } from "@dotrex/core/pipelines";
import { type DiscoveryPipelineContext, DiscoveryPipelineMiddleware } from "./pipelines.js";
export interface RexFileImports {
    tasks?: TaskMap;
    setup?: (ctx: Context) => Promise<void> | void;
    teardown?: (ctx: Context) => Promise<void> | void;
    jobs?: JobMap;
    deployments?: DeploymentMap;
}
export declare class RexfileDiscovery extends DiscoveryPipelineMiddleware {
    run(context: DiscoveryPipelineContext, next: Next): Promise<void>;
}
