# 按日同步覆盖摘要 / Daily fetch coverage

`get_toilet_events`、`get_daily_summary`、`get_toilet_trends` 和
`get_behavior_analysis` 现在附带 `coverage_summary`，无需增加 MCP 调用。
例如查询 `start_date: "2026-10-29", end_date: "2026-10-31"`，会返回两个上海时区日期；结束日期不包含在内。

- `days[].devices[]`：每台设备当天最新保留的读取证据，包含 `last_fetched_at`。
- 设备状态：`not_fetched` 无证据；`partial` 部分读取；`day_in_progress` 在该日结束前读取；`fetched` 在该日结束后成功读取。
- 每日状态：所有设备均为 `fetched` 才显示 `fetched`；全部缺少证据为 `not_fetched`；其余为 `partial`；没有设备列表为 `unknown_devices`。
- `needs_review_dates`：非 `fetched` 的日期，供助手提示核查或按用户要求补拉；本功能不会自动触发同步。
- 指定 `device_id` 时只汇总该设备；否则使用当前设备列表。猫咪筛选不会改变设备读取证据，也不会将设备记录推断归属于某只猫。

`complete` 始终为 `false`。成功读取不是完整性保证，不能把缺失数据补零，也不能据此判断健康状态。摘要只处理保留的覆盖证据（当前最多 400 条）；证据过期移除、设备清单变化和未写入覆盖日志的失败均可能无法在此逐日还原。请同时读取外层 `stale`、`last_successful_sync`、`truncated` 和原始 `coverage`。今天即使已读取，也尚未结束。

This additive response field summarizes retained fetch evidence, not confirmed completeness or per-cat activity. No schema migration, upstream requests, new dependencies, or device actions are introduced.
