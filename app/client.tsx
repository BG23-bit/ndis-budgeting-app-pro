"use client";
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
type Rates = { weekdayOrd: number; weekdayNight: number; sat: number; sun: number; publicHoliday: number; activeSleepoverHourly: number; fixedSleepoverUnit: number; gstRate: number };
type PlanDates = { start: string; end: string; state: string };
type DayRoster = { enabled: boolean; hours: number; nightHours: number; frequency: string };
type SupportLine = { id: string; code: string; description: string; totalFunding: number; ratio: string; excludedHolidays: string[]; roster: { [key: string]: DayRoster }; activeSleepoverHours: number; activeSleepoverFreq: string; fixedSleepovers: number; fixedSleepoverFreq: string; kmsPerWeek: number; kmRate: number; kmFreq: string };
const DAYS = ["mon","tue","wed","thu","fri","sat","sun"];
const DL: {[k:string]:string} = {mon:"Monday",tue:"Tuesday",wed:"Wednesday",thu:"Thursday",fri:"Friday",sat:"Saturday",sun:"Sunday"};
const FREQ: {[k:string]:{label:string;multiplier:number}} = {"every":{label:"Every week",multiplier:1},"2nd":{label:"Every 2nd week",multiplier:0.5},"3rd":{label:"Every 3rd week",multiplier:0.333},"4th":{label:"Every 4th week",multiplier:0.25},"monthly":{label:"Monthly",multiplier:0.2308}};
const RATIOS: {[k:string]:{label:string;divisor:number}} = {"1:1":{label:"1:1 (Full rate)",divisor:1},"1:2":{label:"1:2 (Half rate)",divisor:2},"1:3":{label:"1:3 (Third rate)",divisor:3},"1:4":{label:"1:4 (Quarter rate)",divisor:4}};
const STATES = [{value:"NSW",label:"New South Wales"},{value:"VIC",label:"Victoria"},{value:"QLD",label:"Queensland"},{value:"SA",label:"South Australia"},{value:"WA",label:"Western Australia"},{value:"TAS",label:"Tasmania"},{value:"NT",label:"Northern Territory"},{value:"ACT",label:"Australian Capital Territory"}];
function defaultRoster():{[k:string]:DayRoster}{const r:{[k:string]:DayRoster}={};DAYS.forEach(d=>{r[d]={enabled:false,hours:0,nightHours:0,frequency:"every"}});return r}
function formatDate(d:Date):string{return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function getPublicHolidays(year:number,state:string):{date:string;name:string;dayOfWeek:number}[]{
const h:{date:string;name:string;dayOfWeek:number}[]=[];
function add(date:string,name:string){const d=new Date(date);h.push({date,name,dayOfWeek:d.getDay()})}
add(year+"-01-01","New Year's Day");add(year+"-01-26","Australia Day");
const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),hh=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-hh-k)%7,m=Math.floor((a+11*hh+22*l)/451),mo=Math.floor((hh+l-7*m+114)/31),da=((hh+l-7*m+114)%31)+1;
const easter=new Date(year,mo-1,da);
const gf=new Date(easter);gf.setDate(easter.getDate()-2);add(formatDate(gf),"Good Friday");
const es=new Date(easter);es.setDate(easter.getDate()-1);add(formatDate(es),"Easter Saturday");
add(formatDate(easter),"Easter Sunday");
const em=new Date(easter);em.setDate(easter.getDate()+1);add(formatDate(em),"Easter Monday");
add(year+"-04-25","ANZAC Day");
if(state==="ACT"){const x=new Date(year,2,1);add(formatDate(new Date(year,2,1+((8-x.getDay())%7)+7)),"Canberra Day")}
if(state==="VIC"){const x=new Date(year,5,1);add(formatDate(new Date(year,5,1+((8-x.getDay())%7)+7)),"Queen's Birthday");const y=new Date(year,10,1);add(formatDate(new Date(year,10,1+((9-y.getDay())%7))),"Melbourne Cup")}
if(state==="NSW"||state==="SA"||state==="TAS"||state==="ACT"){const x=new Date(year,5,1);add(formatDate(new Date(year,5,1+((8-x.getDay())%7)+7)),"Queen's Birthday")}
if(state==="QLD"){const x=new Date(year,9,1);add(formatDate(new Date(year,9,1+((8-x.getDay())%7)+21)),"Queen's Birthday")}
if(state==="WA"){const x=new Date(year,8,1);add(formatDate(new Date(year,8,1+((8-x.getDay())%7)+21)),"Queen's Birthday")}
if(state==="NT"){const x=new Date(year,4,1);add(formatDate(new Date(year,4,1+((8-x.getDay())%7))),"May Day");const y=new Date(year,5,1);add(formatDate(new Date(year,5,1+((8-y.getDay())%7)+7)),"Queen's Birthday")}
if(state==="SA"){const x=new Date(year,9,1);add(formatDate(new Date(year,9,1+((8-x.getDay())%7))),"Labour Day")}
if(state==="TAS"){const x=new Date(year,10,1);add(formatDate(new Date(year,10,1+((8-x.getDay())%7))),"Recreation Day")}
add(year+"-12-25","Christmas Day");add(year+"-12-26","Boxing Day");return h}
function getHolidaysInRange(start:string,end:string,state:string){if(!start||!end)return[];const sd=new Date(start),ed=new Date(end);const all:{date:string;name:string;dayOfWeek:number}[]=[];for(let y=sd.getFullYear();y<=ed.getFullYear();y++)all.push(...getPublicHolidays(y,state));return all.filter(h=>{const d=new Date(h.date);return d>=sd&&d<=ed}).sort((a,b)=>a.date.localeCompare(b.date))}
function getDayName(d:number):string{return["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][d]}
function getWeeksInPlan(s:string,e:string):number{if(!s||!e)return 52;return Math.max(1,(new Date(e).getTime()-new Date(s).getTime())/(7*24*60*60*1000))}
function money(n:number):string{const v=Number.isFinite(n)?n:0;return v.toLocaleString("en-AU",{style:"currency",currency:"AUD"})}
function num(x:any):number{const v=Number(x);return Number.isFinite(v)?v:0}
function uid():string{return Math.random().toString(16).slice(2)+Date.now().toString(16)}
function escapeHtml(s:string){return s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function downloadTextFile(fn:string,text:string){const blob=new Blob([text],{type:"text/plain;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=fn;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)}
function Field(p:{label:string;value:number;step?:number;onChange:(v:number)=>void}){return(<label className="block"><div className="text-sm mb-1" style={{color:"#b0a0d0"}}>{p.label}</div><input type="number" step={p.step??1} value={Number.isFinite(p.value)?p.value:0} onChange={e=>p.onChange(num(e.target.value))} className="w-full rounded-lg px-3 py-2 outline-none" style={{background:"rgba(26,17,80,0.6)",border:"1px solid rgba(212,168,67,0.2)",color:"white"}}/></label>)}
function SmallField(p:{value:number;step?:number;onChange:(v:number)=>void;disabled?:boolean}){return(<input type="number" step={p.step??0.25} value={Number.isFinite(p.value)?p.value:0} onChange={e=>p.onChange(num(e.target.value))} disabled={p.disabled} className="rounded-lg px-2 py-1 outline-none w-16 text-center" style={{background:p.disabled?"rgba(26,17,80,0.3)":"rgba(26,17,80,0.6)",border:"1px solid rgba(212,168,67,0.2)",color:p.disabled?"#505060":"white",fontSize:"0.85rem"}}/>)}
function TextField(p:{label:string;value:string;onChange:(v:string)=>void}){return(<label className="block"><div className="text-sm mb-1" style={{color:"#b0a0d0"}}>{p.label}</div><input value={p.value} onChange={e=>p.onChange(e.target.value)} className="w-full rounded-lg px-3 py-2 outline-none" style={{background:"rgba(26,17,80,0.6)",border:"1px solid rgba(212,168,67,0.2)",color:"white"}}/></label>)}
function DateField(p:{label:string;value:string;onChange:(v:string)=>void}){return(<label className="block"><div className="text-sm mb-1" style={{color:"#b0a0d0"}}>{p.label}</div><input type="date" value={p.value} onChange={e=>p.onChange(e.target.value)} className="w-full rounded-lg px-3 py-2 outline-none" style={{background:"rgba(26,17,80,0.6)",border:"1px solid rgba(212,168,67,0.2)",color:"white"}}/></label>)}
function SelectField(p:{label:string;value:string;options:{value:string;label:string}[];onChange:(v:string)=>void}){return(<label className="block"><div className="text-sm mb-1" style={{color:"#b0a0d0"}}>{p.label}</div><select value={p.value} onChange={e=>p.onChange(e.target.value)} className="w-full rounded-lg px-3 py-2 outline-none" style={{background:"rgba(26,17,80,0.6)",border:"1px solid rgba(212,168,67,0.2)",color:"white"}}>{p.options.map(o=>(<option key={o.value} value={o.value}>{o.label}</option>))}</select></label>)}
function SmallSelect(p:{value:string;options:{value:string;label:string}[];onChange:(v:string)=>void;disabled?:boolean}){return(<select value={p.value} onChange={e=>p.onChange(e.target.value)} disabled={p.disabled} className="rounded-lg px-2 py-1 outline-none" style={{background:p.disabled?"rgba(26,17,80,0.3)":"rgba(26,17,80,0.6)",border:"1px solid rgba(212,168,67,0.2)",color:p.disabled?"#505060":"white",fontSize:"0.8rem"}}>{p.options.map(o=>(<option key={o.value} value={o.value}>{o.label}</option>))}</select>)}
function getBudgetStatus(remaining:number,totalFunding:number){const pct=totalFunding>0?(remaining/totalFunding)*100:0;if(remaining<0)return{color:"#ef4444",bg:"rgba(239,68,68,0.1)",label:"OVER BUDGET",border:"rgba(239,68,68,0.3)"};if(pct<10)return{color:"#f59e0b",bg:"rgba(245,158,11,0.1)",label:"LOW BUDGET",border:"rgba(245,158,11,0.3)"};return{color:"#22c55e",bg:"rgba(34,197,94,0.1)",label:"ON TRACK",border:"rgba(34,197,94,0.3)"}}
function calcWeeklyCost(line:SupportLine,rates:Rates){const divisor=RATIOS[line.ratio]?.divisor||1;let wt=0;for(const d of DAYS){const r=line.roster[d];if(!r||!r.enabled)continue;const fm=FREQ[r.frequency]?.multiplier||1;const isSat=d==="sat";const isSun=d==="sun";const dr=isSat?rates.sat/divisor:isSun?rates.sun/divisor:rates.weekdayOrd/divisor;const nr=rates.weekdayNight/divisor;wt+=(r.hours*dr+r.nightHours*nr)*fm}const sf=FREQ[line.activeSleepoverFreq]?.multiplier||1;wt+=line.activeSleepoverHours*(rates.activeSleepoverHourly/divisor)*sf;const ff=FREQ[line.fixedSleepoverFreq]?.multiplier||1;wt+=line.fixedSleepovers*rates.fixedSleepoverUnit*ff;const kf=FREQ[line.kmFreq]?.multiplier||1;wt+=line.kmsPerWeek*line.kmRate*kf;return wt}
function calcPHImpact(line:SupportLine,holidays:{date:string;name:string;dayOfWeek:number}[],rates:Rates){const divisor=RATIOS[line.ratio]?.divisor||1;let extraCost=0,savedCost=0;const dm:{[k:number]:string}={0:"sun",1:"mon",2:"tue",3:"wed",4:"thu",5:"fri",6:"sat"};const details:{name:string;date:string;day:string;impact:number;included:boolean}[]=[];for(const h of holidays){const isExcluded=line.excludedHolidays.includes(h.date);const rd=dm[h.dayOfWeek];const r=line.roster[rd];if(!r||!r.enabled){details.push({name:h.name,date:h.date,day:getDayName(h.dayOfWeek),impact:0,included:!isExcluded});continue}const isSat=rd==="sat";const isSun=rd==="sun";const normalRate=isSat?rates.sat/divisor:isSun?rates.sun/divisor:rates.weekdayOrd/divisor;const phRate=rates.publicHoliday/divisor;const totalHrs=r.hours+r.nightHours;if(!isExcluded){const extra=(phRate-normalRate)*totalHrs;extraCost+=extra;details.push({name:h.name,date:h.date,day:getDayName(h.dayOfWeek),impact:extra,included:true})}else{const saved=normalRate*totalHrs;savedCost+=saved;details.push({name:h.name,date:h.date,day:getDayName(h.dayOfWeek),impact:saved,included:false})}}return{extraCost,savedCost,details}}
function getSuggestions(line:any,rates:Rates){if(line.remaining>=0)return[];const suggestions:string[]=[];const roster=line.roster||{};if(roster.sun?.enabled&&roster.sun.hours>0){const s=rates.sun-rates.weekdayOrd;suggestions.push("Reduce Sunday hours - saves "+money(s*roster.sun.hours*52)+"/yr")}if(roster.sat?.enabled&&roster.sat.hours>0){const s=rates.sat-rates.weekdayOrd;suggestions.push("Reduce Saturday hours - saves "+money(s*roster.sat.hours*52)+"/yr")}if(line.fixedSleepovers>0){suggestions.push("Remove 1 fixed sleepover/wk - saves "+money(rates.fixedSleepoverUnit*52)+"/yr")}if(line.kmsPerWeek>0){suggestions.push("Reduce KMs - currently "+money(line.kmsPerWeek*line.kmRate*52)+"/yr")}return suggestions.slice(0,3)}
function useCloudSync(key:string,data:any){const[userId,setUserId]=useState<string|null>(null);const timerRef=React.useRef<any>(null);useEffect(()=>{supabase.auth.getUser().then(({data:d})=>{setUserId(d.user?.id??null)})},[]);useEffect(()=>{if(!userId||!key)return;if(timerRef.current)clearTimeout(timerRef.current);timerRef.current=setTimeout(async()=>{try{await supabase.from("calculator_data").upsert({user_id:userId,participant_id:key,data:data,updated_at:new Date().toISOString()},{onConflict:"user_id,participant_id"})}catch(e){console.error("Cloud save error:",e)}},2000);return()=>{if(timerRef.current)clearTimeout(timerRef.current)}},[userId,key,data])}
async function loadFromCloud(key:string):Promise<any>{try{const{data:d}=await supabase.auth.getUser();if(!d.user)return null;const{data:row}=await supabase.from("calculator_data").select("data").eq("user_id",d.user.id).eq("participant_id",key).single();return row?.data||null}catch{return null}}
const NDIS_RATES_2025_26:Rates={weekdayOrd:70.23,weekdayNight:77.38,sat:98.83,sun:127.43,publicHoliday:156.03,activeSleepoverHourly:78.81,fixedSleepoverUnit:297.6,gstRate:0};
export default function PageClient({storageKey}:{storageKey?:string}){
const STORAGE_KEY=storageKey||"ndis_budget_calc_pro_v7";
const[userEmail,setUserEmail]=useState<string|null>(null);
useEffect(()=>{supabase.auth.getUser().then(({data})=>{setUserEmail(data.user?.email??null)});const{data:sub}=supabase.auth.onAuthStateChange((_ev,session)=>{setUserEmail(session?.user?.email??null)});return()=>{sub.subscription.unsubscribe()}},[]);
const[planDates,setPlanDates]=useState<PlanDates>({start:new Date().toISOString().slice(0,10),end:new Date(Date.now()+365*24*60*60*1000).toISOString().slice(0,10),state:"VIC"});
const[rates,setRates]=useState<Rates>({weekdayOrd:70.23,weekdayNight:77.38,sat:98.83,sun:127.43,publicHoliday:156.03,activeSleepoverHourly:78.81,fixedSleepoverUnit:297.6,gstRate:0});
const[lines,setLines]=useState<SupportLine[]>([{id:uid(),code:"01",description:"Core Supports",totalFunding:0,ratio:"1:1",excludedHolidays:[],roster:defaultRoster(),activeSleepoverHours:0,activeSleepoverFreq:"every",fixedSleepovers:0,fixedSleepoverFreq:"every",kmsPerWeek:0,kmRate:0.99,kmFreq:"every"}]);
const planWeeks=useMemo(()=>getWeeksInPlan(planDates.start,planDates.end),[planDates.start,planDates.end]);
const holidays=useMemo(()=>getHolidaysInRange(planDates.start,planDates.end,planDates.state),[planDates]);
useEffect(()=>{async function load(){const cloud=await loadFromCloud(STORAGE_KEY);const raw=cloud||(()=>{try{const r=localStorage.getItem(STORAGE_KEY);return r?JSON.parse(r):null}catch{return null}})();if(!raw)return;if(raw?.rates)setRates((r:any)=>({...r,...raw.rates}));if(raw?.planDates)setPlanDates((p:any)=>({...p,...raw.planDates}));if(Array.isArray(raw?.lines)&&raw.lines.length>0)setLines(raw.lines.map((l:any)=>({...l,ratio:l.ratio||"1:1",excludedHolidays:l.excludedHolidays||[],roster:l.roster||defaultRoster(),activeSleepoverFreq:l.activeSleepoverFreq||"every",fixedSleepoverFreq:l.fixedSleepoverFreq||"every",kmsPerWeek:l.kmsPerWeek||0,kmRate:l.kmRate||0.99,kmFreq:l.kmFreq||"every"})))}load()},[]);
const saveData={rates,lines,planDates};useEffect(()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(saveData))}catch{}},[rates,lines,planDates]);useCloudSync(STORAGE_KEY,saveData);
const perLine=useMemo(()=>{return lines.map(l=>{const wt=calcWeeklyCost(l,rates);const weeklyGST=wt*(rates.gstRate||0);const weeklyWithGST=wt+weeklyGST;const basePlanCost=weeklyWithGST*planWeeks;const phImpact=calcPHImpact(l,holidays,rates);const phAdjustment=phImpact.extraCost-phImpact.savedCost;const planTotal=basePlanCost+phAdjustment;const remaining=l.totalFunding-planTotal;return{...l,weeklyTotal:wt,weeklyGST,weeklyWithGST,basePlanCost,phImpact,phAdjustment,planTotal,remaining}})},[lines,rates,planWeeks,holidays]);
const totals=useMemo(()=>{const totalFunding=perLine.reduce((a,l)=>a+l.totalFunding,0);const weekly=perLine.reduce((a,l)=>a+l.weeklyWithGST,0);const planCost=perLine.reduce((a,l)=>a+l.planTotal,0);const totalPH=perLine.reduce((a,l)=>a+l.phAdjustment,0);const remaining=totalFunding-planCost;return{totalFunding,weekly,planCost,totalPH,remaining}},[perLine]);
function updateLine(id:string,patch:Partial<SupportLine>){setLines(prev=>prev.map(l=>(l.id===id?{...l,...patch}:l)))}
function updateRosterDay(lineId:string,day:string,patch:Partial<DayRoster>){setLines(prev=>prev.map(l=>{if(l.id!==lineId)return l;return{...l,roster:{...l.roster,[day]:{...l.roster[day],...patch}}}}))}
function toggleHoliday(lineId:string,date:string){setLines(prev=>prev.map(l=>{if(l.id!==lineId)return l;const exc=l.excludedHolidays.includes(date)?l.excludedHolidays.filter(d=>d!==date):[...l.excludedHolidays,date];return{...l,excludedHolidays:exc}}))}
function setAllHolidays(lineId:string,include:boolean){setLines(prev=>prev.map(l=>l.id!==lineId?l:{...l,excludedHolidays:include?[]:holidays.map(h=>h.date)}))}
function addLine(){setLines(prev=>[...prev,{id:uid(),code:"NEW",description:"New line",totalFunding:0,ratio:"1:1",excludedHolidays:[],roster:defaultRoster(),activeSleepoverHours:0,activeSleepoverFreq:"every",fixedSleepovers:0,fixedSleepoverFreq:"every",kmsPerWeek:0,kmRate:0.99,kmFreq:"every"}])}
function deleteLine(id:string){setLines(prev=>(prev.length<=1?prev:prev.filter(l=>l.id!==id)))}
function exportCSV(){const header=["Code","Description","Ratio","Funding","Weekly","KMs/wk","KM Cost/wk","PH Adj","Plan Total","Remaining"];const rows=perLine.map((l:any)=>[l.code,l.description,l.ratio,l.totalFunding,l.weeklyWithGST,l.kmsPerWeek,l.kmsPerWeek*l.kmRate,l.phAdjustment,l.planTotal,l.remaining]);const csv=[header,...rows].map(r=>r.map(cell=>{const s=String(cell??"");return/[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}).join(",")).join("\n");downloadTextFile("ndis-budget-"+new Date().toISOString().slice(0,10)+".csv",csv)}
function exportPDF(){const dt=new Date().toLocaleString("en-AU");const rh=perLine.map((l:any)=>"<tr><td>"+escapeHtml(l.code)+"</td><td>"+escapeHtml(l.description)+"</td><td>"+l.ratio+"</td><td class='num'>"+escapeHtml(money(l.totalFunding))+"</td><td class='num'>"+escapeHtml(money(l.weeklyWithGST))+"</td><td class='num'>"+l.kmsPerWeek+"km</td><td class='num'>"+escapeHtml(money(l.phAdjustment))+"</td><td class='num'>"+escapeHtml(money(l.planTotal))+"</td><td class='num "+(l.remaining<0?"neg":"pos")+"'>"+escapeHtml(money(l.remaining))+"</td></tr>").join("");const hh=holidays.map(h=>"<tr><td>"+h.date+"</td><td>"+getDayName(h.dayOfWeek)+"</td><td>"+h.name+"</td></tr>").join("");const html="<!doctype html><html><head><meta charset='utf-8'/><title>NDIS Budget Report</title><style>body{font-family:-apple-system,sans-serif;padding:24px;color:#111}h1{margin:0 0 6px;font-size:20px;color:#1a1150}.meta{color:#444;margin-bottom:16px;font-size:12px}table{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}th,td{border:1px solid #ddd;padding:8px}th{background:#1a1150;color:white;text-align:left}.num{text-align:right}.neg{color:#c0392b;font-weight:700}.pos{color:#27ae60;font-weight:700}.kpi{font-size:14px;margin:4px 0}.section{font-size:16px;font-weight:600;margin:20px 0 8px;color:#1a1150}.powered{text-align:center;margin-top:20px;font-size:11px;color:#888}</style></head><body><h1>NDIS Budget Report</h1><div class='meta'>"+escapeHtml(dt)+" | "+escapeHtml(planDates.start)+" to "+escapeHtml(planDates.end)+" | "+planDates.state+" | "+planWeeks.toFixed(1)+" wks | Powered by Kevria</div><div class='kpi'><b>Funding:</b> "+escapeHtml(money(totals.totalFunding))+"</div><div class='kpi'><b>Weekly:</b> "+escapeHtml(money(totals.weekly))+"</div><div class='kpi'><b>PH adj:</b> "+escapeHtml(money(totals.totalPH))+"</div><div class='kpi'><b>Plan cost:</b> "+escapeHtml(money(totals.planCost))+"</div><div class='kpi'><b>Remaining:</b> "+escapeHtml(money(totals.remaining))+"</div><div class='section'>Support Lines</div><table><tr><th>Code</th><th>Description</th><th>Ratio</th><th>Funding</th><th>Weekly</th><th>KMs</th><th>PH Adj</th><th>Plan Total</th><th>Remaining</th></tr>"+rh+"</table><div class='section'>Public Holidays ("+holidays.length+")</div><table><tr><th>Date</th><th>Day</th><th>Holiday</th></tr>"+hh+"</table><div class='powered'>Powered by Kevria - NDIS Budget Calculator</div><script>window.onload=()=>{window.focus();window.print()}</script></body></html>";const w=window.open("","_blank");if(!w){alert("Popup blocked.");return}w.document.open();w.document.write(html);w.document.close()}
const totalStatus=getBudgetStatus(totals.remaining,totals.totalFunding);
return(
<main className="min-h-screen" style={{background:"#0f0a30",color:"white"}}>
<div className="mx-auto max-w-6xl p-6">
<div className="flex items-center justify-between mb-2">
<div className="flex items-center gap-3"><span style={{fontSize:"1.5rem",color:"#d4a843"}}>✦</span><h1 className="text-3xl font-bold">NDIS Budget Calculator</h1></div>
{userEmail&&<span className="text-sm" style={{color:"#8080a0"}}>{userEmail}</span>}
</div>
<div className="text-sm mb-6" style={{color:"#6060a0"}}>Powered by <span style={{color:"#d4a843"}}>Kevria</span></div>

<div className="rounded-2xl p-6 mb-6" style={{background:"rgba(26,17,80,0.4)",border:"1px solid rgba(212,168,67,0.15)"}}>
<h2 className="text-xl font-semibold mb-4" style={{color:"#d4a843"}}>Plan Details</h2>
<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
<DateField label="Plan Start Date" value={planDates.start} onChange={v=>setPlanDates(p=>({...p,start:v}))}/>
<DateField label="Plan End Date" value={planDates.end} onChange={v=>setPlanDates(p=>({...p,end:v}))}/>
<SelectField label="State / Territory" value={planDates.state} options={STATES.map(s=>({value:s.value,label:s.label}))} onChange={v=>setPlanDates(p=>({...p,state:v}))}/>
</div>
<div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
<div className="rounded-xl p-3" style={{background:"rgba(212,168,67,0.1)",border:"1px solid rgba(212,168,67,0.2)"}}><div className="text-xs" style={{color:"#b0a0d0"}}>Plan Duration</div><div className="text-lg font-bold" style={{color:"#d4a843"}}>{planWeeks.toFixed(1)} weeks</div></div>
<div className="rounded-xl p-3" style={{background:"rgba(212,168,67,0.1)",border:"1px solid rgba(212,168,67,0.2)"}}><div className="text-xs" style={{color:"#b0a0d0"}}>Public Holidays</div><div className="text-lg font-bold" style={{color:"#d4a843"}}>{holidays.length} days</div></div>
<div className="rounded-xl p-3" style={{background:"rgba(212,168,67,0.1)",border:"1px solid rgba(212,168,67,0.2)"}}><div className="text-xs" style={{color:"#b0a0d0"}}>State</div><div className="text-lg font-bold" style={{color:"#d4a843"}}>{planDates.state}</div></div>
</div>
{holidays.length>0&&(<div className="mt-4"><div className="text-sm font-semibold mb-2" style={{color:"#b0a0d0"}}>Public Holidays in Plan Period:</div>
<div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">{holidays.map((h,i)=>(<div key={i} className="text-sm py-1 px-2 rounded" style={{background:"rgba(255,255,255,0.03)"}}><span style={{color:"#d4a843"}}>{h.date}</span> <span style={{color:"#8080a0"}}>({getDayName(h.dayOfWeek)})</span> <span style={{color:"#b0a0d0"}}>{h.name}</span></div>))}</div></div>)}
</div>

<div className="rounded-2xl p-6 mb-6" style={{background:"linear-gradient(135deg, rgba(26,17,80,0.8), rgba(45,27,105,0.8))",border:"2px solid "+totalStatus.border}}>
<div className="flex items-center justify-between mb-4">
<div className="grid gap-2">
<div>Combined funding: <span className="font-semibold" style={{color:"#d4a843"}}>{money(totals.totalFunding)}</span></div>
<div>Weekly cost: <span className="font-semibold">{money(totals.weekly)}</span></div>
<div>PH adjustment: <span className="font-semibold" style={{color:totals.totalPH>0?"#ef4444":totals.totalPH<0?"#22c55e":"#b0a0d0"}}>{totals.totalPH>0?"+":""}{money(totals.totalPH)}</span></div>
<div>Plan cost ({planWeeks.toFixed(1)} wks): <span className="font-semibold">{money(totals.planCost)}</span></div>
</div>
<div className="text-right"><div className="text-sm font-semibold px-3 py-1 rounded-full" style={{background:totalStatus.bg,color:totalStatus.color,border:"1px solid "+totalStatus.border}}>{totalStatus.label}</div></div>
</div>
<div className="text-2xl font-bold" style={{color:totalStatus.color}}>Remaining: {money(totals.remaining)}</div>
<div className="mt-4"><div className="flex justify-between text-xs mb-1" style={{color:"#b0a0d0"}}><span>Used: {money(totals.planCost)}</span><span>Budget: {money(totals.totalFunding)}</span></div>
<div style={{background:"rgba(255,255,255,0.1)",borderRadius:"8px",height:"12px",overflow:"hidden"}}><div style={{width:Math.min(100,totals.totalFunding>0?(totals.planCost/totals.totalFunding)*100:0)+"%",height:"100%",borderRadius:"8px",background:totals.planCost>totals.totalFunding?"linear-gradient(90deg,#ef4444,#dc2626)":totals.planCost>totals.totalFunding*0.9?"linear-gradient(90deg,#f59e0b,#d97706)":"linear-gradient(90deg,#22c55e,#16a34a)",transition:"width 0.3s"}}/></div>
<div className="text-xs mt-1 text-right" style={{color:"#b0a0d0"}}>{totals.totalFunding>0?((totals.planCost/totals.totalFunding)*100).toFixed(1):0}% used</div></div>
<div className="mt-4 flex flex-wrap gap-2">
<button onClick={addLine} className="rounded-xl px-4 py-2 font-semibold" style={{background:"rgba(212,168,67,0.15)",border:"1px solid rgba(212,168,67,0.3)",color:"#d4a843"}}>+ Add support line</button>
<button onClick={exportCSV} className="rounded-xl px-4 py-2" style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#b0b0d0"}}>Export CSV</button>
<button onClick={exportPDF} className="rounded-xl px-4 py-2" style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#b0b0d0"}}>Export PDF</button>
</div></div>

<div className="rounded-2xl p-6 mb-6" style={{background:"rgba(26,17,80,0.4)",border:"1px solid rgba(212,168,67,0.15)"}}>
<div className="flex flex-wrap items-center justify-between gap-3 mb-4">
  <div>
    <h2 className="text-xl font-semibold" style={{color:"#d4a843"}}>Rates</h2>
    <div className="text-xs mt-1" style={{color:"#6060a0"}}>
      <a href="https://www.ndis.gov.au/providers/pricing-arrangements" target="_blank" rel="noopener noreferrer" style={{color:"#8080c0",textDecoration:"underline"}}>NDIS Pricing Arrangements 2025–26</a>
    </div>
  </div>
  <button onClick={()=>setRates(NDIS_RATES_2025_26)} style={{background:"rgba(212,168,67,0.1)",border:"1px solid rgba(212,168,67,0.3)",color:"#d4a843",padding:"8px 16px",borderRadius:"8px",cursor:"pointer",fontSize:"0.85rem",fontWeight:"600"}}>
    Reset to 2025–26 NDIS rates
  </button>
</div>
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
<Field label="Weekday (Ord) $/hr" value={rates.weekdayOrd} onChange={v=>setRates(r=>({...r,weekdayOrd:v}))} step={0.01}/>
<Field label="Weekday (Night) $/hr" value={rates.weekdayNight} onChange={v=>setRates(r=>({...r,weekdayNight:v}))} step={0.01}/>
<Field label="Saturday $/hr" value={rates.sat} onChange={v=>setRates(r=>({...r,sat:v}))} step={0.01}/>
<Field label="Sunday $/hr" value={rates.sun} onChange={v=>setRates(r=>({...r,sun:v}))} step={0.01}/>
<Field label="Public Holiday $/hr" value={rates.publicHoliday} onChange={v=>setRates(r=>({...r,publicHoliday:v}))} step={0.01}/>
<Field label="Active sleepover $/hr" value={rates.activeSleepoverHourly} onChange={v=>setRates(r=>({...r,activeSleepoverHourly:v}))} step={0.01}/>
<Field label="Fixed sleepover $ (flat)" value={rates.fixedSleepoverUnit} onChange={v=>setRates(r=>({...r,fixedSleepoverUnit:v}))} step={0.01}/>
<Field label="GST rate (0 or 0.1)" value={rates.gstRate} onChange={v=>setRates(r=>({...r,gstRate:v}))} step={0.01}/>
</div></div>
<div className="grid gap-6">
{perLine.map((l:any)=>{
const status=getBudgetStatus(l.remaining,l.totalFunding);
const suggestions=getSuggestions(l,rates);
const includedCount=holidays.length-l.excludedHolidays.length;
return(
<div key={l.id} className="rounded-2xl p-6" style={{background:"rgba(26,17,80,0.4)",border:"1px solid "+status.border}}>
<div className="flex flex-wrap items-center justify-between gap-2 mb-4">
<div className="flex items-center gap-3">
<div className="text-xl font-semibold">Support line: <span style={{color:"#d4a843"}}>{l.code}</span> — <span style={{color:"#b0b0d0"}}>{l.description}</span></div>
<span className="text-xs font-semibold px-2 py-1 rounded-full" style={{background:status.bg,color:status.color,border:"1px solid "+status.border}}>{status.label}</span>
</div>
<button onClick={()=>deleteLine(l.id)} disabled={lines.length<=1} className="rounded-xl px-3 py-2 disabled:opacity-40" style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",color:"#ef4444"}}>Delete</button>
</div>

<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
<div className="rounded-xl p-4" style={{background:"rgba(15,10,48,0.6)",border:"1px solid rgba(212,168,67,0.1)"}}>
<div className="text-sm mb-3 font-semibold" style={{color:"#d4a843"}}>Line details</div>
<div className="grid grid-cols-1 gap-3">
<TextField label="Code" value={l.code} onChange={v=>updateLine(l.id,{code:v})}/>
<TextField label="Description" value={l.description} onChange={v=>updateLine(l.id,{description:v})}/>
<Field label="Total funding (AUD)" value={l.totalFunding} onChange={v=>updateLine(l.id,{totalFunding:v})} step={100}/>
<SelectField label="Support Ratio" value={l.ratio} options={Object.entries(RATIOS).map(([k,v])=>({value:k,label:v.label}))} onChange={v=>updateLine(l.id,{ratio:v})}/>
</div></div>

<div className="rounded-xl p-4 lg:col-span-2" style={{background:"rgba(15,10,48,0.6)",border:"1px solid rgba(212,168,67,0.1)"}}>
<div className="text-sm mb-3 font-semibold" style={{color:"#d4a843"}}>Weekly Roster</div>
<div className="grid gap-2">
{DAYS.map(d=>{const r=l.roster[d];return(
<div key={d} className="flex items-center gap-2 py-1" style={{borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
<div onClick={()=>updateRosterDay(l.id,d,{enabled:!r.enabled})} style={{width:"22px",height:"22px",borderRadius:"4px",flexShrink:0,background:r.enabled?"#22c55e":"rgba(239,68,68,0.2)",border:"1px solid "+(r.enabled?"#22c55e":"rgba(239,68,68,0.4)"),display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:"12px",cursor:"pointer"}}>{r.enabled?"✓":""}</div>
<div style={{width:"80px",color:r.enabled?"#d4a843":"#505060",fontWeight:"600",fontSize:"0.85rem"}}>{DL[d]}</div>
<div className="flex items-center gap-1"><span className="text-xs" style={{color:"#8080a0"}}>Day:</span><SmallField value={r.hours} onChange={v=>updateRosterDay(l.id,d,{hours:v})} disabled={!r.enabled}/></div>
<div className="flex items-center gap-1"><span className="text-xs" style={{color:"#8080a0"}}>Night:</span><SmallField value={r.nightHours} onChange={v=>updateRosterDay(l.id,d,{nightHours:v})} disabled={!r.enabled}/></div>
<SmallSelect value={r.frequency} options={Object.entries(FREQ).map(([k,v])=>({value:k,label:v.label}))} onChange={v=>updateRosterDay(l.id,d,{frequency:v})} disabled={!r.enabled}/>
</div>)})}
</div>
<div className="mt-3 grid grid-cols-1 gap-2">
<div className="flex items-center gap-2 flex-wrap"><span className="text-xs" style={{color:"#8080a0"}}>Active sleepover hrs/wk:</span><SmallField value={l.activeSleepoverHours} onChange={v=>updateLine(l.id,{activeSleepoverHours:v})}/><SmallSelect value={l.activeSleepoverFreq} options={Object.entries(FREQ).map(([k,v])=>({value:k,label:v.label}))} onChange={v=>updateLine(l.id,{activeSleepoverFreq:v})}/></div>
<div className="flex items-center gap-2 flex-wrap"><span className="text-xs" style={{color:"#8080a0"}}>Fixed sleepovers/wk:</span><SmallField value={l.fixedSleepovers} step={1} onChange={v=>updateLine(l.id,{fixedSleepovers:v})}/><SmallSelect value={l.fixedSleepoverFreq} options={Object.entries(FREQ).map(([k,v])=>({value:k,label:v.label}))} onChange={v=>updateLine(l.id,{fixedSleepoverFreq:v})}/></div>
<div className="flex items-center gap-2 flex-wrap"><span className="text-xs" style={{color:"#8080a0"}}>KMs per week:</span><SmallField value={l.kmsPerWeek} step={1} onChange={v=>updateLine(l.id,{kmsPerWeek:v})}/><span className="text-xs" style={{color:"#8080a0"}}>@ $</span><SmallField value={l.kmRate} step={0.01} onChange={v=>updateLine(l.id,{kmRate:v})}/><span className="text-xs" style={{color:"#8080a0"}}>/km</span><SmallSelect value={l.kmFreq} options={Object.entries(FREQ).map(([k,v])=>({value:k,label:v.label}))} onChange={v=>updateLine(l.id,{kmFreq:v})}/></div>
</div>
<div className="mt-4 text-sm" style={{color:"#b0a0d0"}}>
<div>Weekly total: <span className="font-semibold" style={{color:"white"}}>{money(l.weeklyWithGST)}</span></div>
<div>KM cost/wk: <span className="font-semibold" style={{color:"white"}}>{money(l.kmsPerWeek*l.kmRate*(FREQ[l.kmFreq]?.multiplier||1))}</span></div>
<div>Base plan cost: <span className="font-semibold" style={{color:"white"}}>{money(l.basePlanCost)}</span></div>
<div>PH adjustment: <span className="font-semibold" style={{color:l.phAdjustment>0?"#ef4444":l.phAdjustment<0?"#22c55e":"#b0a0d0"}}>{l.phAdjustment>0?"+":""}{money(l.phAdjustment)}</span></div>
<div className="mt-1">Plan total: <span className="font-semibold" style={{color:"white"}}>{money(l.planTotal)}</span></div>
<div>Ratio: <span className="font-semibold" style={{color:"#d4a843"}}>{RATIOS[l.ratio]?.label||l.ratio}</span></div>
<div className="text-lg font-bold mt-2" style={{color:status.color}}>Remaining: {money(l.remaining)}</div>
</div></div></div>

{holidays.length>0&&(
<div className="mt-4 rounded-xl p-4" style={{background:"rgba(15,10,48,0.4)",border:"1px solid rgba(212,168,67,0.1)"}}>
<div className="flex items-center justify-between mb-3">
<div className="text-sm font-semibold" style={{color:"#d4a843"}}>Public Holidays ({includedCount}/{holidays.length} included)</div>
<div className="flex gap-2">
<button onClick={()=>setAllHolidays(l.id,true)} className="text-xs px-3 py-1 rounded-lg" style={{background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.3)",color:"#22c55e",cursor:"pointer"}}>Include All</button>
<button onClick={()=>setAllHolidays(l.id,false)} className="text-xs px-3 py-1 rounded-lg" style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",color:"#ef4444",cursor:"pointer"}}>Exclude All</button>
</div></div>
<div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
{l.phImpact.details.map((d:any,i:number)=>(
<div key={i} onClick={()=>toggleHoliday(l.id,d.date)} className="flex items-center gap-2 text-sm py-2 px-3 rounded-lg cursor-pointer" style={{background:d.included?"rgba(34,197,94,0.05)":"rgba(239,68,68,0.05)",border:"1px solid "+(d.included?"rgba(34,197,94,0.15)":"rgba(239,68,68,0.15)")}}>
<div style={{width:"20px",height:"20px",borderRadius:"4px",flexShrink:0,background:d.included?"#22c55e":"rgba(239,68,68,0.2)",border:"1px solid "+(d.included?"#22c55e":"rgba(239,68,68,0.4)"),display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:"12px"}}>{d.included?"✓":""}</div>
<div style={{flex:1}}><span style={{color:"#b0a0d0"}}>{d.date}</span> <span style={{color:"#8080a0"}}>({d.day})</span> <span style={{color:d.included?"#c0c0e0":"#808090"}}>{d.name}</span></div>
<div style={{color:d.included?"#ef4444":"#22c55e",fontWeight:"600",fontSize:"0.85rem"}}>{d.included?"+"+money(d.impact):"-"+money(d.impact)}</div>
</div>))}
</div>
<div className="flex justify-between mt-3 text-sm font-bold">
<span style={{color:"#ef4444"}}>Extra: +{money(l.phImpact.extraCost)}</span>
<span style={{color:"#22c55e"}}>Savings: -{money(l.phImpact.savedCost)}</span>
<span style={{color:l.phAdjustment>0?"#ef4444":"#22c55e"}}>Net: {l.phAdjustment>0?"+":""}{money(l.phAdjustment)}</span>
</div></div>)}

{suggestions.length>0&&(
<div className="mt-4 rounded-xl p-4" style={{background:"rgba(245,158,11,0.05)",border:"1px solid rgba(245,158,11,0.2)"}}>
<div className="text-sm font-semibold mb-2" style={{color:"#f59e0b"}}>Suggestions to get back on track:</div>
{suggestions.map((s,i)=>(<div key={i} className="text-sm py-1" style={{color:"#b0a0d0"}}>- {s}</div>))}
</div>)}
</div>)})}
</div>

<div className="text-xs mt-8" style={{color:"#505080"}}>Auto-saves in your browser.</div>
<div className="text-xs mt-2 mb-8" style={{color:"#6060a0"}}>Powered by <span style={{color:"#d4a843"}}>Kevria</span></div>
</div></main>)}

