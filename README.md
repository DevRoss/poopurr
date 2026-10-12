# Poopurr · 猫咪如厕手账

[English](README.en.md) · [贡献指南](CONTRIBUTING.md) · [安全说明](SECURITY.md) · [路线图](ROADMAP.md)

一个可自行部署的 **PETKIT 猫砂盆记录与多猫行为观察工具**。按日期补拉记录，比较猫咪的如厕时段、次数、停留时长，也能通过 MCP 查询。

**状态：早期实验版，MIT 许可。非 PETKIT 官方项目。** 大小便时长推测单独标为低可信，不等于确认结果，不用于诊断。[GitHub 仓库](https://github.com/DevRoss/poopurr) · [CI 状态](https://github.com/DevRoss/poopurr/actions/workflows/ci.yml)

## 能做什么

- 近 31 天按日补拉，支持日期范围、进度、暂停和重试，历史记录去重保存。
- 多猫小时热图、每日观察次数、时长直方图；猫咪归属沿用上游识别。
- 设备识别、人工标注与时长推测分开显示。样本不足、两类重叠或身份未知时保持不确定。
- 8 个 MCP 工具：连接状态、设备、猫咪、同步、明细、每日统计、趋势、行为分析。
- 只读 PETKIT 设备，不会清理、倒砂、转动设备。人工标注只修改本应用数据库。

## 快速开始：本地运行

需要 Node.js **22.13+**（推荐 Node 24）和 npm。无需 ChatGPT/Sites 账号；本地模式无需 Cloudflare 登录。

```sh
git clone https://github.com/DevRoss/poopurr.git
cd poopurr
npm ci
npm run setup
npm run dev
```

打开 **http://localhost:8787**。从本地 `.dev.vars` 文件取出 `ACCESS_TOKEN` 登录本站，再在页面输入 PETKIT 账号、密码和正确地区。`npm run setup` 不会覆盖已有配置。不要把 `.dev.vars` 提交到 Git，也不要把访问密钥发在 Issue 中。

每个部署是**一个家庭**；持有同一访问密钥的人能看到同一套记录。让不同朋友分别部署各自的实例，不要把它当作多租户 SaaS。

## 部署到自己的 Cloudflare

1. `npx wrangler login`
2. `npx wrangler d1 create poopurr`
3. 将返回的数据库 ID 写入 `wrangler.jsonc` 的 `database_id`。
4. 设置 `vars.PUBLIC_ORIGIN` 为此 Worker 的完整 HTTPS 域名（没有尾部 `/`）。域名须与浏览器实际访问的 origin 完全一致。
5. 在密码管理器中生成并保存两个独立随机值：`ACCESS_TOKEN` 至少 32 字符；`PETKIT_SESSION_KEY` 为 32 字节随机值的 64 位小写十六进制。
6. 通过交互式命令设置生产密钥：

```sh
npx wrangler secret put ACCESS_TOKEN
npx wrangler secret put PETKIT_SESSION_KEY
npx wrangler d1 migrations apply DB --remote
npm run deploy
```

生产环境不要设置 `ALLOW_LOCAL_HTTP`。`.dev.vars` 仅用于本地开发，不会代替生产密钥。密钥丢失或随意轮换可能导致原有加密会话无法读取，请保管备份。D1 活动记录本身并非应用层加密；保护云账号及数据库导出。

上线后先检查 `/healthz`，再验证：未登录无法读 `/api/petkit`；登录后能连接；选择昨天可补拉；登出后无法读数据。**不要将测试通过说成所有型号实机兼容。**

## MCP

端点是 `https://你的域名/mcp`。在支持自定义请求头的 Streamable HTTP MCP 客户端中配置：

```json
{
  "url": "https://your-domain.example/mcp",
  "headers": {"Authorization": "Bearer <ACCESS_TOKEN>"}
}
```

这只是通用端点/请求头示例，各客户端配置文件结构不同。当前开源服务没有实现 OAuth 授权服务器；不能据此宣称可直接在所有 ChatGPT 客户端安装。既有私人 Sites 插件的 OAuth 和身份不在开源包中。

PETKIT 密码只在网页连接时使用，聊天工具不接收密码。对于范围同步，调用 `sync_litter_records` 后，若 `next_start_date` 非空，用它继续请求并保持原 `end_date`，直到为空。结束日期为**不包含**该日的上海日期。

## 型号与数据边界

| 型号协议 | 当前支持依据 |
| --- | --- |
| T4 | 私有试用中已验证历史日期读取；仍不能保证设备无漏报 |
| T3 | 协议与合成测试覆盖，等待实机验证 |
| T5 / T6 / T7 | 实验性目标日时间戳和有界分页，等待实机验证 |

上游是非官方接口，可能变更；登录可能使官方 App 或其他客户端退出。摄像头分页每来源最多 4 页；每设备每日最多保存 500 条；查询最多 5,000 条，限制会反映为部分/截断结果。空日期不补“确定为 0”。只读查询不代表不受上游频率限制。

[时长模型说明](docs/CLASSIFICATION.md) 包含样本门槛、低可信假设和已知局限。模型当前使用所选日期范围，切换范围可能改变推测。

## 开发与维护

```sh
npm run check
npx wrangler deploy --dry-run
node scripts/check-public-source.mjs
```

测试全部使用合成数据，不需要真实 PETKIT 账号。包含 workerd + D1 集成测试。GitHub Actions 对 Node 22/24 运行检查；Dependabot 准备每周检查 npm 依赖。实际启用以仓库发布后的配置与权限为准。

[架构](docs/ARCHITECTURE.md) · [维护政策](docs/MAINTENANCE.md) · [变更记录](CHANGELOG.md)

欢迎提供型号兼容反馈和脱敏复现。请勿上传真实账号、会话、设备 ID、猫咪活动日志或含隐私的截图。安全问题请按 SECURITY.md 私下报告。

## 许可与致谢

MIT，见 [LICENSE](LICENSE)。协议实现参考 [py-petkit-api](https://github.com/Jezza34000/py-petkit-api) 与 [mcp-server-petkit](https://github.com/dirkjanfaber/mcp-server-petkit)。上游许可与署名完整保留在 [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt)。PETKIT 名称属于其权利人，本项目不代表官方。
