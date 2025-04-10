import { type Result } from "@bearz/result";
import type { Inputs } from "../collections/inputs.js";
import { Outputs } from "../collections/outputs.js";
import { Context, type Deferred } from "../context.js";
import { type AddTaskDelegate, TaskMap, type TaskResult } from "../tasks/mod.js";
import type { TaskModel } from "../types.js";
import { OrderedMap } from "../collections/ordered_map.js";
import { type PipelineStatus } from "../enums.js";
import type { StringMap } from "../collections/mod.js";
export type DeploymentAction = "deploy" | "destroy" | "rollback" | string;
export interface DeploymentEventResult extends Record<string | symbol, unknown> {
    status: PipelineStatus;
    error?: Error;
    results: TaskResult[];
}
export type DeploymentEventHandler = (ctx: DeploymentContext) => Promise<DeploymentEventResult>;
export declare class DeploymentEventError extends Error {
    event: DeploymentEvent;
    result: DeploymentEventResult;
    constructor(
        message: string,
        event: DeploymentEvent,
        result: DeploymentEventResult,
        options?: ErrorOptions,
    );
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
export declare class DeploymentContext extends Context {
    constructor(ctx: Context, model: DeploymentModel);
    action: DeploymentAction;
    model: DeploymentModel;
    events: Record<DeploymentEvent, TaskMap>;
}
export type DeployDelegate = (
    ctx: DeploymentContext,
) => Promise<Outputs> | Promise<void> | Outputs | void;
export declare abstract class Deployment implements Record<string | symbol, unknown> {
    [key: string | symbol]: unknown;
    events: Record<DeploymentEvent, TaskMap>;
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
    abstract run(ctx: DeploymentContext): Promise<Outputs | void> | void | Outputs;
    set(params: Partial<Omit<Deployment, "id" | "tasks" | "task">>): this;
    getEventTasks(name: string): TaskMap;
    beforeDeploy(fn: AddTaskDelegate): this;
    afterDeploy(fn: AddTaskDelegate): this;
    beforeDestroy(fn: AddTaskDelegate): this;
    afterDestroy(fn: AddTaskDelegate): this;
    beforeRollback(fn: AddTaskDelegate): this;
    afterRollback(fn: AddTaskDelegate): this;
    addEventTask(name: string, fn: AddTaskDelegate): this;
}
export interface DelegateDeploymentParams extends Partial<Omit<DelegateDeployment, "id">> {
    id: string;
    run: DeployDelegate;
    rollback?: DeployDelegate;
    destroy?: DeployDelegate;
}
export declare class DelegateDeployment extends Deployment {
    #private;
    constructor(params: DelegateDeploymentParams);
    constructor(id: string, delegate: DeployDelegate);
    run(ctx: DeploymentContext): Promise<Outputs | void>;
}
export declare class DeploymentMap extends OrderedMap<string, Deployment> {
    static fromObject(obj: Record<string, Deployment>): DeploymentMap;
    missingDependencies(): Array<{
        task: Deployment;
        missing: string[];
    }>;
    flatten(targets?: Deployment[]): Result<Deployment[]>;
    findCyclycalReferences(): Deployment[];
}
export declare class DeploymentResult {
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
export declare function deployments(): DeploymentMap;
export declare function deploy(
    id: string,
    needs: string[],
    run: DeployDelegate,
    tasks: DeploymentMap,
): Deployment;
export declare function deploy(id: string, run: DeployDelegate, tasks?: DeploymentMap): Deployment;
export declare function deploy(t: Deployment, tasks?: DeploymentMap): Deployment;
export declare function deploy(param: DelegateDeploymentParams): Deployment;
