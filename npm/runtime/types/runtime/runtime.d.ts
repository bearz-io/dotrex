import { type LogLevel } from "@dotrex/core/host";
export interface RunnerOptions {
  file?: string;
  cwd?: string;
  command?: string;
  targets?: string[];
  timeout?: number;
  logLevel?: LogLevel;
  context?: string;
  env?: string[];
  envFile?: string[];
  signal?: AbortSignal;
  args?: string[];
}
export declare class Runner {
  constructor();
  run(options: RunnerOptions): Promise<void>;
}
