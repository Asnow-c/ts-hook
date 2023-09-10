import { fileURLToPath, pathToFileURL } from "node:url";
import Module from "node:module";
import type { PackageConfig } from "./pkg";
import { ExtraModule } from "./common_loader";
function packageImportsResolve(name: string, base: string | URL, conditions: Set<string>): URL {
    if (name === "#" || name.startsWith("#/") || name.endsWith("/")) {
        const reason = "is not a valid internal imports specifier name";
        throw new ERR_INVALID_MODULE_SPECIFIER(name, reason, fileURLToPath(base!));
    }
    let packageJSONUrl;
    const packageConfig = ExtraModule._readPackage(fileURLToPath(base));
    if (packageConfig && packageConfig.exists) {
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

function getPackageScopeConfig(resolved: string) {
    let packageJSONUrl = new URL("./package.json", resolved);
    while (true) {
        const packageJSONPath = packageJSONUrl.pathname;
        if (packageJSONPath.endsWith("node_modules/package.json")) {
            break;
        }
        const packageConfig = getPackageConfig(fileURLToPath(packageJSONUrl), resolved);
        if (packageConfig.exists) {
            return packageConfig;
        }

        const lastPackageJSONUrl = packageJSONUrl;
        packageJSONUrl = new URL("../package.json", packageJSONUrl);

        // Terminates at root where ../package.json equals ../../package.json
        // (can't just check "/package.json" for Windows support).
        if (packageJSONUrl.pathname === lastPackageJSONUrl.pathname) {
            break;
        }
    }
    const packageJSONPath = fileURLToPath(packageJSONUrl);
    const packageConfig = {
        pjsonPath: packageJSONPath,
        exists: false,
        main: undefined,
        name: undefined,
        type: "none",
        exports: undefined,
        imports: undefined,
    };
    packageJSONCache.set(packageJSONPath, packageConfig);
    return packageConfig;
}

class ERR_INVALID_MODULE_SPECIFIER extends Error {
    constructor(request: string, reason: string, base?: string | URL) {
        super(`Invalid module "${request}" ${reason}${base ? ` imported from ${base}` : ""}`);
    }
}
/** 
 * ./a.js
 *      a.ts
 *      hook解析
 * 
 * hook解析
 *  xxx
 *      xxx.ts
 *      node 解析
 */

/** 
 * 文件夹解析
 */

/** 
 * 模块解析
 *  imports
 * 
 *  exports
 * 
 */

/** 
 * 文件解析
 *  ./a.js
 *      ./a.ts
 *      ...
 *  
 * ./xxx
 *      ./xxx.ts
 *      ...
 * 
 */