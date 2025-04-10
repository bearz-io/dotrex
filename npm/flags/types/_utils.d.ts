import type { FlagOptions } from "./types.js";
/** Options for {@linkcode closestString}. */
export interface ClosestStringOptions {
    /**
     * Whether the distance should include case.
     *
     * @default {false}
     */
    caseSensitive?: boolean;
    /**
     * A custom comparison function to use for comparing strings.
     *
     * @param a The first string for comparison.
     * @param b The second string for comparison.
     * @returns The distance between the two strings.
     * @default {levenshteinDistance}
     */
    compareFn?: (a: string, b: string) => number;
}
/**
 * Finds the most similar string from an array of strings.
 *
 * By default, calculates the distance between words using the
 * {@link https://en.wikipedia.org/wiki/Levenshtein_distance | Levenshtein distance}.
 *
 * @example Usage
 * ```ts
 * import { closestString } from "@std/text/closest-string";
 * import { assertEquals } from "@std/assert";
 *
 * const possibleWords = ["length", "size", "blah", "help"];
 * const suggestion = closestString("hep", possibleWords);
 *
 * assertEquals(suggestion, "help");
 * ```
 *
 * @param givenWord The string to measure distance against
 * @param possibleWords The string-array to pick the closest string from
 * @param options The options for the comparison.
 * @returns The closest string
 */
export declare function closestString(
    givenWord: string,
    possibleWords: ReadonlyArray<string>,
    options?: ClosestStringOptions,
): string;
/**
 * Calculates the
 * {@link https://en.wikipedia.org/wiki/Levenshtein_distance | Levenshtein distance}
 * between two strings.
 *
 * > [!NOTE]
 * > The complexity of this function is O(m * n), where m and n are the lengths
 * > of the two strings. It's recommended to limit the length and validate input
 * > if arbitrarily accepting input.
 *
 * @example Usage
 * ```ts
 * import { levenshteinDistance } from "@std/text/levenshtein-distance";
 * import { assertEquals } from "@std/assert";
 *
 * assertEquals(levenshteinDistance("aa", "bb"), 2);
 * ```
 * @param str1 The first string.
 * @param str2 The second string.
 * @returns The Levenshtein distance between the two strings.
 */
export declare function levenshteinDistance(str1: string, str2: string): number;
/** Convert param case string to camel case. */
export declare function paramCaseToCamelCase(str: string): string;
/**
 * Find option by flag, name or alias.
 *
 * @param flags Source options array.
 * @param name  Name of the option.
 */
export declare function getOption<O extends FlagOptions>(
    flags: Array<O>,
    name: string,
): O | undefined;
export declare function didYouMeanOption(option: string, options: Array<FlagOptions>): string;
export declare function didYouMeanType(type: string, types: Array<string>): string;
export declare function didYouMean(message: string, type: string, types: Array<string>): string;
export declare function getFlag(name: string): string;
export declare function matchWildCardOptions(
    name: string,
    flags: Array<FlagOptions>,
): FlagOptions | undefined;
export declare function getDefaultValue(option: FlagOptions): unknown;
