import {bounds,dayAt,validDay} from './records.mjs';
export const nextDay = day => dayAt(Date.parse(validDay(day)+'T00:00:00+08:00')+86400000);
export function syncRange(args={},now=Date.now()) {
 if(args.date&&(args.start_date||args.end_date))throw new Error('单日与范围不能同时指定');
 const start=args.date??args.start_date??dayAt(now),end=args.date?nextDay(args.date):(args.end_date??nextDay(dayAt(now)));
 const [a,b]=bounds(start,end);
 if(start<dayAt(now-30*86400000)||end>nextDay(dayAt(now))||b-a>31*86400000)throw new Error('仅支持近31天');
 return {start,end,days:(b-a)/86400000};
}
export function cachedDay(coverage,devices,day,now=Date.now()) {
 if(day>=dayAt(now)||!devices.length)return false;
 const end=Date.parse(nextDay(day)+'T00:00:00+08:00');
 return devices.every(d=>coverage.some(c=>c.device_id===d.id&&c.requested_day===day&&c.fetched_at>=end&&now-c.fetched_at<6*3600000&&c.fetch_succeeded===true));
}
