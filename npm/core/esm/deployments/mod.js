import { fail, ok } from "@bearz/result";
import { Outputs } from "../collections/outputs.js";
import { Context } from "../context.js";
import { DelegateTask, Task, TaskMap, tasks } from "../tasks/mod.js";
import { OrderedMap } from "../collections/ordered_map.js";
import { globals } from "../globals.js";
import { PipelineStatuses } from "../enums.js";
import { green } from "@bearz/ansi/styles";
import { AnsiSettings } from "@bearz/ansi/settings";
import { AnsiModes } from "@bearz/ansi/enums";
export class DeploymentEventError extends Error {
  event;
  result;
  constructor(message, event, result, options) {
    super(message, options);
    this.event = event;
    this.result = result;
    this.name = "DeploymentEventError";
  }
}
export class DeploymentContext extends Context {
  constructor(ctx, model) {
    super(ctx);
    this.model = model;
    this.action = model.action;
  }
  action;
  model;
  events = {};
}
export class Deployment {
  events = {};
  constructor(id) {
    this.id = id;
    this.name = id;
    this.action = "deploy";
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
  set(params) {
    const keys = Object.keys(params);
    for (const key of keys) {
      if (key in this) {
        this[key] = params[key];
      }
    }
    return this;
  }
  getEventTasks(name) {
    const tasks = this.events[name];
    if (!tasks) {
      this.events[name] = new TaskMap();
      return this.events[name];
    }
    return tasks;
  }
  beforeDeploy(fn) {
    return this.addEventTask("before:deploy", fn);
  }
  afterDeploy(fn) {
    return this.addEventTask("after:deploy", fn);
  }
  beforeDestroy(fn) {
    return this.addEventTask("before:destroy", fn);
  }
  afterDestroy(fn) {
    return this.addEventTask("after:destroy", fn);
  }
  beforeRollback(fn) {
    return this.addEventTask("before:rollback", fn);
  }
  afterRollback(fn) {
    return this.addEventTask("after:rollback", fn);
  }
  addEventTask(name, fn) {
    const map = this.getEventTasks(name);
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
    this.events[name] = map;
    return this;
  }
}
const groupSymbol =
  "\x1b[38;2;60;0;255m❯\x1b[39m\x1b[38;2;90;0;255m❯\x1b[39m\x1b[38;2;121;0;255m❯\x1b[39m\x1b[38;2;151;0;255m❯\x1b[39m\x1b[38;2;182;0;255m❯\x1b[39m";
export class DelegateDeployment extends Deployment {
  #run;
  #rollback;
  #destroy;
  constructor() {
    super(typeof arguments[0] === "string" ? arguments[0] : arguments[0].id);
    switch (arguments.length) {
      case 1:
        {
          const params = arguments[0];
          for (const key of Object.keys(params)) {
            if (["run", "destroy", "rollback"].includes(key)) {
              continue;
            }
            const value = params[key];
            if (value !== undefined) {
              this[key] = value;
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
  async run(ctx) {
    const task = ctx.deployment;
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
    const writer = ctx.services.get("RexWriter");
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
        let res = this.#destroy(ctx);
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
        let res = this.#rollback(ctx);
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
function flatten(map, set) {
  const results = new Array();
  for (const item of set) {
    if (!item) {
      continue;
    }
    const needs = item.needs ?? [];
    for (const dep of needs) {
      const depTask = map.get(dep);
      if (!depTask) {
        return fail(
          new Error(`Task ${item.id} depends on missing task ${dep}`),
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
    if (!results.includes(item)) {
      results.push(item);
    }
  }
  return ok(results);
}
export class DeploymentMap extends OrderedMap {
  static fromObject(obj) {
    const map = new DeploymentMap();
    for (const [key, value] of Object.entries(obj)) {
      map.set(key, value);
    }
    return map;
  }
  missingDependencies() {
    const missing = new Array();
    for (const task of this.values()) {
      const needs = task.needs ?? [];
      const missingDeps = needs.filter((dep) => !this.has(dep));
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
export class DeploymentResult {
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
export function deployments() {
  return globals[REX_DEPLOYMENTS_SYMBOL];
}
export function deploy() {
  const first = arguments[0];
  if (first instanceof Deployment) {
    const set = arguments[1] ?? deployments();
    const deployment = first;
    set.set(deployment.id, deployment);
    return deployment;
  }
  if (typeof first == "object") {
    const params = first;
    const set = arguments[1] ?? deployments();
    const task = new DelegateDeployment(params);
    set.set(task.id, task);
    return task;
  }
  const second = arguments[1];
  if (typeof second == "function") {
    const id = first;
    const run = second;
    const set = arguments[2] ?? deployments();
    const deployment = new DelegateDeployment(id, run);
    set.set(deployment.id, deployment);
    return deployment;
  }
  if (Array.isArray(second)) {
    const id = first;
    const needs = second;
    const run = arguments[2];
    const set = arguments[3] ?? deployments();
    const deployment = new DelegateDeployment(id, run);
    deployment.needs = needs;
    set.set(deployment.id, deployment);
    return deployment;
  }
  throw new Error("Invalid arguments");
}
