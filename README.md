# ts-hook

该钩子主要用于在开发环境中直接运行 typescript , 省去了编译步骤

需要注意的是, 通过该钩子直接运行的 ts 文件, 不保证编译后也能运行


全局安装: `npm install @asnc/ts_hook -g`
项目安装: `npm install @asnc/ts_hook -D`

用法: `node --loader GLOBAL_PATH/@asnc/ts_hook/hook.mjs  xx.ts`
用法: `node --loader GLOBAL_PATH/@asnc/ts_hook/hook.mjs  xx.mts`
用法: `node --loader GLOBAL_PATH/@asnc/ts_hook/hook.mjs  xx.cts`

注意: `GLOBAL_PATH`是你安装`@asnc/ts_hook`的所在目录的绝对或相对路径, 使用绝对路径时, Windows 系统下必须以'/'开头
如 `/C:/npm_global/@asnc/ts_hook.mjs`, 使用相对路径时, 相对于 node 的启动目录, 且必须以"./"开头

### 使用 ts-hook 的几种场景

#### 快捷运行一些 ts 文件

#### 对于 ES Module 项目的 ts 文件调试

对于 mts 文件或者 package.json 设置了 type="module"的项目, 往往 ts 文件的导入语法都是 import "./mod.js" 或者 import "./mod.mjs", 对于 ts-node 无法处理这种情况

#### 直接运行导入了 ts 库的 ts 文件

假如有一个使用 typescript 编写的库函数, 名字为 pkgLib, 当项目导入了这个 pkgLib 时, 如果此时想调试这个项目, pkgLib 必须经过编译, 否则无法运行

### ts-hook 的目标功能

-   不提供类型检查
-   不支持 package.json 的 imports、 exports、main 字段
-   不依赖 tsconfig.json, 不支持 tsconfig.json 中的路径别名

-   根据依赖自动尝试 `@swc-node/core` 和 `typescript`

-   根据 package.json 中的 type 和文件扩展名自动确定 ts 编译选项的 module
-   根据 node 版本自动确定 target
-   支持源映射

-   ES Module 使用了与 commonjs 一致的解析策略

### node 导入模块的几种情况

-   直接运行包名
    ES Module 和 commonjs 的导入策略相同

-   使用绝对路径或相对路径导入
    ES Module 不支持扩展名查找, 不支持文件夹模块

-   使用包名导入
    ES Module 和 commonjs 的导入策略基本相同
    不同点: 当 package.json 不存在 exports 字段时, commonjs 可以导入子目录而 ES Module 不能

-   导入自身包
    ES Module 和 commonjs 的导入策略相同

-   使用'#'别名导入
    ES Module 和 commonjs 的导入策略相同

#### ts 文件导入带有 .js .cjs .mjs 的扩展名会尝试去除进行搜索 ts 文件

```
import "./a.cjs"    //  "./a.cjs" > "./a.cts"   >   node解析规则 require("./a.cjs")
import "./a.js"     //  "./a.js" > "./a.ts"     >   node解析规则 require("./a.js")
import "./a.mjs"    //  "./a.mjs"> "./a.mts"    >   node解析规则 require("./a.mjs")

```
