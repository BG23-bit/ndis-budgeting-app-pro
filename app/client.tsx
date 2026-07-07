"use client";
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
type Rates = { weekdayOrd: number; weekdayNight: number; sat: number; sun: number; publicHoliday: number; activeSleepoverHourly: number; fixedSleepoverUnit: number; gstRate: number };
type PlanDates = { start: string; end: string; state: string; serviceStart?: string; serviceEnd?: string };
type DayRoster = { enabled: boolean; hours: number; nightHours: number; frequency: string };
type Claim = { id: string; date: string; amount: number; note: string };
type SupportLine = { id: string; code: string; description: string; totalFunding: number; ratio: string; excludedHolidays: string[]; roster: { [key: string]: DayRoster }; activeSleepoverHours: number; activeSleepoverFreq: string; fixedSleepovers: number; fixedSleepoverFreq: string; kmsPerWeek: number; kmRate: number; kmFreq: string; claims: Claim[]; lineRates: Rates };
type ProviderDetails = { orgName: string; abn: string; contactName: string; email: string; phone: string; address: string; registrationNumber: string };
const DAYS = ["mon","tue","wed","thu","fri","sat","sun"];
const DAY_DOW:{[k:string]:number}={mon:1,tue:2,wed:3,thu:4,fri:5,sat:6,sun:0};
const DL: {[k:string]:string} = {mon:"Monday",tue:"Tuesday",wed:"Wednesday",thu:"Thursday",fri:"Friday",sat:"Saturday",sun:"Sunday"};
const FREQ: {[k:string]:{label:string;multiplier:number}} = {"every":{label:"Every week",multiplier:1},"2nd":{label:"Every 2nd week",multiplier:0.5},"3rd":{label:"Every 3rd week",multiplier:0.333},"4th":{label:"Every 4th week",multiplier:0.25},"monthly":{label:"Monthly",multiplier:0.2308}};
const RATIOS: {[k:string]:{label:string;divisor:number}} = {"1:1":{label:"1:1 (Full rate)",divisor:1},"2:1":{label:"2:1 (Double rate)",divisor:0.5},"1:2":{label:"1:2 (Half rate)",divisor:2},"1:3":{label:"1:3 (Third rate)",divisor:3},"1:4":{label:"1:4 (Quarter rate)",divisor:4}};
const STATES = [{value:"NSW",label:"New South Wales"},{value:"VIC",label:"Victoria"},{value:"QLD",label:"Queensland"},{value:"SA",label:"South Australia"},{value:"WA",label:"Western Australia"},{value:"TAS",label:"Tasmania"},{value:"NT",label:"Northern Territory"},{value:"ACT",label:"Australian Capital Territory"}];
export function defaultRoster():{[k:string]:DayRoster}{const r:{[k:string]:DayRoster}={};DAYS.forEach(d=>{r[d]={enabled:false,hours:0,nightHours:0,frequency:"every"}});return r}
import { getHolidaysInRange } from "@/lib/holidays";
export { getHolidaysInRange };
function getDayName(d:number):string{return["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][d]}
export function getWeeksInPlan(s:string,e:string):number{if(!s||!e)return 52;return Math.max(1,(new Date(e).getTime()-new Date(s).getTime()+86400000)/(7*24*60*60*1000))}
function countDayOccurrences(start:string,end:string,dow:number):number{if(!start||!end)return 0;const sd=new Date(start);const ed=new Date(end);const daysToFirst=(dow-sd.getDay()+7)%7;const first=new Date(sd.getTime()+daysToFirst*86400000);if(first>ed)return 0;return Math.floor((ed.getTime()-first.getTime())/604800000)+1}
export function calcDayCountPlanCost(line:SupportLine,start:string,end:string,planWeeks:number,rates:Rates):number{if(!start||!end)return calcWeeklyCost(line,rates)*planWeeks;const divisor=RATIOS[line.ratio]?.divisor||1;let total=0;for(const d of DAYS){const r=line.roster[d];if(!r||!r.enabled)continue;const fm=FREQ[r.frequency]?.multiplier||1;const occ=countDayOccurrences(start,end,DAY_DOW[d])*fm;const isSat=d==="sat";const isSun=d==="sun";const dr=isSat?rates.sat/divisor:isSun?rates.sun/divisor:rates.weekdayOrd/divisor;const nr=isSat?rates.sat/divisor:isSun?rates.sun/divisor:rates.weekdayNight/divisor;total+=(r.hours*dr+r.nightHours*nr)*occ}const sf=FREQ[line.activeSleepoverFreq]?.multiplier||1;total+=line.activeSleepoverHours*(rates.activeSleepoverHourly/divisor)*sf*planWeeks;const ff=FREQ[line.fixedSleepoverFreq]?.multiplier||1;total+=line.fixedSleepovers*rates.fixedSleepoverUnit*ff*planWeeks;const kf=FREQ[line.kmFreq]?.multiplier||1;total+=line.kmsPerWeek*line.kmRate*kf*planWeeks;return total}
function money(n:number):string{const v=Number.isFinite(n)?n:0;return v.toLocaleString("en-AU",{style:"currency",currency:"AUD"})}
function num(x:any):number{const v=Number(x);return Number.isFinite(v)?v:0}
function uid():string{return Math.random().toString(16).slice(2)+Date.now().toString(16)}
function escapeHtml(s:string){return s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")}
import {parseCSV,findCol,normDate,parseMoney,type ClaimsImportRow,type ClaimsImportPreview} from "@/lib/claims-import";
// Print via a hidden iframe instead of window.open so popup blockers can't break exports.
function printHtml(html:string){
const iframe=document.createElement("iframe");
Object.assign(iframe.style,{position:"fixed",right:"0",bottom:"0",width:"0",height:"0",border:"0"});
iframe.setAttribute("aria-hidden","true");
iframe.srcdoc=html;
iframe.onload=()=>{
  const win=iframe.contentWindow;
  if(!win)return;
  const cleanup=()=>setTimeout(()=>{try{document.body.removeChild(iframe)}catch{}},500);
  win.addEventListener("afterprint",cleanup);
  setTimeout(()=>{try{win.focus();win.print()}catch{}},150);
  setTimeout(()=>{try{document.body.removeChild(iframe)}catch{}},120000);
};
document.body.appendChild(iframe);
}
function downloadTextFile(fn:string,text:string){const type=fn.endsWith(".csv")?"text/csv;charset=utf-8":"text/plain;charset=utf-8";const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=fn;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)}
function Field(p:{label:string;value:number;step?:number;onChange:(v:number)=>void}){return(<label className="block"><div className="text-sm mb-1" style={{color:"#334155"}}>{p.label}</div><input type="number" step={p.step??1} value={Number.isFinite(p.value)?p.value:0} onChange={e=>p.onChange(num(e.target.value))} onFocus={e=>e.target.select()} className="kv-input w-full rounded-lg px-3 py-2"/></label>)}
function SmallField(p:{value:number;step?:number;onChange:(v:number)=>void;disabled?:boolean}){return(<input type="number" step={p.step??0.25} value={p.value||""} placeholder="0" onChange={e=>p.onChange(num(e.target.value))} onFocus={e=>e.target.select()} disabled={p.disabled} className="kv-input kv-money rounded-lg px-2 py-1 w-16 text-center" style={{fontSize:"0.85rem"}}/>)}
function TextField(p:{label:string;value:string;onChange:(v:string)=>void}){return(<label className="block"><div className="text-sm mb-1" style={{color:"#334155"}}>{p.label}</div><input value={p.value} onChange={e=>p.onChange(e.target.value)} className="kv-input w-full rounded-lg px-3 py-2"/></label>)}
function DateField(p:{label:string;value:string;onChange:(v:string)=>void}){return(<label className="block"><div className="text-sm mb-1" style={{color:"#334155"}}>{p.label}</div><input type="date" value={p.value} onChange={e=>p.onChange(e.target.value)} className="kv-input w-full rounded-lg px-3 py-2"/></label>)}
function SelectField(p:{label:string;value:string;options:{value:string;label:string}[];onChange:(v:string)=>void}){return(<label className="block"><div className="text-sm mb-1" style={{color:"#334155"}}>{p.label}</div><select value={p.value} onChange={e=>p.onChange(e.target.value)} className="kv-input w-full rounded-lg px-3 py-2">{p.options.map(o=>(<option key={o.value} value={o.value}>{o.label}</option>))}</select></label>)}
function SmallSelect(p:{value:string;options:{value:string;label:string}[];onChange:(v:string)=>void;disabled?:boolean}){return(<select value={p.value} onChange={e=>p.onChange(e.target.value)} disabled={p.disabled} className="kv-input rounded-lg px-2 py-1" style={{fontSize:"0.8rem"}}>{p.options.map(o=>(<option key={o.value} value={o.value}>{o.label}</option>))}</select>)}
function getBudgetStatus(remaining:number,totalFunding:number){if(totalFunding<=0)return{color:"#64748b",bg:"rgba(100,116,139,0.08)",label:"NOT SET UP",border:"rgba(100,116,139,0.25)"};const pct=(remaining/totalFunding)*100;if(remaining<0)return{color:"#ef4444",bg:"rgba(239,68,68,0.1)",label:"OVER BUDGET",border:"rgba(239,68,68,0.3)"};if(pct<10)return{color:"#f59e0b",bg:"rgba(245,158,11,0.1)",label:"LOW BUDGET",border:"rgba(245,158,11,0.3)"};return{color:"#22c55e",bg:"rgba(34,197,94,0.1)",label:"ON TRACK",border:"rgba(34,197,94,0.3)"}}
function calcWeeklyCost(line:SupportLine,rates:Rates){const divisor=RATIOS[line.ratio]?.divisor||1;let wt=0;for(const d of DAYS){const r=line.roster[d];if(!r||!r.enabled)continue;const fm=FREQ[r.frequency]?.multiplier||1;const isSat=d==="sat";const isSun=d==="sun";const dr=isSat?rates.sat/divisor:isSun?rates.sun/divisor:rates.weekdayOrd/divisor;const nr=isSat?rates.sat/divisor:isSun?rates.sun/divisor:rates.weekdayNight/divisor;wt+=(r.hours*dr+r.nightHours*nr)*fm}const sf=FREQ[line.activeSleepoverFreq]?.multiplier||1;wt+=line.activeSleepoverHours*(rates.activeSleepoverHourly/divisor)*sf;const ff=FREQ[line.fixedSleepoverFreq]?.multiplier||1;wt+=line.fixedSleepovers*rates.fixedSleepoverUnit*ff;const kf=FREQ[line.kmFreq]?.multiplier||1;wt+=line.kmsPerWeek*line.kmRate*kf;return wt}
export function calcPHImpact(line:SupportLine,holidays:{date:string;name:string;dayOfWeek:number}[],rates:Rates){const divisor=RATIOS[line.ratio]?.divisor||1;let extraCost=0,savedCost=0;const dm:{[k:number]:string}={0:"sun",1:"mon",2:"tue",3:"wed",4:"thu",5:"fri",6:"sat"};const details:{name:string;date:string;day:string;impact:number;included:boolean}[]=[];for(const h of holidays){const isExcluded=line.excludedHolidays.includes(h.date);const rd=dm[h.dayOfWeek];const r=line.roster[rd];if(!r||!r.enabled){details.push({name:h.name,date:h.date,day:getDayName(h.dayOfWeek),impact:0,included:!isExcluded});continue}const isSat=rd==="sat";const isSun=rd==="sun";const normalDayRate=isSat?rates.sat/divisor:isSun?rates.sun/divisor:rates.weekdayOrd/divisor;const normalNightRate=isSat?rates.sat/divisor:isSun?rates.sun/divisor:rates.weekdayNight/divisor;const phRate=rates.publicHoliday/divisor;if(!isExcluded){const extra=(phRate-normalDayRate)*r.hours+(phRate-normalNightRate)*r.nightHours;extraCost+=extra;details.push({name:h.name,date:h.date,day:getDayName(h.dayOfWeek),impact:extra,included:true})}else{const saved=normalDayRate*r.hours+normalNightRate*r.nightHours;savedCost+=saved;details.push({name:h.name,date:h.date,day:getDayName(h.dayOfWeek),impact:saved,included:false})}}return{extraCost,savedCost,details}}
function getSuggestions(line:any,rates:Rates){if(line.remaining>=0)return[];const suggestions:string[]=[];const roster=line.roster||{};if(roster.sun?.enabled&&roster.sun.hours>0){const s=rates.sun-rates.weekdayOrd;suggestions.push("Reduce Sunday hours - saves "+money(s*roster.sun.hours*52)+"/yr")}if(roster.sat?.enabled&&roster.sat.hours>0){const s=rates.sat-rates.weekdayOrd;suggestions.push("Reduce Saturday hours - saves "+money(s*roster.sat.hours*52)+"/yr")}if(line.fixedSleepovers>0){suggestions.push("Remove 1 fixed sleepover/wk - saves "+money(rates.fixedSleepoverUnit*52)+"/yr")}if(line.kmsPerWeek>0){suggestions.push("Reduce KMs - currently "+money(line.kmsPerWeek*line.kmRate*52)+"/yr")}return suggestions.slice(0,3)}
function useCloudSync(key:string,data:any){
const[userId,setUserId]=useState<string|null>(null);
const[saveState,setSaveState]=useState<"idle"|"saving"|"saved">("idle");
const timerRef=React.useRef<any>(null);
const pendingRef=React.useRef<any>(null);
useEffect(()=>{supabase.auth.getUser().then(({data:d})=>{setUserId(d.user?.id??null)})},[]);
const doSave=React.useCallback(async(uid:string,k:string,payload:any)=>{setSaveState("saving");try{await supabase.from("calculator_data").upsert({user_id:uid,participant_id:k,data:payload,updated_at:new Date().toISOString()},{onConflict:"user_id,participant_id"});pendingRef.current=null;setSaveState("saved")}catch(e){console.error("Cloud save error:",e);setSaveState("idle")}},[]);
useEffect(()=>{if(!userId||!key)return;pendingRef.current=data;if(timerRef.current)clearTimeout(timerRef.current);timerRef.current=setTimeout(()=>{doSave(userId,key,data)},2000);return()=>{if(timerRef.current)clearTimeout(timerRef.current)}},[userId,key,data,doSave]);
// Flush pending edits when the tab is hidden or closing so a quick edit-then-close isn't lost to the debounce.
useEffect(()=>{if(!userId||!key)return;const flush=()=>{if(pendingRef.current!=null){if(timerRef.current)clearTimeout(timerRef.current);doSave(userId,key,pendingRef.current)}};const onVis=()=>{if(document.visibilityState==="hidden")flush()};window.addEventListener("pagehide",flush);document.addEventListener("visibilitychange",onVis);return()=>{window.removeEventListener("pagehide",flush);document.removeEventListener("visibilitychange",onVis)}},[userId,key,doSave]);
return saveState}
async function loadFromCloud(key:string):Promise<any>{try{const{data:d}=await supabase.auth.getUser();if(!d.user)return null;const{data:row}=await supabase.from("calculator_data").select("data").eq("user_id",d.user.id).eq("participant_id",key).single();return row?.data||null}catch{return null}}
export const NDIS_RATES_2026_27:Rates={weekdayOrd:73.58,weekdayNight:81.07,sat:103.54,sun:133.50,publicHoliday:163.46,activeSleepoverHourly:82.57,fixedSleepoverUnit:311.79,gstRate:0};
const CATEGORY_PRESETS:{[code:string]:{name:string;rates:Rates}}={
  "01":{name:"Assistance with Daily Life",rates:{weekdayOrd:73.58,weekdayNight:81.07,sat:103.54,sun:133.50,publicHoliday:163.46,activeSleepoverHourly:82.57,fixedSleepoverUnit:311.79,gstRate:0}},
  "02":{name:"Transport",rates:{weekdayOrd:0,weekdayNight:0,sat:0,sun:0,publicHoliday:0,activeSleepoverHourly:0,fixedSleepoverUnit:0,gstRate:0}},
  "03":{name:"Consumables",rates:{weekdayOrd:0,weekdayNight:0,sat:0,sun:0,publicHoliday:0,activeSleepoverHourly:0,fixedSleepoverUnit:0,gstRate:0}},
  "04":{name:"Community Participation",rates:{weekdayOrd:73.58,weekdayNight:81.07,sat:103.54,sun:133.50,publicHoliday:163.46,activeSleepoverHourly:82.57,fixedSleepoverUnit:311.79,gstRate:0}},
  "05":{name:"Assistive Technology",rates:{weekdayOrd:0,weekdayNight:0,sat:0,sun:0,publicHoliday:0,activeSleepoverHourly:0,fixedSleepoverUnit:0,gstRate:0}},
  "06":{name:"Home Modifications",rates:{weekdayOrd:0,weekdayNight:0,sat:0,sun:0,publicHoliday:0,activeSleepoverHourly:0,fixedSleepoverUnit:0,gstRate:0}},
  "07":{name:"Support Coordination",rates:{weekdayOrd:100.14,weekdayNight:0,sat:0,sun:0,publicHoliday:0,activeSleepoverHourly:0,fixedSleepoverUnit:0,gstRate:0}},
  "08":{name:"Improved Living Arrangements",rates:{weekdayOrd:73.58,weekdayNight:81.07,sat:103.54,sun:133.50,publicHoliday:163.46,activeSleepoverHourly:82.57,fixedSleepoverUnit:311.79,gstRate:0}},
  "09":{name:"Increased Social and Community Participation",rates:{weekdayOrd:73.58,weekdayNight:81.07,sat:103.54,sun:133.50,publicHoliday:163.46,activeSleepoverHourly:0,fixedSleepoverUnit:0,gstRate:0}},
  "10":{name:"Finding and Keeping a Job",rates:{weekdayOrd:73.58,weekdayNight:0,sat:0,sun:0,publicHoliday:0,activeSleepoverHourly:0,fixedSleepoverUnit:0,gstRate:0}},
  "11":{name:"Improved Relationships",rates:{weekdayOrd:252.99,weekdayNight:0,sat:0,sun:0,publicHoliday:0,activeSleepoverHourly:0,fixedSleepoverUnit:0,gstRate:0}},
  "12":{name:"Improved Health and Wellbeing",rates:{weekdayOrd:161.99,weekdayNight:0,sat:0,sun:0,publicHoliday:0,activeSleepoverHourly:0,fixedSleepoverUnit:0,gstRate:0}},
  "13":{name:"Improved Learning",rates:{weekdayOrd:83.87,weekdayNight:0,sat:0,sun:0,publicHoliday:0,activeSleepoverHourly:0,fixedSleepoverUnit:0,gstRate:0}},
  "14":{name:"Improved Life Choices",rates:{weekdayOrd:100.14,weekdayNight:0,sat:0,sun:0,publicHoliday:0,activeSleepoverHourly:0,fixedSleepoverUnit:0,gstRate:0}},
  "15":{name:"Improved Daily Living",rates:{weekdayOrd:156.16,weekdayNight:0,sat:0,sun:0,publicHoliday:0,activeSleepoverHourly:0,fixedSleepoverUnit:0,gstRate:0}},
  "16":{name:"Home and Living",rates:{weekdayOrd:73.58,weekdayNight:81.07,sat:103.54,sun:133.50,publicHoliday:163.46,activeSleepoverHourly:82.57,fixedSleepoverUnit:311.79,gstRate:0}},
  "17":{name:"Specialist Disability Accommodation",rates:{weekdayOrd:0,weekdayNight:0,sat:0,sun:0,publicHoliday:0,activeSleepoverHourly:0,fixedSleepoverUnit:0,gstRate:0}},
  "18":{name:"Recurring Transport",rates:{weekdayOrd:0,weekdayNight:0,sat:0,sun:0,publicHoliday:0,activeSleepoverHourly:0,fixedSleepoverUnit:0,gstRate:0}},
  "19":{name:"Assistive Technology Maintenance",rates:{weekdayOrd:0,weekdayNight:0,sat:0,sun:0,publicHoliday:0,activeSleepoverHourly:0,fixedSleepoverUnit:0,gstRate:0}},
  "20":{name:"Behaviour Support",rates:{weekdayOrd:252.99,weekdayNight:0,sat:0,sun:0,publicHoliday:0,activeSleepoverHourly:0,fixedSleepoverUnit:0,gstRate:0}},
  "21":{name:"YPIRAC",rates:{weekdayOrd:73.58,weekdayNight:81.07,sat:103.54,sun:133.50,publicHoliday:163.46,activeSleepoverHourly:82.57,fixedSleepoverUnit:311.79,gstRate:0}},
};
export function getPresetRates(code:string):Rates{return CATEGORY_PRESETS[code]?.rates||NDIS_RATES_2026_27}
const NDIS_ITEM_DEFAULTS:{[code:string]:{[rateType:string]:string}}={
  "01":{weekday:"01_011_0107_1_1",weekdayNight:"01_015_0107_1_1",sat:"01_013_0107_1_1",satNight:"01_013_0107_1_1",sun:"01_014_0107_1_1",sunNight:"01_014_0107_1_1",publicHoliday:"01_012_0107_1_1",activeSleepover:"01_002_0107_1_1",fixedSleepover:"01_010_0107_1_1",lump:"01_821_0115_1_1"},
  "04":{weekday:"04_104_0125_6_1",weekdayNight:"04_103_0125_6_1",sat:"04_105_0125_6_1",satNight:"04_105_0125_6_1",sun:"04_106_0125_6_1",sunNight:"04_106_0125_6_1",publicHoliday:"04_102_0125_6_1"},
  "07":{weekday:"07_002_0106_8_3",lump:"07_002_0106_8_3"},
  "08":{weekday:"01_821_0115_1_1",lump:"01_821_0115_1_1"},
  "09":{weekday:"04_104_0125_6_1",sat:"04_105_0125_6_1",sun:"04_106_0125_6_1"},
  "10":{weekday:"10_806_0133_5_1",lump:"10_806_0133_5_1"},
  "11":{weekday:"11_022_0110_7_3",lump:"11_022_0110_7_3"},
  "12":{weekday:"12_027_0126_3_3",lump:"12_027_0126_3_3"},
  "13":{weekday:"13_030_0102_4_3",lump:"13_030_0102_4_3"},
  "15":{weekday:"15_056_0128_1_3",lump:"15_056_0128_1_3"},
};
function getDefaultItemNumber(code:string,rateType:string):string{return NDIS_ITEM_DEFAULTS[code]?.[rateType]||""}
// Merge proposedRoster entries (from plan-upload notes) for one category code into roster fields
function rosterFromProposal(prs:any[]):{roster:{[k:string]:DayRoster};aso:number;fso:number;kms:number}{
  const roster=defaultRoster();
  let aso=0,fso=0,kms=0;
  for(const r of prs){
    const freq=r?.frequency&&FREQ[r.frequency]?r.frequency:"every";
    for(const [d,v] of Object.entries(r?.days||{})){
      if(!(d in roster))continue;
      const hv=num((v as any)?.hours),nv=num((v as any)?.nightHours);
      if(hv<=0&&nv<=0)continue;
      const prev=roster[d];
      roster[d]={enabled:true,hours:(prev.enabled?prev.hours:0)+hv,nightHours:(prev.enabled?prev.nightHours:0)+nv,frequency:freq};
    }
    aso+=num(r?.activeSleepoverHoursPerWeek);fso+=num(r?.sleepoversPerWeek);kms+=num(r?.kmsPerWeek);
  }
  return{roster,aso,fso,kms};
}
function proposalDaysSummary(prs:any[]):string{
  const{roster,aso,fso,kms}=rosterFromProposal(prs);
  const parts:string[]=[];
  for(const d of DAYS){const r=roster[d];if(!r.enabled)continue;parts.push(DL[d].slice(0,3)+" "+(r.hours||0)+"h"+((r.nightHours||0)>0?" +"+r.nightHours+"e":""));}
  if(aso>0)parts.push("active o/n "+aso+"h/wk");
  if(fso>0)parts.push(fso+" sleepover"+(fso===1?"":"s")+"/wk");
  if(kms>0)parts.push(kms+" km/wk");
  return parts.join(" · ");
}
function getLineMode(code:string):"full"|"weekday"|"lump"{if(["02","03","05","06","17","18","19"].includes(code))return"lump";if(["07","10","11","12","13","14","15","20"].includes(code))return"weekday";return"full"}
function isBelowGuide(lr:Rates,code:string):boolean{const p=CATEGORY_PRESETS[code]?.rates;if(!p)return false;return(p.weekdayOrd>0&&lr.weekdayOrd<p.weekdayOrd)||(p.weekdayNight>0&&lr.weekdayNight<p.weekdayNight)||(p.sat>0&&lr.sat<p.sat)||(p.sun>0&&lr.sun<p.sun)||(p.publicHoliday>0&&lr.publicHoliday<p.publicHoliday)||(p.activeSleepoverHourly>0&&lr.activeSleepoverHourly<p.activeSleepoverHourly)}
export default function PageClient({storageKey,participantName,ndisNumber}:{storageKey?:string;participantName?:string;ndisNumber?:string}){
const STORAGE_KEY=storageKey||"ndis_budget_calc_pro_v7";
const[userEmail,setUserEmail]=useState<string|null>(null);
useEffect(()=>{supabase.auth.getUser().then(({data})=>{setUserEmail(data.user?.email??null)});const{data:sub}=supabase.auth.onAuthStateChange((_ev,session)=>{setUserEmail(session?.user?.email??null)});return()=>{sub.subscription.unsubscribe()}},[]);
const[planDates,setPlanDates]=useState<PlanDates>({start:new Date().toISOString().slice(0,10),end:new Date(Date.now()+365*24*60*60*1000).toISOString().slice(0,10),state:"NSW"});
const[rates,setRates]=useState<Rates>({weekdayOrd:73.58,weekdayNight:81.07,sat:103.54,sun:133.50,publicHoliday:163.46,activeSleepoverHourly:82.57,fixedSleepoverUnit:311.79,gstRate:0});
const[lines,setLines]=useState<SupportLine[]>([{id:uid(),code:"01",description:"Core Supports",totalFunding:0,ratio:"1:1",excludedHolidays:[],roster:defaultRoster(),activeSleepoverHours:0,activeSleepoverFreq:"every",fixedSleepovers:0,fixedSleepoverFreq:"every",kmsPerWeek:0,kmRate:1.00,kmFreq:"every",claims:[],lineRates:NDIS_RATES_2026_27}]);
const srvStart=planDates.serviceStart||planDates.start;const srvEnd=planDates.serviceEnd||planDates.end;
const planWeeksCalc=useMemo(()=>getWeeksInPlan(srvStart,srvEnd),[srvStart,srvEnd]);const[weeksOverride,setWeeksOverride]=useState<number|null>(null);const planWeeks=weeksOverride!==null?weeksOverride:planWeeksCalc;
const holidays=useMemo(()=>getHolidaysInRange(srvStart,srvEnd,planDates.state),[srvStart,srvEnd,planDates.state]);
useEffect(()=>{async function load(){const cloud=await loadFromCloud(STORAGE_KEY);const raw=cloud||(()=>{try{const r=localStorage.getItem(STORAGE_KEY);return r?JSON.parse(r):null}catch{return null}})();if(!raw){setLoaded(true);return;}if(raw?.rates)setRates((r:any)=>({...r,...raw.rates}));if(raw?.planDates)setPlanDates((p:any)=>({...p,...raw.planDates}));if(Array.isArray(raw?.lines)&&raw.lines.length>0)setLines(raw.lines.map((l:any)=>({...l,ratio:l.ratio||"1:1",excludedHolidays:l.excludedHolidays||[],roster:l.roster||defaultRoster(),activeSleepoverFreq:l.activeSleepoverFreq||"every",fixedSleepoverFreq:l.fixedSleepoverFreq||"every",kmsPerWeek:l.kmsPerWeek||0,kmRate:l.kmRate||1.00,kmFreq:l.kmFreq||"every",claims:l.claims||[],lineRates:l.lineRates||getPresetRates(l.code)})));if(raw?.weeksOverride!=null)setWeeksOverride(raw.weeksOverride);if(raw?.calcMode!==undefined)setCalcMode(raw.calcMode as any);else{const hasLines=Array.isArray(raw?.lines)&&raw.lines.some((l:any)=>(l?.totalFunding||0)>0);const hasClinical=Array.isArray(raw?.clinicalServices)&&raw.clinicalServices.length>0;if(hasLines&&hasClinical)setCalcMode("both");else if(hasClinical&&!hasLines)setCalcMode("clinical");else if(hasLines)setCalcMode("sil");}if(typeof raw?.clinicalFunding==="number")setClinicalFunding(raw.clinicalFunding);if(Array.isArray(raw?.clinicalServices))setClinicalServices(raw.clinicalServices);if(typeof raw?.clinicalBudgetLinked==="boolean")setClinicalBudgetLinked(raw.clinicalBudgetLinked);setLoaded(true);}load()},[]);
const[calcMode,setCalcMode]=useState<"sil"|"clinical"|"both"|null>(null);
const[loaded,setLoaded]=useState(false);
const[clinicalFunding,setClinicalFunding]=useState(0);
const[clinicalServices,setClinicalServices]=useState<{id:string;code:string;description:string;hours:number;rate:number;note:string}[]>([]);
const[clinicalBudgetLinked,setClinicalBudgetLinked]=useState(false);
const saveData={rates,lines,planDates,weeksOverride,calcMode,clinicalFunding,clinicalServices,clinicalBudgetLinked};
// Don't persist until the initial load has finished — otherwise the mount-time save
// overwrites stored data with defaults before the async load can read it.
useEffect(()=>{if(!loaded)return;try{localStorage.setItem(STORAGE_KEY,JSON.stringify(saveData))}catch{}},[loaded,rates,lines,planDates,weeksOverride,calcMode,clinicalFunding,clinicalServices,clinicalBudgetLinked]);
const saveState=useCloudSync(loaded?STORAGE_KEY:"",saveData);
const perLine=useMemo(()=>{return lines.map(l=>{const lr=l.lineRates||rates;const wt=calcWeeklyCost(l,lr);const weeklyGST=wt*(lr.gstRate||0);const weeklyWithGST=wt+weeklyGST;const basePlanCost=calcDayCountPlanCost(l,srvStart,srvEnd,planWeeks,lr)*(1+(lr.gstRate||0));const phImpact=calcPHImpact(l,holidays,lr);const phAdjustment=phImpact.extraCost-phImpact.savedCost;const planTotal=basePlanCost+phAdjustment;const remaining=l.totalFunding-planTotal;const totalClaimed=(l.claims||[]).reduce((a:number,c:Claim)=>a+c.amount,0);const actualRemaining=l.totalFunding-totalClaimed;return{...l,weeklyTotal:wt,weeklyGST,weeklyWithGST,basePlanCost,phImpact,phAdjustment,planTotal,remaining,totalClaimed,actualRemaining}})},[lines,rates,planWeeks,holidays]);
const totals=useMemo(()=>{const totalFunding=perLine.reduce((a,l)=>a+l.totalFunding,0);const weekly=perLine.reduce((a,l)=>a+l.weeklyWithGST,0);const planCost=perLine.reduce((a,l)=>a+l.planTotal,0);const totalPH=perLine.reduce((a,l)=>a+l.phAdjustment,0);const remaining=totalFunding-planCost;const totalClaimed=perLine.reduce((a,l)=>a+(l as any).totalClaimed,0);const actualRemaining=totalFunding-totalClaimed;return{totalFunding,weekly,planCost,totalPH,remaining,totalClaimed,actualRemaining}},[perLine]);
const saRows=useMemo(()=>perLine.flatMap((l:any)=>{
  const mode=getLineMode(l.code);const rows:{key:string;code:string;rateType:string;label:string}[]=[];
  if(mode==="lump"){rows.push({key:l.id+"_lump",code:l.code,rateType:"lump",label:l.description});return rows;}
  const wkDays=["mon","tue","wed","thu","fri"];
  const wkdOrdHrs=wkDays.reduce((s:number,d:string)=>{const r=l.roster[d];return r?.enabled&&(r.hours||0)>0?s+(r.hours||0)*(FREQ[r.frequency]?.multiplier||1)*planWeeks:s},0);
  const wkdNightHrs=wkDays.reduce((s:number,d:string)=>{const r=l.roster[d];return r?.enabled&&(r.nightHours||0)>0?s+(r.nightHours||0)*(FREQ[r.frequency]?.multiplier||1)*planWeeks:s},0);
  const satR=l.roster["sat"];const sunR=l.roster["sun"];
  const satHrs=satR?.enabled?(satR.hours||0)*(FREQ[satR.frequency]?.multiplier||1)*planWeeks:0;
  const satNightHrs=satR?.enabled?(satR.nightHours||0)*(FREQ[satR.frequency]?.multiplier||1)*planWeeks:0;
  const sunHrs=sunR?.enabled?(sunR.hours||0)*(FREQ[sunR.frequency]?.multiplier||1)*planWeeks:0;
  const sunNightHrs=sunR?.enabled?(sunR.nightHours||0)*(FREQ[sunR.frequency]?.multiplier||1)*planWeeks:0;
  if(wkdOrdHrs>0)rows.push({key:l.id+"_weekday",code:l.code,rateType:"weekday",label:l.description+" - Weekday Daytime"});
  if(wkdNightHrs>0)rows.push({key:l.id+"_weekdayNight",code:l.code,rateType:"weekdayNight",label:l.description+" - Weekday Night"});
  if(satHrs>0)rows.push({key:l.id+"_sat",code:l.code,rateType:"sat",label:l.description+" - Saturday"});
  if(satNightHrs>0)rows.push({key:l.id+"_satNight",code:l.code,rateType:"satNight",label:l.description+" - Saturday Night"});
  if(sunHrs>0)rows.push({key:l.id+"_sun",code:l.code,rateType:"sun",label:l.description+" - Sunday"});
  if(sunNightHrs>0)rows.push({key:l.id+"_sunNight",code:l.code,rateType:"sunNight",label:l.description+" - Sunday Night"});
  if(rows.length===0)rows.push({key:l.id+"_lump",code:l.code,rateType:"lump",label:l.description});
  return rows;
}),[perLine,planWeeks]);
function updateLine(id:string,patch:Partial<SupportLine>){setLines(prev=>prev.map(l=>(l.id===id?{...l,...patch}:l)))}
function updateRosterDay(lineId:string,day:string,patch:Partial<DayRoster>){setLines(prev=>prev.map(l=>{if(l.id!==lineId)return l;return{...l,roster:{...l.roster,[day]:{...l.roster[day],...patch}}}}))}
function toggleHoliday(lineId:string,date:string){setLines(prev=>prev.map(l=>{if(l.id!==lineId)return l;const exc=l.excludedHolidays.includes(date)?l.excludedHolidays.filter(d=>d!==date):[...l.excludedHolidays,date];return{...l,excludedHolidays:exc}}))}
function setAllHolidays(lineId:string,include:boolean){setLines(prev=>prev.map(l=>l.id!==lineId?l:{...l,excludedHolidays:include?[]:holidays.map(h=>h.date)}))}
function addLine(){setLines(prev=>[...prev,{id:uid(),code:"01",description:"New Support Line",totalFunding:0,ratio:"1:1",excludedHolidays:[],roster:defaultRoster(),activeSleepoverHours:0,activeSleepoverFreq:"every",fixedSleepovers:0,fixedSleepoverFreq:"every",kmsPerWeek:0,kmRate:1.00,kmFreq:"every",claims:[],lineRates:NDIS_RATES_2026_27}])}
function updateLineCode(id:string,code:string){setLines(prev=>prev.map(l=>l.id!==id?l:{...l,code,lineRates:getPresetRates(code)}))}
function deleteLine(id:string){if(lines.length<=1)return;const l=lines.find(x=>x.id===id);const claimCount=l?.claims?.length||0;const msg='Delete support line "'+(l?.description||l?.code||"")+'"'+(claimCount>0?" and its "+claimCount+" logged claim"+(claimCount===1?"":"s"):"")+"? This cannot be undone.";if(!confirm(msg))return;setLines(prev=>(prev.length<=1?prev:prev.filter(x=>x.id!==id)))}
const[openClaimsLines,setOpenClaimsLines]=useState<Set<string>>(new Set());
const[openRatesLines,setOpenRatesLines]=useState<Set<string>>(new Set());
function toggleRates(id:string){setOpenRatesLines(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n})}
const[addClaimForm,setAddClaimForm]=useState<{lineId:string;claimId?:string;date:string;amount:string;note:string}|null>(null);
function toggleClaims(id:string){setOpenClaimsLines(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n})}
function addClaim(lineId:string,date:string,amount:number,note:string){setLines(prev=>prev.map(l=>l.id!==lineId?l:{...l,claims:[...(l.claims||[]),{id:uid(),date,amount,note}]}))}
function deleteClaim(lineId:string,claimId:string){setLines(prev=>prev.map(l=>l.id!==lineId?l:{...l,claims:(l.claims||[]).filter((c:Claim)=>c.id!==claimId)}))}
function updateClaim(lineId:string,claimId:string,patch:Partial<Claim>){setLines(prev=>prev.map(l=>l.id!==lineId?l:{...l,claims:(l.claims||[]).map((c:Claim)=>c.id===claimId?{...c,...patch}:c)}))}
const[uploadingPlan,setUploadingPlan]=useState(false);
const[planExtract,setPlanExtract]=useState<any>(null);
const[planUploadError,setPlanUploadError]=useState<string|null>(null);
const[removeOnApply,setRemoveOnApply]=useState<Set<string>>(new Set());
const[planNotes,setPlanNotes]=useState("");
// Simulate what the proposed roster would cost against the extracted budgets
function simulateExtractOutcome(extract:any):null|{rows:{code:string;description:string;budget:number;cost:number;remaining:number;summary:string}[];totalBudget:number;totalCost:number}{
  if(!Array.isArray(extract?.supportLines)||!Array.isArray(extract?.proposedRoster)||extract.proposedRoster.length===0)return null;
  const start=extract.planStart||planDates.start,end=extract.planEnd||planDates.end,state=extract.state||planDates.state;
  const weeks=getWeeksInPlan(start,end);
  const hols=getHolidaysInRange(start,end,state);
  const rows:{code:string;description:string;budget:number;cost:number;remaining:number;summary:string}[]=[];
  for(const sl of extract.supportLines){
    if((sl?.totalFunding||0)<=0)continue;
    const prs=extract.proposedRoster.filter((r:any)=>r?.categoryCode===sl.code);
    if(prs.length===0)continue;
    const{roster,aso,fso,kms}=rosterFromProposal(prs);
    const line:any={id:"sim",code:sl.code,description:sl.description,totalFunding:sl.totalFunding,ratio:"1:1",excludedHolidays:[],roster,activeSleepoverHours:aso,activeSleepoverFreq:"every",fixedSleepovers:fso,fixedSleepoverFreq:"every",kmsPerWeek:kms,kmRate:1.00,kmFreq:"every",claims:[],lineRates:getPresetRates(sl.code)};
    const lr=line.lineRates;
    const base=calcDayCountPlanCost(line,start,end,weeks,lr)*(1+(lr.gstRate||0));
    const ph=calcPHImpact(line,hols,lr);
    const cost=base+ph.extraCost-ph.savedCost;
    rows.push({code:sl.code,description:sl.description,budget:sl.totalFunding,cost,remaining:sl.totalFunding-cost,summary:proposalDaysSummary(prs)});
  }
  if(rows.length===0)return null;
  return{rows,totalBudget:rows.reduce((s,r)=>s+r.budget,0),totalCost:rows.reduce((s,r)=>s+r.cost,0)};
}
// Existing lines the extraction would NOT update (mirrors applyPlanExtract's matching)
function staleLinesForExtract(extract:any,cur:SupportLine[]):SupportLine[]{
  if(!Array.isArray(extract?.supportLines)||extract.supportLines.length===0)return[];
  const used=new Set<number>();
  for(const sl of extract.supportLines){
    if((sl?.totalFunding||0)<=0)continue;
    const idx=cur.findIndex((l,i)=>!used.has(i)&&l.code===sl.code);
    if(idx>=0)used.add(idx);
  }
  return cur.filter((_,i)=>!used.has(i));
}
function lineHasData(l:SupportLine):boolean{
  return (l.claims||[]).length>0||Object.values(l.roster||{}).some((r:any)=>r?.enabled&&((r.hours||0)>0||(r.nightHours||0)>0))||(l.activeSleepoverHours||0)>0||(l.fixedSleepovers||0)>0;
}
const[providerDetails,setProviderDetails]=useState<ProviderDetails>({orgName:"",abn:"",contactName:"",email:"",phone:"",address:"",registrationNumber:""});
const[showSAModal,setShowSAModal]=useState(false);
const[saSpecificReqs,setSaSpecificReqs]=useState({behavioursOfConcern:false,regulatedRestrictivePractice:false,medicationManagement:false});
const[saEstFee,setSaEstFee]=useState("");
const[saItemNumbers,setSaItemNumbers]=useState<{[k:string]:string}>({});
const[showClinicalModal,setShowClinicalModal]=useState(false);
const[clinicalPractitioner,setClinicalPractitioner]=useState({name:"",title:"",qualifications:"",org:"",phone:"",email:""});
const[clinicalOverview,setClinicalOverview]=useState("");
const[clinicalPriceItems,setClinicalPriceItems]=useState<{id:string;itemCode:string;description:string;rate:number}[]>([{id:"cp1",itemCode:"11_022_0110_7_3",description:"Behaviour Support Practitioner",rate:252.99}]);
const[clinicalScheduleItems,setClinicalScheduleItems]=useState<{id:string;description:string;hours:number;rate:number;note:string}[]>([{id:"cs1",description:"",hours:0,rate:0,note:""}]);
useEffect(()=>{try{const raw=localStorage.getItem("kevria_provider_details");if(raw)setProviderDetails(p=>({...p,...JSON.parse(raw)}))}catch{}},[]);
useEffect(()=>{try{localStorage.setItem("kevria_provider_details",JSON.stringify(providerDetails))}catch{}},[providerDetails]);
useEffect(()=>{try{const raw=localStorage.getItem("kevria_item_numbers");if(raw)setSaItemNumbers(JSON.parse(raw))}catch{}},[]);
useEffect(()=>{try{localStorage.setItem("kevria_item_numbers",JSON.stringify(saItemNumbers))}catch{}},[saItemNumbers]);
useEffect(()=>{try{const raw=localStorage.getItem("kevria_clinical_prac");if(raw)setClinicalPractitioner((p:any)=>({...p,...JSON.parse(raw)}))}catch{}},[]);
useEffect(()=>{try{localStorage.setItem("kevria_clinical_prac",JSON.stringify(clinicalPractitioner))}catch{}},[clinicalPractitioner]);
const planFileRef=React.useRef<HTMLInputElement>(null);
const claimsFileRef=React.useRef<HTMLInputElement>(null);
const[claimsImport,setClaimsImport]=useState<ClaimsImportPreview|null>(null);
const[claimsImportError,setClaimsImportError]=useState<string|null>(null);
function handleClaimsCsv(file:File){
  setClaimsImportError(null);
  file.text().then(text=>{
    const rows=parseCSV(text);
    if(rows.length<2){setClaimsImportError("No data rows found in that CSV.");return;}
    const headers=rows[0].map(h=>h.toLowerCase().replace(/[^a-z0-9]/g,""));
    const cDate=findCol(headers,["supportsdeliveredfrom","deliveredfrom","servicedate","supportdate","date"]);
    const cPaid=findCol(headers,["paidtotalamount","paidamount","amountpaid"]);
    const cAmount=findCol(headers,["totalamount","amount","total"]);
    const cQty=findCol(headers,["quantity","qty","hours"]);
    const cPrice=findCol(headers,["unitprice","rate"]);
    const cItem=findCol(headers,["supportnumber","supportitemnumber","itemnumber","supportitem","item"]);
    const cNdis=findCol(headers,["ndisnumber","participantndis"]);
    const cRef=findCol(headers,["claimreference","reference","invoicenumber","invoice"]);
    if(cDate<0||(cPaid<0&&cAmount<0&&(cQty<0||cPrice<0))){
      setClaimsImportError("Couldn't find date and amount columns. Expected an NDIS payment request export (e.g. SupportsDeliveredFrom, PaidTotalAmount) or any CSV with Date and Amount columns.");
      return;
    }
    const digits=(s:string)=>(s||"").replace(/\D/g,"");
    const myNdis=digits(ndisNumber||"");
    let skippedOther=0,skippedNoMatch=0,skippedDup=0,skippedBad=0;
    const out:ClaimsImportRow[]=[];
    const existing=new Set<string>();
    for(const l of lines)for(const c of (l.claims||[]))existing.add(l.id+"|"+c.date+"|"+c.amount.toFixed(2));
    for(const r of rows.slice(1)){
      const date=normDate(r[cDate]||"");
      let amount=0;
      if(cPaid>=0&&parseMoney(r[cPaid])>0)amount=parseMoney(r[cPaid]);
      else if(cQty>=0&&cPrice>=0&&parseMoney(r[cQty])>0&&parseMoney(r[cPrice])>0)amount=parseMoney(r[cQty])*parseMoney(r[cPrice]);
      else if(cAmount>=0)amount=parseMoney(r[cAmount]);
      if(!date||!(amount>0)){skippedBad++;continue;}
      if(cNdis>=0&&myNdis&&digits(r[cNdis])&&digits(r[cNdis])!==myNdis){skippedOther++;continue;}
      let target=lines[0];
      if(cItem>=0&&(r[cItem]||"").trim()){
        const code=(r[cItem]||"").trim().slice(0,2);
        const match=lines.find(l=>l.code===code);
        if(match)target=match;else{skippedNoMatch++;continue;}
      }
      const note=[cItem>=0?(r[cItem]||"").trim():"",cRef>=0?(r[cRef]||"").trim():""].filter(Boolean).join(" · ");
      amount=Math.round(amount*100)/100;
      const key=target.id+"|"+date+"|"+amount.toFixed(2);
      if(existing.has(key)){skippedDup++;continue;}
      existing.add(key);
      out.push({lineId:target.id,lineLabel:target.code+" — "+target.description,date,amount,note});
    }
    if(out.length===0&&skippedDup===0){setClaimsImportError("No usable claim rows found in that CSV.");return;}
    setClaimsImport({rows:out,skippedOther,skippedNoMatch,skippedDup,skippedBad,fileName:file.name});
  }).catch(()=>setClaimsImportError("Couldn't read that file. Make sure it's a CSV export."));
}
function applyClaimsImport(){
  if(!claimsImport)return;
  setLines(prev=>prev.map(l=>{
    const add=claimsImport.rows.filter(r=>r.lineId===l.id);
    if(!add.length)return l;
    return{...l,claims:[...(l.claims||[]),...add.map(r=>({id:uid(),date:r.date,amount:r.amount,note:r.note}))]};
  }));
  setClaimsImport(null);
}
async function handlePlanUpload(file:File){
  setUploadingPlan(true);setPlanUploadError(null);
  try{
    const {data:{session}}=await supabase.auth.getSession();
    const fd=new FormData();fd.append("pdf",file);if(planNotes.trim())fd.append("notes",planNotes.trim());
    const headers:HeadersInit=session?.access_token?{Authorization:"Bearer "+session.access_token}:{};
    const res=await fetch("/api/parse-plan",{method:"POST",body:fd,headers});
    const data=await res.json();
    if(data.error)throw new Error(data.error);
    if(Array.isArray(data.supportLines))data.supportLines=data.supportLines.filter((l:any)=>(l?.totalFunding||0)>0);
    // Pre-tick removal for stale lines that hold no roster or claims (safe to drop)
    const stale=staleLinesForExtract(data,lines);
    setRemoveOnApply(new Set(stale.filter(l=>!lineHasData(l)).map(l=>l.id)));
    setPlanExtract(data);
  }catch(e:any){
    setPlanUploadError(e.message||"Failed to read plan. Please try again.");
  }finally{setUploadingPlan(false);}
}
function applyPlanExtract(){
  if(!planExtract)return;
  if(planExtract.planStart)setPlanDates(p=>({...p,start:planExtract.planStart}));
  if(planExtract.planEnd)setPlanDates(p=>({...p,end:planExtract.planEnd}));
  if(planExtract.state)setPlanDates(p=>({...p,state:planExtract.state}));
  const scheduleRateMap:{[k:string]:keyof Rates}={weekday:"weekdayOrd",weekdayNight:"weekdayNight",saturday:"sat",sunday:"sun",publicHoliday:"publicHoliday"};
  setLines(prev=>{
    let updated=prev.filter(l=>!removeOnApply.has(l.id));
    if(Array.isArray(planExtract.supportLines)&&planExtract.supportLines.length>0){
      const used=new Set<number>();
      for(const sl of planExtract.supportLines){
        if((sl?.totalFunding||0)<=0)continue;
        const idx=updated.findIndex((_l:SupportLine,i:number)=>!used.has(i)&&_l.code===sl.code);
        if(idx>=0){updated[idx]={...updated[idx],totalFunding:sl.totalFunding,description:sl.description,lineRates:updated[idx].lineRates||getPresetRates(sl.code)};used.add(idx);}
        else{updated.push({id:uid(),code:sl.code,description:sl.description,totalFunding:sl.totalFunding,ratio:"1:1",excludedHolidays:[],roster:defaultRoster(),activeSleepoverHours:0,activeSleepoverFreq:"every",fixedSleepovers:0,fixedSleepoverFreq:"every",kmsPerWeek:0,kmRate:1.00,kmFreq:"every",claims:[],lineRates:getPresetRates(sl.code)});}
      }
    }
    if(Array.isArray(planExtract.scheduleOfSupports)&&planExtract.scheduleOfSupports.length>0){
      updated=updated.map((l:SupportLine)=>{
        const items=planExtract.scheduleOfSupports.filter((s:any)=>s.categoryCode===l.code&&s.price>0&&scheduleRateMap[s.rateType]);
        if(!items.length)return l;
        const newRates={...l.lineRates};
        for(const item of items){const k=scheduleRateMap[item.rateType];if(k)(newRates as any)[k]=item.price;}
        return{...l,lineRates:newRates};
      });
    }
    // Apply the roster proposed from the provider's notes (first line per category code)
    if(Array.isArray(planExtract.proposedRoster)&&planExtract.proposedRoster.length>0){
      const doneCodes=new Set<string>();
      updated=updated.map((l:SupportLine)=>{
        const prs=planExtract.proposedRoster.filter((r:any)=>r?.categoryCode===l.code);
        if(prs.length===0||doneCodes.has(l.code))return l;
        doneCodes.add(l.code);
        const{roster,aso,fso,kms}=rosterFromProposal(prs);
        return{...l,roster,activeSleepoverHours:aso,fixedSleepovers:fso,kmsPerWeek:kms>0?kms:l.kmsPerWeek};
      });
    }
    return updated;
  });
  setPlanExtract(null);
}
function exportCSV(){
  const p=participantName||"Unknown";
  const n=ndisNumber||"-";
  const dt=new Date().toLocaleString("en-AU");
  const pct=totals.totalFunding>0?((totals.planCost/totals.totalFunding)*100).toFixed(1):"0.0";
  function csvCell(v:any):string{const s=String(v??"");return/[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
  function row(...cells:any[]){return cells.map(csvCell).join(",")}
  const out:string[]=[];
  out.push("=== NDIS BUDGET REPORT ===");
  out.push(row("Generated",dt));
  out.push(row("Participant",p));
  out.push(row("NDIS Number",n));
  out.push(row("Plan Period",planDates.start+" to "+planDates.end+" ("+planWeeks.toFixed(1)+" weeks)"));
  out.push(row("State / Territory",planDates.state));
  out.push(row("Generated by","Kevria Calc | kevriacalc.com"));
  out.push("");
  out.push("=== PLAN SUMMARY ===");
  out.push(row("Total Funding",money(totals.totalFunding)));
  out.push(row("Weekly Cost",money(totals.weekly)));
  out.push(row("PH Adjustment",money(totals.totalPH)));
  out.push(row("Plan Cost",money(totals.planCost)));
  out.push(row("Remaining",money(totals.remaining)));
  out.push(row("Budget Used",pct+"%"));
  if(totals.totalClaimed>0){out.push(row("Total Claimed",money(totals.totalClaimed)));out.push(row("Actual Remaining",money(totals.actualRemaining)))}
  out.push("");
  out.push("=== SUPPORT LINES ===");
  out.push(row("Code","Description","Ratio","Budget","Weekly Cost","KMs/wk","KM Cost/wk","PH Adjustment","Plan Total","Used %","Remaining","Status"));
  for(const l of perLine){
    const usedPct=l.totalFunding>0?((l.planTotal/l.totalFunding)*100).toFixed(1)+"%":"0.0%";
    const status=l.remaining<0?"OVER BUDGET":l.totalFunding>0&&(l.remaining/l.totalFunding)<0.1?"LOW BUDGET":"ON TRACK";
    out.push(row(l.code,l.description,l.ratio,money(l.totalFunding),money(l.weeklyWithGST),l.kmsPerWeek>0?l.kmsPerWeek+" km":"0 km",money(l.kmsPerWeek*l.kmRate*(FREQ[l.kmFreq]?.multiplier||1)),money(l.phAdjustment),money(l.planTotal),usedPct,money(l.remaining),status));
  }
  out.push("");
  const withClaims=perLine.filter((l:any)=>l.claims&&l.claims.length>0);
  if(withClaims.length>0){
    out.push("=== CLAIMS ===");
    for(const l of withClaims){
      out.push(row("Support Line",l.description+" ("+l.code+")"));
      out.push(row("Date","Amount","Notes"));
      for(const c of l.claims){out.push(row(c.date,money(c.amount),c.note||""))}
      out.push(row("Total Claimed",money((l as any).totalClaimed)));
      out.push(row("Actual Remaining",money((l as any).actualRemaining)));
      out.push("");
    }
  }
  if(holidays.length>0){
    out.push("=== PUBLIC HOLIDAYS ("+holidays.length+") ===");
    out.push(row("Date","Day","Holiday"));
    for(const h of holidays){out.push(row(h.date,getDayName(h.dayOfWeek),h.name))}
    out.push("");
  }
  out.push("Generated by Kevria Calc | kevriacalc.com");
  const fname="ndis-budget-"+(p!=="Unknown"?p.replace(/[^a-z0-9]/gi,"-").toLowerCase()+"-":"")+new Date().toISOString().slice(0,10)+".csv";
  downloadTextFile(fname,out.join("\n"));
}
function exportPDF(){
  const dt=new Date().toLocaleString("en-AU");
  const p=participantName||"";
  const n=ndisNumber||"";
  const pct=totals.totalFunding>0?Math.min(100,(totals.planCost/totals.totalFunding)*100):0;
  const rc=totals.remaining<0?"#dc2626":totals.totalFunding>0&&(totals.remaining/totals.totalFunding)<0.1?"#d97706":"#16a34a";
  const sl=totals.remaining<0?"OVER BUDGET":totals.totalFunding>0&&(totals.remaining/totals.totalFunding)<0.1?"LOW BUDGET":"ON TRACK";
  const bc=totals.remaining<0?"#dc2626":totals.planCost>totals.totalFunding*0.9?"#d97706":"#16a34a";
  const slBg=totals.remaining<0?"#fef2f2":totals.totalFunding>0&&(totals.remaining/totals.totalFunding)<0.1?"#fffbeb":"#f0fdf4";
  const supportRows=perLine.map((l:any)=>{
    const usedPct=l.totalFunding>0?((l.planTotal/l.totalFunding)*100).toFixed(0):"0";
    const lc=l.remaining<0?"#dc2626":l.totalFunding>0&&(l.remaining/l.totalFunding)<0.1?"#d97706":"#16a34a";
    const lb=l.remaining<0?"#fef2f2":l.totalFunding>0&&(l.remaining/l.totalFunding)<0.1?"#fffbeb":"#f0fdf4";
    const ls=l.remaining<0?"OVER":l.totalFunding>0&&(l.remaining/l.totalFunding)<0.1?"LOW":"OK";
    return "<tr>"
      +"<td><span style=\"font-family:monospace;background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:11px\">"+escapeHtml(l.code)+"</span></td>"
      +"<td><strong>"+escapeHtml(l.description)+"</strong><div style=\"font-size:10px;color:#94a3b8\">"+l.ratio+" | "+usedPct+"% used</div></td>"
      +"<td style=\"text-align:right\">"+escapeHtml(money(l.totalFunding))+"</td>"
      +"<td style=\"text-align:right\">"+escapeHtml(money(l.weeklyWithGST))+"</td>"
      +"<td style=\"text-align:right;color:"+(l.phAdjustment>0?"#dc2626":l.phAdjustment<0?"#16a34a":"#94a3b8")+"\">"+(l.phAdjustment!==0?(l.phAdjustment>0?"+":"")+escapeHtml(money(l.phAdjustment)):"&mdash;")+"</td>"
      +"<td style=\"text-align:right\"><strong>"+escapeHtml(money(l.planTotal))+"</strong></td>"
      +"<td style=\"text-align:right;color:"+lc+"\"><strong>"+escapeHtml(money(l.remaining))+"</strong></td>"
      +"<td style=\"text-align:center\"><span style=\"background:"+lb+";color:"+lc+";border:1px solid "+lc+";padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700\">"+ls+"</span></td></tr>";
  }).join("");
  const claimLines=perLine.filter((l:any)=>l.claims&&l.claims.length>0);
  const claimsHtml=claimLines.length>0
    ?"<div class=\"section-title\">Claims &amp; Actual Spend</div>"
      +claimLines.map((l:any)=>"<div style=\"margin-bottom:20px\">"
        +"<div style=\"font-weight:600;font-size:13px;margin-bottom:8px;color:#0f172a\">"+escapeHtml(l.description)
        +" <span style=\"color:#94a3b8;font-weight:400;font-size:12px\">("+escapeHtml(l.code)+")</span>"
        +"<span style=\"float:right;font-size:12px;color:#475569\">Claimed: <strong>"+escapeHtml(money((l as any).totalClaimed))+"</strong>"
        +" &nbsp;|&nbsp; Remaining: <strong style=\"color:"+((l as any).actualRemaining<0?"#dc2626":"#16a34a")+"\">"+escapeHtml(money((l as any).actualRemaining))+"</strong></span></div>"
        +"<table><tr><th>Date</th><th>Amount</th><th>Notes</th></tr>"
        +l.claims.map((c:Claim)=>"<tr><td>"+escapeHtml(c.date)+"</td><td style=\"text-align:right\">"+escapeHtml(money(c.amount))+"</td><td>"+escapeHtml(c.note||"")+"</td></tr>").join("")
        +"</table></div>").join("")
    :"";
  const holidayHtml=holidays.length>0
    ?"<div class=\"section-title\">Public Holidays ("+holidays.length+")</div>"
      +"<table><tr><th>Date</th><th>Day</th><th>Holiday Name</th></tr>"
      +holidays.map(h=>"<tr><td>"+escapeHtml(h.date)+"</td><td>"+getDayName(h.dayOfWeek)+"</td><td>"+escapeHtml(h.name)+"</td></tr>").join("")
      +"</table>"
    :"";
  const infoExtra=(p?"<div class=\"info-item\"><div class=\"lbl\">Participant</div><div class=\"val\">"+escapeHtml(p)+"</div></div>":"")
    +(n?"<div class=\"info-item\"><div class=\"lbl\">NDIS Number</div><div class=\"val\">"+escapeHtml(n)+"</div></div>":"");
  const phAdj=totals.totalPH!==0?"<span>PH Adj: "+(totals.totalPH>0?"+":"")+escapeHtml(money(totals.totalPH))+"</span>":"";
  const claimedBar=totals.totalClaimed>0?"<span>Claimed: "+escapeHtml(money(totals.totalClaimed))+"</span>":"";
  const html=`<!doctype html><html><head><meta charset="utf-8"/><title>NDIS Budget Report${p?" - "+escapeHtml(p):""}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;background:#f8fafc;color:#1e293b;font-size:13px}.header{background:linear-gradient(135deg,#2d1b69 0%,#3d2787 100%);color:white;padding:28px 40px;display:flex;justify-content:space-between;align-items:flex-start}.brand{display:flex;align-items:center;gap:8px;margin-bottom:6px}.brand-mark{font-size:20px;color:#d4a843}.brand-name{font-size:13px;color:#d4a843;font-weight:700;letter-spacing:.08em}.report-title{font-size:22px;font-weight:800;color:white}.header-right{text-align:right;font-size:11px;color:rgba(255,255,255,.7);line-height:1.6}.info-bar{background:white;border-bottom:3px solid #d4a843;padding:14px 40px;display:flex;flex-wrap:wrap;gap:32px}.info-item .lbl{font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;margin-bottom:2px}.info-item .val{font-size:13px;font-weight:700;color:#1e293b}.content{padding:28px 40px}.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px}.kpi-card{background:white;border-radius:10px;padding:16px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,.06)}.kpi-lbl{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;margin-bottom:5px}.kpi-val{font-size:19px;font-weight:800}.progress-card{background:white;border-radius:10px;padding:18px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,.06);margin-bottom:20px}.progress-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.progress-lbl{font-size:12px;font-weight:600;color:#475569}.badge{padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700}.bar-bg{background:#f1f5f9;border-radius:6px;height:12px;overflow:hidden}.bar-fill{height:100%;border-radius:6px}.bar-meta{display:flex;justify-content:space-between;margin-top:5px;font-size:10px;color:#94a3b8}.section-title{font-size:14px;font-weight:700;color:#2d1b69;margin:22px 0 10px;padding-bottom:6px;border-bottom:2px solid #d4a843}table{width:100%;border-collapse:collapse;font-size:12px;background:white;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,.06);margin-bottom:4px}th{background:#2d1b69;color:white;padding:9px 12px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;font-weight:600}td{padding:9px 12px;border-bottom:1px solid #f1f5f9;vertical-align:middle}tr:last-child td{border-bottom:none}tr:nth-child(even) td{background:#fafafa}.footer{margin-top:32px;background:#f8fafc;color:rgba(15,23,42,.45);font-size:10px;padding:18px 40px;display:flex;justify-content:space-between;align-items:center;gap:20px}.footer a{color:#d4a843;text-decoration:none}@media print{body{background:white}.content{padding:16px}.header{-webkit-print-color-adjust:exact;print-color-adjust:exact}th{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>
</head><body>
<div class="header">
  <div><div class="brand"><span class="brand-mark">&#10022;</span><span class="brand-name">KEVRIA</span></div><div class="report-title">NDIS Budget Report</div></div>
  <div class="header-right"><div>Generated: ${escapeHtml(dt)}</div><div style="margin-top:4px;color:rgba(255,255,255,.55)">Rates: 2026&#8211;27 NDIS Pricing Schedule</div></div>
</div>
<div class="info-bar">
  ${infoExtra}<div class="info-item"><div class="lbl">Plan Start</div><div class="val">${escapeHtml(planDates.start)}</div></div>
  <div class="info-item"><div class="lbl">Plan End</div><div class="val">${escapeHtml(planDates.end)}</div></div>
  <div class="info-item"><div class="lbl">Duration</div><div class="val">${planWeeks.toFixed(1)} weeks</div></div>
  <div class="info-item"><div class="lbl">State</div><div class="val">${escapeHtml(planDates.state)}</div></div>
  <div class="info-item"><div class="lbl">Public Holidays</div><div class="val">${holidays.length} days</div></div>
</div>
<div class="content">
  <div class="kpi-grid">
    <div class="kpi-card"><div class="kpi-lbl">Total Funding</div><div class="kpi-val" style="color:#d4a843">${escapeHtml(money(totals.totalFunding))}</div></div>
    <div class="kpi-card"><div class="kpi-lbl">Plan Cost</div><div class="kpi-val" style="color:#0f172a">${escapeHtml(money(totals.planCost))}</div></div>
    <div class="kpi-card"><div class="kpi-lbl">Remaining</div><div class="kpi-val" style="color:${rc}">${escapeHtml(money(totals.remaining))}</div></div>
    <div class="kpi-card"><div class="kpi-lbl">Weekly Cost</div><div class="kpi-val" style="color:#475569">${escapeHtml(money(totals.weekly))}</div></div>
  </div>
  <div class="progress-card">
    <div class="progress-hdr">
      <div class="progress-lbl">Budget Usage &mdash; ${pct.toFixed(1)}% used</div>
      <span class="badge" style="background:${slBg};color:${rc};border:1px solid ${rc}">${sl}</span>
    </div>
    <div class="bar-bg"><div class="bar-fill" style="width:${pct.toFixed(1)}%;background:${bc}"></div></div>
    <div class="bar-meta"><span>Used: ${escapeHtml(money(totals.planCost))}</span>${phAdj}${claimedBar}<span>Budget: ${escapeHtml(money(totals.totalFunding))}</span></div>
  </div>
  <div class="section-title">Support Lines</div>
  <table><tr><th>Code</th><th>Description</th><th style="text-align:right">Budget</th><th style="text-align:right">Weekly</th><th style="text-align:right">PH Adj</th><th style="text-align:right">Plan Total</th><th style="text-align:right">Remaining</th><th style="text-align:center">Status</th></tr>${supportRows}</table>
  ${claimsHtml}
  ${holidayHtml}
</div>
<div class="footer">
  <div>Generated by <a href="https://kevriacalc.com"><strong>Kevria Calc</strong></a></div>
  <div>Rates based on the 2026&#8211;27 NDIS Pricing Schedule. Verify with your plan manager before quoting. Not financial advice.</div>
</div>
</body></html>`;
  printHtml(html);
}
function generateScheduleOfSupports(){
  const pd=providerDetails;
  const pName=participantName||"[Participant Name]";
  const ndis=ndisNumber||"[NDIS Number]";
  const dt=new Date().toLocaleDateString("en-AU",{day:"numeric",month:"long",year:"numeric"});
  const estFee=parseFloat(saEstFee)||0;

  // Build one row per active day-type per line (Annexure 1 format)
  type SRow={key:string;code:string;rateType:string;category:string;price:number|null;hours:number|string|null;total:number|null};
  const supRows:SRow[]=perLine.flatMap((l:any)=>{
    const div=RATIOS[l.ratio]?.divisor||1;
    const mode=getLineMode(l.code);
    const rows:SRow[]=[];
    if(mode==="lump"){
      rows.push({key:l.id+"_lump",code:l.code,rateType:"lump",category:escapeHtml(l.description),price:null,hours:null,total:l.totalFunding});
      return rows;
    }
    const wkDays=["mon","tue","wed","thu","fri"];
    // Use countDayOccurrences (same as main calc) so SoS totals match exactly
    const wkdOrdHrs=wkDays.reduce((s:number,d:string)=>{const r=l.roster[d];if(!r?.enabled||(r.hours||0)<=0)return s;const occ=countDayOccurrences(srvStart,srvEnd,DAY_DOW[d])*(FREQ[r.frequency]?.multiplier||1);return s+(r.hours||0)*occ;},0);
    const wkdNightHrs=wkDays.reduce((s:number,d:string)=>{const r=l.roster[d];if(!r?.enabled||(r.nightHours||0)<=0)return s;const occ=countDayOccurrences(srvStart,srvEnd,DAY_DOW[d])*(FREQ[r.frequency]?.multiplier||1);return s+(r.nightHours||0)*occ;},0);
    const satR=l.roster["sat"];const sunR=l.roster["sun"];
    const satOcc=satR?.enabled?countDayOccurrences(srvStart,srvEnd,6)*(FREQ[satR.frequency]?.multiplier||1):0;
    const sunOcc=sunR?.enabled?countDayOccurrences(srvStart,srvEnd,0)*(FREQ[sunR.frequency]?.multiplier||1):0;
    const satHrs=satR?.enabled?(satR.hours||0)*satOcc:0;
    const satNightHrs=satR?.enabled?(satR.nightHours||0)*satOcc:0;
    const sunHrs=sunR?.enabled?(sunR.hours||0)*sunOcc:0;
    const sunNightHrs=sunR?.enabled?(sunR.nightHours||0)*sunOcc:0;
    // Break PH hours out of regular rows into their own line item
    let phHrs=0,phWkdDay=0,phWkdNight=0,phSatDay=0,phSatNight=0,phSunDay=0,phSunNight=0;
    const _dow:{[k:number]:string}={0:"sun",1:"mon",2:"tue",3:"wed",4:"thu",5:"fri",6:"sat"};
    if(l.phImpact?.details){for(const h of l.phImpact.details){if(!h.included||!h.impact)continue;const rd=_dow[new Date(h.date).getDay()];const r=l.roster[rd];if(!r||!r.enabled)continue;const dh=r.hours||0,nh=r.nightHours||0;phHrs+=dh+nh;if(rd==="sat"){phSatDay+=dh;phSatNight+=nh;}else if(rd==="sun"){phSunDay+=dh;phSunNight+=nh;}else{phWkdDay+=dh;phWkdNight+=nh;}}}
    const adjWkdOrd=Math.max(0,wkdOrdHrs-phWkdDay);
    const adjWkdNight=Math.max(0,wkdNightHrs-phWkdNight);
    const adjSat=Math.max(0,satHrs-phSatDay);
    const adjSatNight=Math.max(0,satNightHrs-phSatNight);
    const adjSun=Math.max(0,sunHrs-phSunDay);
    const adjSunNight=Math.max(0,sunNightHrs-phSunNight);
    // Display rounded hours but compute totals from unrounded values to match the main calc
    if(adjWkdOrd>0){const rate=(l.lineRates?.weekdayOrd||0)/div;rows.push({key:l.id+"_weekday",code:l.code,rateType:"weekday",category:escapeHtml(l.description)+" - Weekday Daytime",price:rate,hours:Math.round(adjWkdOrd),total:rate*adjWkdOrd});}
    if(adjWkdNight>0){const rate=(l.lineRates?.weekdayNight||0)/div;rows.push({key:l.id+"_weekdayNight",code:l.code,rateType:"weekdayNight",category:escapeHtml(l.description)+" - Weekday Night",price:rate,hours:Math.round(adjWkdNight),total:rate*adjWkdNight});}
    if(adjSat>0){const rate=(l.lineRates?.sat||0)/div;rows.push({key:l.id+"_sat",code:l.code,rateType:"sat",category:escapeHtml(l.description)+" - Saturday",price:rate,hours:Math.round(adjSat),total:rate*adjSat});}
    if(adjSatNight>0){const rate=(l.lineRates?.sat||0)/div;rows.push({key:l.id+"_satNight",code:l.code,rateType:"satNight",category:escapeHtml(l.description)+" - Saturday Night",price:rate,hours:Math.round(adjSatNight),total:rate*adjSatNight});}
    if(adjSun>0){const rate=(l.lineRates?.sun||0)/div;rows.push({key:l.id+"_sun",code:l.code,rateType:"sun",category:escapeHtml(l.description)+" - Sunday",price:rate,hours:Math.round(adjSun),total:rate*adjSun});}
    if(adjSunNight>0){const rate=(l.lineRates?.sun||0)/div;rows.push({key:l.id+"_sunNight",code:l.code,rateType:"sunNight",category:escapeHtml(l.description)+" - Sunday Night",price:rate,hours:Math.round(adjSunNight),total:rate*adjSunNight});}
    if(phHrs>0){const rate=(l.lineRates?.publicHoliday||0)/div;rows.push({key:l.id+"_ph",code:l.code,rateType:"publicHoliday",category:escapeHtml(l.description)+" - Public Holiday",price:rate,hours:Math.round(phHrs),total:rate*phHrs});}
    const sf=FREQ[l.activeSleepoverFreq]?.multiplier||1;const activeSoHrs=(l.activeSleepoverHours||0)*sf*planWeeks;if(activeSoHrs>0&&(l.lineRates?.activeSleepoverHourly||0)>0){const rate=(l.lineRates?.activeSleepoverHourly||0)/div;rows.push({key:l.id+"_activeSleepover",code:l.code,rateType:"activeSleepover",category:escapeHtml(l.description)+" - Active Sleepover",price:rate,hours:Math.round(activeSoHrs),total:rate*activeSoHrs});}
    const ff=FREQ[l.fixedSleepoverFreq]?.multiplier||1;const fixedSoUnits=(l.fixedSleepovers||0)*ff*planWeeks;if(fixedSoUnits>0&&(l.lineRates?.fixedSleepoverUnit||0)>0){const rate=l.lineRates?.fixedSleepoverUnit||0;rows.push({key:l.id+"_fixedSleepover",code:l.code,rateType:"fixedSleepover",category:escapeHtml(l.description)+" - Sleepover (Overnight)",price:rate,hours:Math.round(fixedSoUnits),total:rate*fixedSoUnits});}
    const kf=FREQ[l.kmFreq]?.multiplier||1;const totalKm=(l.kmsPerWeek||0)*kf*planWeeks;if(totalKm>0&&(l.kmRate||0)>0){rows.push({key:l.id+"_km",code:l.code,rateType:"km",category:escapeHtml(l.description)+" - Transport (km)",price:l.kmRate,hours:Math.round(totalKm)+"km",total:l.kmRate*totalKm});}
    if(rows.length===0){rows.push({key:l.id+"_lump",code:l.code,rateType:"lump",category:escapeHtml(l.description),price:null,hours:null,total:l.totalFunding});}
    return rows;
  });

  const supRowsHtml=supRows.map(r=>{
    const itemNum=saItemNumbers[r.key]||getDefaultItemNumber(r.code,r.rateType);
    return "<tr>"
    +"<td style=\"vertical-align:top\">"+r.category+"</td>"
    +"<td style=\"vertical-align:top;color:#475569;font-size:8.5pt\">"+(itemNum?"NDIS Item Number<br/>"+escapeHtml(itemNum):"<span style=\"color:#cbd5e1\">_______________</span>")+"</td>"
    +"<td style=\"text-align:right;vertical-align:top;white-space:nowrap\">"+(r.hours!==null?(r.hours+(r.price!==null?" @ "+escapeHtml(money(r.price))+(r.rateType==="km"?"/km":r.rateType==="fixedSleepover"?"/night":"/hr"):"")):"&mdash;")+"</td>"
    +"<td style=\"text-align:right;vertical-align:top;white-space:nowrap;font-weight:700;color:#0f172a\">"+(r.total!==null?escapeHtml(money(r.total)):"&mdash;")+"</td>"
    +"</tr>";
  }).join("");

  const sreqs=saSpecificReqs;
  const specReqHtml=`<div style="margin-bottom:18px">
  <div style="font-size:8.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#2d1b69;padding-bottom:5px;border-bottom:2px solid #d4a843;margin-bottom:10px">Specific Requirements</div>
  <table style="border:1.5px solid #e2e8f0;border-radius:6px;overflow:hidden;font-size:9pt;margin-bottom:0">
    <tbody>
      <tr><td style="padding:7px 12px;border-bottom:1px solid #e2e8f0;width:60%">Behaviours of Concern</td><td style="padding:7px 12px;border-bottom:1px solid #e2e8f0">${sreqs.behavioursOfConcern?"&#9745; Yes &nbsp;&nbsp;&#9744; No":"&#9744; Yes &nbsp;&nbsp;&#9745; No"}</td></tr>
      <tr><td style="padding:7px 12px;border-bottom:1px solid #e2e8f0">Regulated Restrictive Practice</td><td style="padding:7px 12px;border-bottom:1px solid #e2e8f0">${sreqs.regulatedRestrictivePractice?"&#9745; Yes &nbsp;&nbsp;&#9744; No":"&#9744; Yes &nbsp;&nbsp;&#9745; No"}</td></tr>
      <tr><td style="padding:7px 12px">Medication Management</td><td style="padding:7px 12px">${sreqs.medicationManagement?"&#9745; Yes &nbsp;&nbsp;&#9744; No":"&#9744; Yes &nbsp;&nbsp;&#9745; No"}</td></tr>
    </tbody>
  </table>
  </div>`;

  const estFeeHtml=estFee>0?`<div style="margin-bottom:18px;padding:12px 14px;border:1.5px solid #e2e8f0;border-radius:6px;display:flex;justify-content:space-between;align-items:center">
  <div style="font-size:9pt;color:#475569">The following establishment fee will be payable if completing +20 hours per week in services</div>
  <div style="font-size:12pt;font-weight:700;color:#0f172a;white-space:nowrap;margin-left:16px">${escapeHtml(money(estFee))}</div>
  </div>`:"";

  const grandTotal=supRows.reduce((s,r)=>s+(r.total||0),0)+(estFee||0);

  const html=`<!doctype html><html><head><meta charset="utf-8"/><title>Schedule of Supports - ${escapeHtml(pName)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;color:#1e293b;background:white;font-size:10pt;line-height:1.5}
.header{background:#2d1b69;color:white;padding:14px 40px;display:flex;justify-content:space-between;align-items:center}
.brand{color:#d4a843;font-size:16px;font-weight:bold;letter-spacing:.05em}
.doc-label{font-size:9px;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.12em;margin-top:2px}
.content{padding:24px 40px}
.doc-title{font-size:14pt;font-weight:700;color:#2d1b69;text-align:center;margin-bottom:3px;text-transform:uppercase;letter-spacing:.06em}
.doc-ref{text-align:center;font-size:9pt;color:#64748b;margin-bottom:18px}
.details-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;margin-bottom:18px;border:1.5px solid #e2e8f0;border-radius:6px;overflow:hidden}
.det-col{padding:14px 18px}
.det-col+.det-col{border-left:1.5px solid #e2e8f0}
.det-label{font-size:7.5pt;text-transform:uppercase;letter-spacing:.12em;color:#94a3b8;margin-bottom:3px}
.det-name{font-size:11.5pt;font-weight:700;color:#0f172a;margin-bottom:4px}
.det-info{font-size:9pt;color:#475569;line-height:1.6}
.section-heading{font-size:8.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#2d1b69;margin-bottom:8px;padding-bottom:5px;border-bottom:2px solid #d4a843}
table{width:100%;border-collapse:collapse;font-size:9.5pt;margin-bottom:10px}
thead tr{background:#2d1b69}
thead th{color:white;padding:8px 10px;text-align:left;font-size:8pt;text-transform:uppercase;letter-spacing:.07em;font-weight:600}
tbody tr{border-bottom:1px solid #e2e8f0}
tbody tr:nth-child(even){background:#f8fafc}
tbody td{padding:9px 10px;vertical-align:top}
.total-row{background:#f1f5f9!important;border-top:2px solid #2d1b69}
.total-row td{font-weight:700;padding:10px;font-size:10pt;color:#0f172a}
.note{font-size:8pt;color:#94a3b8;margin-bottom:18px;line-height:1.5;border-left:3px solid #e2e8f0;padding-left:10px}
.sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:10px}
.sig-name{font-weight:700;font-size:10pt;margin-bottom:1px}
.sig-role{font-size:8.5pt;color:#64748b;margin-bottom:22px}
.sig-line{border-top:1px solid #94a3b8;padding-top:4px;margin-top:44px;font-size:8.5pt;color:#94a3b8}
.date-line{border-top:1px solid #94a3b8;padding-top:4px;margin-top:14px;font-size:8.5pt;color:#94a3b8}
.footer{margin-top:24px;padding:9px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:7.5pt;color:#94a3b8;display:flex;justify-content:space-between}
@media print{body{background:white}.header{-webkit-print-color-adjust:exact;print-color-adjust:exact}thead tr{-webkit-print-color-adjust:exact;print-color-adjust:exact}.details-grid{-webkit-print-color-adjust:exact;print-color-adjust:exact}.total-row{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style>
</head><body>
<div class="header">
  <div><div class="brand">&#10022; KEVRIA</div><div class="doc-label">Kevria Calc</div></div>
  <div style="text-align:right;font-size:9px;color:rgba(255,255,255,.6)"><div style="font-size:10.5px;color:white;font-weight:700;text-transform:uppercase;letter-spacing:.1em">Schedule of Supports</div><div style="margin-top:3px">Generated: ${escapeHtml(dt)}</div></div>
</div>
<div class="content">
  <div class="doc-title">Schedule of Supports</div>
  <div class="doc-ref">This schedule forms part of the Service Agreement between <strong>${escapeHtml(pd.orgName||"the Provider")}</strong> and <strong>${escapeHtml(pName)}</strong></div>

  <div class="details-grid">
    <div class="det-col">
      <div class="det-label">Participant</div>
      <div class="det-name">${escapeHtml(pName)}</div>
      <div class="det-info">${ndis!=="[NDIS Number]"?"NDIS Number: <strong>"+escapeHtml(ndis)+"</strong><br/>":""}Plan Period: <strong>${escapeHtml(planDates.start)}</strong> to <strong>${escapeHtml(planDates.end)}</strong><br/>${(planDates.serviceStart||planDates.serviceEnd)?`Service Period: <strong>${escapeHtml(srvStart)}</strong> to <strong>${escapeHtml(srvEnd)}</strong><br/>`:""}State / Territory: ${escapeHtml(planDates.state)} &nbsp;|&nbsp; Duration: ${planWeeks.toFixed(1)} weeks</div>
    </div>
    <div class="det-col">
      <div class="det-label">Provider</div>
      <div class="det-name">${escapeHtml(pd.orgName||"[Provider]")}</div>
      <div class="det-info">${pd.abn?"ABN: "+escapeHtml(pd.abn)+"<br/>":""}${pd.registrationNumber?"NDIS Reg: "+escapeHtml(pd.registrationNumber)+"<br/>":""}${pd.contactName?escapeHtml(pd.contactName)+"<br/>":""}${pd.phone?escapeHtml(pd.phone)+" &nbsp;":""}${pd.email?"<a href='mailto:"+escapeHtml(pd.email)+"' style='color:#2d1b69'>"+escapeHtml(pd.email)+"</a>":""}</div>
    </div>
  </div>

  ${specReqHtml}
  ${estFeeHtml}
  <div class="section-heading">Funded Supports &amp; Schedule</div>
  <table>
    <thead><tr>
      <th style="width:28%">Support Category</th>
      <th style="width:30%">Description of Service</th>
      <th style="width:28%;text-align:right">Hrs / Units</th>
      <th style="width:14%;text-align:right">Total Cost</th>
    </tr></thead>
    <tbody>
    ${supRowsHtml}
    <tr class="total-row"><td colspan="3">Total</td><td style="text-align:right">${escapeHtml(money(grandTotal))}</td></tr>
    </tbody>
  </table>
  <div class="note">Prices per the NDIS Pricing Schedule (2026&#8211;27). Plan totals are estimates and may vary based on actual supports delivered. All prices are GST-inclusive where applicable.</div>

  ${(()=>{
    const rLines=perLine.filter((l:any)=>getLineMode(l.code)!=="lump"&&(Object.values(l.roster).some((r:any)=>r?.enabled)||(l.kmsPerWeek||0)>0));
    if(rLines.length===0)return"";
    const dOrder=["mon","tue","wed","thu","fri","sat","sun"];
    const dLabel=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    const rows=rLines.map((l:any)=>{
      const cells=dOrder.map((d,i)=>{
        const r=l.roster[d];
        if(!r?.enabled)return`<td style="text-align:center;color:#cbd5e1;font-size:8.5pt">—</td>`;
        const dh=r.hours||0,nh=r.nightHours||0;
        const freq=r.frequency&&r.frequency!=="every"?`<div style="color:#94a3b8;font-size:7pt;margin-top:1px">${({"2nd":"ftn","3rd":"3rd wk","4th":"4th wk","monthly":"mth"} as {[k:string]:string})[r.frequency]||r.frequency}</div>`:"";
        const isSat=d==="sat",isSun=d==="sun";
        const dayColour=isSat?"#1e40af":isSun?"#d4a843":"inherit";
        let inner="";
        if(dh>0)inner+=`<div style="font-weight:600;color:${dayColour}">${dh}h</div>`;
        if(nh>0)inner+=`<div style="color:#64748b;font-size:8pt">+${nh}n</div>`;
        if(!inner)inner=`<div style="color:#cbd5e1">—</div>`;
        return`<td style="text-align:center;vertical-align:top;padding:6px 4px">${inner}${freq}</td>`;
      }).join("");
      const weeklyDayHrs=dOrder.reduce((s:number,d:string)=>{const r=l.roster[d];if(!r?.enabled)return s;const fm=FREQ[r.frequency]?.multiplier||1;return s+(r.hours||0)*fm;},0);
      const weeklyNightHrs=dOrder.reduce((s:number,d:string)=>{const r=l.roster[d];if(!r?.enabled)return s;const fm=FREQ[r.frequency]?.multiplier||1;return s+(r.nightHours||0)*fm;},0);
      const totalLine=weeklyDayHrs+weeklyNightHrs;
      const kmf=FREQ[l.kmFreq]?.multiplier||1;const weeklyKm=(l.kmsPerWeek||0)*kmf;
      const totalDisplay=`<div style="font-weight:700">${totalLine>0?(totalLine%1===0?totalLine:totalLine.toFixed(1))+"h":"—"}</div>${weeklyNightHrs>0?`<div style="color:#64748b;font-size:8pt">(${weeklyNightHrs%1===0?weeklyNightHrs:weeklyNightHrs.toFixed(1)}n)</div>`:""}${weeklyKm>0?`<div style="color:#1e40af;font-size:8pt;margin-top:2px">${weeklyKm%1===0?weeklyKm:weeklyKm.toFixed(1)} km</div>`:""}`;

      let soNote="";
      const sf=FREQ[l.activeSleepoverFreq]?.multiplier||1;if((l.activeSleepoverHours||0)>0)soNote+=`Active SO: ${l.activeSleepoverHours}h × ${l.activeSleepoverFreq}`;
      const ff=FREQ[l.fixedSleepoverFreq]?.multiplier||1;if((l.fixedSleepovers||0)>0)soNote+=(soNote?", ":"")+`Fixed SO: ${l.fixedSleepovers} × ${l.fixedSleepoverFreq}`;
      return`<tr><td style="vertical-align:top;font-size:9pt;padding:6px 8px">${escapeHtml(l.description)}${soNote?`<div style="font-size:7.5pt;color:#94a3b8;margin-top:2px">${soNote}</div>`:""}</td>${cells}<td style="text-align:right;vertical-align:top;padding:6px 8px">${totalDisplay}</td></tr>`;
    }).join("");
    const headCells=dLabel.map((d,i)=>`<th style="text-align:center;width:7%">${d}</th>`).join("");
    return`<div class="section-heading" style="margin-top:16px">Weekly Roster</div>
  <table style="font-size:9pt">
    <thead><tr><th style="width:22%;text-align:left">Support Category</th>${headCells}<th style="width:9%;text-align:right">Weekly Hrs</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="note" style="margin-top:6px">h = daytime hours &nbsp;|&nbsp; n = night hours &nbsp;|&nbsp; ftn = fortnightly &nbsp;|&nbsp; mth = monthly. Sat shown in blue, Sun in gold.</div>`;
  })()}

  <div class="section-heading" style="margin-top:16px">Signatures</div>
  <div class="sig-grid">
    <div>
      <div class="sig-name">${escapeHtml(pd.orgName||"Provider Organisation")}</div>
      <div class="sig-role">Provider Representative</div>
      <div class="sig-line">Signature</div>
      <div class="date-line">Date</div>
    </div>
    <div>
      <div class="sig-name">${escapeHtml(pName)}</div>
      <div class="sig-role">Participant (or Representative)</div>
      <div class="sig-line">Signature</div>
      <div class="date-line">Date</div>
    </div>
  </div>
</div>
<div class="footer">
  <div>Generated by <strong>Kevria Calc</strong> | kevriacalc.com</div>
  <div>Rates: 2026&#8211;27 NDIS Pricing Schedule. Verify before quoting. Not financial advice.</div>
</div>
</body></html>`;
  printHtml(html);
}
function generateClinicalSoS(){
  const pName=participantName||"[Participant Name]";
  const ndis=ndisNumber||"[NDIS Number]";
  const dt=new Date().toLocaleDateString("en-AU",{day:"numeric",month:"long",year:"numeric"});
  const cp=clinicalPractitioner;
  const defaultRate=clinicalPriceItems[0]?.rate||0;
  const activeItems=clinicalScheduleItems.filter(i=>i.description.trim()||i.hours>0);
  const totalHours=activeItems.reduce((s,i)=>s+(i.hours||0),0);
  const grandTotal=activeItems.reduce((s,i)=>s+(i.hours||0)*(i.rate>0?i.rate:defaultRate),0);
  const titleHours=totalHours%1===0?String(totalHours):totalHours.toFixed(1);
  const priceGuideRows=clinicalPriceItems.filter(p=>p.description.trim()||p.itemCode.trim()).map(p=>`<tr><td style="font-family:monospace;font-size:8.5pt">${escapeHtml(p.itemCode)}</td><td>${escapeHtml(p.description)}</td><td style="text-align:right;white-space:nowrap">${escapeHtml(money(p.rate))}/hr</td></tr>`).join("");
  const scheduleHtmlRows=activeItems.map(r=>{const rate=r.rate>0?r.rate:defaultRate;const total=(r.hours||0)*rate;return`<tr><td>${escapeHtml(r.description)}${r.note?`<div style="font-size:8pt;color:#94a3b8">${escapeHtml(r.note)}</div>`:""}</td><td style="text-align:center;white-space:nowrap">${r.hours%1===0?r.hours:r.hours.toFixed(1)}</td><td style="text-align:right;white-space:nowrap">${escapeHtml(money(total))}</td></tr>`;}).join("");
  const overviewHtml=clinicalOverview.trim()?`<div style="margin-bottom:18px"><div style="font-size:8.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#2d1b69;padding-bottom:5px;border-bottom:2px solid #d4a843;margin-bottom:12px">Overview</div><div style="font-size:9.5pt;color:#374151;line-height:1.7;white-space:pre-wrap">${escapeHtml(clinicalOverview.trim())}</div></div>`:"";
  const html=`<!doctype html><html><head><meta charset="utf-8"/><title>Clinical Schedule of Supports - ${escapeHtml(pName)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;color:#1e293b;background:white;font-size:10pt;line-height:1.5}
.header{background:#2d1b69;color:white;padding:14px 40px;display:flex;justify-content:space-between;align-items:center}
.brand{color:#d4a843;font-size:16px;font-weight:bold;letter-spacing:.05em}
.doc-label{font-size:9px;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.12em;margin-top:2px}
.content{padding:24px 40px}
.doc-title{font-size:14pt;font-weight:700;color:#2d1b69;text-align:center;margin-bottom:3px;text-transform:uppercase;letter-spacing:.04em}
.doc-sub{text-align:center;font-size:10.5pt;font-weight:600;color:#475569;margin-bottom:18px}
.details-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;margin-bottom:18px;border:1.5px solid #e2e8f0;border-radius:6px;overflow:hidden}
.det-col{padding:14px 18px}
.det-col+.det-col{border-left:1.5px solid #e2e8f0}
.det-label{font-size:7.5pt;text-transform:uppercase;letter-spacing:.12em;color:#94a3b8;margin-bottom:3px}
.det-name{font-size:11.5pt;font-weight:700;color:#0f172a;margin-bottom:4px}
.det-info{font-size:9pt;color:#475569;line-height:1.6}
.section-heading{font-size:8.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#2d1b69;margin-bottom:8px;padding-bottom:5px;border-bottom:2px solid #d4a843}
table{width:100%;border-collapse:collapse;font-size:9.5pt;margin-bottom:10px}
thead tr{background:#2d1b69}
thead th{color:white;padding:8px 10px;text-align:left;font-size:8pt;text-transform:uppercase;letter-spacing:.07em;font-weight:600}
tbody tr{border-bottom:1px solid #e2e8f0}
tbody tr:nth-child(even){background:#f8fafc}
tbody td{padding:9px 10px;vertical-align:top}
.total-row{background:#f1f5f9!important;border-top:2px solid #2d1b69}
.total-row td{font-weight:700;padding:10px;font-size:10pt;color:#0f172a}
.note{font-size:8pt;color:#94a3b8;margin-bottom:18px;line-height:1.5;border-left:3px solid #e2e8f0;padding-left:10px}
.sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:10px}
.sig-name{font-weight:700;font-size:10pt;margin-bottom:1px}
.sig-role{font-size:8.5pt;color:#64748b;margin-bottom:22px}
.sig-line{border-top:1px solid #94a3b8;padding-top:4px;margin-top:44px;font-size:8.5pt;color:#94a3b8}
.date-line{border-top:1px solid #94a3b8;padding-top:4px;margin-top:14px;font-size:8.5pt;color:#94a3b8}
.footer{margin-top:24px;padding:9px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:7.5pt;color:#94a3b8;display:flex;justify-content:space-between}
@media print{body{background:white}.header{-webkit-print-color-adjust:exact;print-color-adjust:exact}thead tr{-webkit-print-color-adjust:exact;print-color-adjust:exact}.details-grid{-webkit-print-color-adjust:exact;print-color-adjust:exact}.total-row{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style>
</head><body>
<div class="header">
  <div><div class="brand">&#10022; KEVRIA</div><div class="doc-label">Kevria Calc</div></div>
  <div style="text-align:right;font-size:9px;color:rgba(255,255,255,.6)"><div style="font-size:10.5px;color:white;font-weight:700;text-transform:uppercase;letter-spacing:.1em">Clinical Schedule of Supports</div><div style="margin-top:3px">Generated: ${escapeHtml(dt)}</div></div>
</div>
<div class="content">
  <div class="doc-title">Schedule of Supports</div>
  <div class="doc-sub">${escapeHtml(titleHours)}-Hour Plan Package</div>

  <div class="details-grid">
    <div class="det-col">
      <div class="det-label">Participant</div>
      <div class="det-name">${escapeHtml(pName)}</div>
      <div class="det-info">${ndis!=="[NDIS Number]"?"NDIS Number: <strong>"+escapeHtml(ndis)+"</strong><br/>":""}Plan Period: <strong>${escapeHtml(planDates.start)}</strong> to <strong>${escapeHtml(planDates.end)}</strong><br/>${(planDates.serviceStart||planDates.serviceEnd)?`Service Period: <strong>${escapeHtml(planDates.serviceStart||planDates.start)}</strong> to <strong>${escapeHtml(planDates.serviceEnd||planDates.end)}</strong><br/>`:""}Total Hours: <strong>${escapeHtml(titleHours)} hrs</strong> &nbsp;|&nbsp; Total Cost: <strong>${escapeHtml(money(grandTotal))}</strong></div>
    </div>
    <div class="det-col">
      <div class="det-label">Service Provider</div>
      <div class="det-name">${escapeHtml(cp.org||providerDetails.orgName||"[Provider]")}</div>
      <div class="det-info">${cp.name?"Practitioner: <strong>"+escapeHtml(cp.name)+"</strong><br/>":""}${cp.title?escapeHtml(cp.title)+"<br/>":""}${cp.phone?escapeHtml(cp.phone)+" &nbsp;":""}${cp.email?"<a href='mailto:"+escapeHtml(cp.email)+"' style='color:#2d1b69'>"+escapeHtml(cp.email)+"</a>":""}</div>
    </div>
  </div>

  ${overviewHtml}

  ${priceGuideRows?`<div class="section-heading">NDIS Price Guide</div>
  <table>
    <thead><tr><th style="width:28%">NDIS Item Number</th><th>Description</th><th style="width:16%;text-align:right">Rate</th></tr></thead>
    <tbody>${priceGuideRows}</tbody>
  </table>`:""}

  <div class="section-heading" style="margin-top:16px">Schedule of Supports</div>
  <table>
    <thead><tr><th>Service</th><th style="width:10%;text-align:center">Hours</th><th style="width:18%;text-align:right">Total Cost</th></tr></thead>
    <tbody>
    ${scheduleHtmlRows}
    <tr class="total-row"><td>Total</td><td style="text-align:center">${escapeHtml(titleHours)}</td><td style="text-align:right">${escapeHtml(money(grandTotal))}</td></tr>
    </tbody>
  </table>
  <div class="note">All services are delivered in accordance with the NDIS Pricing Schedule (2026&#8211;27). Total hours and costs are estimates based on assessed clinical need and may be adjusted following review.</div>

  <div class="section-heading" style="margin-top:16px">Practitioner Details &amp; Signatures</div>
  <div style="margin-bottom:18px">
    <div style="font-size:11pt;font-weight:700;color:#0f172a">${escapeHtml(cp.name||"[Practitioner Name]")}</div>
    ${cp.title?`<div style="font-size:9.5pt;color:#475569">${escapeHtml(cp.title)}</div>`:""}
    ${cp.qualifications?`<div style="font-size:9pt;color:#64748b;font-style:italic;margin-top:2px">${escapeHtml(cp.qualifications)}</div>`:""}
    <div style="font-size:9pt;color:#475569;margin-top:4px">${escapeHtml(cp.org||providerDetails.orgName||"")}${cp.phone?" &nbsp;|&nbsp; "+escapeHtml(cp.phone):""}${cp.email?" &nbsp;|&nbsp; <a href='mailto:"+escapeHtml(cp.email)+"' style='color:#2d1b69'>"+escapeHtml(cp.email)+"</a>":""}</div>
  </div>
  <div class="sig-grid">
    <div>
      <div class="sig-name">${escapeHtml(cp.name||"Practitioner")}</div>
      <div class="sig-role">${escapeHtml(cp.title||"Practitioner")}</div>
      <div class="sig-line">Signature</div>
      <div class="date-line">Date</div>
    </div>
    <div>
      <div class="sig-name">${escapeHtml(pName)}</div>
      <div class="sig-role">Participant (or Representative)</div>
      <div class="sig-line">Signature</div>
      <div class="date-line">Date</div>
    </div>
  </div>
</div>
<div class="footer">
  <div>Generated by <strong>Kevria Calc</strong> | kevriacalc.com</div>
  <div>Rates: 2026&#8211;27 NDIS Pricing Schedule. Verify before quoting. Not financial advice.</div>
</div>
</body></html>`;
  printHtml(html);
}
const totalStatus=getBudgetStatus(totals.remaining,totals.totalFunding);
const showSil=calcMode==="sil"||calcMode==="both";
const showClinical=calcMode==="clinical"||calcMode==="both";
const clinicalTotal=clinicalServices.reduce((s,i)=>s+(i.hours||0)*(i.rate||0),0);
const clinicalRemaining=clinicalFunding-clinicalTotal;
const clinicalStatus=getBudgetStatus(clinicalRemaining,clinicalFunding);
const pace=useMemo(()=>{
  if(!srvStart||!srvEnd||totals.totalFunding<=0)return null;
  const today=new Date();const start=new Date(srvStart);const end=new Date(srvEnd);
  if(today<start)return{status:"not_started",pctElapsed:0,weeksElapsed:0,expectedSpend:0,projectedSpendToDate:0,variance:0,usingClaims:false};
  const effective=today>end?end:today;
  const weeksElapsed=(effective.getTime()-start.getTime())/(7*24*60*60*1000);
  const pctElapsed=Math.min(100,planWeeks>0?(weeksElapsed/planWeeks)*100:0);
  const expectedSpend=totals.totalFunding*(pctElapsed/100);
  // Prefer actual logged claims over the roster projection when the user tracks claims.
  const usingClaims=totals.totalClaimed>0;
  const projectedSpendToDate=usingClaims?totals.totalClaimed:totals.weekly*weeksElapsed;
  const variance=projectedSpendToDate-expectedSpend;
  const pctDiff=expectedSpend>0?(variance/expectedSpend)*100:0;
  const ended=today>end;
  const status=ended?"ended":pctDiff>5?"over_pace":pctDiff<-5?"under_pace":"on_pace";
  return{status,pctElapsed,weeksElapsed,expectedSpend,projectedSpendToDate,variance,ended,usingClaims};
},[srvStart,srvEnd,planWeeks,totals.totalFunding,totals.weekly,totals.totalClaimed]);
return(
<main className="min-h-screen" style={{background:"#f5f6fa",color: "#0f172a"}}>
<div style={{background:"linear-gradient(135deg, #241456 0%, #2d1b69 45%, #3d2787 100%)",position:"relative",overflow:"hidden",padding:"34px 0 30px"}}>
<div style={{position:"absolute",top:"-120px",right:"-60px",width:"380px",height:"380px",borderRadius:"50%",background:"radial-gradient(circle, rgba(212,168,67,0.22), transparent 65%)"}}/>
<div style={{position:"absolute",bottom:"-140px",left:"12%",width:"300px",height:"300px",borderRadius:"50%",background:"radial-gradient(circle, rgba(255,255,255,0.06), transparent 65%)"}}/>
<div className="mx-auto max-w-6xl px-6" style={{position:"relative"}}>
<div className="flex items-center justify-between flex-wrap gap-3">
<div>
<div className="flex items-center gap-3"><span style={{fontSize:"1.5rem",color:"#d4a843",filter:"drop-shadow(0 0 12px rgba(212,168,67,0.7))"}}>✦</span><h1 className="text-3xl font-bold tracking-tight" style={{color:"#ffffff"}}>Kevria Calc</h1></div>
<div className="text-sm mt-1.5" style={{color:"rgba(255,255,255,0.6)"}}>{participantName?<>Budget workspace for <span style={{color:"#d4a843",fontWeight:600}}>{participantName}</span></>:<>Powered by <span style={{color:"#d4a843",fontWeight:600}}>Kevria</span></>}</div>
</div>
{userEmail&&<span className="text-xs px-3 py-1.5 rounded-full" style={{color:"rgba(255,255,255,0.75)",background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.14)"}}>{userEmail}</span>}
</div>
</div>
</div>
{calcMode!==null&&showSil?(
<div style={{position:"sticky",top:0,zIndex:40,background:"rgba(245,246,250,0.88)",backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)",borderBottom:"1px solid #e9eaf2",marginBottom:"24px"}}>
<div className="mx-auto max-w-6xl px-6 py-2.5 flex items-center justify-between gap-3 flex-wrap">
<div className="flex items-center gap-2 flex-wrap">
{([["sec-plan","Plan details",!!(planDates.start&&planDates.end&&new Date(planDates.end)>new Date(planDates.start))],["sec-budget","Funding",totals.totalFunding>0],["sec-lines","Roster",totals.weekly>0]] as [string,string,boolean][]).map(([id,label,done],i)=>(
<button key={id} type="button" className={"kv-step"+(done?" done":"")} onClick={()=>document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"})}>
<span className="dot">{done?"✓":i+1}</span>{label}
</button>
))}
</div>
<div className="flex items-center gap-2">
<span className="kv-label">Remaining</span>
<span className="kv-money font-bold" style={{color:totalStatus.color}}>{money(totals.remaining)}</span>
<span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{background:totalStatus.bg,color:totalStatus.color,border:"1px solid "+totalStatus.border}}>{totalStatus.label}</span>
</div>
</div>
</div>
):(<div style={{height:"24px"}}/>)}
<div className="mx-auto max-w-6xl p-6 pt-0">

<div className="kv-card p-6 mb-6">
<div id="sec-plan" className="flex items-center justify-between mb-4" style={{scrollMarginTop:"70px"}}><div className="flex items-center gap-3"><span className="kv-num">1</span><h2 className="text-xl font-semibold" style={{color:"#2d1b69"}}>Plan Details</h2></div>{calcMode&&<button onClick={()=>setCalcMode(null)} style={{fontSize:"0.72rem",color:"#64748b",background:"rgba(15,23,42,0.04)",border:"1px solid rgba(15,23,42,0.1)",borderRadius:"6px",padding:"4px 10px",cursor:"pointer"}}>{calcMode==="sil"?"SIL / Core":calcMode==="clinical"?"Clinical / Therapy":"SIL + Clinical"} · change mode</button>}</div>
<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
<DateField label="Plan Start Date" value={planDates.start} onChange={v=>setPlanDates(p=>({...p,start:v}))}/>
<DateField label="Plan End Date" value={planDates.end} onChange={v=>setPlanDates(p=>({...p,end:v}))}/>
<SelectField label="State / Territory" value={planDates.state} options={STATES.map(s=>({value:s.value,label:s.label}))} onChange={v=>setPlanDates(p=>({...p,state:v}))}/>
</div>
<div className="mt-4">
<label className="flex items-center gap-2 cursor-pointer">
<input type="checkbox" checked={!!(planDates.serviceStart||planDates.serviceEnd)} onChange={e=>{if(e.target.checked)setPlanDates(p=>({...p,serviceStart:p.start,serviceEnd:p.end}));else setPlanDates(p=>{const n={...p};delete n.serviceStart;delete n.serviceEnd;return n;});}} style={{accentColor:"#d4a843"}}/>
<span className="text-sm" style={{color:"#334155"}}>Service period differs from plan period <span style={{color:"#94a3b8"}}>(coming in mid-plan)</span></span>
</label>
{(planDates.serviceStart!==undefined||planDates.serviceEnd!==undefined)&&(
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-3">
<DateField label="Service Start Date" value={planDates.serviceStart||""} onChange={v=>setPlanDates(p=>({...p,serviceStart:v}))}/>
<DateField label="Service End Date" value={planDates.serviceEnd||""} onChange={v=>setPlanDates(p=>({...p,serviceEnd:v}))}/>
</div>
)}
</div>
<div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
<div className="rounded-xl p-3" style={{background:"rgba(212,168,67,0.1)",border:"1px solid rgba(212,168,67,0.45)"}}><div className="text-xs flex items-center justify-between" style={{color:"#334155"}}><span>Weeks of Support</span>{weeksOverride!==null&&<button onClick={()=>setWeeksOverride(null)} style={{color:"#d4a843",fontSize:"0.7rem",background:"none",border:"none",cursor:"pointer",padding:0}}>↺ reset</button>}</div><div className="flex items-center gap-2 mt-1"><input type="number" step="0.5" min="0.5" value={planWeeks} onChange={e=>{const v=num(e.target.value);if(v>=0.5)setWeeksOverride(v)}} onFocus={e=>e.target.select()} className="rounded px-2 py-0 outline-none text-lg font-bold w-20" style={{background: "#ffffff",border:"1px solid rgba(212,168,67,0.3)",color:"#d4a843"}}/><span className="text-lg font-bold" style={{color:"#d4a843"}}>wks</span></div>{weeksOverride!==null&&<div className="text-xs mt-1" style={{color:"#64748b"}}>From dates: {planWeeksCalc.toFixed(1)} wks</div>}</div>
<div className="rounded-xl p-3" style={{background:"rgba(212,168,67,0.1)",border:"1px solid rgba(212,168,67,0.45)"}}><div className="text-xs" style={{color:"#334155"}}>Public Holidays</div><div className="text-lg font-bold" style={{color:"#d4a843"}}>{holidays.length} days</div></div>
<div className="rounded-xl p-3" style={{background:"rgba(212,168,67,0.1)",border:"1px solid rgba(212,168,67,0.45)"}}><div className="text-xs" style={{color:"#334155"}}>State</div><div className="text-lg font-bold" style={{color:"#d4a843"}}>{planDates.state}</div></div>
</div>
{planDates.end&&planDates.start&&new Date(planDates.end)<=new Date(planDates.start)&&(<div className="mt-3 rounded-lg px-4 py-2 text-sm" style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",color:"#f87171"}}>⚠ Plan end date must be after the start date</div>)}
<div className="mt-4">
<div className="text-xs font-semibold mb-2" style={{color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em"}}>Optional — Auto-fill from plan PDF</div>
<textarea value={planNotes} onChange={e=>setPlanNotes(e.target.value)} rows={2} maxLength={2000}
placeholder="Optional: describe the supports you plan to deliver and the roster fills itself — e.g. 6 hrs community access each weekday 9am–3pm, 4 hrs across the weekend, sleepover every night"
className="kv-input w-full rounded-lg px-3 py-2 text-sm mb-2" style={{resize:"vertical"}}/>
<div className="flex items-center gap-3 flex-wrap">
<input ref={planFileRef} type="file" accept=".pdf,application/pdf" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)handlePlanUpload(f);e.target.value="";}}/>
<button onClick={()=>planFileRef.current?.click()} disabled={uploadingPlan} className="kv-btn" style={{background:"rgba(212,168,67,0.12)",border:"1px solid rgba(212,168,67,0.35)",color:"#b8901a",padding:"10px 18px",borderRadius:"8px",cursor:"pointer",fontWeight:"600",fontSize:"0.9rem",opacity:uploadingPlan?0.7:1}}>
{uploadingPlan?"⏳ Reading plan...":"📄 Upload NDIS Plan PDF"}
</button>
<span style={{color:"#64748b",fontSize:"0.82rem"}}>Budgets fill from the PDF — add notes above and the weekly roster fills in too, with a budget check before anything is applied</span>
{planUploadError&&<div className="w-full mt-1"><span style={{color:"#ef4444",fontSize:"0.85rem"}}>{planUploadError}</span></div>}
</div>
</div>
{holidays.length>0&&(<details className="kv-fold mt-4">
<summary className="flex items-center gap-2 text-sm font-semibold py-2" style={{color:"#334155"}}><span style={{color:"#d4a843"}}>▸</span>{holidays.length} public holidays in this plan period <span style={{color:"#94a3b8",fontWeight:"normal"}}>— view list</span></summary>
<div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3 mt-1">{holidays.map((h,i)=>(<div key={i} className="text-sm py-1 px-2 rounded" style={{background:"rgba(15,23,42,0.03)"}}><span className="kv-money" style={{color:"#b8901a"}}>{h.date}</span> <span style={{color:"#94a3b8"}}>({getDayName(h.dayOfWeek).slice(0,3)})</span> <span style={{color:"#334155"}}>{h.name}</span></div>))}</div></details>)}
</div>

{showSil&&<><div className="rounded-2xl p-6 mb-6" id="sec-budget" style={{scrollMarginTop:"70px",background:"linear-gradient(135deg, #241456 0%, #2d1b69 55%, #3d2787 100%)",boxShadow:"0 14px 40px -18px rgba(35,20,86,0.55)",position:"relative",overflow:"hidden"}}>
<div style={{position:"absolute",top:"-100px",right:"-40px",width:"320px",height:"320px",borderRadius:"50%",background:"radial-gradient(circle, rgba(212,168,67,0.16), transparent 65%)"}}/>
<div style={{position:"relative"}}>
<div className="flex items-center justify-between flex-wrap gap-3 mb-5">
<div className="flex items-center gap-3"><span className="kv-num" style={{background:"rgba(255,255,255,0.14)"}}>2</span><h2 className="text-xl font-semibold" style={{color:"#ffffff"}}>Budget Overview</h2></div>
<div className="text-sm font-semibold px-3 py-1 rounded-full" style={{background:"rgba(255,255,255,0.1)",color:totalStatus.color==="#64748b"?"rgba(255,255,255,0.75)":totalStatus.color,border:"1px solid rgba(255,255,255,0.2)"}}>{totalStatus.label}</div>
</div>
<div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-5">
{([["Combined funding",money(totals.totalFunding),"#d4a843"],["Weekly cost",money(totals.weekly),"#ffffff"],["PH adjustment",(totals.totalPH>0?"+":"")+money(totals.totalPH),totals.totalPH>0?"#fca5a5":totals.totalPH<0?"#86efac":"rgba(255,255,255,0.85)"],["Plan cost",money(totals.planCost),"#ffffff"]] as [string,string,string][]).map(([lbl,val,col])=>(
<div key={lbl} className="rounded-xl px-4 py-3" style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)"}}>
<div className="text-xs mb-1" style={{color:"rgba(255,255,255,0.6)"}}>{lbl}</div>
<div className="kv-money text-lg font-bold" style={{color:col}}>{val}</div>
</div>
))}
</div>
<div className="flex items-end justify-between flex-wrap gap-2">
<div>
<div className="text-xs" style={{color:"rgba(255,255,255,0.6)"}}>Remaining</div>
<div className="kv-money text-3xl font-bold" style={{color:totalStatus.color==="#64748b"?"#ffffff":totalStatus.color}}>{money(totals.remaining)}</div>
</div>
{totals.totalClaimed>0&&<div className="text-sm" style={{color:"rgba(255,255,255,0.75)"}}>Actual claimed: <span className="kv-money font-semibold" style={{color:"#86efac"}}>{money(totals.totalClaimed)}</span> <span style={{color:"rgba(255,255,255,0.5)"}}>({money(totals.actualRemaining)} remaining)</span></div>}
</div>
<div className="mt-4"><div className="flex justify-between text-xs mb-1" style={{color:"rgba(255,255,255,0.6)"}}><span>Used: {money(totals.planCost)}</span><span>Budget: {money(totals.totalFunding)}</span></div>
<div style={{background:"rgba(255,255,255,0.14)",borderRadius:"8px",height:"12px",overflow:"hidden"}}><div style={{width:Math.min(100,totals.totalFunding>0?(totals.planCost/totals.totalFunding)*100:0)+"%",height:"100%",borderRadius:"8px",background:totals.planCost>totals.totalFunding?"linear-gradient(90deg,#ef4444,#dc2626)":totals.planCost>totals.totalFunding*0.9?"linear-gradient(90deg,#f59e0b,#d97706)":"linear-gradient(90deg,#22c55e,#16a34a)",transition:"width 0.3s"}}/></div>
<div className="text-xs mt-1 text-right" style={{color:"rgba(255,255,255,0.6)"}}>{totals.totalFunding>0?((totals.planCost/totals.totalFunding)*100).toFixed(1):0}% used</div></div>
<div className="mt-5 flex flex-wrap gap-2 items-stretch">
<button onClick={addLine} className="kv-btn rounded-xl px-4 py-2 font-bold" style={{background:"#d4a843",border:"none",color:"#241456",cursor:"pointer"}}>+ Add support line</button>
<button onClick={exportCSV} className="kv-btn rounded-xl px-4 py-2" style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.22)",color:"rgba(255,255,255,0.9)",cursor:"pointer"}}>Export CSV</button>
<button onClick={exportPDF} className="kv-btn rounded-xl px-4 py-2" style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.22)",color:"rgba(255,255,255,0.9)",cursor:"pointer"}}>Export PDF</button>
<input ref={claimsFileRef} type="file" accept=".csv,text/csv" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)handleClaimsCsv(f);e.target.value="";}}/>
<button onClick={()=>claimsFileRef.current?.click()} className="kv-btn rounded-xl px-4 py-2" style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.22)",color:"rgba(255,255,255,0.9)",cursor:"pointer"}}>Import Claims CSV</button>
{claimsImportError&&<div className="w-full text-sm" style={{color:"#fda4af"}}>{claimsImportError}</div>}
<button onClick={()=>setShowSAModal(true)} className="kv-btn" style={{padding:"10px 14px",background:"#fdf6e3",border:"none",borderRadius:"12px",cursor:"pointer",textAlign:"left"}}>
  <span style={{display:"block",color:"#b8901a",fontWeight:700,fontSize:"0.9rem"}}>📋 Roster / SIL / Core SoS</span>
  <span style={{display:"block",color:"#475569",fontSize:"0.74rem",marginTop:"2px"}}>Hourly roster — day, night, weekend rates</span>
</button>
<button onClick={()=>setShowClinicalModal(true)} className="kv-btn" style={{padding:"10px 14px",background:"#eff6ff",border:"none",borderRadius:"12px",cursor:"pointer",textAlign:"left"}}>
  <span style={{display:"block",color:"#1e40af",fontWeight:700,fontSize:"0.9rem"}}>🏥 Clinical / Therapy SoS</span>
  <span style={{display:"block",color:"#475569",fontSize:"0.74rem",marginTop:"2px"}}>Behaviour support, allied health, therapy packages</span>
</button>
</div>
</div></div>

{pace&&pace.status!=="not_started"&&(()=>{
  const paceColors:{[k:string]:{color:string;bg:string;border:string;label:string}}={
    on_pace:{color:"#22c55e",bg:"rgba(34,197,94,0.1)",border:"rgba(34,197,94,0.3)",label:"On Pace"},
    over_pace:{color:"#ef4444",bg:"rgba(239,68,68,0.1)",border:"rgba(239,68,68,0.3)",label:"Spending Ahead of Pace"},
    under_pace:{color:"#f59e0b",bg:"rgba(245,158,11,0.1)",border:"rgba(245,158,11,0.3)",label:"Spending Behind Pace"},
    ended:{color:"#475569",bg:"rgba(100,116,139,0.1)",border:"rgba(100,116,139,0.3)",label:"Plan Ended"},
  };
  const pc=paceColors[pace.status];
  return(
    <div className="rounded-2xl p-6 mb-6" style={{background: "#ffffff",border:"1px solid "+pc.border,boxShadow:"0 1px 3px rgba(15,23,42,0.05), 0 1px 2px rgba(15,23,42,0.04)"}}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-semibold" style={{color:"#2d1b69"}}>Plan Progress</h2>
        <span className="text-sm font-semibold px-3 py-1 rounded-full" style={{background:pc.bg,color:pc.color,border:"1px solid "+pc.border}}>{pc.label}</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-5">
        <div className="kv-sub rounded-xl p-3">
          <div className="text-xs mb-1" style={{color:"#334155"}}>Time elapsed</div>
          <div className="text-lg font-bold" style={{color:"#d4a843"}}>{pace.pctElapsed.toFixed(1)}%</div>
          <div className="text-xs" style={{color:"#64748b"}}>{pace.weeksElapsed.toFixed(1)} of {planWeeks.toFixed(1)} weeks</div>
        </div>
        <div className="kv-sub rounded-xl p-3">
          <div className="text-xs mb-1" style={{color:"#334155"}}>Expected spend by now</div>
          <div className="text-lg font-bold" style={{color: "#0f172a"}}>{money(pace.expectedSpend)}</div>
          <div className="text-xs" style={{color:"#64748b"}}>based on time elapsed</div>
        </div>
        <div className="kv-sub rounded-xl p-3">
          <div className="text-xs mb-1" style={{color:"#334155"}}>{pace.usingClaims?"Actual claimed to date":"Projected spend to date"}</div>
          <div className="text-lg font-bold" style={{color:pc.color}}>{money(pace.projectedSpendToDate)}</div>
          <div className="text-xs" style={{color:"#64748b"}}>
            {pace.usingClaims?"from logged claims — ":""}{pace.variance>0?"+":""}{money(pace.variance)} vs expected
          </div>
        </div>
      </div>
      <div className="mb-1 text-xs" style={{color:"#334155"}}>Time through plan</div>
      <div style={{background:"rgba(15,23,42,0.08)",borderRadius:"6px",height:"10px",overflow:"hidden",marginBottom:"8px"}}>
        <div style={{width:pace.pctElapsed+"%",height:"100%",borderRadius:"6px",background:"linear-gradient(90deg,#d4a843,#f0c060)",transition:"width 0.3s"}}/>
      </div>
      <div className="mb-1 text-xs" style={{color:"#334155"}}>Budget consumed at this pace</div>
      <div style={{background:"rgba(15,23,42,0.08)",borderRadius:"6px",height:"10px",overflow:"hidden"}}>
        <div style={{width:Math.min(100,totals.totalFunding>0?(pace.projectedSpendToDate/totals.totalFunding)*100:0)+"%",height:"100%",borderRadius:"6px",background:"linear-gradient(90deg,"+pc.color+","+pc.color+"99)",transition:"width 0.3s"}}/>
      </div>
      {pace.status==="over_pace"&&<div className="mt-3 text-sm" style={{color:"#ef4444"}}>{pace.usingClaims?"Claims are running ahead of expected spend for this point in the plan. At this rate the budget will run out before the plan ends.":"Your roster is costing more than expected for this point in the plan. At this rate the budget will run out before the plan ends."}</div>}
      {pace.status==="under_pace"&&<div className="mt-3 text-sm" style={{color:"#f59e0b"}}>{pace.usingClaims?"Claims are tracking below pace. This may indicate supports aren't being fully delivered — check if hours are being utilised.":"Spend is tracking below pace. This may indicate supports aren't being fully delivered — check if hours are being utilised."}</div>}
    </div>
  );
})()}

<details className="kv-fold kv-card mb-6">
<summary className="p-5 flex flex-wrap items-center justify-between gap-3">
  <div className="flex items-center gap-3 flex-wrap">
    <h2 className="text-base font-semibold" style={{color:"#2d1b69"}}>Default hourly rates</h2>
    <span className="text-xs" style={{color:"#94a3b8"}}>2026–27 preset — each support line also has its own editable rates</span>
  </div>
  <span className="text-xs font-semibold" style={{color:"#d4a843"}}>Show ▾</span>
</summary>
<div className="px-5 pb-5">
<div className="flex flex-wrap items-center justify-between gap-3 mb-4">
  <div className="text-xs" style={{color:"#64748b"}}>
    <a href="https://www.ndis.gov.au/providers/pricing-arrangements" target="_blank" rel="noopener noreferrer" style={{color:"#475569",textDecoration:"underline"}}>NDIS Pricing Schedule 2026–27</a>
  </div>
  <button onClick={()=>setRates(NDIS_RATES_2026_27)} className="kv-btn" style={{background:"rgba(212,168,67,0.1)",border:"1px solid rgba(212,168,67,0.3)",color:"#b8901a",padding:"8px 16px",borderRadius:"8px",cursor:"pointer",fontSize:"0.85rem",fontWeight:"600"}}>
    Reset to 2026–27 NDIS rates
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
</div>
</div>
</details>
<div id="sec-lines" className="flex items-center gap-3 mb-4 mt-2" style={{scrollMarginTop:"70px"}}><span className="kv-num">3</span><h2 className="text-xl font-semibold" style={{color:"#2d1b69"}}>Support Lines &amp; Weekly Roster</h2></div>
<div className="grid gap-6">
{perLine.map((l:any)=>{
const status=getBudgetStatus(l.remaining,l.totalFunding);
const suggestions=getSuggestions(l,l.lineRates||rates);
const belowGuide=isBelowGuide(l.lineRates||rates,l.code);
const lineMode=getLineMode(l.code);
const rosterDays=lineMode==="weekday"?["mon","tue","wed","thu","fri"]:DAYS;
const includedCount=holidays.length-l.excludedHolidays.length;
return(
<div key={l.id} className="rounded-2xl p-6" style={{background: "#ffffff",border:"1px solid "+status.border,boxShadow:"0 1px 2px rgba(23,16,61,0.04), 0 10px 28px -14px rgba(23,16,61,0.12)"}}>
<div className="flex flex-wrap items-center justify-between gap-2 mb-4">
<div className="flex items-center gap-3">
<div className="flex items-center gap-2 flex-wrap"><span className="kv-money text-xs font-bold px-2 py-1 rounded-md" style={{background:"rgba(45,27,105,0.07)",color:"#2d1b69",border:"1px solid rgba(45,27,105,0.14)"}}>{l.code}</span><span className="text-lg font-semibold" style={{color:"#1e293b"}}>{l.description}</span></div>
<span className="text-xs font-semibold px-2 py-1 rounded-full" style={{background:status.bg,color:status.color,border:"1px solid "+status.border}}>{status.label}</span>
</div>
<button onClick={()=>deleteLine(l.id)} disabled={lines.length<=1} className="rounded-xl px-3 py-2 disabled:opacity-40" style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",color:"#ef4444"}}>Delete</button>
</div>

<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
<div className="kv-sub rounded-xl p-4">
<div className="text-sm mb-3 font-semibold" style={{color:"#d4a843"}}>Line details</div>
<div className="grid grid-cols-1 gap-3">
<div><div className="text-xs mb-1" style={{color:"#334155"}}>Category</div><select value={l.code} onChange={e=>updateLineCode(l.id,e.target.value)} className="kv-input w-full rounded-lg px-2 py-1.5 text-sm">{Object.entries(CATEGORY_PRESETS).map(([k,v])=>(<option key={k} value={k}>{k} — {v.name}</option>))}</select></div>
<TextField label="Description" value={l.description} onChange={v=>updateLine(l.id,{description:v})}/>
<Field label="Total funding (AUD)" value={l.totalFunding} onChange={v=>updateLine(l.id,{totalFunding:v})} step={100}/>
<SelectField label="Support Ratio" value={l.ratio} options={Object.entries(RATIOS).map(([k,v])=>({value:k,label:v.label}))} onChange={v=>updateLine(l.id,{ratio:v})}/>
</div></div>

{lineMode==="lump"?(
<div className="kv-sub rounded-xl p-4 lg:col-span-2" style={{display:"flex",flexDirection:"column",justifyContent:"center"}}>
<div className="text-sm font-semibold mb-2" style={{color:"#d4a843"}}>{CATEGORY_PRESETS[l.code]?.name||"Support Category"}</div>
{l.code==="17"?(<div className="text-sm mb-4 rounded-lg px-3 py-2" style={{color:"#c0a060",background:"rgba(212,168,67,0.07)",border:"1px solid rgba(212,168,67,0.45)"}}>⚠️ SDA is a fixed annual housing payment set in the participant's plan — not an hourly rate. Enter the total SDA funding amount below and track it as a lump sum.</div>):(<div className="text-sm mb-4" style={{color:"#475569"}}>This category covers lump sum items (equipment, modifications, transport, consumables). No roster needed — just set the total funding.</div>)}
<div className="text-sm" style={{color:"#334155"}}>Budget: <span className="font-semibold" style={{color:"#d4a843"}}>{money(l.totalFunding)}</span></div>
<div className="text-lg font-bold mt-2" style={{color:status.color}}>Remaining: {money(l.remaining)}</div>
</div>
):(
<div className="kv-sub rounded-xl p-4 lg:col-span-2">
<div className="text-sm mb-3 font-semibold" style={{color:"#d4a843"}}>Weekly Roster{lineMode==="weekday"&&<span style={{color:"#64748b",fontWeight:"normal",fontSize:"0.8rem",marginLeft:"8px"}}>Weekdays only</span>}</div>
<div className="grid gap-2">
{rosterDays.map(d=>{const r=l.roster[d];return(
<div key={d} className="flex flex-wrap items-center gap-2 py-1" style={{borderBottom:"1px solid rgba(15,23,42,0.03)"}}>
<button type="button" onClick={()=>updateRosterDay(l.id,d,{enabled:!r.enabled})} role="checkbox" aria-checked={r.enabled} aria-label={"Include "+DL[d]+" in roster"} style={{width:"22px",height:"22px",borderRadius:"4px",flexShrink:0,padding:0,background:r.enabled?"#22c55e":"rgba(239,68,68,0.2)",border:"1px solid "+(r.enabled?"#22c55e":"rgba(239,68,68,0.4)"),display:"flex",alignItems:"center",justifyContent:"center",color: "#0f172a",fontSize:"12px",cursor:"pointer"}}>{r.enabled?"✓":""}</button>
<div style={{width:"80px",color:r.enabled?"#d4a843":"#64748b",fontWeight:"600",fontSize:"0.85rem"}}>{DL[d]}</div>
<div className="flex items-center gap-1"><span className="text-xs" style={{color:"#475569"}}>Hrs:</span><SmallField value={r.hours} onChange={v=>updateRosterDay(l.id,d,{hours:v})} disabled={!r.enabled}/></div>
{lineMode==="full"&&<div className="flex items-center gap-1"><span className="text-xs" style={{color:"#475569"}}>Night:</span><SmallField value={r.nightHours} onChange={v=>updateRosterDay(l.id,d,{nightHours:v})} disabled={!r.enabled}/></div>}
<SmallSelect value={r.frequency} options={Object.entries(FREQ).map(([k,v])=>({value:k,label:v.label}))} onChange={v=>updateRosterDay(l.id,d,{frequency:v})} disabled={!r.enabled}/>
</div>)})}
</div>
<div className="mt-3 grid grid-cols-1 gap-2">
{lineMode==="full"&&<div className="flex items-center gap-2 flex-wrap"><span className="text-xs" style={{color:"#475569"}}>Active sleepover hrs/wk:</span><SmallField value={l.activeSleepoverHours} onChange={v=>updateLine(l.id,{activeSleepoverHours:v})}/><SmallSelect value={l.activeSleepoverFreq} options={Object.entries(FREQ).map(([k,v])=>({value:k,label:v.label}))} onChange={v=>updateLine(l.id,{activeSleepoverFreq:v})}/></div>}
{lineMode==="full"&&<div className="flex items-center gap-2 flex-wrap"><span className="text-xs" style={{color:"#475569"}}>Fixed sleepovers/wk:</span><SmallField value={l.fixedSleepovers} step={1} onChange={v=>updateLine(l.id,{fixedSleepovers:v})}/><SmallSelect value={l.fixedSleepoverFreq} options={Object.entries(FREQ).map(([k,v])=>({value:k,label:v.label}))} onChange={v=>updateLine(l.id,{fixedSleepoverFreq:v})}/></div>}
<div className="flex items-center gap-2 flex-wrap"><span className="text-xs" style={{color:"#475569"}}>KMs per week:</span><SmallField value={l.kmsPerWeek} step={1} onChange={v=>updateLine(l.id,{kmsPerWeek:v})}/><span className="text-xs" style={{color:"#475569"}}>@ $</span><SmallField value={l.kmRate} step={0.01} onChange={v=>updateLine(l.id,{kmRate:v})}/><span className="text-xs" style={{color:"#475569"}}>/km</span><SmallSelect value={l.kmFreq} options={Object.entries(FREQ).map(([k,v])=>({value:k,label:v.label}))} onChange={v=>updateLine(l.id,{kmFreq:v})}/></div>
</div>
<div className="mt-4 text-sm" style={{color:"#334155"}}>
<div>Weekly total: <span className="font-semibold" style={{color: "#0f172a"}}>{money(l.weeklyWithGST)}</span></div>
{lineMode==="full"&&<div>KM cost/wk: <span className="font-semibold" style={{color: "#0f172a"}}>{money(l.kmsPerWeek*l.kmRate*(FREQ[l.kmFreq]?.multiplier||1))}</span></div>}
<div>Base plan cost: <span className="font-semibold" style={{color: "#0f172a"}}>{money(l.basePlanCost)}</span></div>
{lineMode==="full"&&<div>PH adjustment: <span className="font-semibold" style={{color:l.phAdjustment>0?"#ef4444":l.phAdjustment<0?"#22c55e":"#334155"}}>{l.phAdjustment>0?"+":""}{money(l.phAdjustment)}</span></div>}
<div className="mt-1">Plan total: <span className="font-semibold" style={{color: "#0f172a"}}>{money(l.planTotal)}</span></div>
<div>Ratio: <span className="font-semibold" style={{color:"#d4a843"}}>{RATIOS[l.ratio]?.label||l.ratio}</span></div>
<div className="text-lg font-bold mt-2" style={{color:status.color}}>Remaining: {money(l.remaining)}</div>
</div></div>
)}
</div>

{lineMode!=="lump"&&<div className="mt-4 rounded-xl overflow-hidden" style={{border:"1px solid "+(belowGuide?"rgba(245,158,11,0.4)":"rgba(212,168,67,0.15)")}}>
<button onClick={()=>toggleRates(l.id)} className="w-full flex items-center justify-between px-4 py-3" style={{background:belowGuide?"rgba(245,158,11,0.06)":"rgba(212,168,67,0.04)",cursor:"pointer",border:"none",color: "#0f172a",textAlign:"left"}}>
  <span className="text-sm font-semibold" style={{color:belowGuide?"#f59e0b":"#d4a843"}}>
    Hourly Rates{belowGuide&&<span style={{marginLeft:"8px",fontSize:"0.78rem"}}>⚠ Some rates below price guide</span>}
    <span style={{color:"#64748b",fontWeight:"normal",marginLeft:"8px",fontSize:"0.8rem"}}>Weekday: {money(l.lineRates?.weekdayOrd||0)}/hr{(l.lineRates?.sat||0)>0?" · Sat: "+money(l.lineRates.sat)+"/hr":""}</span>
  </span>
  <span style={{color:"#d4a843",fontSize:"0.8rem"}}>{openRatesLines.has(l.id)?"▲":"▼"}</span>
</button>
{openRatesLines.has(l.id)&&(
<div className="p-4" style={{background: "#ffffff"}}>
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-3">
    {([
      {key:"weekdayOrd",label:"Weekday (Ord) $/hr"},
      {key:"weekdayNight",label:"Weekday (Night) $/hr"},
      {key:"sat",label:"Saturday $/hr"},
      {key:"sun",label:"Sunday $/hr"},
      {key:"publicHoliday",label:"Public Holiday $/hr"},
      {key:"activeSleepoverHourly",label:"Active Sleepover $/hr"},
      {key:"fixedSleepoverUnit",label:"Fixed Sleepover $ (flat)"},
    ] as {key:keyof Rates;label:string}[]).map(({key,label})=>{
      const guideVal=(CATEGORY_PRESETS[l.code]?.rates as any)?.[key]||0;
      const curVal=(l.lineRates as any)?.[key]||0;
      const warn=guideVal>0&&curVal<guideVal;
      return(
        <label key={key} className="block">
          <div className="text-xs mb-1 flex items-center gap-2" style={{color:warn?"#f59e0b":"#334155"}}>
            {label}
            {guideVal>0&&<span style={{color:warn?"#f59e0b":"#64748b",fontSize:"0.75rem"}}>guide: ${guideVal}</span>}
            {warn&&<span style={{color:"#f59e0b",fontSize:"0.75rem"}}>⚠ below</span>}
          </div>
          <input type="number" step={0.01} value={Number.isFinite(curVal)?curVal:0}
            onChange={e=>updateLine(l.id,{lineRates:{...l.lineRates,[key]:num(e.target.value)}})}
            onFocus={e=>e.target.select()}
            className="w-full rounded-lg px-3 py-2 outline-none"
            style={{background: "#ffffff",border:"1px solid "+(warn?"rgba(245,158,11,0.4)":"rgba(212,168,67,0.2)"),color:warn?"#f59e0b":"#0f172a"}}
          />
        </label>
      );
    })}
  </div>
  <button onClick={()=>updateLine(l.id,{lineRates:getPresetRates(l.code)})} style={{padding:"6px 14px",background:"rgba(212,168,67,0.1)",border:"1px solid rgba(212,168,67,0.3)",color:"#d4a843",borderRadius:"6px",cursor:"pointer",fontSize:"0.82rem",fontWeight:"600"}}>
    Reset to {CATEGORY_PRESETS[l.code]?.name||"category"} preset
  </button>
</div>
)}
</div>}

{lineMode!=="lump"&&holidays.length>0&&(
<div className="kv-sub mt-4 rounded-xl p-4">
<div className="flex items-center justify-between mb-3">
<div className="text-sm font-semibold" style={{color:"#d4a843"}}>Public Holidays ({includedCount}/{holidays.length} included)</div>
<div className="flex gap-2">
<button onClick={()=>setAllHolidays(l.id,true)} className="text-xs px-3 py-1 rounded-lg" style={{background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.3)",color:"#22c55e",cursor:"pointer"}}>Include All</button>
<button onClick={()=>setAllHolidays(l.id,false)} className="text-xs px-3 py-1 rounded-lg" style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",color:"#ef4444",cursor:"pointer"}}>Exclude All</button>
</div></div>
<div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
{l.phImpact.details.map((d:any,i:number)=>(
<button type="button" key={i} onClick={()=>toggleHoliday(l.id,d.date)} role="checkbox" aria-checked={d.included} aria-label={(d.included?"Exclude ":"Include ")+d.name+" ("+d.date+")"} className="flex items-center gap-2 text-sm py-2 px-3 rounded-lg cursor-pointer w-full" style={{background:d.included?"rgba(34,197,94,0.05)":"rgba(239,68,68,0.05)",border:"1px solid "+(d.included?"rgba(34,197,94,0.15)":"rgba(239,68,68,0.15)"),textAlign:"left"}}>
<div style={{width:"20px",height:"20px",borderRadius:"4px",flexShrink:0,background:d.included?"#22c55e":"rgba(239,68,68,0.2)",border:"1px solid "+(d.included?"#22c55e":"rgba(239,68,68,0.4)"),display:"flex",alignItems:"center",justifyContent:"center",color: "#0f172a",fontSize:"12px"}}>{d.included?"✓":""}</div>
<div style={{flex:1}}><span style={{color:"#334155"}}>{d.date}</span> <span style={{color:"#475569"}}>({d.day})</span> <span style={{color:d.included?"#1e293b":"#64748b"}}>{d.name}</span></div>
<div style={{color:d.included?"#ef4444":"#22c55e",fontWeight:"600",fontSize:"0.85rem"}}>{d.included?"+"+money(d.impact):"-"+money(d.impact)}</div>
</button>))}
</div>
<div className="flex justify-between mt-3 text-sm font-bold">
<span style={{color:"#ef4444"}}>Extra: +{money(l.phImpact.extraCost)}</span>
<span style={{color:"#22c55e"}}>Savings: -{money(l.phImpact.savedCost)}</span>
<span style={{color:l.phAdjustment>0?"#ef4444":"#22c55e"}}>Net: {l.phAdjustment>0?"+":""}{money(l.phAdjustment)}</span>
</div></div>)}

<div className="mt-4 rounded-xl overflow-hidden" style={{border:"1px solid rgba(34,197,94,0.2)"}}>
<button onClick={()=>toggleClaims(l.id)} className="w-full flex items-center justify-between px-4 py-3" style={{background:"rgba(34,197,94,0.05)",cursor:"pointer",border:"none",color: "#0f172a",textAlign:"left"}}>
  <span className="text-sm font-semibold" style={{color:"#22c55e"}}>Claims / Actual Spend ({(l.claims||[]).length}){(l as any).totalClaimed>0&&<span style={{color:"#334155",fontWeight:"normal"}}> — {money((l as any).totalClaimed)} claimed, {money((l as any).actualRemaining)} remaining</span>}</span>
  <span style={{color:"#22c55e",fontSize:"0.8rem"}}>{openClaimsLines.has(l.id)?"▲":"▼"}</span>
</button>
{openClaimsLines.has(l.id)&&(
<div className="p-4" style={{background: "#ffffff"}}>
  {(l.claims||[]).length===0&&<div className="text-sm mb-3" style={{color:"#64748b"}}>No claims logged yet.</div>}
  {(l.claims||[]).length>0&&(
    <div className="mb-3">
      <div className="grid text-xs mb-1 px-2" style={{gridTemplateColumns:"110px 1fr 100px 64px",color:"#475569",gap:"8px"}}>
        <span>Date</span><span>Note</span><span className="text-right">Amount</span><span></span>
      </div>
      {(l.claims||[]).map((c:Claim)=>(
        <div key={c.id} className="grid items-center text-sm py-2 px-2 rounded mb-1" style={{gridTemplateColumns:"110px 1fr 100px 64px",gap:"8px",background:"rgba(34,197,94,0.04)",border:"1px solid rgba(34,197,94,0.1)"}}>
          <span style={{color:"#334155"}}>{c.date}</span>
          <span style={{color:"#1e293b"}}>{c.note||"—"}</span>
          <span className="text-right font-semibold" style={{color:"#22c55e"}}>{money(c.amount)}</span>
          <div className="flex gap-1">
          <button onClick={()=>setAddClaimForm({lineId:l.id,claimId:c.id,date:c.date,amount:String(c.amount),note:c.note||""})} title="Edit claim" style={{background:"rgba(212,168,67,0.1)",border:"1px solid rgba(212,168,67,0.3)",color:"#d4a843",borderRadius:"4px",cursor:"pointer",fontSize:"0.75rem",padding:"2px 6px"}}>✎</button>
          <button onClick={()=>deleteClaim(l.id,c.id)} title="Delete claim" style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",color:"#ef4444",borderRadius:"4px",cursor:"pointer",fontSize:"0.75rem",padding:"2px 6px"}}>✕</button>
          </div>
        </div>
      ))}
      <div className="text-right text-sm font-bold mt-2" style={{color:"#22c55e"}}>Total claimed: {money((l as any).totalClaimed)}</div>
    </div>
  )}
  {addClaimForm?.lineId===l.id?(
    <div className="rounded-xl p-3 mt-2" style={{background:"rgba(34,197,94,0.05)",border:"1px solid rgba(34,197,94,0.2)"}}>
      <div className="grid gap-2 sm:grid-cols-3 mb-2">
        <div><div className="text-xs mb-1" style={{color:"#334155"}}>Date</div><input type="date" value={addClaimForm!.date} onChange={e=>setAddClaimForm(f=>f?{...f,date:e.target.value}:f)} className="w-full rounded-lg px-2 py-1 outline-none text-sm" style={{background: "#ffffff",border:"1px solid rgba(34,197,94,0.2)",color: "#0f172a"}}/></div>
        <div><div className="text-xs mb-1" style={{color:"#334155"}}>Amount ($)</div><input type="number" step="0.01" value={addClaimForm!.amount} onChange={e=>setAddClaimForm(f=>f?{...f,amount:e.target.value}:f)} onFocus={e=>e.target.select()} placeholder="0.00" className="w-full rounded-lg px-2 py-1 outline-none text-sm" style={{background: "#ffffff",border:"1px solid rgba(34,197,94,0.2)",color: "#0f172a"}}/></div>
        <div><div className="text-xs mb-1" style={{color:"#334155"}}>Note (optional)</div><input value={addClaimForm!.note} onChange={e=>setAddClaimForm(f=>f?{...f,note:e.target.value}:f)} placeholder="e.g. Invoice #1234" className="w-full rounded-lg px-2 py-1 outline-none text-sm" style={{background: "#ffffff",border:"1px solid rgba(34,197,94,0.2)",color: "#0f172a"}}/></div>
      </div>
      <div className="flex gap-2">
        <button onClick={()=>{const f=addClaimForm!;const a=parseFloat(f.amount);if(!a||a<=0)return;if(f.claimId)updateClaim(l.id,f.claimId,{date:f.date,amount:a,note:f.note});else addClaim(l.id,f.date,a,f.note);setAddClaimForm(null)}} style={{padding:"6px 16px",background:"rgba(34,197,94,0.2)",border:"1px solid rgba(34,197,94,0.4)",color:"#22c55e",borderRadius:"6px",cursor:"pointer",fontSize:"0.85rem",fontWeight:"600"}}>{addClaimForm?.claimId?"Update claim":"Save"}</button>
        <button onClick={()=>setAddClaimForm(null)} style={{padding:"6px 16px",background:"rgba(15,23,42,0.05)",border:"1px solid rgba(15,23,42,0.1)",color:"#334155",borderRadius:"6px",cursor:"pointer",fontSize:"0.85rem"}}>Cancel</button>
      </div>
    </div>
  ):(
    <button onClick={()=>setAddClaimForm({lineId:l.id,date:new Date().toISOString().slice(0,10),amount:"",note:""})} style={{marginTop:"4px",padding:"6px 16px",background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.3)",color:"#22c55e",borderRadius:"6px",cursor:"pointer",fontSize:"0.85rem",fontWeight:"600"}}>+ Log claim</button>
  )}
</div>
)}
</div>

{suggestions.length>0&&(
<div className="mt-4 rounded-xl p-4" style={{background:"rgba(245,158,11,0.05)",border:"1px solid rgba(245,158,11,0.2)"}}>
<div className="text-sm font-semibold mb-2" style={{color:"#f59e0b"}}>Suggestions to get back on track:</div>
{suggestions.map((s,i)=>(<div key={i} className="text-sm py-1" style={{color:"#334155"}}>- {s}</div>))}
</div>)}
</div>)})}
</div>

{planExtract&&(
<div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.82)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}}>
<div style={{background:"#f8fafc",border:"1px solid rgba(212,168,67,0.4)",borderRadius:"16px",padding:"32px",maxWidth:"560px",width:"90%",maxHeight:"80vh",overflowY:"auto"}}>
<h3 style={{fontSize:"1.3rem",fontWeight:"700",color:"#d4a843",marginBottom:"16px"}}>Plan extracted — confirm to apply</h3>
{planExtract.planStart&&<div style={{color:"#334155",marginBottom:"6px",fontSize:"0.9rem"}}>Plan period: <span style={{color: "#0f172a",fontWeight:"600"}}>{planExtract.planStart} → {planExtract.planEnd||"?"}</span></div>}
{planExtract.state&&<div style={{color:"#334155",marginBottom:"6px",fontSize:"0.9rem"}}>State: <span style={{color: "#0f172a",fontWeight:"600"}}>{planExtract.state}</span></div>}
{planExtract.participantName&&<div style={{color:"#334155",marginBottom:"6px",fontSize:"0.9rem"}}>Participant: <span style={{color: "#0f172a",fontWeight:"600"}}>{planExtract.participantName}</span></div>}
{Array.isArray(planExtract.supportLines)&&planExtract.supportLines.length>0&&(
<div style={{marginTop:"16px"}}>
<div style={{color:"#b8901a",fontWeight:"600",marginBottom:"8px",fontSize:"0.95rem"}}>Support line funding:</div>
{planExtract.supportLines.map((sl:any,i:number)=>(
<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",marginBottom:"6px",background:"rgba(212,168,67,0.05)",border:"1px solid rgba(212,168,67,0.35)",borderRadius:"8px"}}>
<div><span className="kv-money" style={{color:"#b8901a",fontWeight:"600",marginRight:"8px"}}>{sl.code}</span><span style={{color:"#1e293b",fontSize:"0.9rem"}}>{sl.description}</span></div>
<div className="flex items-center gap-2" style={{flexShrink:0,marginLeft:"12px"}}>
<span className="kv-money" style={{color: "#0f172a",fontWeight:"700"}}>{money(sl.totalFunding)}</span>
<button onClick={()=>setPlanExtract((p:any)=>({...p,supportLines:p.supportLines.filter((_:any,j:number)=>j!==i)}))} title="Remove this line" style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)",color:"#ef4444",borderRadius:"4px",cursor:"pointer",fontSize:"0.72rem",padding:"2px 6px"}}>✕</button>
</div>
</div>
))}
{(()=>{
const sum=planExtract.supportLines.reduce((s:number,x:any)=>s+(x.totalFunding||0),0);
const pt=typeof planExtract.planTotal==="number"?planExtract.planTotal:null;
return(<>
<div className="kv-money" style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",fontWeight:700,color:"#0f172a",borderTop:"1px solid rgba(15,23,42,0.1)"}}><span>Total extracted</span><span>{money(sum)}</span></div>
{pt!==null&&pt>0&&Math.abs(sum-pt)>1&&(
<div style={{marginTop:"6px",padding:"10px 12px",background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:"8px",fontSize:"0.85rem",color:"#dc2626"}}>
⚠ The plan states total funding of <strong>{money(pt)}</strong>, but these lines add up to <strong>{money(sum)}</strong>. A flexible budget may have been read into more than one category — remove the duplicate line with ✕ before applying, or cancel and enter funding manually.
</div>
)}
{pt!==null&&pt>0&&Math.abs(sum-pt)<=1&&(
<div style={{marginTop:"6px",fontSize:"0.82rem",color:"#16a34a"}}>✓ Matches the plan&apos;s stated total funding ({money(pt)})</div>
)}
</>);
})()}
</div>
)}
{Array.isArray(planExtract.scheduleOfSupports)&&planExtract.scheduleOfSupports.length>0&&(
<div style={{marginTop:"16px"}}>
<div style={{color:"#d4a843",fontWeight:"600",marginBottom:"8px",fontSize:"0.95rem"}}>Schedule of Supports:</div>
<div style={{overflowX:"auto"}}>
<table style={{width:"100%",borderCollapse:"collapse",fontSize:"0.78rem"}}>
<thead><tr style={{color:"#334155",borderBottom:"1px solid rgba(212,168,67,0.2)"}}>
<th style={{textAlign:"left",padding:"4px 8px",fontWeight:"600"}}>Item #</th>
<th style={{textAlign:"left",padding:"4px 8px",fontWeight:"600"}}>Description</th>
<th style={{textAlign:"right",padding:"4px 8px",fontWeight:"600"}}>Price</th>
<th style={{textAlign:"right",padding:"4px 8px",fontWeight:"600"}}>Hours</th>
<th style={{textAlign:"right",padding:"4px 8px",fontWeight:"600"}}>Total</th>
</tr></thead>
<tbody>{planExtract.scheduleOfSupports.map((item:any,i:number)=>(
<tr key={i} style={{borderBottom:"1px solid rgba(15,23,42,0.04)"}}>
<td style={{padding:"4px 8px",color:"#d4a843",whiteSpace:"nowrap",fontFamily:"monospace"}}>{item.itemNumber}</td>
<td style={{padding:"4px 8px",color:"#1e293b"}}>{item.supportCategory}</td>
<td style={{padding:"4px 8px",color: "#0f172a",textAlign:"right",whiteSpace:"nowrap"}}>{money(item.price)}</td>
<td style={{padding:"4px 8px",color:"#1e293b",textAlign:"right"}}>{item.hoursRequired??"-"}</td>
<td style={{padding:"4px 8px",color: "#0f172a",textAlign:"right",whiteSpace:"nowrap"}}>{item.totalCost?money(item.totalCost):"-"}</td>
</tr>
))}</tbody>
</table>
</div>
</div>
)}
{planExtract.specificRequirements&&(
<div style={{marginTop:"12px",padding:"10px 12px",background:"rgba(212,168,67,0.05)",border:"1px solid rgba(212,168,67,0.45)",borderRadius:"8px",fontSize:"0.85rem"}}>
<div style={{color:"#d4a843",fontWeight:"600",marginBottom:"6px"}}>Specific Requirements:</div>
{([["Behaviours of Concern",planExtract.specificRequirements.behavioursOfConcern],["Regulated Restrictive Practice",planExtract.specificRequirements.regulatedRestrictivePractice],["Medication Management",planExtract.specificRequirements.medicationManagement]] as [string,boolean|null][]).filter(([,v])=>v!==null&&v!==undefined).map(([label,val],i)=>(
<div key={i} style={{color:"#1e293b"}}>{label}: <span style={{color:val?"#ef4444":"#22c55e",fontWeight:"600"}}>{val?"Yes":"No"}</span></div>
))}
{planExtract.establishmentFee?<div style={{color:"#1e293b",marginTop:"4px"}}>Establishment Fee: <span style={{color: "#0f172a",fontWeight:"600"}}>{money(planExtract.establishmentFee)}</span></div>:null}
</div>
)}
{(()=>{
const sim=simulateExtractOutcome(planExtract);
if(!sim)return null;
return(
<div style={{marginTop:"16px"}}>
<div style={{color:"#b8901a",fontWeight:"600",marginBottom:"8px",fontSize:"0.95rem"}}>Proposed roster &amp; budget check:</div>
{sim.rows.map((r,i)=>{
const over=r.remaining<0;
const pct=r.cost>0?Math.max(0,Math.round((1-r.budget/r.cost)*100)):0;
return(
<div key={i} style={{padding:"10px 12px",marginBottom:"6px",background:over?"rgba(239,68,68,0.05)":"rgba(34,197,94,0.05)",border:"1px solid "+(over?"rgba(239,68,68,0.25)":"rgba(34,197,94,0.2)"),borderRadius:"8px"}}>
<div className="flex items-center justify-between gap-2 flex-wrap">
<div><span className="kv-money" style={{color:"#b8901a",fontWeight:600,marginRight:"8px"}}>{r.code}</span><span style={{color:"#1e293b",fontSize:"0.9rem",fontWeight:600}}>{r.description}</span></div>
<span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{background:over?"rgba(239,68,68,0.1)":"rgba(34,197,94,0.1)",color:over?"#dc2626":"#16a34a",border:"1px solid "+(over?"rgba(239,68,68,0.3)":"rgba(34,197,94,0.3)")}}>{over?"OVER BUDGET":"FITS BUDGET"}</span>
</div>
<div style={{fontSize:"0.78rem",color:"#64748b",marginTop:"4px"}}>{r.summary}</div>
<div className="kv-money" style={{fontSize:"0.85rem",color:"#334155",marginTop:"4px"}}>Costs <strong>{money(r.cost)}</strong> over the plan vs <strong>{money(r.budget)}</strong> funded — <span style={{color:over?"#dc2626":"#16a34a",fontWeight:700}}>{over?money(-r.remaining)+" over":money(r.remaining)+" spare"}</span></div>
{over&&<div style={{fontSize:"0.8rem",color:"#b45309",marginTop:"4px"}}>To fit, hours would need to come down by about {pct}% — trim weekend or evening hours first (they cost the most), or agree a lower rate.</div>}
</div>
);
})}
<div className="kv-money" style={{display:"flex",justifyContent:"space-between",padding:"6px 12px",fontWeight:700,color:sim.totalCost>sim.totalBudget?"#dc2626":"#16a34a"}}><span>Roster total vs budgets checked</span><span>{money(sim.totalCost)} / {money(sim.totalBudget)}</span></div>
<div style={{fontSize:"0.75rem",color:"#94a3b8",padding:"0 12px"}}>Estimated with 2026–27 preset rates, this plan&apos;s dates, state public holidays and km allowances. Fine-tune in the calculator after applying.</div>
</div>
);
})()}
{(()=>{
const stale=staleLinesForExtract(planExtract,lines);
if(stale.length===0)return null;
return(
<div style={{marginTop:"16px",padding:"12px",background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:"8px"}}>
<div style={{color:"#b45309",fontWeight:"600",fontSize:"0.9rem",marginBottom:"8px"}}>Existing lines not found in this plan</div>
{stale.map(l=>{
const hasData=lineHasData(l);
const checked=removeOnApply.has(l.id);
return(
<label key={l.id} className="flex items-center gap-2 py-1 cursor-pointer" style={{fontSize:"0.85rem"}}>
<input type="checkbox" checked={checked} onChange={()=>setRemoveOnApply(prev=>{const n=new Set(prev);n.has(l.id)?n.delete(l.id):n.add(l.id);return n;})} style={{accentColor:"#d4a843",width:"15px",height:"15px",flexShrink:0}}/>
<span className="kv-money" style={{color:"#b8901a",fontWeight:600}}>{l.code}</span>
<span style={{color:"#1e293b",flex:1}}>{l.description}</span>
<span className="kv-money" style={{color:"#475569",fontWeight:600}}>{money(l.totalFunding)}</span>
{hasData&&<span style={{color:"#b45309",fontSize:"0.72rem"}}>has roster/claims</span>}
</label>
);
})}
<div style={{color:"#92400e",fontSize:"0.78rem",marginTop:"6px"}}>Ticked lines will be <strong>removed</strong> when you apply — untick anything you want to keep. Lines with roster or claims data are kept by default.</div>
</div>
);
})()}
<p style={{color:"#64748b",fontSize:"0.82rem",marginTop:"16px"}}>Matched lines keep their roster and claims — only funding amounts, descriptions and rates are updated.</p>
<div style={{display:"flex",gap:"12px",marginTop:"20px"}}>
<button onClick={applyPlanExtract} style={{flex:1,padding:"12px",backgroundColor:"#d4a843",color:"#f8fafc",border:"none",borderRadius:"8px",cursor:"pointer",fontWeight:"700",fontSize:"1rem"}}>Apply to Calculator</button>
<button onClick={()=>setPlanExtract(null)} style={{flex:1,padding:"12px",background:"rgba(15,23,42,0.05)",border:"1px solid rgba(15,23,42,0.1)",color:"#334155",borderRadius:"8px",cursor:"pointer"}}>Cancel</button>
</div>
</div>
</div>
)}
{claimsImport&&(
<div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.82)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:"16px"}}>
<div style={{background:"#f8fafc",border:"1px solid rgba(34,197,94,0.4)",borderRadius:"16px",padding:"32px",maxWidth:"640px",width:"100%",maxHeight:"85vh",overflowY:"auto"}}>
<h3 style={{fontSize:"1.3rem",fontWeight:"700",color:"#16a34a",marginBottom:"6px"}}>Import claims — review before applying</h3>
<div style={{color:"#64748b",fontSize:"0.85rem",marginBottom:"16px"}}>{claimsImport.fileName}</div>
{claimsImport.rows.length>0?(
<>
<div style={{overflowX:"auto"}}>
<table style={{width:"100%",borderCollapse:"collapse",fontSize:"0.82rem",minWidth:"480px"}}>
<thead><tr style={{color:"#334155",borderBottom:"1px solid rgba(34,197,94,0.25)"}}>
<th style={{textAlign:"left",padding:"4px 8px",fontWeight:"600"}}>Date</th>
<th style={{textAlign:"left",padding:"4px 8px",fontWeight:"600"}}>Support line</th>
<th style={{textAlign:"left",padding:"4px 8px",fontWeight:"600"}}>Note</th>
<th style={{textAlign:"right",padding:"4px 8px",fontWeight:"600"}}>Amount</th>
</tr></thead>
<tbody>{claimsImport.rows.map((r,i)=>(
<tr key={i} style={{borderBottom:"1px solid rgba(15,23,42,0.04)"}}>
<td style={{padding:"4px 8px",color:"#334155",whiteSpace:"nowrap"}}>{r.date}</td>
<td style={{padding:"4px 8px",color:"#1e293b"}}>{r.lineLabel}</td>
<td style={{padding:"4px 8px",color:"#64748b"}}>{r.note||"—"}</td>
<td style={{padding:"4px 8px",color:"#16a34a",textAlign:"right",whiteSpace:"nowrap",fontWeight:600}}>{money(r.amount)}</td>
</tr>
))}</tbody>
</table>
</div>
<div style={{textAlign:"right",fontWeight:700,color:"#16a34a",marginTop:"10px"}}>Total: {money(claimsImport.rows.reduce((s,r)=>s+r.amount,0))} across {claimsImport.rows.length} claim{claimsImport.rows.length===1?"":"s"}</div>
</>
):(
<div style={{color:"#64748b",fontSize:"0.9rem"}}>Nothing new to import — every row in this file has already been imported.</div>
)}
{(claimsImport.skippedDup>0||claimsImport.skippedOther>0||claimsImport.skippedNoMatch>0||claimsImport.skippedBad>0)&&(
<div style={{marginTop:"12px",padding:"10px 12px",background:"rgba(15,23,42,0.04)",borderRadius:"8px",fontSize:"0.8rem",color:"#64748b"}}>
Skipped: {[claimsImport.skippedDup>0?claimsImport.skippedDup+" already imported":"",claimsImport.skippedOther>0?claimsImport.skippedOther+" for other participants":"",claimsImport.skippedNoMatch>0?claimsImport.skippedNoMatch+" with no matching support line":"",claimsImport.skippedBad>0?claimsImport.skippedBad+" without a valid date/amount":""].filter(Boolean).join(" · ")}
</div>
)}
<div style={{display:"flex",gap:"12px",marginTop:"20px"}}>
{claimsImport.rows.length>0&&<button onClick={applyClaimsImport} style={{flex:1,padding:"12px",backgroundColor:"#16a34a",color:"#ffffff",border:"none",borderRadius:"8px",cursor:"pointer",fontWeight:"700",fontSize:"1rem"}}>Import {claimsImport.rows.length} claim{claimsImport.rows.length===1?"":"s"}</button>}
<button onClick={()=>setClaimsImport(null)} style={{flex:1,padding:"12px",background:"rgba(15,23,42,0.05)",border:"1px solid rgba(15,23,42,0.1)",color:"#334155",borderRadius:"8px",cursor:"pointer"}}>Cancel</button>
</div>
</div>
</div>
)}
</>}

{showClinical&&(
<div className="rounded-2xl p-6 mb-6" style={{background: "#ffffff",border:"1px solid rgba(100,150,212,0.25)",boxShadow:"0 1px 3px rgba(15,23,42,0.05), 0 1px 2px rgba(15,23,42,0.04)"}}>
  <div className="flex items-center justify-between mb-5">
    <h2 className="text-xl font-semibold" style={{color:"#1e40af"}}>🏥 Clinical / Therapy Services</h2>
    {calcMode==="clinical"&&<button onClick={()=>setCalcMode(null)} style={{fontSize:"0.72rem",color:"#64748b",background:"rgba(15,23,42,0.04)",border:"1px solid rgba(15,23,42,0.1)",borderRadius:"6px",padding:"4px 10px",cursor:"pointer"}}>change mode</button>}
  </div>

  <div className="flex items-center gap-3 mb-4 rounded-lg px-3 py-2" style={{background:"rgba(100,150,212,0.06)",border:"1px solid rgba(100,150,212,0.15)"}}>
    <button onClick={()=>setClinicalBudgetLinked(v=>!v)} style={{flexShrink:0,width:"36px",height:"20px",borderRadius:"10px",border:"none",cursor:"pointer",background:clinicalBudgetLinked?"#3b82f6":"rgba(100,150,212,0.25)",position:"relative",transition:"background 0.2s"}}>
      <span style={{position:"absolute",top:"2px",left:clinicalBudgetLinked?"18px":"2px",width:"16px",height:"16px",borderRadius:"50%",background:"white",transition:"left 0.2s",display:"block"}}/>
    </button>
    <div>
      <div className="text-xs font-semibold" style={{color:clinicalBudgetLinked?"#1e40af":"#64748b"}}>
        {clinicalBudgetLinked?"Drawn from plan above":"Separate clinical budget"}
      </div>
      <div className="text-xs" style={{color:"#64748b"}}>
        {clinicalBudgetLinked
          ?"Clinical spend counts toward the support lines above — no separate budget needed here."
          :"This clinical funding is separate from the SIL/Core plan (e.g. a standalone therapy plan or ECEI package)."}
      </div>
    </div>
  </div>
  {!clinicalBudgetLinked&&<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-5">
    <div>
      <div className="text-xs font-semibold mb-1" style={{color:"#64748b"}}>Total Clinical Funding</div>
      <input type="number" step="0.01" min="0" value={clinicalFunding||""} onChange={e=>setClinicalFunding(num(e.target.value))} onFocus={e=>e.target.select()} placeholder="0.00"
        className="w-full rounded-lg px-3 py-2 outline-none"
        style={{background: "#ffffff",border:"1px solid rgba(100,150,212,0.3)",color: "#0f172a",fontSize:"1.1rem",fontWeight:600}}/>
    </div>
    <div className="rounded-xl p-3" style={{background:"rgba(100,150,212,0.07)",border:"1px solid rgba(100,150,212,0.2)"}}>
      <div className="text-xs" style={{color:"#64748b"}}>Total Service Hours</div>
      <div className="text-lg font-bold" style={{color:"#1e40af"}}>{(()=>{const h=clinicalServices.reduce((s,i)=>s+(i.hours||0),0);return(h%1===0?h:h.toFixed(1))+"h"})()}</div>
      <div className="text-xs mt-1" style={{color:"#64748b"}}>Est. cost: {money(clinicalTotal)}</div>
    </div>
  </div>}
  {clinicalBudgetLinked&&<div className="rounded-xl p-3 mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2" style={{background:"rgba(100,150,212,0.07)",border:"1px solid rgba(100,150,212,0.2)"}}>
    <div>
      <div className="text-xs" style={{color:"#64748b"}}>Total Service Hours</div>
      <div className="text-lg font-bold" style={{color:"#1e40af"}}>{(()=>{const h=clinicalServices.reduce((s,i)=>s+(i.hours||0),0);return(h%1===0?h:h.toFixed(1))+"h"})()}</div>
    </div>
    <div>
      <div className="text-xs" style={{color:"#64748b"}}>Est. clinical cost</div>
      <div className="text-lg font-bold" style={{color:"#1e40af"}}>{money(clinicalTotal)}</div>
      <div className="text-xs mt-1" style={{color:"#64748b"}}>Counted within plan lines above</div>
    </div>
  </div>}

  <div className="flex items-center justify-between mb-2">
    <div className="text-xs font-semibold" style={{color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em"}}>Services</div>
    <button onClick={()=>setClinicalServices(p=>[...p,{id:uid(),code:"15",description:"",hours:0,rate:CATEGORY_PRESETS["15"].rates.weekdayOrd,note:""}])} style={{background:"rgba(100,150,212,0.12)",border:"1px solid rgba(100,150,212,0.3)",color:"#1e40af",padding:"5px 12px",borderRadius:"8px",cursor:"pointer",fontSize:"0.8rem",fontWeight:600}}>+ Add service</button>
  </div>

  <div className="rounded-xl mb-5" style={{border:"1px solid rgba(100,150,212,0.15)",overflowX:"auto"}}>
    <div className="grid px-3 py-2" style={{gridTemplateColumns:"1.8fr 2.5fr 1fr 1.3fr 1.5fr auto",gap:"8px",background:"rgba(100,150,212,0.07)",minWidth:"640px"}}>
      <div className="text-xs font-semibold" style={{color:"#64748b"}}>Category</div>
      <div className="text-xs font-semibold" style={{color:"#64748b"}}>Service Description</div>
      <div className="text-xs font-semibold" style={{color:"#64748b"}}>Hours</div>
      <div className="text-xs font-semibold" style={{color:"#64748b"}}>Rate / hr ($)</div>
      <div className="text-xs font-semibold" style={{color:"#64748b"}}>Note</div>
      <div/>
    </div>
    {clinicalServices.map((si,idx)=>(
      <div key={si.id} className="grid px-3 py-2" style={{gridTemplateColumns:"1.8fr 2.5fr 1fr 1.3fr 1.5fr auto",gap:"8px",alignItems:"center",borderTop:"1px solid rgba(100,150,212,0.1)",minWidth:"640px"}}>
        <select value={si.code||"15"} onChange={e=>{const i=idx;const c=e.target.value;const preset=CATEGORY_PRESETS[c]?.rates.weekdayOrd||0;setClinicalServices(p=>p.map((x,j)=>j===i?{...x,code:c,rate:preset,description:x.description||CATEGORY_PRESETS[c]?.name||""}:x))}}
          className="rounded px-2 py-1 text-xs outline-none" style={{background: "#ffffff",border:"1px solid rgba(100,150,212,0.15)",color: "#0f172a"}}>
          {["07","11","12","13","14","15","20"].map(v=>(
            <option key={v} value={v}>{v} — {CATEGORY_PRESETS[v]?.name||v}</option>
          ))}
        </select>
        <input value={si.description} onChange={e=>{const i=idx;setClinicalServices(p=>p.map((x,j)=>j===i?{...x,description:e.target.value}:x))}} placeholder="e.g. Comprehensive BSP Development"
          className="rounded px-2 py-1 text-sm outline-none w-full" style={{background: "#ffffff",border:"1px solid rgba(100,150,212,0.15)",color: "#0f172a"}}/>
        <input type="number" step="0.5" min="0" value={si.hours||""} onChange={e=>{const i=idx;setClinicalServices(p=>p.map((x,j)=>j===i?{...x,hours:num(e.target.value)}:x))}} onFocus={e=>e.target.select()} placeholder="0"
          className="rounded px-2 py-1 text-sm outline-none" style={{background: "#ffffff",border:"1px solid rgba(100,150,212,0.15)",color: "#0f172a"}}/>
        <input type="number" step="0.01" min="0" value={si.rate||""} onChange={e=>{const i=idx;setClinicalServices(p=>p.map((x,j)=>j===i?{...x,rate:num(e.target.value)}:x))}} onFocus={e=>e.target.select()} placeholder="0.00"
          className="rounded px-2 py-1 text-sm outline-none" style={{background: "#ffffff",border:"1px solid rgba(100,150,212,0.15)",color: "#0f172a"}}/>
        <input value={si.note} onChange={e=>{const i=idx;setClinicalServices(p=>p.map((x,j)=>j===i?{...x,note:e.target.value}:x))}} placeholder="e.g. per term"
          className="rounded px-2 py-1 text-sm outline-none w-full" style={{background: "#ffffff",border:"1px solid rgba(100,150,212,0.15)",color: "#0f172a"}}/>
        <button onClick={()=>{const i=idx;setClinicalServices(p=>p.filter((_,j)=>j!==i))}} style={{color:"#ef4444",background:"none",border:"none",cursor:"pointer",fontSize:"1rem",padding:"2px 4px"}}>✕</button>
      </div>
    ))}
    {clinicalServices.length===0&&<div className="px-3 py-5 text-sm text-center" style={{color:"#64748b"}}>No services yet — click &ldquo;+ Add service&rdquo; to start</div>}
  </div>

  {clinicalFunding>0&&(
  <div className="rounded-xl p-4 mb-5" style={{background:"linear-gradient(135deg,rgba(241,245,249,0.9),rgba(248,250,252,0.9))",border:`2px solid ${clinicalStatus.border}`}}>
    <div className="flex items-center justify-between mb-3">
      <div className="grid gap-1">
        <div className="text-sm" style={{color:"#64748b"}}>Total funding: <span style={{color:"#1e40af",fontWeight:600}}>{money(clinicalFunding)}</span></div>
        <div className="text-sm" style={{color:"#64748b"}}>Service cost: <span style={{color: "#0f172a",fontWeight:600}}>{money(clinicalTotal)}</span></div>
      </div>
      <div className="text-sm font-semibold px-3 py-1 rounded-full" style={{background:clinicalStatus.bg,color:clinicalStatus.color,border:`1px solid ${clinicalStatus.border}`}}>{clinicalStatus.label}</div>
    </div>
    <div className="text-2xl font-bold mb-3" style={{color:clinicalStatus.color}}>Remaining: {money(clinicalRemaining)}</div>
    <div style={{background:"rgba(15,23,42,0.08)",borderRadius:"8px",height:"10px",overflow:"hidden"}}>
      <div style={{width:Math.min(100,clinicalFunding>0?(clinicalTotal/clinicalFunding)*100:0)+"%",height:"100%",borderRadius:"8px",background:`linear-gradient(90deg,${clinicalStatus.color},${clinicalStatus.color}99)`,transition:"width 0.3s"}}/>
    </div>
  </div>
  )}

  <button onClick={()=>{if(clinicalServices.length>0)setClinicalScheduleItems(clinicalServices.map(s=>({...s})));setShowClinicalModal(true)}} style={{padding:"10px 16px",background:"rgba(100,150,212,0.1)",border:"1px solid rgba(100,150,212,0.35)",borderRadius:"12px",cursor:"pointer",textAlign:"left"}}>
    <span style={{display:"block",color:"#1e40af",fontWeight:700,fontSize:"0.88rem"}}>🏥 Generate Clinical Schedule of Supports</span>
    <span style={{display:"block",color:"#64748b",fontSize:"0.72rem",marginTop:"2px"}}>Services pre-filled from your list above</span>
  </button>
</div>
)}

<div className="text-xs mt-8" style={{color:saveState==="saving"?"#d4a843":"#64748b"}}>{saveState==="saving"?"Saving changes…":saveState==="saved"?"All changes saved ✓":"Auto-saves as you work."}</div>
<div className="text-xs mt-2 mb-8" style={{color:"#64748b"}}>Powered by <span style={{color:"#d4a843"}}>Kevria</span></div>
</div>

{calcMode===null&&loaded&&(
<div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(15,23,42,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:"24px"}}>
  <div style={{maxWidth:"720px",width:"100%",textAlign:"center",background:"#ffffff",border:"1px solid #cbd5e1",borderRadius:"20px",padding:"40px 32px",boxShadow:"0 20px 50px rgba(15,23,42,0.25)"}}>
    <div style={{fontSize:"1.8rem",color:"#d4a843",marginBottom:"12px"}}>✦</div>
    <h2 style={{fontSize:"1.5rem",fontWeight:800,color: "#2d1b69",marginBottom:"8px"}}>What are you calculating for{participantName?" "+participantName:""}?</h2>
    <p style={{color:"#475569",fontSize:"0.88rem",marginBottom:"32px",lineHeight:1.6}}>Choose the type of support. This sets up the right calculator view.<br/>You can change it any time from the Plan Details section.</p>
    <div className="grid grid-cols-1 sm:grid-cols-3" style={{gap:"14px"}}>
      <button onClick={()=>setCalcMode("sil")} style={{padding:"28px 16px",background:"#fdf6e3",border:"2px solid #d4a843",borderRadius:"16px",cursor:"pointer",textAlign:"center",boxShadow:"0 1px 3px rgba(15,23,42,0.06)"}}>
        <div style={{fontSize:"2.2rem",marginBottom:"12px"}}>🏠</div>
        <div style={{color:"#b8901a",fontWeight:700,fontSize:"1rem",marginBottom:"8px"}}>SIL / Core Supports</div>
        <div style={{color:"#475569",fontSize:"0.78rem",lineHeight:1.6}}>Roster-based with day, night, weekend &amp; public holiday rates</div>
      </button>
      <button onClick={()=>setCalcMode("clinical")} style={{padding:"28px 16px",background:"#eff6ff",border:"2px solid #3b82f6",borderRadius:"16px",cursor:"pointer",textAlign:"center",boxShadow:"0 1px 3px rgba(15,23,42,0.06)"}}>
        <div style={{fontSize:"2.2rem",marginBottom:"12px"}}>🏥</div>
        <div style={{color:"#1e40af",fontWeight:700,fontSize:"1rem",marginBottom:"8px"}}>Clinical / Therapy</div>
        <div style={{color:"#475569",fontSize:"0.78rem",lineHeight:1.6}}>Behaviour support, allied health, therapy — flat hourly packages</div>
      </button>
      <button onClick={()=>setCalcMode("both")} style={{padding:"28px 16px",background:"#f0fdf4",border:"2px solid #22c55e",borderRadius:"16px",cursor:"pointer",textAlign:"center",boxShadow:"0 1px 3px rgba(15,23,42,0.06)"}}>
        <div style={{fontSize:"2.2rem",marginBottom:"12px"}}>📋</div>
        <div style={{color:"#16a34a",fontWeight:700,fontSize:"1rem",marginBottom:"8px"}}>Both</div>
        <div style={{color:"#475569",fontSize:"0.78rem",lineHeight:1.6}}>Participant has roster supports and clinical services</div>
      </button>
    </div>
  </div>
</div>
)}

{showSAModal&&(
<div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:"16px"}}>
<div style={{background:"#f8fafc",border:"1px solid rgba(212,168,67,0.3)",borderRadius:"16px",maxWidth:"680px",width:"100%",maxHeight:"90vh",overflowY:"auto",padding:"32px"}}>
  <div className="flex items-center justify-between mb-6">
    <h2 className="text-xl font-bold" style={{color:"#d4a843"}}>📋 Schedule of Supports</h2>
    <button onClick={()=>setShowSAModal(false)} style={{background:"rgba(15,23,42,0.05)",border:"1px solid rgba(15,23,42,0.1)",color:"#334155",borderRadius:"8px",padding:"6px 12px",cursor:"pointer"}}>✕</button>
  </div>

  <div className="text-sm mb-5" style={{color:"#334155"}}>Your provider details are saved and reused for every participant. Fill them in once — they&apos;ll pre-fill next time.</div>
  <div className="rounded-lg p-3 mb-4 text-xs" style={{background:"rgba(15,23,42,0.04)",border:"1px solid rgba(15,23,42,0.07)",color:"#475569"}}>
    A clean one-pager listing all funded supports and weekly schedule — attach it to your existing SA template. Works for every provider out of the box.
  </div>

  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
    {([
      {label:"Organisation Name *",key:"orgName",placeholder:"e.g. Kevria Support Services Pty Ltd"},
      {label:"ABN",key:"abn",placeholder:"e.g. 12 345 678 901"},
      {label:"NDIS Registration Number",key:"registrationNumber",placeholder:"e.g. 4050012345"},
      {label:"Contact Person",key:"contactName",placeholder:"e.g. Jane Smith"},
      {label:"Phone",key:"phone",placeholder:"e.g. 03 9000 0000"},
      {label:"Email",key:"email",placeholder:"e.g. support@yourorg.com.au"},
    ] as {label:string;key:keyof ProviderDetails;placeholder:string}[]).map(f=>(
      <div key={f.key}>
        <div className="text-xs mb-1 font-semibold" style={{color:"#334155"}}>{f.label}</div>
        <input value={providerDetails[f.key]} onChange={e=>setProviderDetails(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder}
          className="kv-input w-full rounded-lg px-3 py-2 text-sm"/>
      </div>
    ))}
    <div className="sm:col-span-2">
      <div className="text-xs mb-1 font-semibold" style={{color:"#334155"}}>Address</div>
      <input value={providerDetails.address} onChange={e=>setProviderDetails(p=>({...p,address:e.target.value}))} placeholder="e.g. 123 Main St, Melbourne VIC 3000"
        className="kv-input w-full rounded-lg px-3 py-2 text-sm"/>
    </div>
  </div>

  <div className="rounded-xl p-4 mb-6" style={{background:"rgba(15,23,42,0.03)",border:"1px solid rgba(15,23,42,0.07)"}}>
    <div className="text-xs font-semibold mb-2" style={{color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em"}}>Agreement will be generated for</div>
    <div className="grid grid-cols-2 gap-3 text-sm">
      <div><span style={{color:"#64748b"}}>Participant: </span><span style={{color: "#0f172a",fontWeight:600}}>{participantName||"—"}</span></div>
      <div><span style={{color:"#64748b"}}>NDIS No: </span><span style={{color: "#0f172a",fontWeight:600}}>{ndisNumber||"—"}</span></div>
      <div><span style={{color:"#64748b"}}>Plan period: </span><span style={{color: "#0f172a",fontWeight:600}}>{planDates.start} → {planDates.end}</span></div>
      <div><span style={{color:"#64748b"}}>State: </span><span style={{color: "#0f172a",fontWeight:600}}>{planDates.state}</span></div>
      <div><span style={{color:"#64748b"}}>Support lines: </span><span style={{color: "#0f172a",fontWeight:600}}>{lines.length}</span></div>
      <div><span style={{color:"#64748b"}}>Total budget: </span><span style={{color:"#d4a843",fontWeight:600}}>{money(totals.totalFunding)}</span></div>
    </div>
  </div>

  {saRows.length>0&&<div className="rounded-lg p-4 mb-5" style={{background:"rgba(15,23,42,0.03)",border:"1px solid rgba(15,23,42,0.07)"}}>
    <div className="text-xs font-semibold mb-1" style={{color:"#334155",textTransform:"uppercase",letterSpacing:"0.06em"}}>NDIS Item Numbers</div>
    <div className="text-xs mb-3" style={{color:"#64748b"}}>Auto-filled from the 2026–27 pricing schedule. Override any item number below if needed.</div>
    {saRows.map(row=>(
      <div key={row.key} className="flex items-center gap-2 mb-2">
        <div className="text-xs flex-1 truncate" style={{color:"#1e293b",minWidth:0}}>{row.label}</div>
        <input value={saItemNumbers[row.key]||""} onChange={e=>setSaItemNumbers(p=>({...p,[row.key]:e.target.value}))}
          placeholder={getDefaultItemNumber(row.code,row.rateType)||"e.g. 01_011_0107_1_1"}
          className="kv-input kv-money rounded px-2 py-1 text-xs"
          style={{width:"180px",flexShrink:0}}/>
      </div>
    ))}
  </div>}

  <div className="rounded-lg p-4 mb-5" style={{background:"rgba(15,23,42,0.03)",border:"1px solid rgba(15,23,42,0.07)"}}>
    <div className="text-xs font-semibold mb-3" style={{color:"#334155",textTransform:"uppercase",letterSpacing:"0.06em"}}>Specific Requirements</div>
    <div className="grid grid-cols-1 gap-2">
      {([["behavioursOfConcern","Behaviours of Concern"],["regulatedRestrictivePractice","Regulated Restrictive Practice"],["medicationManagement","Medication Management"]] as [keyof typeof saSpecificReqs,string][]).map(([key,label])=>(
        <label key={key} className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={saSpecificReqs[key]} onChange={e=>setSaSpecificReqs(p=>({...p,[key]:e.target.checked}))} style={{width:"16px",height:"16px",accentColor:"#d4a843"}}/>
          <span className="text-sm" style={{color:"#1e293b"}}>{label}</span>
        </label>
      ))}
    </div>
    <div className="mt-3">
      <div className="text-xs mb-1 font-semibold" style={{color:"#334155"}}>Establishment Fee (leave blank if none)</div>
      <input value={saEstFee} onChange={e=>setSaEstFee(e.target.value)} placeholder="e.g. 735.80" type="number" min="0" step="0.01"
        className="kv-input w-full rounded-lg px-3 py-2 text-sm"/>
    </div>
  </div>

  <div className="flex gap-3">
    <button onClick={()=>{setShowSAModal(false);generateScheduleOfSupports()}} disabled={!providerDetails.orgName.trim()}
      style={{flex:1,padding:"13px",backgroundColor:providerDetails.orgName.trim()?"#d4a843":"#4a3a20",color:providerDetails.orgName.trim()?"#f8fafc":"#94a3b8",border:"none",borderRadius:"10px",cursor:providerDetails.orgName.trim()?"pointer":"not-allowed",fontWeight:"bold",fontSize:"1rem"}}>
      Generate PDF →
    </button>
    <button onClick={()=>setShowSAModal(false)} style={{padding:"13px 20px",background:"rgba(15,23,42,0.05)",border:"1px solid rgba(15,23,42,0.1)",color:"#334155",borderRadius:"10px",cursor:"pointer"}}>
      Cancel
    </button>
  </div>
  {!providerDetails.orgName.trim()&&<div className="text-xs mt-2 text-center" style={{color:"#64748b"}}>Organisation name is required</div>}
</div>
</div>
)}

{showClinicalModal&&(
<div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:"16px"}}>
<div style={{background:"#f8fafc",border:"1px solid rgba(100,150,212,0.4)",borderRadius:"16px",maxWidth:"760px",width:"100%",maxHeight:"90vh",overflowY:"auto",padding:"32px"}}>
  <div className="flex items-center justify-between mb-6">
    <h2 className="text-xl font-bold" style={{color:"#1e40af"}}>🏥 Clinical Schedule of Supports</h2>
    <button onClick={()=>setShowClinicalModal(false)} style={{background:"rgba(15,23,42,0.05)",border:"1px solid rgba(15,23,42,0.1)",color:"#334155",borderRadius:"8px",padding:"6px 12px",cursor:"pointer"}}>✕</button>
  </div>
  <div className="text-sm mb-5" style={{color:"#334155"}}>For clinical/therapeutic services (Behaviour Support, allied health, etc). Enter your price guide, services, and practitioner details. Practitioner details are saved for next time.</div>

  <div className="text-xs font-semibold mb-2" style={{color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em"}}>Practitioner Details</div>
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-5">
    {([
      {label:"Practitioner Name *",key:"name",placeholder:"e.g. Jane Smith"},
      {label:"Title / Role",key:"title",placeholder:"e.g. Behaviour Practitioner"},
      {label:"Qualifications",key:"qualifications",placeholder:"e.g. B. Psych (Hons), BCBA"},
      {label:"Organisation",key:"org",placeholder:"e.g. Your Clinical Service"},
      {label:"Phone",key:"phone",placeholder:"e.g. 03 9000 0000"},
      {label:"Email",key:"email",placeholder:"e.g. clinician@yourorg.com.au"},
    ] as {label:string;key:string;placeholder:string}[]).map(f=>(
      <div key={f.key}>
        <div className="text-xs mb-1 font-semibold" style={{color:"#334155"}}>{f.label}</div>
        <input value={(clinicalPractitioner as any)[f.key]} onChange={e=>{const k=f.key;setClinicalPractitioner((p:any)=>({...p,[k]:e.target.value}))}} placeholder={f.placeholder}
          className="w-full rounded-lg px-3 py-2 outline-none text-sm"
          style={{background: "#ffffff",border:"1px solid rgba(100,150,212,0.25)",color: "#0f172a"}}/>
      </div>
    ))}
  </div>

  <div className="text-xs font-semibold mb-1" style={{color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em"}}>Overview / Narrative (optional)</div>
  <div className="text-xs mb-2" style={{color:"#64748b"}}>Letter-style narrative that appears in the PDF (e.g. addressed to guardian/participant).</div>
  <textarea value={clinicalOverview} onChange={e=>setClinicalOverview(e.target.value)} rows={4} placeholder={"Dear Guardian,\n\nFollowing assessment of [participant name], the following schedule of supports has been prepared..."}
    className="w-full rounded-lg px-3 py-2 outline-none text-sm mb-5"
    style={{background: "#ffffff",border:"1px solid rgba(100,150,212,0.25)",color: "#0f172a",resize:"vertical"}}/>

  <div className="flex items-center justify-between mb-2">
    <div className="text-xs font-semibold" style={{color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em"}}>NDIS Price Guide Items</div>
    <button onClick={()=>setClinicalPriceItems(p=>[...p,{id:uid(),itemCode:"",description:"",rate:0}])} style={{background:"rgba(100,150,212,0.12)",border:"1px solid rgba(100,150,212,0.3)",color:"#1e40af",padding:"4px 10px",borderRadius:"6px",cursor:"pointer",fontSize:"0.78rem"}}>+ Add row</button>
  </div>
  <div className="rounded-lg p-3 mb-5" style={{background:"rgba(15,23,42,0.03)",border:"1px solid rgba(15,23,42,0.07)",overflowX:"auto"}}>
    <div className="grid mb-1" style={{gridTemplateColumns:"2.2fr 3fr 1.4fr auto",gap:"6px",minWidth:"480px"}}>
      <div className="text-xs" style={{color:"#64748b"}}>Item Code</div>
      <div className="text-xs" style={{color:"#64748b"}}>Description</div>
      <div className="text-xs" style={{color:"#64748b"}}>Rate / hr ($)</div>
      <div/>
    </div>
    {clinicalPriceItems.map((pi,idx)=>(
      <div key={pi.id} className="grid mb-2" style={{gridTemplateColumns:"2.2fr 3fr 1.4fr auto",gap:"6px",alignItems:"center",minWidth:"480px"}}>
        <input value={pi.itemCode} onChange={e=>{const i=idx;setClinicalPriceItems(p=>p.map((x,j)=>j===i?{...x,itemCode:e.target.value}:x))}} placeholder="15_056_0128_1_3"
          className="rounded px-2 py-1 text-xs outline-none"
          style={{background: "#ffffff",border:"1px solid rgba(100,150,212,0.2)",color: "#0f172a",fontFamily:"monospace"}}/>
        <input value={pi.description} onChange={e=>{const i=idx;setClinicalPriceItems(p=>p.map((x,j)=>j===i?{...x,description:e.target.value}:x))}} placeholder="Service description"
          className="rounded px-2 py-1 text-xs outline-none"
          style={{background: "#ffffff",border:"1px solid rgba(100,150,212,0.2)",color: "#0f172a"}}/>
        <input type="number" step="0.01" value={pi.rate||""} onChange={e=>{const i=idx;setClinicalPriceItems(p=>p.map((x,j)=>j===i?{...x,rate:num(e.target.value)}:x))}} placeholder="252.99"
          className="rounded px-2 py-1 text-xs outline-none"
          style={{background: "#ffffff",border:"1px solid rgba(100,150,212,0.2)",color: "#0f172a"}}/>
        <button onClick={()=>{const i=idx;setClinicalPriceItems(p=>p.filter((_,j)=>j!==i))}} style={{color:"#ef4444",background:"none",border:"none",cursor:"pointer",fontSize:"0.9rem",padding:"2px 4px"}}>✕</button>
      </div>
    ))}
    <div className="text-xs mt-1" style={{color:"#64748b"}}>First item rate is used as the default for schedule items with no rate override.</div>
  </div>

  <div className="flex items-center justify-between mb-2">
    <div className="text-xs font-semibold" style={{color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em"}}>Schedule of Services</div>
    <button onClick={()=>setClinicalScheduleItems(p=>[...p,{id:uid(),description:"",hours:0,rate:0,note:""}])} style={{background:"rgba(100,150,212,0.12)",border:"1px solid rgba(100,150,212,0.3)",color:"#1e40af",padding:"4px 10px",borderRadius:"6px",cursor:"pointer",fontSize:"0.78rem"}}>+ Add row</button>
  </div>
  <div className="rounded-lg p-3 mb-5" style={{background:"rgba(15,23,42,0.03)",border:"1px solid rgba(15,23,42,0.07)",overflowX:"auto"}}>
    <div className="grid mb-1" style={{gridTemplateColumns:"3fr 1fr 1.4fr 2fr auto",gap:"6px",minWidth:"520px"}}>
      <div className="text-xs" style={{color:"#64748b"}}>Service Description</div>
      <div className="text-xs" style={{color:"#64748b"}}>Hours</div>
      <div className="text-xs" style={{color:"#64748b"}}>Rate (0=default)</div>
      <div className="text-xs" style={{color:"#64748b"}}>Note (optional)</div>
      <div/>
    </div>
    {clinicalScheduleItems.map((si,idx)=>(
      <div key={si.id} className="grid mb-2" style={{gridTemplateColumns:"3fr 1fr 1.4fr 2fr auto",gap:"6px",alignItems:"center",minWidth:"520px"}}>
        <input value={si.description} onChange={e=>{const i=idx;setClinicalScheduleItems(p=>p.map((x,j)=>j===i?{...x,description:e.target.value}:x))}} placeholder="e.g. Comprehensive BSP Development"
          className="rounded px-2 py-1 text-xs outline-none"
          style={{background: "#ffffff",border:"1px solid rgba(100,150,212,0.2)",color: "#0f172a"}}/>
        <input type="number" step="0.5" min="0" value={si.hours||""} onChange={e=>{const i=idx;setClinicalScheduleItems(p=>p.map((x,j)=>j===i?{...x,hours:num(e.target.value)}:x))}} placeholder="0"
          className="rounded px-2 py-1 text-xs outline-none"
          style={{background: "#ffffff",border:"1px solid rgba(100,150,212,0.2)",color: "#0f172a"}}/>
        <input type="number" step="0.01" min="0" value={si.rate||""} onChange={e=>{const i=idx;setClinicalScheduleItems(p=>p.map((x,j)=>j===i?{...x,rate:num(e.target.value)}:x))}} placeholder="default"
          className="rounded px-2 py-1 text-xs outline-none"
          style={{background: "#ffffff",border:"1px solid rgba(100,150,212,0.2)",color: "#0f172a"}}/>
        <input value={si.note} onChange={e=>{const i=idx;setClinicalScheduleItems(p=>p.map((x,j)=>j===i?{...x,note:e.target.value}:x))}} placeholder="e.g. per session"
          className="rounded px-2 py-1 text-xs outline-none"
          style={{background: "#ffffff",border:"1px solid rgba(100,150,212,0.2)",color: "#0f172a"}}/>
        <button onClick={()=>{const i=idx;setClinicalScheduleItems(p=>p.filter((_,j)=>j!==i))}} style={{color:"#ef4444",background:"none",border:"none",cursor:"pointer",fontSize:"0.9rem",padding:"2px 4px"}}>✕</button>
      </div>
    ))}
    {(()=>{const dr=clinicalPriceItems[0]?.rate||0;const th=clinicalScheduleItems.reduce((s,i)=>s+(i.hours||0),0);const tc=clinicalScheduleItems.reduce((s,i)=>s+(i.hours||0)*(i.rate>0?i.rate:dr),0);if(th<=0)return null;return<div className="text-sm font-semibold mt-2 pt-2" style={{borderTop:"1px solid rgba(15,23,42,0.1)",color:"#1e40af"}}>Total: {th%1===0?th:th.toFixed(1)} hours — {money(tc)}</div>})()}
  </div>

  <div className="flex gap-3">
    <button onClick={()=>{setShowClinicalModal(false);generateClinicalSoS()}} disabled={!clinicalPractitioner.name.trim()}
      style={{flex:1,padding:"13px",backgroundColor:clinicalPractitioner.name.trim()?"#1e40af":"#dbeafe",color:clinicalPractitioner.name.trim()?"#ffffff":"#94a3b8",border:"none",borderRadius:"10px",cursor:clinicalPractitioner.name.trim()?"pointer":"not-allowed",fontWeight:"bold",fontSize:"1rem"}}>
      Generate Clinical PDF →
    </button>
    <button onClick={()=>setShowClinicalModal(false)} style={{padding:"13px 20px",background:"rgba(15,23,42,0.05)",border:"1px solid rgba(15,23,42,0.1)",color:"#334155",borderRadius:"10px",cursor:"pointer"}}>
      Cancel
    </button>
  </div>
  {!clinicalPractitioner.name.trim()&&<div className="text-xs mt-2 text-center" style={{color:"#64748b"}}>Practitioner name is required</div>}
</div>
</div>
)}

</main>)}

