import { ObjectMap } from "./collections/object_map.js";
import { Outputs } from "./collections/outputs.js";
import { StringMap } from "./collections/string_map.js";
import type { HostWriter } from "./host/mod.js";
import type { ServiceProvider } from "./types.js";
export declare class Context implements Record<string | symbol, unknown> {
  [key: string | symbol]: unknown;
  constructor(context: ServiceProvider, name?: string);
  constructor(context: Context);
  signal: AbortSignal;
  env: StringMap;
  variables: ObjectMap;
  writer: HostWriter;
  secrets: StringMap;
  services: ServiceProvider;
  /**
   * The name of the context. For example, "production", "staging", "development",
   * "default", "server01", etc.
   */
  name: string;
  cwd: string;
  args?: string[];
  outputs: Outputs;
}
export type Deferred<T> = T | ((ctx: Context) => T | Promise<T>);
