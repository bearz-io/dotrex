import { fail, ok, type Result } from "@bearz/result";
import type { Inputs } from "../collections/inputs.ts";
import { Outputs } from "../collections/outputs.ts";
import { Context, type Deferred } from "../context.ts";
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
import type { TaskModel } from "../types.ts";
import { OrderedMap } from "../collections/ordered_map.ts";
import { globals } from "../globals.ts";
import { type PipelineStatus, PipelineStatuses } from "../enums.ts";
import type { StringMap } from "../collections/mod.ts";
import type { HostWriter } from "../host/mod.ts";
import { green } from "@bearz/ansi/styles";
import { AnsiSettings } from "@bearz/ansi/settings";
import { AnsiModes } from "@bearz/ansi/enums";

export type DeploymentAction = "deploy" | "destroy" | "rollback" | string;

export interface DeploymentEventResult extends Record<string | symbol, unknown> {
    status: PipelineStatus;
    error?: Error;
    results: TaskResult[];
}

export type DeploymentEventHandler = (ctx: DeploymentContext) => Promise<DeploymentEventResult>;

export class DeploymentEventError extends Error {
    constructor(
        message: string,
        public event: DeploymentEvent,
        public result: DeploymentEventResult,
        options?: ErrorOptions,
    ) {
        super(message, options);
        this.name = "DeploymentEventError";
    }
}

export interface DeploymentModel extends TaskModel {
    action: DeploymentAction;

    eventTasks: Record<DeploymentEvent, TaskMap>;

    eventHandlers: Record<DeploymentEvent, DeploymentEventHandler>;
}

export type DeploymentEvent =
    | "before:deploy"
    | "after:deploy"
    | "before:destroy"
    | "after:destroy"
    | "before:rollback"
    | "after:rollback"
    | string;

export class DeploymentContext extends Context {
    constructor(ctx: Context, model: DeploymentModel) {
        super(ctx);

        this.model = model;
        this.action = model.action;
    }

    action: DeploymentAction;

    model: DeploymentModel;

    events: Record<DeploymentEvent, TaskMap> = {};
}

export type DeployDelegate = (
    ctx: DeploymentContext,
) => Promise<Outputs> | Promise<void> | Outputs | void;

export abstract class Deployment implements Record<string | symbol, unknown> {
    [key: string | symbol]: unknown;

    events: Record<DeploymentEvent, TaskMap> = {};

    constructor(id: string) {
        this.id = id;
        this.name = id;
        this.action = "deploy";
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

    abstract run(ctx: DeploymentContext): Promise<Outputs | void> | void | Outputs;

    set(params: Partial<Omit<Deployment, "id" | "tasks" | "task">>): this {
        const keys = Object.keys(params);
        for (const key of keys) {
            if (key in this) {
                (this as Record<string, unknown>)[key] = params[key];
            }
        }

        return this;
    }

    getEventTasks(name: string): TaskMap {
        const tasks = this.events[name];
        if (!tasks) {
            this.events[name] = new TaskMap();
            return this.events[name];
        }

        return tasks;
    }

    beforeDeploy(fn: AddTaskDelegate): this {
        return this.addEventTask("before:deploy", fn);
    }

    afterDeploy(fn: AddTaskDelegate): this {
        return this.addEventTask("after:deploy", fn);
    }

    beforeDestroy(fn: AddTaskDelegate): this {
        return this.addEventTask("before:destroy", fn);
    }

    afterDestroy(fn: AddTaskDelegate): this {
        return this.addEventTask("after:destroy", fn);
    }

    beforeRollback(fn: AddTaskDelegate): this {
        return this.addEventTask("before:rollback", fn);
    }

    afterRollback(fn: AddTaskDelegate): this {
        return this.addEventTask("after:rollback", fn);
    }

    addEventTask(name: string, fn: AddTaskDelegate): this {
        const map = this.getEventTasks(name);
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

        this.events[name] = map;

        return this;
    }
}

export interface DelegateDeploymentParams extends Partial<Omit<DelegateDeployment, "id">> {
    id: string;

    run: DeployDelegate;

    rollback?: DeployDelegate;

    destroy?: DeployDelegate;
}

const groupSymbol =
    "\x1b[38;2;60;0;255m❯\x1b[39m\x1b[38;2;90;0;255m❯\x1b[39m\x1b[38;2;121;0;255m❯\x1b[39m\x1b[38;2;151;0;255m❯\x1b[39m\x1b[38;2;182;0;255m❯\x1b[39m";

export class DelegateDeployment extends Deployment {
    #run: DeployDelegate;
    #rollback?: DeployDelegate;
    #destroy?: DeployDelegate;

    constructor(params: DelegateDeploymentParams);
    constructor(id: string, delegate: DeployDelegate);
    constructor() {
        super(typeof arguments[0] === "string" ? arguments[0] : arguments[0].id);
        switch (arguments.length) {
            case 1:
                {
                    const params = arguments[0] as DelegateDeploymentParams;
                    for (const key of Object.keys(params)) {
                        if (["run", "destroy", "rollback"].includes(key)) {
                            continue;
                        }
                        const value = params[key as keyof DelegateDeploymentParams];
                        if (value !== undefined) {
                            this[key as keyof DelegateTask] = value;
                        }
                    }

                    this.#run = params.run;
                    this.#rollback = params.rollback;
                    this.#destroy = params.destroy;
                }

                break;
            case 2:
                this.#run = arguments[1];
                break;
            default:
                throw new Error("Invalid number of arguments");
        }
    }

    override async run(ctx: DeploymentContext): Promise<Outputs | void> {
        const task = ctx.deployment as DelegateDeployment;
        const directive = ctx.action;

        if (this.#rollback === undefined) {
            this.#rollback = () => {
                console.warn(`Deployment ${task.id} has no rollback function`);
            };
        }

        if (task.#destroy === undefined) {
            this.#destroy = () => {
                console.warn(`Deployment ${this.id} has no destroy function`);
            };
        }

        if (this.#run === undefined) {
            throw new Error(`Deployment ${this.id} has no run function`);
        }
        const writer = ctx.services.get<HostWriter>("RexWriter");
        switch (directive) {
            case "destroy": {
                if (ctx.model.eventHandlers["before:destroy"]) {
                    const handler = ctx.model.eventHandlers["before:destroy"];
                    const r = await handler(ctx);
                    if (
                        r.error || r.status === PipelineStatuses.Failed ||
                        r.status === PipelineStatuses.Cancelled
                    ) {
                        throw new DeploymentEventError(
                            `Deployment ${this.id} failed during before:destroy tasks`,
                            "before:destroy",
                            r,
                            { cause: r.error },
                        );
                    }
                }

                writer?.startGroup(`destroying...`);
                const start = new Date().getTime();

                let res = this.#destroy!(ctx);
                if (res instanceof Promise) {
                    res = await res;
                }

                const end = new Date().getTime();
                const duration = end - start;
                const ms = duration % 1000;
                const s = Math.floor(duration / 1000) % 60;
                const m = Math.floor(duration / 60000) % 60;

                if (AnsiSettings.current.mode === AnsiModes.TwentyFourBit) {
                    // rexWriter.write(groupSymbol)
                    writer?.write(groupSymbol);
                    writer?.writeLine(
                        ` ${this.name ?? this.id} completed sucessfully in ${
                            green(m.toString())
                        }m ${green(s.toString())}s ${green(ms.toString())}ms`,
                    );
                } else {
                    writer?.success(
                        `${this.name ?? this.id} completed in ${m}m ${s}s ${ms}ms`,
                    );
                }

                writer?.endGroup();

                if (ctx.model.eventHandlers["after:destroy"]) {
                    const handler = ctx.model.eventHandlers["after:destroy"];
                    const r = await handler(ctx);
                    if (
                        r.error || r.status === PipelineStatuses.Failed ||
                        r.status === PipelineStatuses.Cancelled
                    ) {
                        throw new DeploymentEventError(
                            `Deployment ${this.id} failed during after:destroy tasks`,
                            "after:destroy",
                            r,
                            { cause: r.error },
                        );
                    }
                }

                return res;
            }

            case "rollback": {
                if (ctx.model.eventHandlers["before:rollback"]) {
                    const handler = ctx.model.eventHandlers["before:rollback"];
                    const r = await handler(ctx);
                    if (
                        r.error || r.status === PipelineStatuses.Failed ||
                        r.status === PipelineStatuses.Cancelled
                    ) {
                        throw new DeploymentEventError(
                            `Deployment ${this.id} failed during before:rollback tasks`,
                            "before:rollback",
                            r,
                            { cause: r.error },
                        );
                    }
                }

                writer?.startGroup(`rolling back...`);
                const start = new Date().getTime();
                let res = this.#rollback!(ctx);
                if (res instanceof Promise) {
                    res = await res;
                }

                const end = new Date().getTime();
                const duration = end - start;
                const ms = duration % 1000;
                const s = Math.floor(duration / 1000) % 60;
                const m = Math.floor(duration / 60000) % 60;

                if (AnsiSettings.current.mode === AnsiModes.TwentyFourBit) {
                    // rexWriter.write(groupSymbol)
                    writer?.write(groupSymbol);
                    writer?.writeLine(
                        ` ${this.name ?? this.id} completed sucessfully in ${
                            green(m.toString())
                        }m ${green(s.toString())}s ${green(ms.toString())}ms`,
                    );
                } else {
                    writer?.success(
                        `${this.name ?? this.id} completed in ${m}m ${s}s ${ms}ms`,
                    );
                }

                writer?.endGroup();

                if (ctx.model.eventHandlers["after:rollback"]) {
                    const handler = ctx.model.eventHandlers["after:rollback"];
                    const r = await handler(ctx);
                    if (
                        r.error || r.status === PipelineStatuses.Failed ||
                        r.status === PipelineStatuses.Cancelled
                    ) {
                        throw new DeploymentEventError(
                            `Deployment ${this.id} failed during after:rollback tasks`,
                            "after:rollback",
                            r,
                            { cause: r.error },
                        );
                    }
                }

                return res;
            }

            case "deploy":
            default: {
                if (ctx.model.eventHandlers["before:deploy"]) {
                    const handler = ctx.model.eventHandlers["before:deploy"];
                    const r = await handler(ctx);
                    if (
                        r.error || r.status === PipelineStatuses.Failed ||
                        r.status === PipelineStatuses.Cancelled
                    ) {
                        throw new DeploymentEventError(
                            `Deployment ${this.id} failed during before:deploy tasks`,
                            "before:deploy",
                            r,
                            { cause: r.error },
                        );
                    }
                }

                writer?.startGroup(`deploying...`);
                const start = new Date().getTime();
                let res = this.#run(ctx);
                if (res instanceof Promise) {
                    res = await res;
                }

                const end = new Date().getTime();
                const duration = end - start;
                const ms = duration % 1000;
                const s = Math.floor(duration / 1000) % 60;
                const m = Math.floor(duration / 60000) % 60;

                if (AnsiSettings.current.mode === AnsiModes.TwentyFourBit) {
                    // rexWriter.write(groupSymbol)
                    writer?.write(groupSymbol);
                    writer?.writeLine(
                        ` ${this.name ?? this.id} completed sucessfully in ${
                            green(m.toString())
                        }m ${green(s.toString())}s ${green(ms.toString())}ms`,
                    );
                } else {
                    writer?.success(
                        `${this.name ?? this.id} completed in ${m}m ${s}s ${ms}ms`,
                    );
                }

                writer?.endGroup();
                if (ctx.model.eventHandlers["after:deploy"]) {
                    const handler = ctx.model.eventHandlers["after:deploy"];
                    const r = await handler(ctx);
                    if (
                        r.error || r.status === PipelineStatuses.Failed ||
                        r.status === PipelineStatuses.Cancelled
                    ) {
                        throw new DeploymentEventError(
                            `Deployment ${this.id} failed during after:deploy tasks`,
                            "after:deploy",
                            r,
                            { cause: r.error },
                        );
                    }
                }

                return res;
            }
        }
    }
}

function flatten(map: DeploymentMap, set: Deployment[]): Result<Deployment[]> {
    const results = new Array<Deployment>();
    for (const item of set) {
        if (!item) {
            continue;
        }

        const needs = item.needs ?? [];
        for (const dep of needs) {
            const depTask = map.get(dep);
            if (!depTask) {
                return fail(new Error(`Task ${item.id} depends on missing task ${dep}`));
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

        if (!results.includes(item)) {
            results.push(item);
        }
    }

    return ok(results);
}

export class DeploymentMap extends OrderedMap<string, Deployment> {
    static fromObject(obj: Record<string, Deployment>): DeploymentMap {
        const map = new DeploymentMap();
        for (const [key, value] of Object.entries(obj)) {
            map.set(key, value);
        }
        return map;
    }

    missingDependencies(): Array<{ task: Deployment; missing: string[] }> {
        const missing = new Array<{ task: Deployment; missing: string[] }>();
        for (const task of this.values()) {
            const needs = task.needs ?? [];
            const missingDeps = needs.filter((dep: string) => !this.has(dep));
            if (missingDeps.length > 0) {
                missing.push({ task, missing: missingDeps });
            }
        }
        return missing;
    }

    flatten(targets?: Deployment[]): Result<Deployment[]> {
        targets = targets ?? Array.from(this.values());
        return flatten(this, targets);
    }

    findCyclycalReferences(): Deployment[] {
        const stack = new Set<Deployment>();
        const cycles = new Array<Deployment>();
        const resolve = (task: Deployment) => {
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

export class DeploymentResult {
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
        if (outputs) {
            this.outputs.merge(outputs);
        }
        return this;
    }
}

const REX_DEPLOYMENTS_SYMBOL = Symbol.for("@REX_DEPLOYMENTS");
if (!globals[REX_DEPLOYMENTS_SYMBOL]) {
    globals[REX_DEPLOYMENTS_SYMBOL] = new DeploymentMap();
}

export function deployments(): DeploymentMap {
    return globals[REX_DEPLOYMENTS_SYMBOL] as DeploymentMap;
}

export function deploy(
    id: string,
    needs: string[],
    run: DeployDelegate,
    tasks: DeploymentMap,
): Deployment;
export function deploy(id: string, run: DeployDelegate, tasks?: DeploymentMap): Deployment;
export function deploy(t: Deployment, tasks?: DeploymentMap): Deployment;
export function deploy(param: DelegateDeploymentParams): Deployment;
export function deploy(): Deployment {
    const first = arguments[0];

    if (first instanceof Deployment) {
        const set = arguments[1] as DeploymentMap ?? deployments();
        const deployment = first;
        set.set(deployment.id, deployment);
        return deployment;
    }

    if (typeof first == "object") {
        const params = first as DelegateDeploymentParams;
        const set = arguments[1] as DeploymentMap ?? deployments();
        const task = new DelegateDeployment(params);
        set.set(task.id, task);
        return task;
    }

    const second = arguments[1];
    if (typeof second == "function") {
        const id = first as string;
        const run = second as DeployDelegate;
        const set = arguments[2] as DeploymentMap ?? deployments();
        const deployment = new DelegateDeployment(id, run);
        set.set(deployment.id, deployment);
        return deployment;
    }

    if (Array.isArray(second)) {
        const id = first as string;
        const needs = second as string[];
        const run = arguments[2] as DeployDelegate;
        const set = arguments[3] as DeploymentMap ?? deployments();
        const deployment = new DelegateDeployment(id, run);
        deployment.needs = needs;
        set.set(deployment.id, deployment);
        return deployment;
    }

    throw new Error("Invalid arguments");
}
