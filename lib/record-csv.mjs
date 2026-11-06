// Browser-only export of already displayed records. Never serialize whole API objects.
const headers = [
  '数据类型', '导出范围', '时间（Asia/Shanghai）', '猫咪', '停留时长（秒）',
  '分类结果（推测不等于确认）', '分类来源', '可信度', '分类说明', '人工标注', '设备名称',
];
const kinds = {urine:'小便', stool:'大便', both:'大小便', unknown:'不确定'};
const sources = {manual:'人工标注', device:'设备识别', duration_clusters:'时长分组推测', labeled_duration:'标注样本时长推测', unknown:'未知'};

export function csvCell(value) {
  let text = value == null ? '' : String(value);
  // Excel may ignore leading whitespace/control characters before a formula marker.
  // Always quote cells, escape quotes, and neutralize formulas before quoting.
  if (/^[\s\u0000-\u001f]*[=+\-@]/u.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}

function shanghaiTime(timestamp) {
  if (!Number.isFinite(timestamp)) return '';
  const date = new Date(timestamp + 8 * 3600000);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0,19).replace('T',' ') + '+08:00';
}

export function recordsCsv(rows, pets = [], {demo = false} = {}) {
  const names = new Map(pets.map(p => [String(p.id), p.name]));
  const body = rows.map(row => {
    const c = row.classification ?? {};
    const inferred = ['duration_clusters','labeled_duration'].includes(c.source);
    const kind = kinds[c.label] ?? '不确定';
    return [
      demo ? '合成演示数据' : '已采集记录', '仅当前显示记录，非完整历史',
      shanghaiTime(row.timestamp), row.pet_name ?? names.get(String(row.pet_id)) ?? '未识别',
      Number.isFinite(row.duration_seconds) && row.duration_seconds >= 0 ? row.duration_seconds : '',
      inferred && kind !== '不确定' ? '推测 · ' + kind : kind,
      sources[c.source] ?? '未知', c.confidence ?? 'none', c.note ?? '',
      kinds[row.user_label] ?? '未标注', row.device_name ?? '',
    ].map(csvCell).join(',');
  });
  // UTF-8 BOM helps Excel recognize Chinese; CRLF and quoted newlines preserve CSV structure.
  return '\uFEFF' + [headers.map(csvCell).join(','), ...body].join('\r\n') + '\r\n';
}
