import type { AnsiLogLevel } from "@bearz/ansi/enums";
import type { AnsiWriter } from "@bearz/ansi/writer";
import type { SecretMasker } from "@bearz/secrets/masker";

export type LogLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const LogLevels = {
    None: 0 as LogLevel,
    Critical: 1 as LogLevel,
    Error: 2 as LogLevel,
    Warning: 3 as LogLevel,
    Info: 4 as LogLevel,
    Debug: 5 as LogLevel,
    Trace: 6 as LogLevel,

    /**
     * Gets the names of the log levels.
     * @returns {string[]} Array of log level names
     */
    names: function (): string[] {
        return ["none", "critical", "error", "warning", "notice", "information", "debug", "trace"];
    },

    /**
     * Gets the values of the log levels.
     * @returns {number[]} Array of log level values
     */
    values: function (): number[] {
        return [0, 2, 3, 4, 5, 6, 7, 8];
    },

    /**
     * Gets the numeric value of the log level.
     * @param name The name of the log level/
     * @returns The numeric value of the log level.
     */
    toValue: function (name: string): number {
        switch (name) {
            case "none":
            case "None":
                return 0;
            case "critical":
            case "Critical":
            case "fatal":
            case "Fatal":
                return 2;
            case "error":
            case "Error":
                return 3;
            case "warn":
            case "Warn":
            case "warning":
            case "Warning":
                return 4;
            case "notice":
            case "Notice":
                return 5;
            case "info":
            case "Info":
            case "information":
            case "Information":
                return 6;
            case "debug":
            case "Debug":
                return 7;
            case "trace":
            case "Trace":
                return 8;
        }

        return 4;
    },

    /**
     * Gets the string representation of the log level.
     * @param value The numeric value of the log level.
     * @returns The string representation of the log level.
     */
    toString: function (value: number | LogLevel | AnsiLogLevel): string {
        switch (value) {
            case 0:
                return "none";
            case 2:
                return "critical";
            case 3:
                return "error";
            case 4:
                return "warning";
            case 5:
                return "notice";
            case 6:
                return "information";
            case 7:
                return "debug";
            case 8:
                return "trace";
        }

        return "";
    },
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
