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
