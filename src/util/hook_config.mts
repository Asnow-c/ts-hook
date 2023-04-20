const env = process.env;
export const hookConfig = {
    enableTsAlias: !!env["ENABLE_TS_ALIAS"],
    sameParsing: !!env["SAME_PARSER"],
};

export type HookConfig = typeof hookConfig;
