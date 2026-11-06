import test from 'node:test';
import assert from 'node:assert/strict';
import {recordsCsv,csvCell} from '../lib/record-csv.mjs';
import {makeEvents,pets,END} from '../demo/data.mjs';
import {analyzeBehavior} from '../lib/behavior.mjs';

// Small independent CSV reader verifies real field boundaries, not only substrings.
function parse(csv) {
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=1;i<csv.length;i++){
  const c=csv[i];
  if(c==='"'){if(quoted&&csv[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
  else if(c===','&&!quoted){row.push(cell);cell='';}
  else if(c==='\r'&&csv[i+1]==='\n'&&!quoted){row.push(cell);rows.push(row);row=[];cell='';i++;}
  else cell+=c;
 }
 assert.equal(quoted,false);return rows;
}
const time=Date.parse('2026-10-22T16:05:06Z');
test('CSV preserves Chinese, quotes, commas, newlines and Shanghai midnight',()=>{
 const csv=recordsCsv([{timestamp:time,pet_name:'猫,"A"\n换行',duration_seconds:0,device_name:'小佩'}]);
 assert.equal(csv.charCodeAt(0),0xfeff);
 const [head,row]=parse(csv);assert.equal(row.length,head.length);
 assert.equal(row[2],'2026-10-23 00:05:06+08:00');assert.equal(row[3],'猫,"A"\n换行');assert.equal(row[4],'0');
});
test('missing values stay unknown or blank; no fabricated records or zero durations',()=>{
 const [,row]=parse(recordsCsv([{timestamp:null,duration_seconds:null,pet_id:null}], [{id:'other',name:'Other cat'}]));
 assert.equal(row[2],'');assert.equal(row[3],'未识别');assert.equal(row[4],'');assert.equal(row[5],'不确定');
 assert.equal(parse(recordsCsv([])).length,1);
});
test('device, manual, inferred and uncertain results remain distinct',()=>{
 const rows=['device','manual','duration_clusters','labeled_duration','unknown'].map(source=>({timestamp:time,classification:{source,label:source==='unknown'?'unknown':'stool',confidence:source==='duration_clusters'?'low':'tentative',note:'原说明'},user_label:source==='manual'?'stool':null}));
 const data=parse(recordsCsv(rows)).slice(1);
 assert.deepEqual(data.map(r=>r[6]),['设备识别','人工标注','时长分组推测','标注样本时长推测','未知']);
 assert.equal(data[2][5],'推测 · 大便');assert.equal(data[2][7],'low');assert.equal(data[4][5],'不确定');
 assert.equal(data[1][9],'大便');assert.equal(data[0][9],'未标注');
});
test('spreadsheet formulas are neutralized including leading whitespace and controls',()=>{
 for(const text of ['=1+1','+SUM(1,2)','-1+2','@SUM(A1)','  =1','\t=1','\r=1','\n=1','\u0000=1'])assert.equal(parse('\uFEFF'+csvCell(text)+'\r\n')[0][0],"'"+text);
 assert.equal(csvCell('ordinary-name'),'"ordinary-name"');
});
test('allowlisted fields exclude raw payloads, account/device IDs and credentials',()=>{
 const csv=recordsCsv([{timestamp:time,pet_id:'pet-secret',device_id:'device-secret',key:'private-key',token:'session-secret',raw:{password:'private-password'},classification:{label:'unknown'}}]);
 for(const secret of ['pet-secret','device-secret','private-key','session-secret','private-password'])assert.ok(!csv.includes(secret));
 assert.match(csv,/仅当前显示记录，非完整历史/);
});
test('demo export matches the filtered visible slice and carries a synthetic marker',()=>{
 const analysis=analyzeBehavior(makeEvents(),pets,'2026-10-06',END);
 const displayed=analysis.events.filter(r=>r.pet_id===pets[1].id).slice(0,20);
 const csv=parse(recordsCsv(displayed,pets,{demo:true}));
 assert.equal(csv.length,21);assert.ok(csv.slice(1).every(r=>r[0]==='合成演示数据'&&r[3]===pets[1].name));
});
