/**
 * Standard, non-prefixed capabilities
 * @see https://www.w3.org/TR/webdriver/#dfn-table-of-standard-capabilities)
 */
export const STANDARD_CAPS: Readonly<Set<keyof import("@appium/types").StandardCapabilities>>;
/**
 * Returned by {@linkcode parseCaps }
 */
export type ParsedCaps<C extends import("@appium/types").Constraints> = {
    allFirstMatchCaps: NSCapabilities<C>[];
    validatedFirstMatchCaps: Capabilities<C>[];
    requiredCaps: NSCapabilities<C>;
    matchedCaps: Capabilities<C> | null;
    validationErrors: string[];
};
export type Constraints = import('@appium/types').Constraints;
export type Constraint = import('@appium/types').Constraint;
export type StringRecord = import('@appium/types').StringRecord;
export type BaseDriverCapConstraints = import('@appium/types').BaseDriverCapConstraints;
export type ConstraintsToCaps<C extends import("@appium/types").Constraints> = import('@appium/types').ConstraintsToCaps<C>;
export type ValidateCapsOpts = {
    /**
     * - if true, skip the presence constraint
     */
    skipPresenceConstraint?: boolean | undefined;
};
export type NSCapabilities<C extends import("@appium/types").Constraints> = import('@appium/types').NSCapabilities<C>;
export type Capabilities<C extends import("@appium/types").Constraints> = import('@appium/types').Capabilities<C>;
export type W3CCapabilities<C extends import("@appium/types").Constraints> = import('@appium/types').W3CCapabilities<C>;
export type StringKeyOf<T> = import('type-fest').StringKeyOf<T>;
/**
 * <T,U>
 */
export type MergeExclusive<T, U> = import('type-fest').MergeExclusive<T, U>;
/**
 * Returned by {@linkcode parseCaps}
 * @template {Constraints} C
 * @typedef ParsedCaps
 * @property {NSCapabilities<C>[]} allFirstMatchCaps
 * @property {Capabilities<C>[]} validatedFirstMatchCaps
 * @property {NSCapabilities<C>} requiredCaps
 * @property {Capabilities<C>|null} matchedCaps
 * @property {string[]} validationErrors
 */
/**
 * Parse capabilities
 * @template {Constraints} C
 * @param {W3CCapabilities<C>} caps
 * @param {C} [constraints]
 * @param {boolean} [shouldValidateCaps]
 * @see https://www.w3.org/TR/webdriver/#processing-capabilities
 * @returns {ParsedCaps<C>}
 */
export function parseCaps<C extends import("@appium/types").Constraints>(caps: import("@appium/types").W3CCapabilities<C>, constraints?: C | undefined, shouldValidateCaps?: boolean | undefined): ParsedCaps<C>;
/**
 * Calls parseCaps and just returns the matchedCaps variable
 * @template {Constraints} C
 * @template {W3CCapabilities<C>} W3CCaps
 * @param {W3CCaps} w3cCaps
 * @param {C} [constraints]
 * @param {boolean} [shouldValidateCaps]
 * @returns {Capabilities<C>}
 */
export function processCapabilities<C extends import("@appium/types").Constraints, W3CCaps extends import("@appium/types").W3CCapabilities<C>>(w3cCaps: W3CCaps, constraints?: C | undefined, shouldValidateCaps?: boolean | undefined): import("@appium/types").ConstraintsToCaps<C>;
/**
 * Validates caps against a set of constraints
 * @template {Constraints} C
 * @param {Capabilities<C>} caps
 * @param {C} [constraints]
 * @param {ValidateCapsOpts} [opts]
 * @returns {Capabilities<C>}
 */
export function validateCaps<C extends import("@appium/types").Constraints>(caps: import("@appium/types").ConstraintsToCaps<C>, constraints?: C | undefined, opts?: ValidateCapsOpts | undefined): import("@appium/types").ConstraintsToCaps<C>;
/**
 * Takes primary caps object and merges it into a secondary caps object.
 * @template {Constraints} T
 * @template {Constraints} U
 * @template {Capabilities<T>} Primary
 * @template {Capabilities<U>} Secondary
 * @param {Primary} [primary]
 * @param {Secondary} [secondary]
 * @returns {MergeExclusive<Primary, Secondary>}
 * @see https://www.w3.org/TR/webdriver/#dfn-merging-capabilities)
 */
export function mergeCaps<T extends import("@appium/types").Constraints, U extends import("@appium/types").Constraints, Primary extends import("@appium/types").ConstraintsToCaps<T>, Secondary extends import("@appium/types").ConstraintsToCaps<U>>(primary?: Primary | undefined, secondary?: Secondary | undefined): import("type-fest").MergeExclusive<Primary, Secondary>;
export const APPIUM_VENDOR_PREFIX: "appium:";
/**
 * Get an array of all the unprefixed caps that are being used in 'alwaysMatch' and all of the 'firstMatch' object
 * @template {Constraints} C
 * @param {W3CCapabilities<C>} caps A capabilities object
 */
export function findNonPrefixedCaps<C extends import("@appium/types").Constraints>({ alwaysMatch, firstMatch }: import("@appium/types").W3CCapabilities<C>): string[];
/**
 * @param {string} cap
 * @returns {boolean}
 */
export function isStandardCap(cap: string): boolean;
/**
 * If the 'appium:' prefix was provided and it's a valid capability, strip out the prefix
 * @template {Constraints} C
 * @param {NSCapabilities<C>} caps
 * @see https://www.w3.org/TR/webdriver/#dfn-extension-capabilities
 * @internal
 * @returns {Capabilities<C>}
 */
export function stripAppiumPrefixes<C extends import("@appium/types").Constraints>(caps: Partial<import("@appium/types").CapsToNSCaps<import("@appium/types").ConstraintsToCaps<C>, "appium">>): import("@appium/types").ConstraintsToCaps<C>;
/**
 * Return a copy of a capabilities object which has taken everything within the 'options'
 * capability and promoted it to the top level.
 *
 * @template {Constraints} C
 * @param {W3CCapabilities<C>} originalCaps
 * @return {W3CCapabilities<C>} the capabilities with 'options' promoted if necessary
 */
export function promoteAppiumOptions<C extends import("@appium/types").Constraints>(originalCaps: import("@appium/types").W3CCapabilities<C>): import("@appium/types").W3CCapabilities<C>;
/**
 * Return a copy of a "bare" (single-level, non-W3C) capabilities object which has taken everything
 * within the 'appium:options' capability and promoted it to the top level.
 *
 * @template {Constraints} C
 * @param {NSCapabilities<C>} obj
 * @return {NSCapabilities<C>} the capabilities with 'options' promoted if necessary
 */
export function promoteAppiumOptionsForObject<C extends import("@appium/types").Constraints>(obj: Partial<import("@appium/types").CapsToNSCaps<import("@appium/types").ConstraintsToCaps<C>, "appium">>): Partial<import("@appium/types").CapsToNSCaps<import("@appium/types").ConstraintsToCaps<C>, "appium">>;
export const PREFIXED_APPIUM_OPTS_CAP: "appium:options";
//# sourceMappingURL=capabilities.d.ts.map