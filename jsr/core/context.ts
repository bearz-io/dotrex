import { ObjectMap } from "./collections/object_map.ts";
import { Outputs } from "./collections/outputs.ts";
import { StringMap } from "./collections/string_map.ts";
import type { HostWriter } from "./host/mod.ts";
import type { ServiceProvider } from "./types.ts";
import { toObject } from "@bearz/env";

export class Context implements Record<string | symbol, unknown> {
    [key: string | symbol]: unknown;

    constructor(context: ServiceProvider, name?: string);
    constructor(context: Context);
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

        const envData = toObject() as Record<string, string>;
        this.env = new StringMap();
        this.env.merge(envData);
        this.secrets = new StringMap();
        this.services = first;
        this.writer = this.services.require<HostWriter>("RexWriter").unwrap();
        this.signal = new AbortController().signal;
        this.variables = new ObjectMap();
        this.name = arguments[1] ?? "default";
        this.cwd = "";
        this.args = [];
        this.outputs = new Outputs();
    }

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
