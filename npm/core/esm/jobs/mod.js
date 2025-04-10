import { fail, ok } from "@bearz/result";
import { Outputs } from "../collections/outputs.js";
import { Context } from "../context.js";
import { PipelineStatuses } from "../enums.js";
import { DelegateTask, Task, TaskMap, tasks, } from "../tasks/mod.js";
import { OrderedMap } from "../collections/ordered_map.js";
import { globals } from "../globals.js";
export class JobContext extends Context {
    constructor(ctx, model) {
        super(ctx);
        this.model = model;
    }
    model;
}
export class Job {
    constructor(id) {
        this.id = id;
        this.name = id;
        this.tasks = new TaskMap();
    }
    id;
    name;
    with;
    env;
    timeout;
    if;
    tasks;
    needs;
    set(params) {
        const keys = Object.keys(params);
        for (const key of keys) {
            if (key in this) {
                this[key] = params[key];
            }
        }
        return this;
    }
    withTasks(fn) {
        const map = this.tasks;
        const get = (id) => tasks().get(id);
        const add = (id) => {
            const task = get(id);
            if (!task) {
                throw new Error(`Task ${id} not found`);
            }
            map.set(id, task);
        };
        function task() {
            const first = arguments[0];
            if (first instanceof Task) {
                const set = arguments[1] ?? map;
                const task = first;
                set.set(task.id, task);
                return task;
            }
            if (typeof first == "object") {
                const params = first;
                const set = arguments[1] ?? map;
                const task = new DelegateTask(params);
                set.set(task.id, task);
                return task;
            }
            const second = arguments[1];
            if (typeof second == "function") {
                const id = first;
                const run = second;
                const set = arguments[2] ?? map;
                const task = new DelegateTask(id, run);
                set.set(task.id, task);
                return task;
            }
            if (Array.isArray(second)) {
                const id = first;
                const needs = second;
                const run = arguments[2];
                const set = arguments[3] ?? map;
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
    outputs;
    status;
    error;
    startedAt;
    finishedAt;
    id;
    taskResults;
    constructor(id) {
        this.id = id;
        this.outputs = new Outputs();
        this.status = PipelineStatuses.Pending;
        this.error = undefined;
        this.startedAt = new Date();
        this.finishedAt = this.startedAt;
        this.taskResults = [];
    }
    start() {
        this.startedAt = new Date();
        return this;
    }
    stop() {
        this.finishedAt = new Date();
        return this;
    }
    fail(err) {
        this.status = PipelineStatuses.Failed;
        this.error = err;
        return this;
    }
    cancel() {
        this.status = PipelineStatuses.Cancelled;
        return this;
    }
    skip() {
        this.status = PipelineStatuses.Skipped;
        return this;
    }
    success(outputs) {
        this.status = PipelineStatuses.Success;
        if (outputs) {
            this.outputs.merge(outputs);
        }
        return this;
    }
}
function flatten(map, set) {
    const results = new Array();
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
export class JobMap extends OrderedMap {
    constructor() {
        super();
    }
    missingDependencies() {
        const missing = new Array();
        for (const job of this.values()) {
            const needs = job.needs ?? [];
            const missingDeps = needs.filter((dep) => !this.has(dep));
            if (missingDeps.length > 0) {
                missing.push({ job, missing: missingDeps });
            }
        }
        return missing;
    }
    flatten(targets) {
        targets = targets ?? Array.from(this.values());
        return flatten(this, targets);
    }
    findCyclycalReferences() {
        const stack = new Set();
        const cycles = new Array();
        const resolve = (job) => {
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
export function jobs() {
    return globals[REX_JOBS_SYMBOL];
}
export function job(id, needs) {
    const map = jobs();
    if (map.has(id)) {
        return map.get(id);
    }
    const job = new Job(id);
    job.needs = needs ?? [];
    map.set(id, job);
    return job;
}
