import React,{useMemo,useState,lazy,Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import {ArrowUpRight,Activity,Clock,Cat,RotateCcw,Code2} from 'lucide-react';
const BehaviorPanel=lazy(()=>import('../web/behavior-panel'));
import {analyzeBehavior} from '../lib/behavior.mjs';
import {makeEvents,pets,END} from './data.mjs';
import icon from '../docs/assets/icon.svg';
import '../web/globals.css';
import './style.css';
const labels:Record<string,string>={urine:'小便',stool:'大便',both:'大小便',unknown:'不确定'};
function Demo(){
 const [events,setEvents]=useState<any[]>(makeEvents),[days,setDays]=useState(7),[pet,setPet]=useState(''),[message,setMessage]=useState('');
 const start=new Date(Date.parse(END+'T00:00:00+08:00')-(days-1)*86400000).toISOString().slice(0,10);
 const analysis=useMemo(()=>analyzeBehavior(events,pets,start,END),[events,start]);
 const shown=analysis.events.filter((r:any)=>!pet||r.pet_id===pet),classified=shown.filter((r:any)=>['manual','device'].includes(r.classification.source)).length;
 function reset(){setEvents(makeEvents());setDays(7);setPet('');setMessage('已恢复全部演示数据。');}
 return <><div className="demo-ribbon">互动演示 · 全部为虚拟数据 · 无需账号 · 不连接 PETKIT</div><header><a className="brand" href="https://github.com/DevRoss/poopurr"><img src={icon} width="44" height="44" alt="Poopurr"/><span>poopurr<small>猫咪如厕手账</small></span></a><a className="secondary" href="https://github.com/DevRoss/poopurr">GitHub <ArrowUpRight size={15}/></a></header><main className="wrap">
 <section className="hero"><div><div className="eyebrow">SMALL HABITS. BIG LOVE.</div><h1>猫咪的秘密日程，<br/><em>现在有迹可循。</em></h1><p>认识麻薯和吐司，两位虚拟的如厕观察员。<br/>换个时间范围，看看它们各自的节奏。</p><div className="demo-actions"><a className="primary" href="#explore">开始探索 ↓</a><a className="text-link" href="https://github.com/DevRoss/poopurr#快速开始">部署自己的手账 ↗</a></div></div><div className="hero-note"><img src={icon} width="114" height="114" alt="微笑的猫咪"/><p>每一次小日常<br/><strong>都值得认真对待。</strong></p></div></section>
 <section className="demo-guide"><span>试试看</span><p>① 切换 7 / 14 / 30 天　② 查看时段与时长分布　③ 在明细中标注一条记录</p></section>
 <section className="sectionbar" id="explore"><div><span className="eyebrow">A LITTLE WINDOW INTO THEIR DAY</span><h2>观察手账</h2><p>{start} — 2026-10-12 · 固定演示日期</p></div><div className="controls"><div className="segmented" role="group" aria-label="日期范围">{[7,14,30].map(n=><button key={n} aria-pressed={days===n} className={days===n?'active':''} onClick={()=>setDays(n)}>{n} 天</button>)}</div><select aria-label="筛选统计与明细的猫咪" value={pet} onChange={e=>setPet(e.target.value)}><option value="">全部猫咪</option>{pets.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><button className="secondary" onClick={reset}><RotateCcw size={14}/>重置</button></div></section>
 <div role="status" className="demo-status">{message||'改动只保留在当前页面；刷新或重置后恢复。'}</div>
 <section className="stats"><article><span className="metric-label"><Activity size={17}/>观察到的如厕</span><div className="metric">{shown.length}<small>次</small></div><p>当前日期与猫咪筛选</p></article><article><span className="metric-label"><Cat size={17}/>有明确来源的分类</span><div className="metric">{classified}<small>次</small></div><p>模拟设备识别或手动标注</p></article><article><span className="metric-label"><Clock size={17}/>观察窗口</span><div className="metric">{days}<small>天</small></div><p>两只虚拟猫咪 · 固定样本</p></article></section>
 <Suspense fallback={<p className="analysis-note">正在加载两只猫的行为图表…</p>}><BehaviorPanel analysis={analysis}/></Suspense>
 <section className="records"><div className="panel-title"><h2>每一次，都记着</h2><span>最近 20 条 · 试试手动校正</span></div><div className="tablewrap"><table><thead><tr><th>时间 · 上海</th><th>猫咪</th><th>停留</th><th>分类与来源</th><th>手动校正</th></tr></thead><tbody>{shown.slice(0,20).map((r:any)=><tr key={r.key}><td>{new Date(r.timestamp).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}</td><td>{pets.find(p=>p.id===r.pet_id)?.name}</td><td>{r.duration_seconds} 秒</td><td><span className={'event-tag '+(['duration_clusters','labeled_duration'].includes(r.classification.source)?'inferred':'')}>{r.classification.source==='manual'?'手动 · ':r.classification.source==='device'?'模拟设备 · ':r.classification.source==='unknown'?'':'推测 · '}{labels[r.classification.label]}</span></td><td><select className="label-select" aria-label={`校正 ${r.key}`} value={r.user_label??''} onChange={e=>{const value=e.target.value;setEvents(events.map(x=>x.key===r.key?{...x,user_label:value||null}:x));setMessage('演示标注已更新，统计和模型已重新计算。');}}><option value="">自动分类</option>{Object.entries(labels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></td></tr>)}</tbody></table></div></section>
 <section className="demo-end"><Code2 size={28}/><h2>给你家的猫，也留一本手账。</h2><p>自部署 · 历史补拉 · 多猫对比 · 只读 MCP</p><a className="primary" href="https://github.com/DevRoss/poopurr#快速开始">查看开源项目 <ArrowUpRight size={16}/></a></section><footer><span>Poopurr · Small habits. Big love.</span><span>合成数据演示 · 非 PETKIT 官方项目</span></footer></main></>;
}
createRoot(document.getElementById('root')!).render(<Demo/>);
