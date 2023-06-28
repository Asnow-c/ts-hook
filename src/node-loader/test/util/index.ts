import { fork, ChildProcess, ForkOptions } from "child_process";
import { expect } from "vitest";
import * as Path from "node:path";
import { fileURLToPath, pathToFileURL } from "url";
import { HookConfig } from "../../hook_config.cjs";

export function resolveJsPath(meta: ImportMeta) {
    let file = fileURLToPath(meta.url);
    let dir = Path.resolve(file, "..");
    return { file, dir };
}

const cwd = process.cwd();
const loaderPath = pathToFileURL(cwd + "/hook.mjs").toString();

export class Process {
    private static hookConfigToEnv(config: Partial<HookConfig>) {
        let env: NodeJS.ProcessEnv = {};
        if (config.sameParsing) env.SAME_PARSER = "true";
        return env;
    }
    static run(cwd: string, path: string, env?: Partial<HookConfig>) {
        let absPath = Path.resolve(cwd, path);

        let options: Pick<ForkOptions, "env"> | undefined = undefined;
        if (env) options = { env: this.hookConfigToEnv(env) };

        return new Promise<Process>(function (resolve) {
            new Process(absPath, resolve, options);
        });
    }
    private ps: ChildProcess;
    readonly messageList: any = [];
    exit?: { code: number | null; signal: NodeJS.Signals | null };
    sign?: number;
    constructor(absPath: string, res: (val: Process) => void, options?: Pick<ForkOptions, "env">) {
        this.ps = fork(absPath, { ...options, execArgv: ["--loader", loaderPath] });
        this.ps.on("message", (msg) => this.messageList.push(msg));
        this.ps.on("error", function (error) {
            console.log(error);
        });
        this.ps.on("exit", (code, signal) => {
            this.exit = { code, signal };
            res(this);
        });
    }
    kill() {
        return this.ps.kill();
    }
}
export class ProcessExpect {
    constructor(readonly ps: Process) {}

    isSafeExit() {
        return expect(this.ps.exit?.code).toEqual(0);
    }
    messageToEqual(msg: any[]) {
        return expect(this.ps.messageList).toEqual(msg);
    }
}
export function expectPs(ps: Process) {
    return new ProcessExpect(ps);
}
