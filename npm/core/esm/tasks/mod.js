import { OrderedMap } from "../collections/ordered_map.js";
import { Outputs } from "../collections/outputs.js";
import { Context } from "../context.js";
import { PipelineStatuses } from "../enums.js";
import { globals } from "../globals.js";
import { fail, ok } from "@bearz/result";
export class TaskContext extends Context {
  constructor(ctx, model) {
    super(ctx);
    this.model = model;
  }
  model;
}
export class Task {
  constructor(id) {
    this.id = id;
    this.name = "";
    this.uses = "task";
  }
  id;
  name;
  description;
  with;
  env;
  cwd;
  timeout;
  if;
  force;
  needs;
}
export class DelegateTask extends Task {
  constructor() {
    super(typeof arguments[0] === "string" ? arguments[0] : arguments[0].id);
    switch (arguments.length) {
      case 1:
        {
          const params = arguments[0];
          for (const key of Object.keys(params)) {
            const value = params[key];
            if (value !== undefined) {
              this[key] = value;
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
  #delegate;
  run(ctx) {
    return this.#delegate(ctx);
  }
}
export class TaskResult {
  id;
  outputs;
  status;
  error;
  startedAt;
  finishedAt;
  constructor(id) {
    this.id = id;
    this.outputs = new Outputs();
    this.status = PipelineStatuses.Pending;
    this.error = undefined;
    this.startedAt = new Date();
    this.finishedAt = this.startedAt;
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
        return fail(
          new Error(`Task ${task.id} depends on missing task ${dep}`),
        );
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
export class TaskMap extends OrderedMap {
  static fromObject(obj) {
    const map = new TaskMap();
    for (const [key, value] of Object.entries(obj)) {
      map.set(key, value);
    }
    return map;
  }
  missingDependencies() {
    const missing = new Array();
    for (const task of this.values()) {
      const missingDeps = (task.needs ?? []).filter((dep) => !this.has(dep));
      if (missingDeps.length > 0) {
        missing.push({ task, missing: missingDeps });
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
    const resolve = (task) => {
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
export function tasks() {
  return globals[REX_TASKS_SYMBOL];
}
export function task() {
  const first = arguments[0];
  if (first instanceof Task) {
    const set = arguments[1] ?? tasks();
    const task = first;
    set.set(task.id, task);
    return task;
  }
  if (typeof first == "object") {
    const params = first;
    const set = arguments[1] ?? tasks();
    const task = new DelegateTask(params);
    set.set(task.id, task);
    return task;
  }
  const second = arguments[1];
  if (typeof second == "function") {
    const id = first;
    const run = second;
    const set = arguments[2] ?? tasks();
    const task = new DelegateTask(id, run);
    set.set(task.id, task);
    return task;
  }
  if (Array.isArray(second)) {
    const id = first;
    const needs = second;
    const run = arguments[2];
    const set = arguments[3] ?? tasks();
    const task = new DelegateTask(id, run);
    task.needs = needs;
    set.set(task.id, task);
    return task;
  }
  throw new Error("Invalid arguments");
}
