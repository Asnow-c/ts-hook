import {
    CodeError,
    ERR_INVALID_MODULE_SPECIFIER,
    ERR_INVALID_PACKAGE_CONFIG,
    importNotDefined,
    invalidPackageTarget,
    throwInvalidSubpath,
} from "../errors/error.mjs";

class ExportsMatcher {
    static EXPORTS_PATTERN = /^((?:@[^/\\%]+\/)?[^./\\%][^/\\%]*)(\/.*)?$/;
    private exports: PkgExports | null;
    constructor(exports: PkgExports | PkgExportsItemValue) {
        if (isConditionalExportsMainSugar(exports)) exports = { ".": exports } as PkgExports;
        this.exports = exports as PkgExports;
    }
    replace(request: string) {
        if (!this.exports) return;
        const { 1: name, 2: expansion = "" } = ExportsMatcher.EXPORTS_PATTERN.exec(request) ?? [];
        if (!name) return;
        const subPath = "." + expansion;

        let mathValue = this.exports[subPath];
        if (mathValue && !subPath.includes("*") && !subPath.endsWith("/")) {
            const target = exports[subPath];
            return resolvePackageTarget(packageJSONUrl, target, "", subPath, base, false, false, false, conditions);
        }

        let bestMatch = "";
        let bestMatchSubpath;
        const packageSubpath = subPath;
        for (const [key, matchValue] of Object.entries(this.exports)) {
            const patternIndex = key.indexOf("*");
            if (patternIndex !== -1 && packageSubpath.startsWith(key.slice(0, patternIndex))) {
                const patternTrailer = key.slice(patternIndex + 1);
                if (
                    packageSubpath.length >= key.length &&
                    packageSubpath.endsWith(patternTrailer) &&
                    patternKeyCompare(bestMatch, key) === 1 &&
                    key.lastIndexOf("*") === patternIndex
                ) {
                    bestMatch = key;
                    bestMatchSubpath = packageSubpath.slice(
                        patternIndex,
                        packageSubpath.length - patternTrailer.length
                    );
                }
            }
        }
        if (bestMatch) {
            const target = exports[bestMatch];
            return resolvePackageTarget(
                packageJSONUrl,
                target,
                bestMatchSubpath,
                bestMatch,
                base,
                true,
                false,
                packageSubpath.endsWith("/"),
                conditions
            );
        }
    }
}
class ImportsMatcher {
    constructor(imports: Record<string, string>) {}
}

/**
 * @param {string} name
 * @param {string | URL | undefined} base
 * @param {Set<string>} conditions
 * @returns {URL}
 */
function packageImportsResolve(name: string, base: string | URL | undefined, conditions: Set<string>) {
    if (name === "#" || name.startsWith("#/") || name.endsWith("/")) {
        const reason = "is not a valid internal imports specifier name";
        throw new ERR_INVALID_MODULE_SPECIFIER(name, reason, fileURLToPath(base));
    }
    let packageJSONUrl: URL;
    const packageConfig = getPackageScopeConfig(base);
    if (packageConfig.exists) {
        packageJSONUrl = pathToFileURL(packageConfig.pjsonPath);
        const imports = packageConfig.imports;
        if (imports) {
            if (Object.hasOwn(imports, name) && !name.includes("*")) {
                const resolveResult = resolvePackageTarget(
                    packageJSONUrl,
                    imports[name],
                    "",
                    name,
                    base,
                    false,
                    true,
                    false,
                    conditions
                );
                if (resolveResult != null) {
                    return resolveResult;
                }
            } else {
                let bestMatch = "";
                let bestMatchSubpath;
                const keys = Object.getOwnPropertyNames(imports);
                for (let i = 0; i < keys.length; i++) {
                    const key = keys[i];
                    const patternIndex = key.indexOf("*");
                    if (patternIndex !== -1 && name.startsWith(key.slice(0, patternIndex))) {
                        const patternTrailer = key.slice(patternIndex + 1);
                        if (
                            name.length >= key.length &&
                            name.endsWith(patternTrailer) &&
                            patternKeyCompare(bestMatch, key) === 1 &&
                            key.lastIndexOf("*") === patternIndex
                        ) {
                            bestMatch = key;
                            bestMatchSubpath = name.slice(patternIndex, name.length - patternTrailer.length);
                        }
                    }
                }

                if (bestMatch) {
                    const target = imports[bestMatch];
                    const resolveResult = resolvePackageTarget(
                        packageJSONUrl,
                        target,
                        bestMatchSubpath,
                        bestMatch,
                        base,
                        true,
                        true,
                        false,
                        conditions
                    );
                    if (resolveResult != null) {
                        return resolveResult;
                    }
                }
            }
        }
    }
    throw importNotDefined(name, packageJSONUrl, base);
}
function isConditionalExportsMainSugar(exports: PkgExports | PkgExportsItemValue) {
    if (typeof exports === "string" || Array.isArray(exports)) return true;
    if (typeof exports !== "object" || exports === null) return false;

    let isConditionalSugar = false;
    let i = 0;
    for (const key of Object.keys(exports)) {
        const curIsConditionalSugar = key === "" || key[0] !== ".";
        if (i++ === 0) {
            isConditionalSugar = curIsConditionalSugar;
        } else if (isConditionalSugar !== curIsConditionalSugar) {
            throw new CodeError(
                "\"exports\" cannot contain some keys starting with '.' and some not." +
                    " The exports object must either be an object of package subpath keys" +
                    " or an object of main entry condition name keys only.",
                "ERR_INVALID_PACKAGE_CONFIG"
            );
        }
    }

    return isConditionalSugar;
}

function patternKeyCompare(a: string, b: string) {
    const aPatternIndex = a.indexOf("*");
    const bPatternIndex = b.indexOf("*");
    const baseLenA = aPatternIndex === -1 ? a.length : aPatternIndex + 1;
    const baseLenB = bPatternIndex === -1 ? b.length : bPatternIndex + 1;
    if (baseLenA > baseLenB) return -1;
    if (baseLenB > baseLenA) return 1;
    if (aPatternIndex === -1) return 1;
    if (bPatternIndex === -1) return -1;
    if (a.length > b.length) return -1;
    if (b.length > a.length) return 1;
    return 0;
}

function resolvePackageTarget(
    packageJSONUrl: URL,
    target: PkgExportsItemValue,
    subpath: string,
    packageSubpath: string,
    base: string | URL | undefined,
    pattern: boolean,
    internal: boolean,
    isPathMap: boolean,
    conditions: Set<string>
): URL | null | undefined {
    if (typeof target === "string") {
        return resolvePackageTargetString(
            target,
            subpath,
            packageSubpath,
            packageJSONUrl,
            base,
            pattern,
            internal,
            isPathMap,
            conditions
        );
    } else if (Array.isArray(target)) {
        if (target.length === 0) return null;

        let lastException;
        for (let i = 0; i < target.length; i++) {
            const targetItem = target[i];
            let resolveResult;
            try {
                resolveResult = resolvePackageTarget(
                    packageJSONUrl,
                    targetItem,
                    subpath,
                    packageSubpath,
                    base,
                    pattern,
                    internal,
                    isPathMap,
                    conditions
                );
            } catch (e) {
                lastException = e;
                if ((e as CodeError).code === "ERR_INVALID_PACKAGE_TARGET") continue;
                throw e;
            }
            if (resolveResult === undefined) continue;

            if (resolveResult === null) {
                lastException = null;
                continue;
            }
            return resolveResult;
        }
        if (lastException === undefined || lastException === null) return lastException;
        throw lastException;
    } else if (typeof target === "object" && target !== null) {
        const keys = Object.getOwnPropertyNames(target);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (isArrayIndex(key)) {
                throw new ERR_INVALID_PACKAGE_CONFIG(
                    fileURLToPath(packageJSONUrl),
                    base,
                    '"exports" cannot contain numeric property keys.'
                );
            }
        }
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (key === "default" || conditions.has(key)) {
                const conditionalTarget = target[key];
                const resolveResult = resolvePackageTarget(
                    packageJSONUrl,
                    conditionalTarget,
                    subpath,
                    packageSubpath,
                    base,
                    pattern,
                    internal,
                    isPathMap,
                    conditions
                );
                if (resolveResult === undefined) continue;
                return resolveResult;
            }
        }
        return undefined;
    } else if (target === null) return null;
    throw invalidPackageTarget(packageSubpath, target, packageJSONUrl, internal, base);
}
function isArrayIndex(key: string) {
    const keyNum = +key;
    if (`${keyNum}` !== key) return false;
    return keyNum >= 0 && keyNum < 0xffff_ffff;
}

function resolvePackageTargetString(
    target: string,
    subpath: string,
    match: string,
    packageJSONUrl: URL,
    base: string | URL | undefined,
    pattern: boolean,
    internal: boolean,
    isPathMap: boolean,
    conditions: Set<string>
): URL {
    if (subpath !== "" && !pattern && target[target.length - 1] !== "/")
        throw invalidPackageTarget(match, target, packageJSONUrl, internal, base);

    if (!target.startsWith("./")) {
        if (internal && !target.startsWith("../") && !target.startsWith("/")) {
            // No need to convert target to string, since it's already presumed to be
            if (!canParseURL(target)) {
                const exportTarget = pattern ? patternRegEx[Symbol.replace](target, () => subpath) : target + subpath;
                return packageResolve(exportTarget, packageJSONUrl, conditions);
            }
        }
        throw invalidPackageTarget(match, target, packageJSONUrl, internal, base);
    }

    if (invalidSegmentRegEx.exec(target.slice(2)) !== null) {
        if (deprecatedInvalidSegmentRegEx.exec(target.slice(2)) === null) {
            if (!isPathMap) {
                const request = pattern ? match.replace("*", () => subpath) : match + subpath;
                const resolvedTarget = pattern ? patternRegEx[Symbol.replace](target, () => subpath) : target;
                emitInvalidSegmentDeprecation(resolvedTarget, request, match, packageJSONUrl, internal, base, true);
            }
        } else {
            throw invalidPackageTarget(match, target, packageJSONUrl, internal, base);
        }
    }

    const resolved = new URL(target, packageJSONUrl);
    const resolvedPath = resolved.pathname;
    const packagePath = new URL(".", packageJSONUrl).pathname;

    if (!resolvedPath.startsWith(packagePath))
        throw invalidPackageTarget(match, target, packageJSONUrl, internal, base);

    if (subpath === "") return resolved;

    if (invalidSegmentRegEx.exec(subpath) !== null) {
        const request = pattern ? match.replace("*", () => subpath) : match + subpath;
        if (deprecatedInvalidSegmentRegEx.exec(subpath) === null) {
            if (!isPathMap) {
                const resolvedTarget = pattern ? patternRegEx[Symbol.replace](target, () => subpath) : target;
                emitInvalidSegmentDeprecation(resolvedTarget, request, match, packageJSONUrl, internal, base, false);
            }
        } else throwInvalidSubpath(request, match, packageJSONUrl, internal, base);
    }

    if (pattern) return new URL(patternRegEx[Symbol.replace](resolved.href, () => subpath));

    return new URL(subpath, resolved);
}
const invalidSegmentRegEx =
    /(^|\\|\/)((\.|%2e)(\.|%2e)?|(n|%6e|%4e)(o|%6f|%4f)(d|%64|%44)(e|%65|%45)(_|%5f)(m|%6d|%4d)(o|%6f|%4f)(d|%64|%44)(u|%75|%55)(l|%6c|%4c)(e|%65|%45)(s|%73|%53))?(\\|\/|$)/i;
const deprecatedInvalidSegmentRegEx =
    /(^|\\|\/)((\.|%2e)(\.|%2e)?|(n|%6e|%4e)(o|%6f|%4f)(d|%64|%44)(e|%65|%45)(_|%5f)(m|%6d|%4d)(o|%6f|%4f)(d|%64|%44)(u|%75|%55)(l|%6c|%4c)(e|%65|%45)(s|%73|%53))(\\|\/|$)/i;
const patternRegEx = /\*/g;
