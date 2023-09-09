import type { PkgExports } from "./pkg";
//todo:
export function resolvePkgImports(request: string, imports: Record<string, string>): string {
    return request;
}
//todo:
export function resolveExports(exports: PkgExports, request: string): string {
    return request;
    const keys = Object.keys(exports);
    if (includesKeys(exports, ["require", "imports", "node"])) {
    }
}

function includesKeys(obj: object, keys: string[]) {
    for (let i = 0; i < keys.length; i++) {
        if (Object.hasOwn(obj, keys[i])) return true;
    }
}
