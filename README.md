**English** | [中文](https://github.com/asnow-c/ts-hook/blob/main/docs/zh/README.md)

## ts_hook

This hook is primarily used to run typescript directly in the development environment, eliminating the compilation step

> Required node version >= 16

Global install: `npm install @asnc/ts_hook -g`\
Project install: `npm install @asnc/ts_hook -D`

Usage: `node --loader MODULE_PATH/@asnc/ts_hook/hook.mjs  xx.ts`\
Usage: `node --loader MODULE_PATH/@asnc/ts_hook/hook.mjs  xx.mts`\
Usage: `node --loader MODULE_PATH/@asnc/ts_hook/hook.mjs  xx.cts`\
Usage: `node --loader @asnc/ts_hook/hook.mjs  xx.cts` (Project level use)\

> Note: `MODULE_PATH` is the absolute or relative path to the directory where you installed @asnc/ts_hook. When using an absolute path, Windows must start with a `/`
> Example `/C:/npm_global/@asnc/ts_hook.mjs`, when using a relative path, relative to the node's startup directory, and must start with `./`

> If you use a global installation `@asnc/ts_hook`, you need to install one of the dependencies of typescript or `@swc/core` globally. If you use a project installation `@asnc/ts_hook`, you need to install typescript or `@swc/core` in your project. ts_hook relies on them. `@asnc/ts_hook` tries to import `@swc/core` first. If the import fails, it will try to import typescript

### Compare with ts-node and @swc-node/register

|                                                          | @asnc/ts_hook           | @swc-node/register       | ts-node    |
| -------------------------------------------------------- | ----------------------- | ------------------------ | ---------- |
| Dependencies                                             | typescript or @swc/core | typescript and @swc/core | typescript |
| Type check                                               | No                      | No                       | Yes        |
| Source map                                               | Yes                     | Yes                      | Yes        |
| [Cross-package import](#Cross-package import) ts project | Yes                     | No                       | No         |
| Mix esm and commonjs                                     | Yes                     |                          | Yes        |
| [Path alias](#Path alias)                                | Yes                     | Yes in some cases        | No         |

#### Cross-package import

In the monorepo project, we develop multiple packages in Typescript at the same time, and they may reference each other
When using a Node debugger package in this scenario, we must compile the package with the packages in the project on which it depends
while
If you use ts-node or @swc-node/register, you only need to compile the package on which it depends, because their hooks don't compile on external dependencies
And this is very inconvenient
So @asnc/ts_hook solves this problem. @asnc/ts_hook tracks the import of all` .ts` `.mts` `.cts ` files

#### Mix esm and commonjs

The following directories are available:

```
work
- index.mts
- esm.mts
- cjs.tsc
```

index.mts:

```typescript
import "./cjs.cjs";
import "./esm.mjs";
console.log(__dirname);
```

@swc-node/register cannot resolve this full path import

#### Path alias

In many cases we set the paths field in tsconfig.json
@swc-node/register only looks for the paths field of the tsconfig.json file in the working directory at run time. If the working directory is not in the project at run time, this means that @swc-node/register cannot read the alias configuration. Unless shown setting alias

@asnc/ts_hooks support alias configuration in project-level tsconfig.json (needs to be in the same directory as package.json)

### ts-hook features

-   Type checking is not provided
-   Optional tsc and swc compiler, try to import swc compiler first
-   Supports the imports, exports, and main fields of package.json
    -   If the file id parsed through these fields ends with the extension `.js` `.mjs` `.cjs` and the file does not exist, the extension will be replaced with `.ts` `.mts` `.cts` and the import attempt will be made
        The module compilation option for -ts is fixed to NodeNext
-   Supports source mapping
-   ES Module can use the same parsing strategy as commonjs

### Configuration

The configuration needs to be injected from environment variables

For boolean type: Set `""` to `false` and all other values to `true`

##### SAME_PARSER: Does ES Module use the same parsing strategy as Commonjs

Type: `boolean` default `false`
When enabled, ES Module will use the same module resolution strategy as Commonjs

##### TS_COMPILER_OPTIONS: Global ts file compilation configuration

Type: `string`

Note: Some configurations are overwritten

Example: vscode debugger configuration

```json
{
    "configurations": [
        {
            "type": "node",
            "env": {    //Injected environment variable
                "TS_COMPILER_OPTIONS": "{\"target\":\"esnext\"}",
            },
            ...
        }
    ]
}
```

##### TS_CONFIG_PATH: Global ts file compiled configuration file path

Type: `string`

Note: Some configurations are overwritten

#### Configuration example

vscode debug configuration, you can inject environment variables

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "node",
            "request": "launch",
            "name": "ts debugger",
            "runtimeArgs": ["--loader", "./node_modules/@asnc/ts_hook/hook.mjs"], //Use loader
            //Injected environment variable
            "env": {
                "SAME_PARSER": "" //Set "" which is true
            },
            "sourceMaps": true,
            "program": "${file}"
        }
    ]
}
```
