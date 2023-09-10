import { fileURLToPath } from "node:url";

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
    constructor(request: string | URL, reason: string, base?: string | null) {
        super(
            `Invalid module "${request}" ${reason}${base ? ` imported from ${base}` : ""}`,
            ERR_INVALID_MODULE_SPECIFIER.name
        );
    }
}

export class ERR_PACKAGE_IMPORT_NOT_DEFINED extends CodeError {
    constructor(specifier: string, packagePath: string | URL | undefined, base: string) {
        super(
            `Package import specifier "${specifier}" is not defined${
                packagePath ? ` in package ${packagePath}package.json` : ""
            } imported from ${base}`,
            ERR_PACKAGE_IMPORT_NOT_DEFINED.name
        );
    }
}
export class ERR_PACKAGE_PATH_NOT_EXPORTED extends Error {
    constructor(pkgPath: string, subpath: string, base: undefined | null | string | URL = undefined) {
        let msg: string;
        if (subpath === ".")
            msg = `No "exports" main defined in ${pkgPath}package.json${base ? ` imported from ${base}` : ""}`;
        else
            msg = `Package subpath '${subpath}' is not defined by "exports" in ${pkgPath}package.json${
                base ? ` imported from ${base}` : ""
            }`;

        super(msg);
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
export function importNotDefined(specifier: string, packageJSONUrl: URL | undefined, base: string | URL) {
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

export function exportsNotFound(subpath: string, packageJSONUrl: URL, base?: string | URL | null) {
    return new ERR_PACKAGE_PATH_NOT_EXPORTED(
        fileURLToPath(new URL(".", packageJSONUrl)),
        subpath,
        base && fileURLToPath(base)
    );
}
export function createEsmNotFoundErr(request: string, path: string) {
    // eslint-disable-next-line no-restricted-syntax
    const err = new CodeError(`Cannot find module '${request}'`, "MODULE_NOT_FOUND");
    if (path) (err as any).path = path;
    // TODO(BridgeAR): Add the requireStack as well.
    return err;
}
