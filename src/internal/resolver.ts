import { fileURLToPath, pathToFileURL } from "node:url";
import type { PackageConfig } from "./pkg";
import { ExtraModule } from "./common_loader";
import * as Path from "node:path";
import {
    ERR_INVALID_MODULE_SPECIFIER,
    ERR_INVALID_PACKAGE_CONFIG,
    createEsmNotFoundErr,
    exportsNotFound,
    importNotDefined,
    invalidPackageTarget,
} from "./errors/error.js";
import * as fs from "node:fs";

//todo: 模块解析

// This only applies to requests of a specific form:
// 1. name/.*
// 2. @scope/name/.*
const EXPORTS_PATTERN = /^((?:@[^/\\%]+\/)?[^./\\%][^/\\%]*)(\/.*)?$/;
function resolveExports(nmPath: string, request: string, conditions: Set<string>) {
    // The implementation's behavior is meant to mirror resolution in ESM.
    const { 1: name, 2: expansion = "" } = EXPORTS_PATTERN.exec(request) ?? ({} as any);
    if (!name) return;
    const pkgPath = Path.resolve(nmPath, name);
    const pkg = ExtraModule._readPackage(pkgPath);
    if (pkg && pkg.exists && pkg.exports != null) {
        return finalizeEsmResolution(
            packageExportsResolve(pathToFileURL(pkgPath + "/package.json"), "." + expansion, pkg, null, conditions),
            null,
            pkgPath
        );
    }
}
function finalizeEsmResolution(resolved: URL, parentPath: string | null, pkgPath: string) {
    const { encodedSepRegEx } = require("internal/modules/esm/resolve");
    if (encodedSepRegEx.exec(resolved) !== null)
        throw new ERR_INVALID_MODULE_SPECIFIER(resolved, 'must not include encoded "/" or "\\" characters', parentPath);
    const filename = fileURLToPath(resolved);
    const actual = tryFile(filename);
    if (actual) return actual;
    const err = createEsmNotFoundErr(filename, Path.resolve(pkgPath, "package.json"));
    throw err;
}

function packageImportsResolve(name: string, base: string | URL, conditions: Set<string>): URL {
    if (name === "#" || name.startsWith("#/") || name.endsWith("/")) {
        const reason = "is not a valid internal imports specifier name";
        throw new ERR_INVALID_MODULE_SPECIFIER(name, reason, fileURLToPath(base!));
    }
    let packageJSONUrl = pathToFileURL(Path.resolve(fileURLToPath(base), "package.json"));
    const packageConfig = ExtraModule._readPackage(fileURLToPath(base));
    if (packageConfig && packageConfig.exists) {
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

function resolvePackageTarget(
    packageJSONUrl: URL,
    target: string | [string],
    subpath: string,
    packageSubpath: string,
    base: string | URL,
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
        if (target.length === 0) {
            return null;
        }

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
                if (e.code === "ERR_INVALID_PACKAGE_TARGET") {
                    continue;
                }
                throw e;
            }
            if (resolveResult === undefined) {
                continue;
            }
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
    } else if (target === null) {
        return null;
    }
    throw invalidPackageTarget(packageSubpath, target, packageJSONUrl, internal, base);
}

function packageExportsResolve(
    packageJSONUrl: URL,
    packageSubpath: string,
    packageConfig: PackageConfig,
    base: string | URL | undefined | null,
    conditions: Set<string>
): URL {
    let exports = packageConfig.exports ?? {};
    if (isConditionalExportsMainSugar(exports, packageJSONUrl, base)) exports = { ".": exports };

    if (Object.hasOwn(exports, packageSubpath) && !packageSubpath.includes("*") && !packageSubpath.endsWith("/")) {
        const target = exports[packageSubpath];
        const resolveResult = resolvePackageTarget(
            packageJSONUrl,
            target,
            "",
            packageSubpath,
            base,
            false,
            false,
            false,
            conditions
        );

        if (resolveResult == null) {
            throw exportsNotFound(packageSubpath, packageJSONUrl, base);
        }

        return resolveResult;
    }

    let bestMatch = "";
    let bestMatchSubpath;
    const keys = Object.getOwnPropertyNames(exports);
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
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
                bestMatchSubpath = packageSubpath.slice(patternIndex, packageSubpath.length - patternTrailer.length);
            }
        }
    }

    if (bestMatch) {
        const target = exports[bestMatch];
        const resolveResult = resolvePackageTarget(
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

        if (resolveResult == null) {
            throw exportsNotFound(packageSubpath, packageJSONUrl, base);
        }
        return resolveResult;
    }

    throw exportsNotFound(packageSubpath, packageJSONUrl, base);
}

function isConditionalExportsMainSugar(
    exports: Record<string, any>,
    packageJSONUrl: URL,
    base?: string | URL | null
): boolean {
    if (typeof exports === "string" || Array.isArray(exports)) return true;
    if (typeof exports !== "object" || exports === null) return false;

    const keys = Object.getOwnPropertyNames(exports);
    let isConditionalSugar = false;
    let i = 0;
    for (let j = 0; j < keys.length; j++) {
        const key = keys[j];
        const curIsConditionalSugar = key === "" || key[0] !== ".";
        if (i++ === 0) {
            isConditionalSugar = curIsConditionalSugar;
        } else if (isConditionalSugar !== curIsConditionalSugar) {
            throw new ERR_INVALID_PACKAGE_CONFIG(
                fileURLToPath(packageJSONUrl),
                base,
                "\"exports\" cannot contain some keys starting with '.' and some not." +
                    " The exports object must either be an object of package subpath keys" +
                    " or an object of main entry condition name keys only."
            );
        }
    }
    return isConditionalSugar;
}
// Check if the file exists and is not a directory
// if using --preserve-symlinks and isMain is false,
// keep symlinks intact, otherwise resolve to the
// absolute realpath.
function tryFile(requestPath: string, isMain?: boolean) {
    const info = fs.statSync(requestPath);
    if (info.isFile()) return requestPath;
    else if (info.isSymbolicLink() && !isMain) {
        return fs.readlinkSync(requestPath);
    }
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
/**
 *
 * @param {string} target
 * @param {*} subpath
 * @param {*} match
 * @param {*} packageJSONUrl
 * @param {*} base
 * @param {*} pattern
 * @param {*} internal
 * @param {*} isPathMap
 * @param {*} conditions
 * @returns {URL}
 */
function resolvePackageTargetString(
    target: string,
    subpath: string,
    match: string,
    packageJSONUrl: URL,
    base: string | URL | null | undefined,
    pattern,
    internal: boolean,
    isPathMap: boolean,
    conditions: Set<string>
) {
    if (subpath !== "" && !pattern && target[target.length - 1] !== "/")
        throw invalidPackageTarget(match, target, packageJSONUrl, internal, base);

    if (!target.startsWith("./")) {
        if (internal && !target.startsWith("../") && !target.startsWith("/")) {
            // No need to convert target to string, since it's already presumed to be
            if (!URLCanParse(target)) {
                const exportTarget = pattern ? RegExpPrototypeSymbolReplace(target, () => subpath) : target + subpath;
                return packageResolve(exportTarget, packageJSONUrl, conditions);
            }
        }
        throw invalidPackageTarget(match, target, packageJSONUrl, internal, base);
    }

    if (invalidSegmentRegEx.exec(target.slice(2)) !== null) {
        if (deprecatedInvalidSegmentRegEx.exec(target.slice(2)) === null) {
            if (!isPathMap) {
                const request = pattern ? match.replace("*", () => subpath) : match + subpath;
                const resolvedTarget = pattern
                    ? RegExpPrototypeSymbolReplace(patternRegEx, target, () => subpath)
                    : target;
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
                const resolvedTarget = pattern
                    ? RegExpPrototypeSymbolReplace(patternRegEx, target, () => subpath)
                    : target;
                emitInvalidSegmentDeprecation(resolvedTarget, request, match, packageJSONUrl, internal, base, false);
            }
        } else {
            throwInvalidSubpath(request, match, packageJSONUrl, internal, base);
        }
    }

    if (pattern) {
        return new URL(RegExpPrototypeSymbolReplace(patternRegEx, resolved.href, () => subpath));
    }

    return new URL(subpath, resolved);
}
const invalidSegmentRegEx =
    /(^|\\|\/)((\.|%2e)(\.|%2e)?|(n|%6e|%4e)(o|%6f|%4f)(d|%64|%44)(e|%65|%45)(_|%5f)(m|%6d|%4d)(o|%6f|%4f)(d|%64|%44)(u|%75|%55)(l|%6c|%4c)(e|%65|%45)(s|%73|%53))?(\\|\/|$)/i;
const deprecatedInvalidSegmentRegEx =
    /(^|\\|\/)((\.|%2e)(\.|%2e)?|(n|%6e|%4e)(o|%6f|%4f)(d|%64|%44)(e|%65|%45)(_|%5f)(m|%6d|%4d)(o|%6f|%4f)(d|%64|%44)(u|%75|%55)(l|%6c|%4c)(e|%65|%45)(s|%73|%53))(\\|\/|$)/i;
const patternRegEx = /\*/g;
