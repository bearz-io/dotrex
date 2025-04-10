import { BaseMessage } from "../bus/mod.ts";
import type {
    Deployment,
    DeploymentMap,
    DeploymentModel,
    DeploymentResult,
} from "@dotrex/core/deployments";

export class DeploymentStarted extends BaseMessage {
    constructor(
        public readonly state: DeploymentModel,
        public readonly action: string,
    ) {
        super("deployment:started");
    }
}

export class DeploymentCompleted extends BaseMessage {
    constructor(
        public readonly state: DeploymentModel,
        public readonly result: DeploymentResult,
        public readonly action: string,
    ) {
        super("deployment:completed");
    }
}

export class DeploymentSkipped extends BaseMessage {
    constructor(
        public readonly state: DeploymentModel,
        public readonly action: string,
    ) {
        super("deployment:skipped");
    }
}

export class DeploymentFailed extends BaseMessage {
    constructor(
        public readonly state: DeploymentModel,
        public readonly error: Error,
        public readonly action: string,
    ) {
        super("deployment:failed");
    }
}

export class DeploymentCancelled extends BaseMessage {
    constructor(
        public readonly state: DeploymentModel,
        public readonly directive: string,
    ) {
        super("deployment:cancelled");
    }
}

export class MissingDeploymentDependencies extends BaseMessage {
    constructor(public readonly deployments: Array<{ deployment: Deployment; missing: string[] }>) {
        super("deployment:missing-dependencies");
    }
}

export class CyclicalDeploymentReferences extends BaseMessage {
    constructor(public readonly deployments: Deployment[]) {
        super("deployment:cyclical-references");
    }
}

export class DeploymentNotFound extends BaseMessage {
    constructor(public readonly deploymentName: string) {
        super("deployment:not-found");
    }
}

export class ListDeployments extends BaseMessage {
    constructor(public readonly deployments: DeploymentMap) {
        super("deployment:list");
    }
}
