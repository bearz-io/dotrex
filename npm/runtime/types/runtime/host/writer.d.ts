import { DefaultPipelineWriter } from "@bearz/ci-env/writer";
import type { HostWriter, LogLevel } from "@dotrex/core/host";
export declare const groupSymbol =
  "\u001B[38;2;60;0;255m\u276F\u001B[39m\u001B[38;2;90;0;255m\u276F\u001B[39m\u001B[38;2;121;0;255m\u276F\u001B[39m\u001B[38;2;151;0;255m\u276F\u001B[39m\u001B[38;2;182;0;255m\u276F\u001B[39m";
export declare const jobSymbol =
  "\u001B[38;2;255;0;0m\u276F\u001B[39m\u001B[38;2;208;0;35m\u276F\u001B[39m\u001B[38;2;160;0;70m\u276F\u001B[39m\u001B[38;2;113;0;105m\u276F\u001B[39m\u001B[38;2;65;0;140m\u276F\u001B[39m";
export declare const deploySymbol =
  "\u001B[38;2;60;0;255m\u276F\u001B[39m\u001B[38;2;54;51;204m\u276F\u001B[39m\u001B[38;2;48;102;153m\u276F\u001B[39m\u001B[38;2;42;153;102m\u276F\u001B[39m\u001B[38;2;36;204;51m\u276F\u001B[39m";
export declare class DefaultHostWriter extends DefaultPipelineWriter
  implements HostWriter {
  setLogLevel(level: LogLevel): this;
  skipGroup(name: string): this;
}
/**
 * The default host writer.
 */
export declare const writer: HostWriter;
