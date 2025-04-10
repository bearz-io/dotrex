import type { AnsiLogLevel } from "@bearz/ansi/enums";
import type { AnsiWriter } from "@bearz/ansi/writer";
import type { SecretMasker } from "@bearz/secrets/masker";
export type LogLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export declare const LogLevels: {
    None: LogLevel;
    Critical: LogLevel;
    Error: LogLevel;
    Warning: LogLevel;
    Info: LogLevel;
    Debug: LogLevel;
    Trace: LogLevel;
    /**
     * Gets the names of the log levels.
     * @returns {string[]} Array of log level names
     */
    names: () => string[];
    /**
     * Gets the values of the log levels.
     * @returns {number[]} Array of log level values
     */
    values: () => number[];
    /**
     * Gets the numeric value of the log level.
     * @param name The name of the log level/
     * @returns The numeric value of the log level.
     */
    toValue: (name: string) => number;
    /**
     * Gets the string representation of the log level.
     * @param value The numeric value of the log level.
     * @returns The string representation of the log level.
     */
    toString: (value: number | LogLevel | AnsiLogLevel) => string;
};
export interface HostWriter extends AnsiWriter {
    readonly secretMasker: SecretMasker;
    mask(value: string): this;
    maskLine(value: string): this;
    /**
     * Determines if the log level is enabled.
     * @param level The log level.
     */
    enabled(level: LogLevel | AnsiLogLevel): boolean;
    /**
     * Sets the log level.
     * @param level The log level.
     */
    setLogLevel(level: LogLevel): this;
    /**
     * Skips a group of messages.
     * @param name The group name.
     */
    skipGroup(name: string): this;
}
