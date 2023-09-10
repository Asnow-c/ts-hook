declare module "source-map-support" {}

declare namespace NodeLoader {
    interface ResolveContext {
        conditions: string[];
        importAssertions: any;
        parentURL?: string;
    }
    type Format = "builtin" | "commonjs" | "json" | "module" | "wasm";
    interface ResolveFxReturn {
        format?: Format;
        importAssertions?: any;
        shortCircuit?: boolean;
        /** 必须是字符串url */
        url: string;
    }

    interface LoadContext {
        conditions: string[];
        format?: Format;
        importAssertions: any;
    }
    interface LoadReturn {
        format: Format;
        shortCircuit?: boolean;
        source?: string | ArrayBuffer;
    }

    type NextResolveFx = (specifier: string, context: ResolveContext) => Promise<ResolveFxReturn>;
    type NextLoadFx = (specifier: string, context: LoadContext) => Promise<LoadReturn>;
}
