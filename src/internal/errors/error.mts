import { fileURLToPath } from "node:url";
import * as mod from "node:path";

export class CodeError extends Error {
    constructor(msg: string, readonly code: string, options?: ErrorOptions) {
        super(msg, options);
    }
}

export class ERR_INVALID_PACKAGE_CONFIG extends CodeError {
    constructor(path: string, base: string | URL | undefined, message: string) {
        let msg = `Invalid package config ${path}${base ? ` while importing ${base}` : ""}${
            message ? `. ${message}` : ""
        }`;
        super(msg, ERR_INVALID_PACKAGE_CONFIG.name);
    }
}

export class ERR_INVALID_PACKAGE_TARGET extends CodeError {
    constructor(pkgPath: string, key: string, target: string, isImport = false, base = undefined) {
        const relError = typeof target === "string" && !isImport && target.length && !target.startsWith("./");
        let msg: string;
        if (key === ".") {
            if (!isImport)
                msg =
                    `Invalid "exports" main target ${JSON.stringify(target)} defined ` +
                    `in the package config ${pkgPath}package.json${base ? ` imported from ${base}` : ""}${
                        relError ? '; targets must start with "./"' : ""
                    }`;
        } else {
            msg = `Invalid "${isImport ? "imports" : "exports"}" target ${JSON.stringify(
                target
            )} defined for '${key}' in the package config ${pkgPath}package.json${
                base ? ` imported from ${base}` : ""
            }${relError ? '; targets must start with "./"' : ""}`;
        }
        super(msg!, ERR_INVALID_PACKAGE_TARGET.name);
    }
}

export class ERR_INVALID_MODULE_SPECIFIER extends CodeError {
    constructor(request: string, reason: string, base?: string) {
        super(
            `Invalid module "${request}" ${reason}${base ? ` imported from ${base}` : ""}`,
            ERR_INVALID_MODULE_SPECIFIER.name
        );
    }
}

export class ERR_PACKAGE_IMPORT_NOT_DEFINED extends CodeError {
    constructor(specifier: string, packagePath: string, base: string) {
        super(
            `Package import specifier "${specifier}" is not defined${
                packagePath ? ` in package ${packagePath}package.json` : ""
            } imported from ${base}`,
            ERR_PACKAGE_IMPORT_NOT_DEFINED.name
        );
    }
}

export class ERR_REQUIRE_ESM extends CodeError {
    constructor(filename: string, hasEsmSyntax: boolean, parentPath = null) {
        let msg = `require() of ES Module ${filename}${parentPath ? ` from ${parentPath}` : ""} not supported.`;
        if (filename.endsWith(".mjs"))
            msg +=
                `\nInstead change the require of ${filename} to a dynamic ` +
                "import() which is available in all CommonJS modules.";
        super(msg, ERR_REQUIRE_ESM.name);
    }
}

export function invalidPackageTarget(subpath: string, target: string, packageJSONUrl: URL, internal: any, base: any) {
    if (typeof target === "object" && target !== null) {
        target = JSON.stringify(target, null, "");
    } else {
        target = `${target}`;
    }
    return new ERR_INVALID_PACKAGE_TARGET(
        fileURLToPath(new URL(".", packageJSONUrl)),
        subpath,
        target,
        internal,
        base && fileURLToPath(base)
    );
}
export function importNotDefined(specifier: string, packageJSONUrl: URL, base: string) {
    return new ERR_PACKAGE_IMPORT_NOT_DEFINED(
        specifier,
        packageJSONUrl && fileURLToPath(new URL(".", packageJSONUrl)),
        fileURLToPath(base)
    );
}

export function throwInvalidSubpath(
    request: string,
    match: string,
    packageJSONUrl: URL,
    internal: boolean,
    base?: string | URL
) {
    const reason = `request is not a valid match in pattern "${match}" for the "${
        internal ? "imports" : "exports"
    }" resolution of ${fileURLToPath(packageJSONUrl)}`;
    throw new ERR_INVALID_MODULE_SPECIFIER(request, reason, base && fileURLToPath(base));
}
