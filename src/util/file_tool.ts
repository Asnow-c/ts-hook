import * as Path from "node:path";
export function* upSearch(checkPath: string, first = true, nodePath = Path) {
    let { root, dir, base } = nodePath.parse(nodePath.resolve(checkPath));
    const sep = nodePath.sep;
    if (base === "") checkPath = dir;
    else checkPath = dir === root ? root + base : dir + sep + base;
    if (first) yield checkPath;

    let separatorIndex: number;
    while (checkPath.length > root.length) {
        separatorIndex = checkPath.lastIndexOf(sep);
        checkPath = checkPath.slice(0, separatorIndex);
        if (separatorIndex > 0) yield checkPath;
        else yield root;
    }
    return;
}
/**
 * @returns undefined: 请求不是路径  string: 绝对路径
 */
export function toAbsPath(request: string, parentPath: string) {
    if (request.startsWith(".") || request.startsWith("..")) return Path.resolve(parentPath, request);
    if (Path.isAbsolute(request)) return request;
}
