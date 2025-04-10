import { BaseMessage } from "../bus/mod.ts";
import type { Job, JobMap, JobModel, JobResult } from "@dotrex/core/jobs";

export class JobStarted extends BaseMessage {
    constructor(public readonly job: JobModel) {
        super("job:started");
    }
}

export class JobCompleted extends BaseMessage {
    constructor(public readonly job: JobModel, public readonly result: JobResult) {
        super("job:completed");
    }
}

export class JobSkipped extends BaseMessage {
    constructor(public readonly job: JobModel) {
        super("job:skipped");
    }
}

export class JobFailed extends BaseMessage {
    constructor(public readonly job: JobModel, public readonly error: Error) {
        super("job:failed");
    }
}

export class JobCancelled extends BaseMessage {
    constructor(public readonly job: JobModel) {
        super("job:cancelled");
    }
}

export class MissingJobDependencies extends BaseMessage {
    constructor(public readonly jobs: Array<{ job: Job; missing: string[] }>) {
        super("jobs:missing-dependencies");
    }
}

export class CyclicalJobReferences extends BaseMessage {
    constructor(public readonly jobs: Job[]) {
        super("jobs:cyclical-references");
    }
}

export class JobNotFound extends BaseMessage {
    constructor(public readonly jobName: string) {
        super("job:not-found");
    }
}

export class ListJobs extends BaseMessage {
    constructor(public readonly jobs: JobMap) {
        super("jobs:list");
    }
}
