import {useState} from 'react';
import {Download} from 'lucide-react';
import {recordsCsv} from '../lib/record-csv.mjs';

export default function RecordExport({rows,pets=[],demo=false,disabled=false}:{rows:any[];pets?:any[];demo?:boolean;disabled?:boolean}) {
  const [message,setMessage]=useState('');
  function download() {
    try {
      const blob=new Blob([recordsCsv(rows,pets,{demo})],{type:'text/csv;charset=utf-8'});
      const url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;
      link.download=demo?'poopurr-demo-displayed-records.csv':'poopurr-displayed-records.csv';
      try {document.body.appendChild(link);link.click();}
      finally {link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
      setMessage(`已准备 ${rows.length} 条当前显示记录；文件包含猫咪名称与时间，请按需分享。`);
    } catch {setMessage('无法生成 CSV，请重试或换一个支持下载的浏览器。');}
  }
  return <div className="record-export"><button className="secondary" disabled={disabled||rows.length===0} onClick={download}><Download size={14}/>导出当前 {rows.length} 条 CSV</button><small>仅导出下方显示的记录，非完整历史。{demo?'合成演示数据。':''}</small><span role="status">{message}</span></div>;
}
