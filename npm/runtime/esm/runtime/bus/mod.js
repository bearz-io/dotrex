import { LogLevel } from "./types.js";
export { LogLevel };
export function logLevelToString(level) {
    switch (level) {
        case LogLevel.Trace:
            return "trace";
        case LogLevel.Debug:
            return "debug";
        case LogLevel.Info:
            return "info";
        case LogLevel.Warn:
            return "warn";
        case LogLevel.Error:
            return "error";
        case LogLevel.Fatal:
            return "fatal";
        default:
            return "unknown";
    }
}
export class LogMessage {
    error;
    message;
    args;
    level;
    timestamp = new Date();
    kind;
    constructor(level, error, message, args) {
        this.kind = "log";
        this.level = level;
        this.error = error;
        this.message = message;
        this.args = args;
    }
}
export class BaseMessage {
    kind;
    constructor(kind) {
        this.kind = kind;
    }
}
export class DefaultLoggingMessageBus {
    #level = LogLevel.Info;
    listeners = [];
    addListener(listener) {
        this.listeners.push(listener);
    }
    removeListener(listener) {
        const index = this.listeners.indexOf(listener);
        if (index >= 0) {
            this.listeners.splice(index, 1);
        }
    }
    send(message) {
        this.listeners.forEach((listener) => listener(message));
    }
    enabled(level) {
        return this.#level >= level;
    }
    setLevel(level) {
        this.#level = level;
        return this;
    }
    fatal() {
        const first = arguments[0];
        let args = undefined;
        let message = undefined;
        let error = undefined;
        if (first instanceof Error) {
            error = first;
            message = arguments[1];
            args = Array.prototype.slice.call(arguments, 2);
        }
        else {
            message = first;
            args = Array.prototype.slice.call(arguments, 1);
        }
        this.send(new LogMessage(LogLevel.Fatal, error, message, args));
        return this;
    }
    error() {
        const first = arguments[0];
        let args = undefined;
        let message = undefined;
        let error = undefined;
        if (first instanceof Error) {
            error = first;
            message = arguments[1];
            args = Array.prototype.slice.call(arguments, 2);
        }
        else {
            message = first;
            args = Array.prototype.slice.call(arguments, 1);
        }
        this.send(new LogMessage(LogLevel.Error, error, message, args));
        return this;
    }
    warn() {
        const first = arguments[0];
        let args = undefined;
        let message = undefined;
        let error = undefined;
        if (first instanceof Error) {
            error = first;
            message = arguments[1];
            args = Array.prototype.slice.call(arguments, 2);
        }
        else {
            message = first;
            args = Array.prototype.slice.call(arguments, 1);
        }
        this.send(new LogMessage(LogLevel.Warn, error, message, args));
        return this;
    }
    info() {
        const first = arguments[0];
        let args = undefined;
        let message = undefined;
        let error = undefined;
        if (first instanceof Error) {
            error = first;
            message = arguments[1];
            args = Array.prototype.slice.call(arguments, 2);
        }
        else {
            message = first;
            args = Array.prototype.slice.call(arguments, 1);
        }
        this.send(new LogMessage(LogLevel.Info, error, message, args));
        return this;
    }
    debug() {
        const first = arguments[0];
        let args = undefined;
        let message = undefined;
        let error = undefined;
        if (first instanceof Error) {
            error = first;
            message = arguments[1];
            args = Array.prototype.slice.call(arguments, 2);
        }
        else {
            message = first;
            args = Array.prototype.slice.call(arguments, 1);
        }
        this.send(new LogMessage(LogLevel.Debug, error, message, args));
        return this;
    }
    trace() {
        const first = arguments[0];
        let args = undefined;
        let message = undefined;
        let error = undefined;
        if (first instanceof Error) {
            error = first;
            message = arguments[1];
            args = Array.prototype.slice.call(arguments, 2);
        }
        else {
            message = first;
            args = Array.prototype.slice.call(arguments, 1);
        }
        this.send(new LogMessage(LogLevel.Trace, error, message, args));
        return this;
    }
}
