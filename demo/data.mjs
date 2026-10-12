// Deterministic fictional records: never read PETKIT, credentials or production data.
export const pets=[{id:'demo-mochi',name:'麻薯'},{id:'demo-toast',name:'吐司'}];
export const END='2026-10-13';
export function makeEvents(){
 const rows=[];
 for(let d=0;d<30;d++) for(let c=0;c<2;c++) for(let n=0;n<3+(d+c)%2;n++){
  const day=new Date(Date.UTC(2026,8,13+d)).toISOString().slice(0,10);
  const hour=(c?[8,15,22,23]:[6,12,19,7])[n],minute=(d*13+n*17+c*7)%60;
  rows.push({key:`demo-${d}-${c}-${n}`,pet_id:pets[c].id,pet_name:pets[c].name,day,
   timestamp:Date.parse(`${day}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:00+08:00`),
   duration_seconds:(n===2?95+c*25:24+c*12)+(d*7+n*3)%19,
   stool_detected:d%5===0&&n===2,urine_detected:d%5===0&&n!==2,user_label:null});
 }
 return rows.sort((a,b)=>b.timestamp-a.timestamp);
}
