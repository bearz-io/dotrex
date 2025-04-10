import { type Result } from "@bearz/result";
import type { Inputs } from "../collections/inputs.js";
import { Outputs } from "../collections/outputs.js";
import type { StringMap } from "../collections/string_map.js";
import { Context, type Deferred } from "../context.js";
import { type PipelineStatus } from "../enums.js";
import { type AddTaskDelegate, TaskMap, type TaskResult } from "../tasks/mod.js";
import { OrderedMap } from "../collections/ordered_map.js";
export interface JobModel extends Record<string, unknown> {
    id: string;
    name: string;
    env: StringMap;
    tasks: TaskMap;
    needs: string[];
    outputs: Outputs;
    if: boolean;
    timeout: number;
}
export declare class JobContext extends Context {
    constructor(ctx: Context, model: JobModel);
    model: JobModel;
}
export declare class Job implements Record<string | symbol, unknown> {
    [key: string | symbol]: unknown;
    constructor(id: string);
    id: string;
    name?: string;
    with?: Deferred<Inputs>;
    env?: Deferred<StringMap>;
    timeout?: Deferred<number>;
    if?: Deferred<boolean>;
    tasks: TaskMap;
    needs?: string[];
    set(params: Partial<Omit<Job, "id" | "tasks" | "task">>): this;
    withTasks(fn: AddTaskDelegate): this;
}
export declare class JobResult {
    outputs: Outputs;
    status: PipelineStatus;
    error?: Error;
    startedAt: Date;
    finishedAt: Date;
    id: string;
    taskResults: TaskResult[];
    constructor(id: string);
    start(): this;
    stop(): this;
    fail(err: Error): this;
    cancel(): this;
    skip(): this;
    success(outputs?: Record<string, unknown>): this;
}
export declare class JobMap extends OrderedMap<string, Job> {
    constructor();
    missingDependencies(): Array<{
        job: Job;
        missing: string[];
    }>;
    flatten(targets?: Job[]): Result<Job[]>;
    findCyclycalReferences(): Job[];
}
export declare function jobs(): JobMap;
export declare function job(id: string, needs?: string[]): Job;
