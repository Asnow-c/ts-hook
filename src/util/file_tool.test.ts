import { upSearch } from "./file_tool.js";
import { it, describe, expect } from "vitest";
import { win32, posix, PlatformPath } from "node:path";
function windowPathToUnixPath(path: string) {
    if (path.length <= 2 && /^[a-zA-XZ]:[\\/]?$/.test(path)) return posix.resolve("/" + path);
    if (win32.isAbsolute(path)) return posix.resolve("/" + path);
    return posix.resolve(path);
}
const windows = {
    "A:/dg/sd/dd": ["A:\\dg\\sd\\dd", "A:\\dg\\sd", "A:\\dg", "A:"],
    "A:/a.js": ["A:\\a.js", "A:"],
};
const unix = {
    "/dg/sd/dd": ["/dg/sd/dd", "/dg/sd", "/dg", "/"],
    "/a.js": ["/a.js", "/"],
    "/": ["/"],
};
const eachArg = [
    { name: "windows", cases: windows },
    { name: "unix", cases: unix },
];
describe.each(eachArg)("upSearch", function ({ cases, name }) {
    const os = name === "unix" ? posix : win32;
    const fullCase: [string, string[]][] = [];
    it.each(Object.entries(cases))(name + "返回第一项", function (inParameter, expects) {
        let res: string[] = upSearchAll(inParameter, undefined, os);

        expect(res, '输入："' + inParameter + '"').toEqual(expects);

        expects.shift();
        fullCase.push([inParameter, res]);
    });
    //不返回第一项实际就是“返回第一项”的结果去除第一个
    it.each(fullCase)(name + "不返回第一项", function (inParameter, expects) {
        let res: string[] = upSearchAll(inParameter, false, os);
        expect(res).toEqual(expects);
    });
});
describe("upSearch-window特殊", function () {
    it("/", function () {
        const res = upSearchAll("/");
        expect(res).toHaveLength(1);
        expect(res[0]).toMatch(/^((\w:)|\\)$/); //window: "C:"   posix: "\"
    });
    it("/b", function () {
        const res = upSearchAll("/b");
        expect(res).toHaveLength(2);
        expect(res[0], "0").toMatch(/^((\w:)?\\b)$/); //window: "C:\b"   posix: "\b"
        expect(res[1], "1").toMatch(/^((\w:)|\\)$/); //window: "C:"   posix: "\"
    });
});

function upSearchAll(checkPath: string, first?: boolean, nodePath?: PlatformPath) {
    return Array.from(upSearch(checkPath, first, nodePath));
}
