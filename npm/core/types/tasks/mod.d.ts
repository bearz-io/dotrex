import type { Inputs } from "../collections/inputs.js";
import { OrderedMap } from "../collections/ordered_map.js";
import { Outputs } from "../collections/outputs.js";
import type { StringMap } from "../collections/string_map.js";
import { Context, type Deferred } from "../context.js";
import { type PipelineStatus } from "../enums.js";
import type { TaskModel } from "../types.js";
import { type Result } from "@bearz/result";
export type { TaskModel };
export declare class TaskContext extends Context {
    constructor(ctx: Context, model: TaskModel);
    model: TaskModel;
}
export type RunDelegate = (ctx: TaskContext) => Promise<Outputs> | Promise<void> | Outputs | void;
export declare abstract class Task implements Record<string | symbol, unknown> {
    [key: string | symbol]: unknown;
    constructor(id: string);
    id: string;
    name?: string;
    description?: string;
    with?: Deferred<Inputs>;
    env?: Deferred<StringMap>;
    cwd?: Deferred<string>;
    timeout?: Deferred<number>;
    if?: Deferred<boolean>;
    force?: Deferred<boolean>;
    needs?: string[];
    abstract run(ctx: TaskContext): Promise<Outputs | void> | void | Outputs;
}
export interface DelegateTaskParams extends Partial<Omit<DelegateTask, "id">> {
    id: string;
    run: RunDelegate;
}
export declare class DelegateTask extends Task {
    #private;
    constructor(params: DelegateTaskParams);
    constructor(id: string, delegate: RunDelegate);
    run(ctx: TaskContext): Promise<Outputs | void> | void | Outputs;
}
export declare class TaskResult {
    id: string;
    outputs: Outputs;
    status: PipelineStatus;
    error?: Error;
    startedAt: Date;
    finishedAt: Date;
    constructor(id: string);
    start(): this;
    stop(): this;
    fail(err: Error): this;
    cancel(): this;
    skip(): this;
    success(outputs?: Record<string, unknown>): this;
}
export declare class TaskMap extends OrderedMap<string, Task> {
    static fromObject(obj: Record<string, Task>): TaskMap;
    missingDependencies(): Array<{
        task: Task;
        missing: string[];
    }>;
    flatten(targets?: Task[]): Result<Task[]>;
    findCyclycalReferences(): Task[];
}
export declare function tasks(): TaskMap;
export declare function task(id: string, needs: string[], run: RunDelegate, tasks?: TaskMap): Task;
export declare function task(id: string, run: RunDelegate, tasks?: TaskMap): Task;
export declare function task(t: Task, tasks?: TaskMap): Task;
export declare function task(param: DelegateTaskParams): Task;
export type AddTaskDelegate = (
    t: typeof task,
    add: (id: string) => void,
    get: (id: string) => Task | undefined,
    map: TaskMap,
) => void;
