import { Context } from "@dotrex/core/context";
import { toError } from "../_utils.js";
import { PipelineStatuses } from "@dotrex/core/enums";
import {
  DeploymentContext,
  DeploymentResult,
  deployments as globalDeployments,
} from "@dotrex/core/deployments";
import { Pipeline } from "@dotrex/core/pipelines";
export class DeploymentPipelineContext extends DeploymentContext {
  constructor(ctx, deployment, model) {
    super(ctx, model);
    this.bus = ctx.services.require("Bus").unwrap();
    this.result = new DeploymentResult(deployment.id);
    this.status = PipelineStatuses.Running;
    this.deployment = deployment;
  }
  deployment;
  result;
  bus;
  status;
}
export class DeploymentPipelineMiddleware {
}
export class DeploymentPipeline extends Pipeline {
  constructor() {
    super();
  }
  use(middleware) {
    if (middleware instanceof DeploymentPipelineMiddleware) {
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
export class DeploymentsPipelineContext extends Context {
  constructor(ctx, targets, deployments) {
    super(ctx);
    this.targets = targets;
    this.bus = ctx.services.require("Bus").unwrap();
    this.results = [];
    this.status = PipelineStatuses.Running;
    this.deployments = deployments ?? ctx.services.get("Deployments") ??
      globalDeployments();
  }
  deployments;
  results;
  status;
  error;
  bus;
  targets;
}
export class DeploymentsPipelineMiddleware {
}
export class SequentialDeploymentsPipeline extends Pipeline {
  constructor() {
    super();
  }
  use(middleware) {
    if (middleware instanceof DeploymentsPipelineMiddleware) {
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
