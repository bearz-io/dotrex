import { BaseMessage } from "../bus/mod.js";
import type { Task, TaskMap, TaskModel, TaskResult } from "@dotrex/core/tasks";
export declare class TaskStarted extends BaseMessage {
    readonly task: TaskModel;
    constructor(task: TaskModel);
}
export declare class TaskCompleted extends BaseMessage {
    readonly task: TaskModel;
    readonly result: TaskResult;
    constructor(task: TaskModel, result: TaskResult);
}
export declare class TaskSkipped extends BaseMessage {
    readonly task: TaskModel;
    constructor(task: TaskModel);
}
export declare class TaskFailed extends BaseMessage {
    readonly task: TaskModel;
    readonly error: Error;
    constructor(task: TaskModel, error: Error);
}
export declare class TaskCancelled extends BaseMessage {
    readonly task: TaskModel;
    constructor(task: TaskModel);
}
export declare class MissingTaskDependencies extends BaseMessage {
    readonly tasks: Array<{
        task: Task;
        missing: string[];
    }>;
    constructor(
        tasks: Array<{
            task: Task;
            missing: string[];
        }>,
    );
}
export declare class CyclicalTaskReferences extends BaseMessage {
    readonly tasks: Task[];
    constructor(tasks: Task[]);
}
export declare class TaskNotFound extends BaseMessage {
    readonly taskName: string;
    constructor(taskName: string);
}
export declare class ListTasks extends BaseMessage {
    readonly tasks: TaskMap;
    constructor(tasks: TaskMap);
}
