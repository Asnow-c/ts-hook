import * as Path from "node:path";
export function* upSearch(checkPath: string, first = true) {
    let { root, dir, base } = Path.parse(Path.resolve(checkPath));
    const sep = Path.sep;
    checkPath = base === "" ? dir : dir + sep + base;
    if (first) yield checkPath;

    let separatorIndex: number;
    while (checkPath.length > root.length) {
        separatorIndex = checkPath.lastIndexOf(sep);
        checkPath = checkPath.slice(0, separatorIndex);
        yield checkPath;
    }
    return;
}
/**
 * @returns undefined: 请求不是路径  string: 绝对路径
 */
export function toAbsPath(request: string, parentPath: string) {
    let isRel = request === "." || request === ".." || /^\.\.?[\\\/]/.test(request);
    if (isRel) return Path.resolve(parentPath, request);
    if (Path.isAbsolute(request)) return request;
}
