const env = process.env;
export const hookConfig = {
    enableTsAlias: !!env["ENABLE_TS_ALIAS"],
    sameParsing: !!env["SAME_PARSER"],
};

export type HookConfig = typeof hookConfig;
export interface ProcessEnv {
    ENABLE_TS_ALIAS?: string;
    SAME_PARSER?: string;
    TS_COMPILER_OPTIONS?: string;
    TS_CONFIG_PATH?: string;
}
