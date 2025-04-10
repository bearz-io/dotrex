import { BaseMessage } from "../bus/mod.js";
export class TaskStarted extends BaseMessage {
    task;
    constructor(task) {
        super("task:started");
        this.task = task;
    }
}
export class TaskCompleted extends BaseMessage {
    task;
    result;
    constructor(task, result) {
        super("task:completed");
        this.task = task;
        this.result = result;
    }
}
export class TaskSkipped extends BaseMessage {
    task;
    constructor(task) {
        super("task:skipped");
        this.task = task;
    }
}
export class TaskFailed extends BaseMessage {
    task;
    error;
    constructor(task, error) {
        super("task:failed");
        this.task = task;
        this.error = error;
    }
}
export class TaskCancelled extends BaseMessage {
    task;
    constructor(task) {
        super("task:cancelled");
        this.task = task;
    }
}
export class MissingTaskDependencies extends BaseMessage {
    tasks;
    constructor(tasks) {
        super("tasks:missing-dependencies");
        this.tasks = tasks;
    }
}
export class CyclicalTaskReferences extends BaseMessage {
    tasks;
    constructor(tasks) {
        super("tasks:cyclical-references");
        this.tasks = tasks;
    }
}
export class TaskNotFound extends BaseMessage {
    taskName;
    constructor(taskName) {
        super("task:not-found");
        this.taskName = taskName;
    }
}
export class ListTasks extends BaseMessage {
    tasks;
    constructor(tasks) {
        super("tasks:list");
        this.tasks = tasks;
    }
}
