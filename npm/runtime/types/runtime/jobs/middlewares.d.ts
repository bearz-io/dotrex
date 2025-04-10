import type { Next } from "@dotrex/core/pipelines";
import {
  JobPipelineContext,
  JobPipelineMiddleware,
  type JobsPipelineContext,
  JobsPipelineMiddleware,
} from "./pipelines.js";
export declare class ApplyJobContext extends JobPipelineMiddleware {
  run(ctx: JobPipelineContext, next: Next): Promise<void>;
}
export declare class RunJob extends JobPipelineMiddleware {
  run(ctx: JobPipelineContext, next: Next): Promise<void>;
}
export declare class JobsExcution extends JobsPipelineMiddleware {
  run(ctx: JobsPipelineContext, next: Next): Promise<void>;
}
