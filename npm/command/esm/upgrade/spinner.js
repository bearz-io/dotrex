// deno-lint-ignore-file no-explicit-any
// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import { AnsiSettings } from "@bearz/ansi/settings";
import { stdout } from "@bearz/process";
import { AnsiModes } from "@bearz/ansi/enums";
const encoder = new TextEncoder();
const LINE_CLEAR = encoder.encode("\r\u001b[K"); // From cli/prompt_secret.ts
const COLOR_RESET = "\u001b[0m";
const DEFAULT_INTERVAL = 75;
const DEFAULT_SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const COLORS = {
    black: "\u001b[30m",
    red: "\u001b[31m",
    green: "\u001b[32m",
    yellow: "\u001b[33m",
    blue: "\u001b[34m",
    magenta: "\u001b[35m",
    cyan: "\u001b[36m",
    white: "\u001b[37m",
    gray: "\u001b[90m",
};
/**
 * A spinner that can be used to indicate that something is loading.
 *
 * @example Usage
 * ```ts no-eval
 * import { Spinner } from "./spinner.ts";
 *
 * const spinner = new Spinner({ message: "Loading...", color: "yellow" });
 * spinner.start();
 *
 * setTimeout(() => {
 *  spinner.stop();
 *  console.log("Finished loading!");
 * }, 3_000);
 * ```
 */
export class Spinner {
    #spinner;
    /**
     * The message to display next to the spinner.
     * This can be changed while the spinner is active.
     *
     * @example Usage
     * ```ts no-eval
     * import { Spinner } from "./spinner.ts";
     *
     * const spinner = new Spinner({ message: "Working..." });
     * spinner.start();
     *
     * for (let step = 0; step < 5; step++) {
     *   // do some work
     *   await new Promise((resolve) => setTimeout(resolve, 1000));
     *
     *   spinner.message = `Finished Step #${step}`;
     * }
     *
     * spinner.stop();
     * console.log("Done!");
     * ```
     */
    message;
    #interval;
    #color;
    #intervalId;
    #active = false;
    /**
     * Creates a new spinner.
     *
     * @example Usage
     * ```ts no-assert
     * import { Spinner } from "./spinner.ts";
     *
     * const spinner = new Spinner({ message: "Loading..." });
     * spinner.stop();
     * ```
     */
    constructor(
        { spinner = DEFAULT_SPINNER, message = "", interval = DEFAULT_INTERVAL, color } = {},
    ) {
        this.#spinner = spinner;
        this.message = message;
        this.#interval = interval;
        this.color = color;
    }
    /**
     * Set the color of the spinner. This defaults to the default terminal color.
     * This can be changed while the spinner is active.
     *
     * Providing `undefined` will use the default terminal color.
     *
     * @param value Color to set.
     *
     * @example Usage
     * ```ts no-eval
     * import { Spinner } from "./spinner.ts";
     *
     * const spinner = new Spinner({ message: "Loading...", color: "yellow" });
     * spinner.start();
     *
     * // do some work
     * await new Promise((resolve) => setTimeout(resolve, 1000));
     *
     * spinner.color = "magenta";
     * ```
     */
    set color(value) {
        this.#color = value ? COLORS[value] : undefined;
    }
    /**
     * Get the current color of the spinner.
     *
     * @example Usage
     * ```ts no-assert
     * import { Spinner } from "./spinner.ts";
     *
     * const spinner = new Spinner({ message: "Loading", color: "blue" });
     *
     * spinner.color; // Blue ANSI escape sequence
     * ```
     * @returns The color of the spinner or `undefined` if it's using the terminal default.
     */
    get color() {
        return this.#color;
    }
    /**
     * Starts the spinner.
     *
     * @example Usage
     * ```ts no-eval
     * import { Spinner } from "./spinner.ts";
     *
     * const spinner = new Spinner({ message: "Loading..." });
     * spinner.start();
     * ```
     */
    start() {
        // dnt-shim-ignore
        if (this.#active || globalThis.Deno?.stdout.writable.locked) {
            return;
        }
        this.#active = true;
        let i = 0;
        const noColor = AnsiSettings.current.mode === AnsiModes.None;
        // Updates the spinner after the given interval.
        const updateFrame = () => {
            const color = this.#color ?? "";
            const frame = encoder.encode(
                noColor
                    ? this.#spinner[i] + " " + this.message
                    : color + this.#spinner[i] + COLOR_RESET + " " + this.message,
            );
            // call writeSync once to reduce flickering
            const writeData = new Uint8Array(LINE_CLEAR.length + frame.length);
            writeData.set(LINE_CLEAR);
            writeData.set(frame, LINE_CLEAR.length);
            stdout.writeSync(writeData);
            i = (i + 1) % this.#spinner.length;
        };
        this.#intervalId = setInterval(updateFrame, this.#interval);
    }
    /**
     * Stops the spinner.
     *
     * @example Usage
     * ```ts no-eval
     * import { Spinner } from "./spinner.ts";
     *
     * const spinner = new Spinner({ message: "Loading..." });
     * spinner.start();
     *
     * setTimeout(() => {
     *  spinner.stop();
     *  console.log("Finished loading!");
     * }, 3_000);
     * ```
     */
    stop() {
        if (this.#intervalId && this.#active) {
            clearInterval(this.#intervalId);
            stdout.writeSync(LINE_CLEAR); // Clear the current line
            this.#active = false;
        }
    }
}
