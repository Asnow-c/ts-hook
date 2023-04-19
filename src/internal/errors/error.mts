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
