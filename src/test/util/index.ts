import { fork, ChildProcess, ForkOptions } from "child_process";
import { expect } from "vitest";
import * as Path from "node:path";
import { fileURLToPath } from "url";

export function resolveJsPath(meta: ImportMeta) {
    let file = fileURLToPath(meta.url);
    let dir = Path.resolve(file, "..");
    return { file, dir };
}

const dir = resolveJsPath(import.meta).dir;
const cwd = process.cwd();
const loaderPath = "/" + Path.resolve(cwd, "hook.mjs");

const env = undefined;

export class Process {
    static run(cwd: string, path: string) {
        let absPath = Path.resolve(cwd, path);

        return new Promise<Process>(function (resolve) {
            new Process(absPath, resolve, { env });
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
