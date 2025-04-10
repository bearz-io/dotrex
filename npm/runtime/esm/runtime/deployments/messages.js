import { BaseMessage } from "../bus/mod.js";
export class DeploymentStarted extends BaseMessage {
  state;
  action;
  constructor(state, action) {
    super("deployment:started");
    this.state = state;
    this.action = action;
  }
}
export class DeploymentCompleted extends BaseMessage {
  state;
  result;
  action;
  constructor(state, result, action) {
    super("deployment:completed");
    this.state = state;
    this.result = result;
    this.action = action;
  }
}
export class DeploymentSkipped extends BaseMessage {
  state;
  action;
  constructor(state, action) {
    super("deployment:skipped");
    this.state = state;
    this.action = action;
  }
}
export class DeploymentFailed extends BaseMessage {
  state;
  error;
  action;
  constructor(state, error, action) {
    super("deployment:failed");
    this.state = state;
    this.error = error;
    this.action = action;
  }
}
export class DeploymentCancelled extends BaseMessage {
  state;
  directive;
  constructor(state, directive) {
    super("deployment:cancelled");
    this.state = state;
    this.directive = directive;
  }
}
export class MissingDeploymentDependencies extends BaseMessage {
  deployments;
  constructor(deployments) {
    super("deployment:missing-dependencies");
    this.deployments = deployments;
  }
}
export class CyclicalDeploymentReferences extends BaseMessage {
  deployments;
  constructor(deployments) {
    super("deployment:cyclical-references");
    this.deployments = deployments;
  }
}
export class DeploymentNotFound extends BaseMessage {
  deploymentName;
  constructor(deploymentName) {
    super("deployment:not-found");
    this.deploymentName = deploymentName;
  }
}
export class ListDeployments extends BaseMessage {
  deployments;
  constructor(deployments) {
    super("deployment:list");
    this.deployments = deployments;
  }
}
