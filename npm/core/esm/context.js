import { ObjectMap } from "./collections/object_map.js";
import { Outputs } from "./collections/outputs.js";
import { StringMap } from "./collections/string_map.js";
import { toObject } from "@bearz/env";
export class Context {
  constructor() {
    const first = arguments[0];
    if (first instanceof Context) {
      this.name = first.name;
      this.env = new StringMap().merge(first.env);
      this.variables = new ObjectMap().merge(first.variables);
      this.writer = first.writer;
      this.signal = first.signal;
      this.secrets = new StringMap().merge(first.secrets);
      this.services = first.services;
      this.signal = first.signal;
      this.variables = new ObjectMap().merge(first.variables);
      this.outputs = new Outputs().merge(first.outputs);
      this.cwd = first.cwd;
      this.args = first.args;
      return;
    }
    const envData = toObject();
    this.env = new StringMap();
    this.env.merge(envData);
    this.secrets = new StringMap();
    this.services = first;
    this.writer = this.services.require("RexWriter").unwrap();
    this.signal = new AbortController().signal;
    this.variables = new ObjectMap();
    this.name = arguments[1] ?? "default";
    this.cwd = "";
    this.args = [];
    this.outputs = new Outputs();
  }
  signal;
  env;
  variables;
  writer;
  secrets;
  services;
  /**
   * The name of the context. For example, "production", "staging", "development",
   * "default", "server01", etc.
   */
  name;
  cwd;
  args;
  outputs;
}
