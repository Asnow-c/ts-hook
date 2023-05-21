import { upSearch } from "./file_tool.js";
import { it, describe, expect } from "vitest";

describe("upSearch", function () {
    it("不使用用第一项", function () {
        let res: string[] = Array.from(upSearch("A:/dg/sd/dd", false));
        expect(res).toEqual(["A:\\dg\\sd", "A:\\dg", "A:"]);
    });
    it("使用用第一项", function () {
        let res: string[] = Array.from(upSearch("A:/dg/sd/dd"));
        expect(res).toEqual(["A:\\dg\\sd\\dd", "A:\\dg\\sd", "A:\\dg", "A:"]);
    });
    describe("根目录", function () {
        it("不使用用第一项", function () {
            let res: string[] = Array.from(upSearch("A:/", false));
            expect(res).toEqual([]);
        });
        it("使用用第一项", function () {
            let res: string[] = Array.from(upSearch("A:/"));
            expect(res).toEqual(["A:\\"]);
        });
    });
});
