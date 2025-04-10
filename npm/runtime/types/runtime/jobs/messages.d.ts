import { BaseMessage } from "../bus/mod.js";
import type { Job, JobMap, JobModel, JobResult } from "@dotrex/core/jobs";
export declare class JobStarted extends BaseMessage {
    readonly job: JobModel;
    constructor(job: JobModel);
}
export declare class JobCompleted extends BaseMessage {
    readonly job: JobModel;
    readonly result: JobResult;
    constructor(job: JobModel, result: JobResult);
}
export declare class JobSkipped extends BaseMessage {
    readonly job: JobModel;
    constructor(job: JobModel);
}
export declare class JobFailed extends BaseMessage {
    readonly job: JobModel;
    readonly error: Error;
    constructor(job: JobModel, error: Error);
}
export declare class JobCancelled extends BaseMessage {
    readonly job: JobModel;
    constructor(job: JobModel);
}
export declare class MissingJobDependencies extends BaseMessage {
    readonly jobs: Array<{
        job: Job;
        missing: string[];
    }>;
    constructor(jobs: Array<{
        job: Job;
        missing: string[];
    }>);
}
export declare class CyclicalJobReferences extends BaseMessage {
    readonly jobs: Job[];
    constructor(jobs: Job[]);
}
export declare class JobNotFound extends BaseMessage {
    readonly jobName: string;
    constructor(jobName: string);
}
export declare class ListJobs extends BaseMessage {
    readonly jobs: JobMap;
    constructor(jobs: JobMap);
}
