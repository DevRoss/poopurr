# 导出当前记录 / Export displayed records

在「每一次，都记着」下点击 **导出当前 N 条 CSV**。下载文件可用 Excel、Numbers 或其他 CSV 阅读器打开。它完全在浏览器中生成，不会再次请求 PETKIT，也不会上传到第三方。

## 范围与含义

- 导出的是按钮下方**当前已经显示的记录快照**，不是完整数据库或全日期范围备份。正式页面最多显示 100 条；Demo 最多显示 20 条。切换筛选后，请等明细更新再导出。
- 每行包含范围说明、上海时间（明确 `+08:00`）、猫咪名称、停留时长、分类结果/来源/可信度/说明、人工标注和设备名称。
- 时长推测在结果中带「推测」前缀；人工、设备、两种推测来源分别保留。缺失时长留空，未知猫咪保留「未识别」，不添加空日期或零次记录。
- Demo 文件名含 `demo`，每行标注「合成演示数据」。刷新、筛选或标注后重新下载即可获得新的当前快照。
- 不包含账号、会话、原始接口 payload、记录 key、猫咪 ID 或设备 ID。文件仍包含名称和活动时间，并不是匿名诊断包，请自行决定分享范围。

## 文件格式

UTF-8 BOM、CRLF 行尾、双引号包围所有单元格。内嵌引号转义；保留逗号与换行。可能被电子表格解释为公式的文本会添加单引号前缀，包含前导空白/控制字符后的 `= + - @`，以便按文本打开。重新编辑或转换文件时，应保留此保护。

## English

Use **导出当前 N 条 CSV** below the event table heading to download only the currently displayed rows (up to 100 in the application, 20 in the demo). Wait for filtered records to load before exporting. This is a local snapshot, not a full-history backup. Classification provenance and uncertainty remain explicit. Missing values remain blank/unknown. The file uses UTF-8 BOM and quoted CSV cells, with spreadsheet formula neutralization. Names and timestamps are personal data even though account credentials and opaque IDs are excluded.
