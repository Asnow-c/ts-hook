import { it, describe, expect } from "vitest";
import { jsonToTsConfig, ScriptTarget } from "./tslib.js";

describe("toConfig", function () {
    it("target", function () {
        expect(jsonToTsConfig({ target: "esNext" }), "混合1").toEqual({ target: ScriptTarget.ESNext });
        expect(jsonToTsConfig({ target: "ESNext" }), "混合2").toEqual({ target: ScriptTarget.ESNext });
        expect(jsonToTsConfig({ target: "ESNEXT" }), "全部大写").toEqual({ target: ScriptTarget.ESNext });
        expect(jsonToTsConfig({ target: "esnext" }), "全部小写").toEqual({ target: ScriptTarget.ESNext });
        expect(jsonToTsConfig({ target: "json" })).toEqual({ target: ScriptTarget.JSON });
    });
    it("混合", function () {
        expect(jsonToTsConfig({ target: "es2020", strict: true, rootDir: ".", inlineSourceMap: false })).toEqual({
            target: ScriptTarget.ES2020,
            strict: true,
        });
    });
});
