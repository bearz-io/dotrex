import { fail, ok, type Result } from "@bearz/result";
import type { Inputs } from "../collections/inputs.ts";
import { Outputs } from "../collections/outputs.ts";
import type { StringMap } from "../collections/string_map.ts";
import { Context, type Deferred } from "../context.ts";
import { type PipelineStatus, PipelineStatuses } from "../enums.ts";
import {
    type AddTaskDelegate,
    DelegateTask,
    type DelegateTaskParams,
    type RunDelegate,
    Task,
    TaskMap,
    type TaskResult,
    tasks,
} from "../tasks/mod.ts";
import { OrderedMap } from "../collections/ordered_map.ts";
import { globals } from "../globals.ts";

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

export class JobContext extends Context {
    constructor(ctx: Context, model: JobModel) {
        super(ctx);

        this.model = model;
    }

    model: JobModel;
}

export class Job implements Record<string | symbol, unknown> {
    [key: string | symbol]: unknown;

    constructor(id: string) {
        this.id = id;
        this.name = id;
        this.tasks = new TaskMap();
    }

    id: string;

    name?: string;

    with?: Deferred<Inputs>;

    env?: Deferred<StringMap>;

    timeout?: Deferred<number>;

    if?: Deferred<boolean>;

    tasks: TaskMap;

    needs?: string[];

    set(params: Partial<Omit<Job, "id" | "tasks" | "task">>): this {
        const keys = Object.keys(params);
        for (const key of keys) {
            if (key in this) {
                (this as Record<string, unknown>)[key] = params[key];
            }
        }

        return this;
    }

    withTasks(fn: AddTaskDelegate): this {
        const map = this.tasks;
        const get = (id: string) => tasks().get(id);
        const add = (id: string) => {
            const task = get(id);
            if (!task) {
                throw new Error(`Task ${id} not found`);
            }

            map.set(id, task);
        };

        function task(id: string, needs: string[], run: RunDelegate, tasks?: TaskMap): Task;
        function task(id: string, run: RunDelegate, tasks?: TaskMap): Task;
        function task(t: Task, tasks?: TaskMap): Task;
        function task(param: DelegateTaskParams): Task;
        function task(): Task {
            const first = arguments[0];

            if (first instanceof Task) {
                const set = arguments[1] as TaskMap ?? map;
                const task = first;
                set.set(task.id, task);
                return task;
            }

            if (typeof first == "object") {
                const params = first as DelegateTaskParams;
                const set = arguments[1] as TaskMap ?? map;
                const task = new DelegateTask(params);
                set.set(task.id, task);
                return task;
            }

            const second = arguments[1];
            if (typeof second == "function") {
                const id = first as string;
                const run = second as RunDelegate;
                const set = arguments[2] as TaskMap ?? map;
                const task = new DelegateTask(id, run);
                set.set(task.id, task);
                return task;
            }

            if (Array.isArray(second)) {
                const id = first as string;
                const needs = second as string[];
                const run = arguments[2] as RunDelegate;
                const set = arguments[3] as TaskMap ?? map;
                const task = new DelegateTask(id, run);
                task.needs = needs;
                set.set(task.id, task);
                return task;
            }

            throw new Error("Invalid arguments");
        }

        fn(task, add, get, map);

        return this;
    }
}

export class JobResult {
    outputs: Outputs;
    status: PipelineStatus;
    error?: Error;
    startedAt: Date;
    finishedAt: Date;
    id: string;
    taskResults: TaskResult[];

    constructor(id: string) {
        this.id = id;
        this.outputs = new Outputs();
        this.status = PipelineStatuses.Pending;
        this.error = undefined;
        this.startedAt = new Date();
        this.finishedAt = this.startedAt;
        this.taskResults = [];
    }

    start(): this {
        this.startedAt = new Date();
        return this;
    }

    stop(): this {
        this.finishedAt = new Date();
        return this;
    }

    fail(err: Error): this {
        this.status = PipelineStatuses.Failed;
        this.error = err;
        return this;
    }

    cancel(): this {
        this.status = PipelineStatuses.Cancelled;
        return this;
    }

    skip(): this {
        this.status = PipelineStatuses.Skipped;
        return this;
    }

    success(outputs?: Record<string, unknown>): this {
        this.status = PipelineStatuses.Success;
        if (outputs) {
            this.outputs.merge(outputs);
        }
        return this;
    }
}

function flatten(map: JobMap, set: Job[]): Result<Job[]> {
    const results = new Array<Job>();
    for (const task of set) {
        if (!task) {
            continue;
        }

        const needs = task.needs ?? [];
        for (const dep of needs) {
            const depTask = map.get(dep);
            if (!depTask) {
                return fail(new Error(`Task ${task.id} depends on missing task ${dep}`));
            }

            const depResult = flatten(map, [depTask]);
            if (depResult.isError) {
                return depResult;
            }

            results.push(...depResult.unwrap());
            if (!results.includes(depTask)) {
                results.push(depTask);
            }
        }

        if (!results.includes(task)) {
            results.push(task);
        }
    }

    return ok(results);
}

export class JobMap extends OrderedMap<string, Job> {
    constructor() {
        super();
    }

    missingDependencies(): Array<{ job: Job; missing: string[] }> {
        const missing = new Array<{ job: Job; missing: string[] }>();
        for (const job of this.values()) {
            const needs = job.needs ?? [];
            const missingDeps = needs.filter((dep: string) => !this.has(dep));
            if (missingDeps.length > 0) {
                missing.push({ job, missing: missingDeps });
            }
        }
        return missing;
    }

    flatten(targets?: Job[]): Result<Job[]> {
        targets = targets ?? Array.from(this.values());
        return flatten(this, targets);
    }

    findCyclycalReferences(): Job[] {
        const stack = new Set<Job>();
        const cycles = new Array<Job>();
        const resolve = (job: Job) => {
            if (stack.has(job)) {
                return false;
            }

            stack.add(job);
            const needs = job.needs ?? [];
            for (const dep of needs) {
                const depTask = this.get(dep);
                if (!depTask) {
                    continue;
                }

                if (!resolve(depTask)) {
                    return false;
                }
            }

            stack.delete(job);

            return true;
        };

        for (const task of this.values()) {
            if (!resolve(task)) {
                // cycle detected
                cycles.push(task);
            }
        }

        // no cycles detected
        return cycles;
    }
}

const REX_JOBS_SYMBOL = Symbol.for("@REX_JOBS");
if (!globals[REX_JOBS_SYMBOL]) {
    globals[REX_JOBS_SYMBOL] = new JobMap();
}

export function jobs(): JobMap {
    return globals[REX_JOBS_SYMBOL] as JobMap;
}

export function job(id: string, needs?: string[]): Job {
    const map = jobs();
    if (map.has(id)) {
        return map.get(id) as Job;
    }

    const job = new Job(id);
    job.needs = needs ?? [];
    map.set(id, job);

    return job;
}
