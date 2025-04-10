// Copyright 2018-2025 the Deno authors. MIT license.
// This module is browser compatible.
const { ceil } = Math;
// This implements Myers' bit-vector algorithm as described here:
// https://dl.acm.org/doi/pdf/10.1145/316542.316550
const peq = new Uint32Array(0x110000);
function myers32(t, p) {
  const n = t.length;
  const m = p.length;
  for (let i = 0; i < m; i++) {
    peq[p[i].codePointAt(0)] |= 1 << i;
  }
  const last = m - 1;
  let pv = -1;
  let mv = 0;
  let score = m;
  for (let j = 0; j < n; j++) {
    const eq = peq[t[j].codePointAt(0)];
    const xv = eq | mv;
    const xh = (((eq & pv) + pv) ^ pv) | eq;
    let ph = mv | ~(xh | pv);
    let mh = pv & xh;
    score += ((ph >>> last) & 1) - ((mh >>> last) & 1);
    // Set the horizontal delta in the first row to +1
    // because we are computing the distance between two full strings.
    ph = (ph << 1) | 1;
    mh = mh << 1;
    pv = mh | ~(xv | ph);
    mv = ph & xv;
  }
  for (let i = 0; i < m; i++) {
    peq[p[i].codePointAt(0)] = 0;
  }
  return score;
}
function myersX(t, p) {
  const n = t.length;
  const m = p.length;
  // Initialize the horizontal deltas to +1.
  const h = new Int8Array(n).fill(1);
  const bmax = ceil(m / 32) - 1;
  // Process the blocks row by row so that we can use the fixed-size peq array.
  for (let b = 0; b < bmax; b++) {
    const start = b * 32;
    const end = (b + 1) * 32;
    for (let i = start; i < end; i++) {
      peq[p[i].codePointAt(0)] |= 1 << i;
    }
    let pv = -1;
    let mv = 0;
    for (let j = 0; j < n; j++) {
      const hin = h[j];
      let eq = peq[t[j].codePointAt(0)];
      const xv = eq | mv;
      eq |= hin >>> 31;
      const xh = (((eq & pv) + pv) ^ pv) | eq;
      let ph = mv | ~(xh | pv);
      let mh = pv & xh;
      h[j] = (ph >>> 31) - (mh >>> 31);
      ph = (ph << 1) | (-hin >>> 31);
      mh = (mh << 1) | (hin >>> 31);
      pv = mh | ~(xv | ph);
      mv = ph & xv;
    }
    for (let i = start; i < end; i++) {
      peq[p[i].codePointAt(0)] = 0;
    }
  }
  const start = bmax * 32;
  for (let i = start; i < m; i++) {
    peq[p[i].codePointAt(0)] |= 1 << i;
  }
  const last = m - 1;
  let pv = -1;
  let mv = 0;
  let score = m;
  for (let j = 0; j < n; j++) {
    const hin = h[j];
    let eq = peq[t[j].codePointAt(0)];
    const xv = eq | mv;
    eq |= hin >>> 31;
    const xh = (((eq & pv) + pv) ^ pv) | eq;
    let ph = mv | ~(xh | pv);
    let mh = pv & xh;
    score += ((ph >>> last) & 1) - ((mh >>> last) & 1);
    ph = (ph << 1) | (-hin >>> 31);
    mh = (mh << 1) | (hin >>> 31);
    pv = mh | ~(xv | ph);
    mv = ph & xv;
  }
  for (let i = start; i < m; i++) {
    peq[p[i].codePointAt(0)] = 0;
  }
  return score;
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
export function closestString(givenWord, possibleWords, options) {
  if (possibleWords.length === 0) {
    throw new TypeError(
      "When using closestString(), the possibleWords array must contain at least one word",
    );
  }
  const { caseSensitive, compareFn = levenshteinDistance } = { ...options };
  if (!caseSensitive) {
    givenWord = givenWord.toLowerCase();
  }
  let nearestWord = possibleWords[0];
  let closestStringDistance = Infinity;
  for (const each of possibleWords) {
    const distance = caseSensitive
      ? compareFn(givenWord, each)
      : compareFn(givenWord, each.toLowerCase());
    if (distance < closestStringDistance) {
      nearestWord = each;
      closestStringDistance = distance;
    }
  }
  return nearestWord;
}
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
export function levenshteinDistance(str1, str2) {
  let t = [...str1];
  let p = [...str2];
  if (t.length < p.length) {
    [p, t] = [t, p];
  }
  if (p.length === 0) {
    return t.length;
  }
  return p.length <= 32 ? myers32(t, p) : myersX(t, p);
}
/** Convert param case string to camel case. */
export function paramCaseToCamelCase(str) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}
/**
 * Find option by flag, name or alias.
 *
 * @param flags Source options array.
 * @param name  Name of the option.
 */
export function getOption(flags, name) {
  while (name[0] === "-") {
    name = name.slice(1);
  }
  for (const flag of flags) {
    if (isOption(flag, name)) {
      return flag;
    }
  }
  return;
}
export function didYouMeanOption(option, options) {
  const optionNames = options
    .map((option) => [option.name, ...(option.aliases ?? [])])
    .flat()
    .map((option) => getFlag(option));
  return didYouMean(" Did you mean option", getFlag(option), optionNames);
}
export function didYouMeanType(type, types) {
  return didYouMean(" Did you mean type", type, types);
}
export function didYouMean(message, type, types) {
  const match = types.length ? closestString(type, types) : undefined;
  return match ? `${message} "${match}"?` : "";
}
export function getFlag(name) {
  if (name.startsWith("-")) {
    return name;
  }
  if (name.length > 1) {
    return `--${name}`;
  }
  return `-${name}`;
}
/**
 * Check if option has name or alias.
 *
 * @param option    The option to check.
 * @param name      The option name or alias.
 */
function isOption(option, name) {
  return option.name === name ||
    (option.aliases && option.aliases.indexOf(name) !== -1);
}
export function matchWildCardOptions(name, flags) {
  for (const option of flags) {
    if (option.name.indexOf("*") === -1) {
      continue;
    }
    let matched = matchWildCardOption(name, option);
    if (matched) {
      matched = { ...matched, name };
      flags.push(matched);
      return matched;
    }
  }
}
function matchWildCardOption(name, option) {
  const parts = option.name.split(".");
  const parts2 = name.split(".");
  if (parts.length !== parts2.length) {
    return false;
  }
  const count = Math.max(parts.length, parts2.length);
  for (let i = 0; i < count; i++) {
    if (parts[i] !== parts2[i] && parts[i] !== "*") {
      return false;
    }
  }
  return option;
}
export function getDefaultValue(option) {
  return typeof option.default === "function"
    ? option.default()
    : option.default;
}
