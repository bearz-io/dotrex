import type { Runtime } from "./runtime.js";
export type RuntimeName = "deno" | "node" | "bun";
/** Result of getRuntime(). */
export interface GetRuntimeResult {
    runtimeName: RuntimeName;
    runtime: Runtime;
}
/** Get runtime handler for current runtime. */
export declare function getRuntime(): Promise<GetRuntimeResult>;
