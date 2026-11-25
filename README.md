# dsh-emotion-soul

> 一个面向 DeepSeek Harness（DSH）的实验性 Cordis 插件：为 Agent 提供进程内的情绪状态、`check_emotion` 工具和角色提示词。

**当前状态：原型 / 开发中。** 目前实现的是单进程内存状态与静态 `soul.json` 人设配置；还没有记忆库、反思归纳或形象界面。已验证预构建 tarball 能在隔离 DSH profile 启动；从 GitHub 源码安装仍需单独验证构建脚本授权，发布前请阅读[发布前检查](#发布前检查)。

## 能力与边界

| 构想 | 当前状态 | 说明 |
|---|---|---|
| 以太体：情绪状态 | 已实现原型 | 维护精力、心情和基准心情；用户消息会影响进程内状态。 |
| 情绪工具 | 已实现原型 | 注册 `check_emotion`，返回当前精力与心情数值。 |
| 灵性体：角色人设 | 已实现原型 | 从 `src/soul.json` 读取名字、人设和基准心情，并注入 system prompt。 |
| 心智体：反思归纳 | 未实现 | README 中的未来构想，不代表当前已有对应插件或存储能力。 |
| 记忆库 / RAG | 未实现 | 当前没有跨会话记忆、检索或持久化。 |
| 肉身体：形象界面 | 未实现 | 当前没有 Live2D、头像或其他视觉界面集成。 |

情绪值只保存在当前 Node 进程中；重启会恢复初始值。此原型不应被理解为真实心理状态或持久化记忆。

## 项目结构与 DSH 如何加载

```text
dsh-emotion-soul/
├── package.json          # 包元数据；dsh.bundle.patch 指向 bundle patch
├── cordis.patch.yml      # 向 profile 插入插件行
├── src/
│   ├── emotion-soul.ts   # Cordis 插件实现：name / inject / apply
│   └── soul.json         # 默认角色配置
└── README.md
```

加载链路是：**profile 的 bundle 列表 → `package.json` 的 `dsh.bundle.patch` → `cordis.patch.yml` 中的插件行 → 插件模块的 `apply(ctx, config)`**。

- `pnpm` 根据 `package.json` 安装依赖；本地目录安装可以保留 `link:`，指回开发 checkout。
- DSH 不会把 `package.json` 的 `main` 当成“启动这个插件”的命令。对于 bundle，DSH 根据 `dsh.bundle.patch` 找到配置层；Loader 再根据 patch 行的 `name` 导入具体模块。
- 插件 `name`、`inject`、`apply` 是 Cordis 插件约定；`inject` 声明它依赖的服务，`apply` 注册工具、提示词和事件处理。
- `--patch` 接受的是一个 patch 文件，不是源码路径。它适合临时试验；可安装项目应由包自己的 bundle patch 引用插件入口。

## 本地开发

先准备可运行的 DSH CLI，并在本项目根目录执行：

```sh
dsh plugin --profile web add .
```

这会把当前 checkout 作为本地包安装到 `web` profile；依赖中看到 `link:` 指回项目目录是正常的，方便开发时直接改源码。它不是把源码复制进 `.dsh/profiles/web`。

验证 DSH 是否将此包识别为 bundle：

```sh
dsh --profile web --dump-config
```

在输出中检查 `dsh-emotion-soul` 提供的 patch 层和 `emotion-soul` 行。添加或移除 bundle 后，重启正在运行的 profile；bundle 集合在 profile 启动时确定。

> 当前源码入口是 TypeScript。DSH 源码开发环境通常使用 `tsx/esm`，但已安装的 DSH CLI 不应被假定为能直接运行任意外部 `.ts` 文件。独立项目需要自己的构建产物和依赖声明，见下方发布前检查。

## 发布前检查

**已完成本地 tarball 的最小验证；尚未发布到 GitHub。**

- [x] `pnpm run build` 生成 `dist/` 下的 JS、声明文件和 `soul.json`；入口、`files` 和 bundle patch 已对应，`pnpm pack` 生成包含这些文件的 tarball。
- [x] `@deepseek-ai/dsh-tools` 是运行依赖（固定 `0.2.2-rc.1`），`@deepseek-ai/cordis` 是宿主 peer 和本地开发依赖；`engines.dsh` 目前限定 `0.2.2-rc.1`。
- [x] tarball 已在隔离 DSH profile 安装；`--dump-config` 显示 `emotion-soul`，实际启动日志显示载入 `soul.json` 和插件。独立安装目录也验证包入口和 JSON 可读取。
- [x] 原生定时器在插件 disposer 中清理，提示词 section disposer 也会调用；`.gitignore` 排除新旧构建产物、测试目录、tarball 和依赖。`pnpm pack` 已验证会触发 `prepare` 构建。
- [ ] 尚未实测 `check_emotion` 工具调用、提示词注入效果与热重载后的卸载清理；启动日志不能代替这些功能测试。
- [ ] 尚未验证 GitHub 源码安装的 `prepare` 执行与 pnpm 构建脚本授权；建立 GitHub 仓库后补上准确的 `repository` 字段并验证安装。

下方 GitHub 命令是后续发布操作，不代表仓库已经公开。

## 发布到 GitHub

### 1. 建立 GitHub 仓库

在 GitHub 创建空仓库，例如 `OWNER/dsh-emotion-soul`，在本地项目根目录初始化并推送：

```sh
git init
git add .
git status --short
git commit -m "Initial dsh-emotion-soul plugin"
git branch -M main
git remote add origin https://github.com/OWNER/dsh-emotion-soul.git
git push -u origin main
```

先确认 GitHub 仓库中有 `README.md`、许可证和所需源码/构建配置，不要提交 `node_modules/`、密钥或本地 DSH profile。

### 2. 给可复现版本打标签

完成构建和干净安装验证后，再提交最终变更并创建版本标签：

```sh
git add .
git commit -m "Prepare v0.1.0 release"
git tag v0.1.0
git push origin main --tags
```

### 3. 从 GitHub 安装到 DSH

GitHub 源码安装的构建行为需要特别留意：pnpm 不会无条件替仓库构建，且 pnpm 10 对 Git 依赖的构建脚本要求明确授权。插件包需要正确的 `prepare`/构建配置；用户也必须审查并授权可信包的安装构建。构建与授权准备就绪后，可以固定到不可变提交来安装：

```sh
dsh plugin --profile web add github:OWNER/dsh-emotion-soul#COMMIT_SHA
```

不要在生产环境中盲目跟随可变的 `main` 分支。安装后检查组合配置，并重启 profile：

```sh
dsh --profile web --dump-config
dsh --profile web
```

若暂时不打算处理 Git 安装构建授权，可优先发布到 npm 等注册表并分发已构建文件，或用经过验证的预构建 tarball；无论选择哪种方式，都要确保发布物包含 patch、运行时入口和 `soul.json`。

## 许可证

本项目采用 MIT License，完整条款见 [`LICENSE`](./LICENSE)。`package.json` 中的 `license` 字段是机器可读的许可证标识，不能代替该许可证全文。
