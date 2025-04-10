import { type LoggingMessageBus, LogLevel, type Message, type MessageSink } from "./types.js";
export type { LoggingMessageBus, Message, MessageSink };
export { LogLevel };
export declare function logLevelToString(level: LogLevel): string;
export declare class LogMessage implements Message {
    error?: Error;
    message?: string;
    args?: unknown[];
    level: LogLevel;
    timestamp: Date;
    kind: string;
    [key: string]: unknown;
    constructor(level: LogLevel, error?: Error, message?: string, args?: unknown[]);
}
export declare class BaseMessage implements Message {
    readonly kind: string;
    constructor(kind: string);
    [key: string]: unknown;
}
export declare class DefaultLoggingMessageBus implements LoggingMessageBus {
    #private;
    private listeners;
    addListener(listener: MessageSink): void;
    removeListener(listener: MessageSink): void;
    send(message: Message): void;
    enabled(level: LogLevel): boolean;
    setLevel(level: LogLevel): this;
    fatal(error: Error, message?: string, ...args: unknown[]): this;
    fatal(message: string, ...args: unknown[]): this;
    error(error: Error, message?: string, ...args: unknown[]): this;
    error(message: string, ...args: unknown[]): this;
    warn(error: Error, message?: string, ...args: unknown[]): this;
    warn(message: string, ...args: unknown[]): this;
    info(error: Error, message?: string, ...args: unknown[]): this;
    info(message: string, ...args: unknown[]): this;
    debug(error: Error, message?: string, ...args: unknown[]): this;
    debug(message: string, ...args: unknown[]): this;
    trace(error: Error, message?: string, ...args: unknown[]): this;
    trace(message: string, ...args: unknown[]): this;
}
