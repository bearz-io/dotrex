import { BaseMessage } from "../bus/mod.js";
import type {
  Deployment,
  DeploymentMap,
  DeploymentModel,
  DeploymentResult,
} from "@dotrex/core/deployments";
export declare class DeploymentStarted extends BaseMessage {
  readonly state: DeploymentModel;
  readonly action: string;
  constructor(state: DeploymentModel, action: string);
}
export declare class DeploymentCompleted extends BaseMessage {
  readonly state: DeploymentModel;
  readonly result: DeploymentResult;
  readonly action: string;
  constructor(state: DeploymentModel, result: DeploymentResult, action: string);
}
export declare class DeploymentSkipped extends BaseMessage {
  readonly state: DeploymentModel;
  readonly action: string;
  constructor(state: DeploymentModel, action: string);
}
export declare class DeploymentFailed extends BaseMessage {
  readonly state: DeploymentModel;
  readonly error: Error;
  readonly action: string;
  constructor(state: DeploymentModel, error: Error, action: string);
}
export declare class DeploymentCancelled extends BaseMessage {
  readonly state: DeploymentModel;
  readonly directive: string;
  constructor(state: DeploymentModel, directive: string);
}
export declare class MissingDeploymentDependencies extends BaseMessage {
  readonly deployments: Array<{
    deployment: Deployment;
    missing: string[];
  }>;
  constructor(
    deployments: Array<{
      deployment: Deployment;
      missing: string[];
    }>,
  );
}
export declare class CyclicalDeploymentReferences extends BaseMessage {
  readonly deployments: Deployment[];
  constructor(deployments: Deployment[]);
}
export declare class DeploymentNotFound extends BaseMessage {
  readonly deploymentName: string;
  constructor(deploymentName: string);
}
export declare class ListDeployments extends BaseMessage {
  readonly deployments: DeploymentMap;
  constructor(deployments: DeploymentMap);
}
