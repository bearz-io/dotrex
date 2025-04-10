import type { Inputs } from "../collections/inputs.ts";
import { OrderedMap } from "../collections/ordered_map.ts";
import { Outputs } from "../collections/outputs.ts";
import type { StringMap } from "../collections/string_map.ts";
import { Context, type Deferred } from "../context.ts";
import { type PipelineStatus, PipelineStatuses } from "../enums.ts";
import { globals } from "../globals.ts";
import type { TaskModel } from "../types.ts";
import { fail, ok, type Result } from "@bearz/result";

export type { TaskModel };

export class TaskContext extends Context {
    constructor(ctx: Context, model: TaskModel) {
        super(ctx);

        this.model = model;
    }

    model: TaskModel;
}

export type RunDelegate = (ctx: TaskContext) => Promise<Outputs> | Promise<void> | Outputs | void;

export abstract class Task implements Record<string | symbol, unknown> {
    [key: string | symbol]: unknown;

    constructor(id: string) {
        this.id = id;
        this.name = "";
        this.uses = "task";
    }

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

export class DelegateTask extends Task {
    constructor(params: DelegateTaskParams);
    constructor(id: string, delegate: RunDelegate);
    constructor() {
        super(typeof arguments[0] === "string" ? arguments[0] : arguments[0].id);
        switch (arguments.length) {
            case 1:
                {
                    const params = arguments[0] as DelegateTaskParams;
                    for (const key of Object.keys(params)) {
                        const value = params[key as keyof DelegateTaskParams];
                        if (value !== undefined) {
                            this[key as keyof DelegateTask] = value;
                        }
                    }

                    this.#delegate = params.run;
                }

                break;
            case 2:
                this.#delegate = arguments[1];
                break;
            default:
                throw new Error("Invalid number of arguments");
        }
    }

    #delegate: (ctx: TaskContext) => Promise<Outputs> | Promise<void> | Outputs | void;

    override run(ctx: TaskContext): Promise<Outputs | void> | void | Outputs {
        return this.#delegate(ctx);
    }
}

export class TaskResult {
    id: string;
    outputs: Outputs;
    status: PipelineStatus;
    error?: Error;
    startedAt: Date;
    finishedAt: Date;

    constructor(id: string) {
        this.id = id;
        this.outputs = new Outputs();
        this.status = PipelineStatuses.Pending;
        this.error = undefined;
        this.startedAt = new Date();
        this.finishedAt = this.startedAt;
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

function flatten(map: TaskMap, set: Task[]): Result<Task[]> {
    const results = new Array<Task>();
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

export class TaskMap extends OrderedMap<string, Task> {
    static fromObject(obj: Record<string, Task>): TaskMap {
        const map = new TaskMap();
        for (const [key, value] of Object.entries(obj)) {
            map.set(key, value);
        }
        return map;
    }

    missingDependencies(): Array<{ task: Task; missing: string[] }> {
        const missing = new Array<{ task: Task; missing: string[] }>();
        for (const task of this.values()) {
            const missingDeps = (task.needs ?? []).filter((dep: string) => !this.has(dep));
            if (missingDeps.length > 0) {
                missing.push({ task, missing: missingDeps });
            }
        }
        return missing;
    }

    flatten(targets?: Task[]): Result<Task[]> {
        targets = targets ?? Array.from(this.values());
        return flatten(this, targets);
    }

    findCyclycalReferences(): Task[] {
        const stack = new Set<Task>();
        const cycles = new Array<Task>();
        const resolve = (task: Task) => {
            if (stack.has(task)) {
                return false;
            }

            stack.add(task);
            const needs = task.needs ?? [];
            for (const dep of needs) {
                const depTask = this.get(dep);
                if (!depTask) {
                    continue;
                }

                if (!resolve(depTask)) {
                    return false;
                }
            }

            stack.delete(task);

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
const REX_TASKS_SYMBOL = Symbol.for("@REX_TASKS");

if (!globals[REX_TASKS_SYMBOL]) {
    globals[REX_TASKS_SYMBOL] = new TaskMap();
}

export function tasks(): TaskMap {
    return globals[REX_TASKS_SYMBOL] as TaskMap;
}

export function task(id: string, needs: string[], run: RunDelegate, tasks?: TaskMap): Task;
export function task(id: string, run: RunDelegate, tasks?: TaskMap): Task;
export function task(t: Task, tasks?: TaskMap): Task;
export function task(param: DelegateTaskParams): Task;
export function task(): Task {
    const first = arguments[0];

    if (first instanceof Task) {
        const set = arguments[1] as TaskMap ?? tasks();
        const task = first;
        set.set(task.id, task);
        return task;
    }

    if (typeof first == "object") {
        const params = first as DelegateTaskParams;
        const set = arguments[1] as TaskMap ?? tasks();
        const task = new DelegateTask(params);
        set.set(task.id, task);
        return task;
    }

    const second = arguments[1];
    if (typeof second == "function") {
        const id = first as string;
        const run = second as RunDelegate;
        const set = arguments[2] as TaskMap ?? tasks();
        const task = new DelegateTask(id, run);
        set.set(task.id, task);
        return task;
    }

    if (Array.isArray(second)) {
        const id = first as string;
        const needs = second as string[];
        const run = arguments[2] as RunDelegate;
        const set = arguments[3] as TaskMap ?? tasks();
        const task = new DelegateTask(id, run);
        task.needs = needs;
        set.set(task.id, task);
        return task;
    }

    throw new Error("Invalid arguments");
}

export type AddTaskDelegate = (
    t: typeof task,
    add: (id: string) => void,
    get: (id: string) => Task | undefined,
    map: TaskMap,
) => void;
