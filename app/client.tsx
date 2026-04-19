"use client";
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
type Rates = { weekdayOrd: number; weekdayNight: number; sat: number; sun: number; publicHoliday: number; activeSleepoverHourly: number; fixedSleepoverUnit: number; gstRate: number };
type PlanDates = { start: string; end: string; state: string };
type DayRoster = { enabled: boolean; hours: number; nightHours: number; frequency: string };
type Claim = { id: string; date: string; amount: number; note: string };
type SupportLine = { id: string; code: string; description: string; totalFunding: number; ratio: string; excludedHolidays: string[]; roster: { [key: string]: DayRoster }; activeSleepoverHours: number; activeSleepoverFreq: string; fixedSleepovers: number; fixedSleepoverFreq: string; kmsPerWeek: number; kmRate: number; kmFreq: string; claims: Claim[]; lineRates: Rates };
type ProviderDetails = { orgName: string; abn: string; contactName: string; email: string; phone: string; address: string; registrationNumber: string };
const DAYS = ["mon","tue","wed","thu","fri","sat","sun"];
const DAY_DOW:{[k:string]:number}={mon:1,tue:2,wed:3,thu:4,fri:5,sat:6,sun:0};
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
const anzac=new Date(year+"-04-25");if(anzac.getDay()===0)add(year+"-04-26","ANZAC Day (observed)");if(anzac.getDay()===6)add(year+"-04-27","ANZAC Day (observed)");
if(state==="ACT"){const x=new Date(year,2,1);add(formatDate(new Date(year,2,1+((8-x.getDay())%7)+7)),"Canberra Day")}
if(state==="VIC"){const x=new Date(year,5,1);add(formatDate(new Date(year,5,1+((8-x.getDay())%7)+7)),"Queen's Birthday");const y=new Date(year,10,1);add(formatDate(new Date(year,10,1+((9-y.getDay())%7))),"Melbourne Cup")}
if(state==="NSW"||state==="SA"||state==="TAS"||state==="ACT"){const x=new Date(year,5,1);add(formatDate(new Date(year,5,1+((8-x.getDay())%7)+7)),"Queen's Birthday")}
if(state==="QLD"){const x=new Date(year,9,1);add(formatDate(new Date(year,9,1+((8-x.getDay())%7)+21)),"Queen's Birthday")}
if(state==="WA"){const x=new Date(year,8,1);add(formatDate(new Date(year,8,1+((8-x.getDay())%7)+21)),"Queen's Birthday")}
if(state==="NT"){const x=new Date(year,4,1);add(formatDate(new Date(year,4,1+((8-x.getDay())%7))),"May Day");const y=new Date(year,5,1);add(formatDate(new Date(year,5,1+((8-y.getDay())%7)+7)),"Queen's Birthday")}
if(state==="SA"||state==="NSW"||state==="ACT"){const x=new Date(year,9,1);add(formatDate(new Date(year,9,1+((8-x.getDay())%7))),"Labour Day")}
if(state==="TAS"){const x=new Date(year,10,1);add(formatDate(new Date(year,10,1+((8-x.getDay())%7))),"Recreation Day")}
add(year+"-12-25","Christmas Day");add(year+"-12-26","Boxing Day");
const xmas=new Date(year+"-12-25");if(xmas.getDay()===6)add(year+"-12-27","Christmas Day (observed)");if(xmas.getDay()===0)add(year+"-12-27","Christmas Day (observed)");
const boxing=new Date(year+"-12-26");if(boxing.getDay()===6)add(year+"-12-28","Boxing Day (observed)");if(boxing.getDay()===0)add(year+"-12-27","Boxing Day (observed)");
return h}
function getHolidaysInRange(start:string,end:string,state:string){if(!start||!end)return[];const sd=new Date(start),ed=new Date(end);const all:{date:string;name:string;dayOfWeek:number}[]=[];for(let y=sd.getFullYear();y<=ed.getFullYear();y++)all.push(...getPublicHolidays(y,state));return all.filter(h=>{const d=new Date(h.date);return d>=sd&&d<=ed}).sort((a,b)=>a.date.localeCompare(b.date))}
function getDayName(d:number):string{return["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][d]}
function getWeeksInPlan(s:string,e:string):number{if(!s||!e)return 52;return Math.max(1,(new Date(e).getTime()-new Date(s).getTime())/(7*24*60*60*1000))}
function countDayOccurrences(start:string,end:string,dow:number):number{if(!start||!end)return 0;const sd=new Date(start);const ed=new Date(end);const daysToFirst=(dow-sd.getDay()+7)%7;const first=new Date(sd.getTime()+daysToFirst*86400000);if(first>ed)return 0;return Math.floor((ed.getTime()-first.getTime())/604800000)+1}
function calcDayCountPlanCost(line:SupportLine,start:string,end:string,planWeeks:number,rates:Rates):number{if(!start||!end)return calcWeeklyCost(line,rates)*planWeeks;const divisor=RATIOS[line.ratio]?.divisor||1;let total=0;for(const d of DAYS){const r=line.roster[d];if(!r||!r.enabled)continue;const fm=FREQ[r.frequency]?.multiplier||1;const occ=countDayOccurrences(start,end,DAY_DOW[d])*fm;const isSat=d==="sat";const isSun=d==="sun";const dr=isSat?rates.sat/divisor:isSun?rates.sun/divisor:rates.weekdayOrd/divisor;const nr=isSat?rates.sat/divisor:isSun?rates.sun/divisor:rates.weekdayNight/divisor;total+=(r.hours*dr+r.nightHours*nr)*occ}const sf=FREQ[line.activeSleepoverFreq]?.multiplier||1;total+=line.activeSleepoverHours*(rates.activeSleepoverHourly/divisor)*sf*planWeeks;const ff=FREQ[line.fixedSleepoverFreq]?.multiplier||1;total+=line.fixedSleepovers*rates.fixedSleepoverUnit*ff*planWeeks;const kf=FREQ[line.kmFreq]?.multiplier||1;total+=line.kmsPerWeek*line.kmRate*kf*planWeeks;return total}
function money(n:number):string{const v=Number.isFinite(n)?n:0;return v.toLocaleString("en-AU",{style:"currency",currency:"AUD"})}
function num(x:any):number{const v=Number(x);return Number.isFinite(v)?v:0}
function uid():string{return Math.random().toString(16).slice(2)+Date.now().toString(16)}
function escapeHtml(s:string){return s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function downloadTextFile(fn:string,text:string){const type=fn.endsWith(".csv")?"text/csv;charset=utf-8":"text/plain;charset=utf-8";const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=fn;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)}
function Field(p:{label:string;value:number;step?:number;onChange:(v:number)=>void}){return(<label className="block"><div className="text-sm mb-1" style={{color:"#b0a0d0"}}>{p.label}</div><input type="number" step={p.step??1} value={Number.isFinite(p.value)?p.value:0} onChange={e=>p.onChange(num(e.target.value))} onFocus={e=>e.target.select()} className="w-full rounded-lg px-3 py-2 outline-none" style={{background:"rgba(26,17,80,0.6)",border:"1px solid rgba(212,168,67,0.2)",color:"white"}}/></label>)}
function SmallField(p:{value:number;step?:number;onChange:(v:number)=>void;disabled?:boolean}){return(<input type="number" step={p.step??0.25} value={Number.isFinite(p.value)?p.value:0} onChange={e=>p.onChange(num(e.target.value))} onFocus={e=>e.target.select()} disabled={p.disabled} className="rounded-lg px-2 py-1 outline-none w-16 text-center" style={{background:p.disabled?"rgba(26,17,80,0.3)":"rgba(26,17,80,0.6)",border:"1px solid rgba(212,168,67,0.2)",color:p.disabled?"#505060":"white",fontSize:"0.85rem"}}/>)}
function TextField(p:{label:string;value:string;onChange:(v:string)=>void}){return(<label className="block"><div className="text-sm mb-1" style={{color:"#b0a0d0"}}>{p.label}</div><input value={p.value} onChange={e=>p.onChange(e.target.value)} className="w-full rounded-lg px-3 py-2 outline-none" style={{background:"rgba(26,17,80,0.6)",border:"1px solid rgba(212,168,67,0.2)",color:"white"}}/></label>)}
function DateField(p:{label:string;value:string;onChange:(v:string)=>void}){return(<label className="block"><div className="text-sm mb-1" style={{color:"#b0a0d0"}}>{p.label}</div><input type="date" value={p.value} onChange={e=>p.onChange(e.target.value)} className="w-full rounded-lg px-3 py-2 outline-none" style={{background:"rgba(26,17,80,0.6)",border:"1px solid rgba(212,168,67,0.2)",color:"white"}}/></label>)}
function SelectField(p:{label:string;value:string;options:{value:string;label:string}[];onChange:(v:string)=>void}){return(<label className="block"><div className="text-sm mb-1" style={{color:"#b0a0d0"}}>{p.label}</div><select value={p.value} onChange={e=>p.onChange(e.target.value)} className="w-full rounded-lg px-3 py-2 outline-none" style={{background:"rgba(26,17,80,0.6)",border:"1px solid rgba(212,168,67,0.2)",color:"white"}}>{p.options.map(o=>(<option key={o.value} value={o.value}>{o.label}</option>))}</select></label>)}
function SmallSelect(p:{value:string;options:{value:string;label:string}[];onChange:(v:string)=>void;disabled?:boolean}){return(<select value={p.value} onChange={e=>p.onChange(e.target.value)} disabled={p.disabled} className="rounded-lg px-2 py-1 outline-none" style={{background:p.disabled?"rgba(26,17,80,0.3)":"rgba(26,17,80,0.6)",border:"1px solid rgba(212,168,67,0.2)",color:p.disabled?"#505060":"white",fontSize:"0.8rem"}}>{p.options.map(o=>(<option key={o.value} value={o.value}>{o.label}</option>))}</select>)}
function getBudgetStatus(remaining:number,totalFunding:number){const pct=totalFunding>0?(remaining/totalFunding)*100:0;if(remaining<0)return{color:"#ef4444",bg:"rgba(239,68,68,0.1)",label:"OVER BUDGET",border:"rgba(239,68,68,0.3)"};if(pct<10)return{color:"#f59e0b",bg:"rgba(245,158,11,0.1)",label:"LOW BUDGET",border:"rgba(245,158,11,0.3)"};return{color:"#22c55e",bg:"rgba(34,197,94,0.1)",label:"ON TRACK",border:"rgba(34,197,94,0.3)"}}
function calcWeeklyCost(line:SupportLine,rates:Rates){const divisor=RATIOS[line.ratio]?.divisor||1;let wt=0;for(const d of DAYS){const r=line.roster[d];if(!r||!r.enabled)continue;const fm=FREQ[r.frequency]?.multiplier||1;const isSat=d==="sat";const isSun=d==="sun";const dr=isSat?rates.sat/divisor:isSun?rates.sun/divisor:rates.weekdayOrd/divisor;const nr=isSat?rates.sat/divisor:isSun?rates.sun/divisor:rates.weekdayNight/divisor;wt+=(r.hours*dr+r.nightHours*nr)*fm}const sf=FREQ[line.activeSleepoverFreq]?.multiplier||1;wt+=line.activeSleepoverHours*(rates.activeSleepoverHourly/divisor)*sf;const ff=FREQ[line.fixedSleepoverFreq]?.multiplier||1;wt+=line.fixedSleepovers*rates.fixedSleepoverUnit*ff;const kf=FREQ[line.kmFreq]?.multiplier||1;wt+=line.kmsPerWeek*line.kmRate*kf;return wt}
function calcPHImpact(line:SupportLine,holidays:{date:string;name:string;dayOfWeek:number}[],rates:Rates){const divisor=RATIOS[line.ratio]?.divisor||1;let extraCost=0,savedCost=0;const dm:{[k:number]:string}={0:"sun",1:"mon",2:"tue",3:"wed",4:"thu",5:"fri",6:"sat"};const details:{name:string;date:string;day:string;impact:number;included:boolean}[]=[];for(const h of holidays){const isExcluded=line.excludedHolidays.includes(h.date);const rd=dm[h.dayOfWeek];const r=line.roster[rd];if(!r||!r.enabled){details.push({name:h.name,date:h.date,day:getDayName(h.dayOfWeek),impact:0,included:!isExcluded});continue}const isSat=rd==="sat";const isSun=rd==="sun";const normalDayRate=isSat?rates.sat/divisor:isSun?rates.sun/divisor:rates.weekdayOrd/divisor;const normalNightRate=isSat?rates.sat/divisor:isSun?rates.sun/divisor:rates.weekdayNight/divisor;const phRate=rates.publicHoliday/divisor;if(!isExcluded){const extra=(phRate-normalDayRate)*r.hours+(phRate-normalNightRate)*r.nightHours;extraCost+=extra;details.push({name:h.name,date:h.date,day:getDayName(h.dayOfWeek),impact:extra,included:true})}else{const saved=normalDayRate*r.hours+normalNightRate*r.nightHours;savedCost+=saved;details.push({name:h.name,date:h.date,day:getDayName(h.dayOfWeek),impact:saved,included:false})}}return{extraCost,savedCost,details}}
function getSuggestions(line:any,rates:Rates){if(line.remaining>=0)return[];const suggestions:string[]=[];const roster=line.roster||{};if(roster.sun?.enabled&&roster.sun.hours>0){const s=rates.sun-rates.weekdayOrd;suggestions.push("Reduce Sunday hours - saves "+money(s*roster.sun.hours*52)+"/yr")}if(roster.sat?.enabled&&roster.sat.hours>0){const s=rates.sat-rates.weekdayOrd;suggestions.push("Reduce Saturday hours - saves "+money(s*roster.sat.hours*52)+"/yr")}if(line.fixedSleepovers>0){suggestions.push("Remove 1 fixed sleepover/wk - saves "+money(rates.fixedSleepoverUnit*52)+"/yr")}if(line.kmsPerWeek>0){suggestions.push("Reduce KMs - currently "+money(line.kmsPerWeek*line.kmRate*52)+"/yr")}return suggestions.slice(0,3)}
function useCloudSync(key:string,data:any){const[userId,setUserId]=useState<string|null>(null);const timerRef=React.useRef<any>(null);useEffect(()=>{supabase.auth.getUser().then(({data:d})=>{setUserId(d.user?.id??null)})},[]);useEffect(()=>{if(!userId||!key)return;if(timerRef.current)clearTimeout(timerRef.current);timerRef.current=setTimeout(async()=>{try{await supabase.from("calculator_data").upsert({user_id:userId,participant_id:key,data:data,updated_at:new Date().toISOString()},{onConflict:"user_id,participant_id"})}catch(e){console.error("Cloud save error:",e)}},2000);return()=>{if(timerRef.current)clearTimeout(timerRef.current)}},[userId,key,data])}
async function loadFromCloud(key:string):Promise<any>{try{const{data:d}=await supabase.auth.getUser();if(!d.user)return null;const{data:row}=await supabase.from("calculator_data").select("data").eq("user_id",d.user.id).eq("participant_id",key).single();return row?.data||null}catch{return null}}
const NDIS_RATES_2025_26:Rates={weekdayOrd:70.23,weekdayNight:77.38,sat:98.83,sun:127.43,publicHoliday:156.03,activeSleepoverHourly:78.81,fixedSleepoverUnit:297.6,gstRate:0};
const CATEGORY_PRESETS:{[code:string]:{name:string;rates:Rates}}={
  "01":{name:"Daily Activities",rates:{weekdayOrd:70.23,weekdayNight:77.38,sat:98.83,sun:127.43,publicHoliday:156.03,activeSleepoverHourly:78.81,fixedSleepoverUnit:297.6,gstRate:0}},
  "02":{name:"Transport",rates:{weekdayOrd:0,weekdayNight:0,sat:0,sun:0,publicHoliday:0,activeSleepoverHourly:0,fixedSleepoverUnit:0,gstRate:0}},
  "03":{name:"Consumables",rates:{weekdayOrd:0,weekdayNight:0,sat:0,sun:0,publicHoliday:0,activeSleepoverHourly:0,fixedSleepoverUnit:0,gstRate:0}},
  "04":{name:"Social & Community",rates:{weekdayOrd:70.23,weekdayNight:77.38,sat:98.83,sun:127.43,publicHoliday:156.03,activeSleepoverHourly:78.81,fixedSleepoverUnit:297.6,gstRate:0}},
  "05":{name:"Assistive Technology",rates:{weekdayOrd:0,weekdayNight:0,sat:0,sun:0,publicHoliday:0,activeSleepoverHourly:0,fixedSleepoverUnit:0,gstRate:0}},
  "06":{name:"Home Modifications",rates:{weekdayOrd:0,weekdayNight:0,sat:0,sun:0,publicHoliday:0,activeSleepoverHourly:0,fixedSleepoverUnit:0,gstRate:0}},
  "07":{name:"Support Coordination",rates:{weekdayOrd:100.14,weekdayNight:0,sat:0,sun:0,publicHoliday:0,activeSleepoverHourly:0,fixedSleepoverUnit:0,gstRate:0}},
  "08":{name:"Improved Living Arrangements",rates:{weekdayOrd:70.23,weekdayNight:77.38,sat:98.83,sun:127.43,publicHoliday:156.03,activeSleepoverHourly:78.81,fixedSleepoverUnit:297.6,gstRate:0}},
  "09":{name:"Increased Social & Community",rates:{weekdayOrd:70.23,weekdayNight:77.38,sat:98.83,sun:127.43,publicHoliday:156.03,activeSleepoverHourly:0,fixedSleepoverUnit:0,gstRate:0}},
  "10":{name:"Finding & Keeping a Job",rates:{weekdayOrd:70.23,weekdayNight:0,sat:0,sun:0,publicHoliday:0,activeSleepoverHourly:0,fixedSleepoverUnit:0,gstRate:0}},
  "11":{name:"Improved Health & Wellbeing",rates:{weekdayOrd:193.99,weekdayNight:0,sat:0,sun:0,publicHoliday:0,activeSleepoverHourly:0,fixedSleepoverUnit:0,gstRate:0}},
  "12":{name:"Improved Learning",rates:{weekdayOrd:100.14,weekdayNight:0,sat:0,sun:0,publicHoliday:0,activeSleepoverHourly:0,fixedSleepoverUnit:0,gstRate:0}},
  "13":{name:"Improved Life Choices",rates:{weekdayOrd:100.14,weekdayNight:0,sat:0,sun:0,publicHoliday:0,activeSleepoverHourly:0,fixedSleepoverUnit:0,gstRate:0}},
  "14":{name:"Improved Daily Living",rates:{weekdayOrd:193.99,weekdayNight:0,sat:0,sun:0,publicHoliday:0,activeSleepoverHourly:0,fixedSleepoverUnit:0,gstRate:0}},
  "15":{name:"Improved Relationships",rates:{weekdayOrd:190.54,weekdayNight:0,sat:0,sun:0,publicHoliday:0,activeSleepoverHourly:0,fixedSleepoverUnit:0,gstRate:0}},
};
function getPresetRates(code:string):Rates{return CATEGORY_PRESETS[code]?.rates||NDIS_RATES_2025_26}
const NDIS_ITEM_DEFAULTS:{[code:string]:{[rateType:string]:string}}={
  "01":{weekday:"01_011_0107_1_1",weekdayNight:"01_012_0107_1_1",sat:"01_013_0107_1_1",satNight:"01_013_0107_1_1",sun:"01_014_0107_1_1",sunNight:"01_014_0107_1_1",publicHoliday:"01_015_0107_1_1",activeSleepover:"01_010_0107_1_1",fixedSleepover:"01_799_0104_1_1",lump:"01_821_0115_1_1"},
  "04":{weekday:"04_104_0125_6_1",weekdayNight:"04_104_0125_6_1",sat:"04_105_0125_6_1",satNight:"04_105_0125_6_1",sun:"04_106_0125_6_1",sunNight:"04_106_0125_6_1",publicHoliday:"04_117_0125_6_1",activeSleepover:"04_010_0125_6_1"},
  "07":{weekday:"07_001_0106_8_3",lump:"07_001_0106_8_3"},
  "08":{weekday:"01_821_0115_1_1",lump:"01_821_0115_1_1"},
  "09":{weekday:"04_104_0125_6_1",sat:"04_105_0125_6_1",sun:"04_106_0125_6_1"},
  "10":{weekday:"10_002_0102_5_3",lump:"10_002_0102_5_3"},
  "11":{weekday:"11_022_0110_7_3",lump:"11_022_0110_7_3"},
  "12":{weekday:"12_001_0117_1_3",lump:"12_001_0117_1_3"},
  "13":{weekday:"13_001_0132_3_3",lump:"13_001_0132_3_3"},
  "14":{weekday:"14_033_0128_3_3",lump:"14_033_0128_3_3"},
  "15":{weekday:"15_056_0128_1_3",lump:"15_056_0128_1_3"},
};
function getDefaultItemNumber(code:string,rateType:string):string{return NDIS_ITEM_DEFAULTS[code]?.[rateType]||""}
function getLineMode(code:string):"full"|"weekday"|"lump"{if(["02","03","05","06"].includes(code))return"lump";if(["07","10","11","12","13","14","15"].includes(code))return"weekday";return"full"}
function isBelowGuide(lr:Rates,code:string):boolean{const p=CATEGORY_PRESETS[code]?.rates;if(!p)return false;return(p.weekdayOrd>0&&lr.weekdayOrd<p.weekdayOrd)||(p.weekdayNight>0&&lr.weekdayNight<p.weekdayNight)||(p.sat>0&&lr.sat<p.sat)||(p.sun>0&&lr.sun<p.sun)||(p.publicHoliday>0&&lr.publicHoliday<p.publicHoliday)||(p.activeSleepoverHourly>0&&lr.activeSleepoverHourly<p.activeSleepoverHourly)}
export default function PageClient({storageKey,participantName,ndisNumber}:{storageKey?:string;participantName?:string;ndisNumber?:string}){
const STORAGE_KEY=storageKey||"ndis_budget_calc_pro_v7";
const[userEmail,setUserEmail]=useState<string|null>(null);
useEffect(()=>{supabase.auth.getUser().then(({data})=>{setUserEmail(data.user?.email??null)});const{data:sub}=supabase.auth.onAuthStateChange((_ev,session)=>{setUserEmail(session?.user?.email??null)});return()=>{sub.subscription.unsubscribe()}},[]);
const[planDates,setPlanDates]=useState<PlanDates>({start:new Date().toISOString().slice(0,10),end:new Date(Date.now()+365*24*60*60*1000).toISOString().slice(0,10),state:"NSW"});
const[rates,setRates]=useState<Rates>({weekdayOrd:70.23,weekdayNight:77.38,sat:98.83,sun:127.43,publicHoliday:156.03,activeSleepoverHourly:78.81,fixedSleepoverUnit:297.6,gstRate:0});
const[lines,setLines]=useState<SupportLine[]>([{id:uid(),code:"01",description:"Core Supports",totalFunding:0,ratio:"1:1",excludedHolidays:[],roster:defaultRoster(),activeSleepoverHours:0,activeSleepoverFreq:"every",fixedSleepovers:0,fixedSleepoverFreq:"every",kmsPerWeek:0,kmRate:0.99,kmFreq:"every",claims:[],lineRates:NDIS_RATES_2025_26}]);
const planWeeksCalc=useMemo(()=>getWeeksInPlan(planDates.start,planDates.end),[planDates.start,planDates.end]);const[weeksOverride,setWeeksOverride]=useState<number|null>(null);const planWeeks=weeksOverride!==null?weeksOverride:planWeeksCalc;
const holidays=useMemo(()=>getHolidaysInRange(planDates.start,planDates.end,planDates.state),[planDates]);
useEffect(()=>{async function load(){const cloud=await loadFromCloud(STORAGE_KEY);const raw=cloud||(()=>{try{const r=localStorage.getItem(STORAGE_KEY);return r?JSON.parse(r):null}catch{return null}})();if(!raw)return;if(raw?.rates)setRates((r:any)=>({...r,...raw.rates}));if(raw?.planDates)setPlanDates((p:any)=>({...p,...raw.planDates}));if(Array.isArray(raw?.lines)&&raw.lines.length>0)setLines(raw.lines.map((l:any)=>({...l,ratio:l.ratio||"1:1",excludedHolidays:l.excludedHolidays||[],roster:l.roster||defaultRoster(),activeSleepoverFreq:l.activeSleepoverFreq||"every",fixedSleepoverFreq:l.fixedSleepoverFreq||"every",kmsPerWeek:l.kmsPerWeek||0,kmRate:l.kmRate||0.99,kmFreq:l.kmFreq||"every",claims:l.claims||[],lineRates:l.lineRates||getPresetRates(l.code)})));if(raw?.weeksOverride!=null)setWeeksOverride(raw.weeksOverride);if(raw?.calcMode!=null)setCalcMode(raw.calcMode as any);if(typeof raw?.clinicalFunding==="number")setClinicalFunding(raw.clinicalFunding);if(Array.isArray(raw?.clinicalServices))setClinicalServices(raw.clinicalServices);}load()},[]);
const[calcMode,setCalcMode]=useState<"sil"|"clinical"|"both"|null>(null);
const[clinicalFunding,setClinicalFunding]=useState(0);
const[clinicalServices,setClinicalServices]=useState<{id:string;code:string;description:string;hours:number;rate:number;note:string}[]>([]);
const saveData={rates,lines,planDates,weeksOverride,calcMode,clinicalFunding,clinicalServices};useEffect(()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(saveData))}catch{}},[rates,lines,planDates,weeksOverride]);useCloudSync(STORAGE_KEY,saveData);
const perLine=useMemo(()=>{return lines.map(l=>{const lr=l.lineRates||rates;const wt=calcWeeklyCost(l,lr);const weeklyGST=wt*(lr.gstRate||0);const weeklyWithGST=wt+weeklyGST;const basePlanCost=calcDayCountPlanCost(l,planDates.start,planDates.end,planWeeks,lr)*(1+(lr.gstRate||0));const phImpact=calcPHImpact(l,holidays,lr);const phAdjustment=phImpact.extraCost-phImpact.savedCost;const planTotal=basePlanCost+phAdjustment;const remaining=l.totalFunding-planTotal;const totalClaimed=(l.claims||[]).reduce((a:number,c:Claim)=>a+c.amount,0);const actualRemaining=l.totalFunding-totalClaimed;return{...l,weeklyTotal:wt,weeklyGST,weeklyWithGST,basePlanCost,phImpact,phAdjustment,planTotal,remaining,totalClaimed,actualRemaining}})},[lines,rates,planWeeks,holidays]);
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
function addLine(){setLines(prev=>[...prev,{id:uid(),code:"01",description:"New Support Line",totalFunding:0,ratio:"1:1",excludedHolidays:[],roster:defaultRoster(),activeSleepoverHours:0,activeSleepoverFreq:"every",fixedSleepovers:0,fixedSleepoverFreq:"every",kmsPerWeek:0,kmRate:0.99,kmFreq:"every",claims:[],lineRates:NDIS_RATES_2025_26}])}
function updateLineCode(id:string,code:string){setLines(prev=>prev.map(l=>l.id!==id?l:{...l,code,lineRates:getPresetRates(code)}))}
function deleteLine(id:string){setLines(prev=>(prev.length<=1?prev:prev.filter(l=>l.id!==id)))}
const[openClaimsLines,setOpenClaimsLines]=useState<Set<string>>(new Set());
const[openRatesLines,setOpenRatesLines]=useState<Set<string>>(new Set());
function toggleRates(id:string){setOpenRatesLines(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n})}
const[addClaimForm,setAddClaimForm]=useState<{lineId:string;date:string;amount:string;note:string}|null>(null);
function toggleClaims(id:string){setOpenClaimsLines(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n})}
function addClaim(lineId:string,date:string,amount:number,note:string){setLines(prev=>prev.map(l=>l.id!==lineId?l:{...l,claims:[...(l.claims||[]),{id:uid(),date,amount,note}]}))}
function deleteClaim(lineId:string,claimId:string){setLines(prev=>prev.map(l=>l.id!==lineId?l:{...l,claims:(l.claims||[]).filter((c:Claim)=>c.id!==claimId)}))}
const[uploadingPlan,setUploadingPlan]=useState(false);
const[planExtract,setPlanExtract]=useState<any>(null);
const[planUploadError,setPlanUploadError]=useState<string|null>(null);
const[providerDetails,setProviderDetails]=useState<ProviderDetails>({orgName:"",abn:"",contactName:"",email:"",phone:"",address:"",registrationNumber:""});
const[showSAModal,setShowSAModal]=useState(false);
const[saSpecificReqs,setSaSpecificReqs]=useState({behavioursOfConcern:false,regulatedRestrictivePractice:false,medicationManagement:false});
const[saEstFee,setSaEstFee]=useState("");
const[saItemNumbers,setSaItemNumbers]=useState<{[k:string]:string}>({});
const[showClinicalModal,setShowClinicalModal]=useState(false);
const[clinicalPractitioner,setClinicalPractitioner]=useState({name:"",title:"",qualifications:"",org:"",phone:"",email:""});
const[clinicalOverview,setClinicalOverview]=useState("");
const[clinicalPriceItems,setClinicalPriceItems]=useState<{id:string;itemCode:string;description:string;rate:number}[]>([{id:"cp1",itemCode:"15_056_0128_1_3",description:"Behaviour Support Practitioner",rate:193.99}]);
const[clinicalScheduleItems,setClinicalScheduleItems]=useState<{id:string;description:string;hours:number;rate:number;note:string}[]>([{id:"cs1",description:"",hours:0,rate:0,note:""}]);
useEffect(()=>{try{const raw=localStorage.getItem("kevria_provider_details");if(raw)setProviderDetails(p=>({...p,...JSON.parse(raw)}))}catch{}},[]);
useEffect(()=>{try{localStorage.setItem("kevria_provider_details",JSON.stringify(providerDetails))}catch{}},[providerDetails]);
useEffect(()=>{try{const raw=localStorage.getItem("kevria_item_numbers");if(raw)setSaItemNumbers(JSON.parse(raw))}catch{}},[]);
useEffect(()=>{try{localStorage.setItem("kevria_item_numbers",JSON.stringify(saItemNumbers))}catch{}},[saItemNumbers]);
useEffect(()=>{try{const raw=localStorage.getItem("kevria_clinical_prac");if(raw)setClinicalPractitioner((p:any)=>({...p,...JSON.parse(raw)}))}catch{}},[]);
useEffect(()=>{try{localStorage.setItem("kevria_clinical_prac",JSON.stringify(clinicalPractitioner))}catch{}},[clinicalPractitioner]);
const planFileRef=React.useRef<HTMLInputElement>(null);
async function handlePlanUpload(file:File){
  setUploadingPlan(true);setPlanUploadError(null);
  try{
    const {data:{session}}=await supabase.auth.getSession();
    const fd=new FormData();fd.append("pdf",file);
    const headers:HeadersInit=session?.access_token?{Authorization:"Bearer "+session.access_token}:{};
    const res=await fetch("/api/parse-plan",{method:"POST",body:fd,headers});
    const data=await res.json();
    if(data.error)throw new Error(data.error);
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
    let updated=[...prev];
    if(Array.isArray(planExtract.supportLines)&&planExtract.supportLines.length>0){
      const used=new Set<number>();
      for(const sl of planExtract.supportLines){
        const idx=updated.findIndex((_l:SupportLine,i:number)=>!used.has(i)&&_l.code===sl.code);
        if(idx>=0){updated[idx]={...updated[idx],totalFunding:sl.totalFunding,description:sl.description,lineRates:updated[idx].lineRates||getPresetRates(sl.code)};used.add(idx);}
        else{updated.push({id:uid(),code:sl.code,description:sl.description,totalFunding:sl.totalFunding,ratio:"1:1",excludedHolidays:[],roster:defaultRoster(),activeSleepoverHours:0,activeSleepoverFreq:"every",fixedSleepovers:0,fixedSleepoverFreq:"every",kmsPerWeek:0,kmRate:0.99,kmFreq:"every",claims:[],lineRates:getPresetRates(sl.code)});}
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
  out.push(row("Generated by","Kevria Kevria Calc | kevria.com"));
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
  out.push("Generated by Kevria Kevria Calc | kevria.com");
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
        +"<div style=\"font-weight:600;font-size:13px;margin-bottom:8px;color:#1a1150\">"+escapeHtml(l.description)
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
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;background:#f8fafc;color:#1e293b;font-size:13px}.header{background:linear-gradient(135deg,#1a1150 0%,#2d1b69 100%);color:white;padding:28px 40px;display:flex;justify-content:space-between;align-items:flex-start}.brand{display:flex;align-items:center;gap:8px;margin-bottom:6px}.brand-mark{font-size:20px;color:#d4a843}.brand-name{font-size:13px;color:#d4a843;font-weight:700;letter-spacing:.08em}.report-title{font-size:22px;font-weight:800;color:white}.header-right{text-align:right;font-size:11px;color:rgba(255,255,255,.55);line-height:1.6}.info-bar{background:white;border-bottom:3px solid #d4a843;padding:14px 40px;display:flex;flex-wrap:wrap;gap:32px}.info-item .lbl{font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;margin-bottom:2px}.info-item .val{font-size:13px;font-weight:700;color:#1e293b}.content{padding:28px 40px}.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px}.kpi-card{background:white;border-radius:10px;padding:16px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,.06)}.kpi-lbl{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;margin-bottom:5px}.kpi-val{font-size:19px;font-weight:800}.progress-card{background:white;border-radius:10px;padding:18px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,.06);margin-bottom:20px}.progress-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.progress-lbl{font-size:12px;font-weight:600;color:#475569}.badge{padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700}.bar-bg{background:#f1f5f9;border-radius:6px;height:12px;overflow:hidden}.bar-fill{height:100%;border-radius:6px}.bar-meta{display:flex;justify-content:space-between;margin-top:5px;font-size:10px;color:#94a3b8}.section-title{font-size:14px;font-weight:700;color:#1a1150;margin:22px 0 10px;padding-bottom:6px;border-bottom:2px solid #e2e8f0}table{width:100%;border-collapse:collapse;font-size:12px;background:white;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,.06);margin-bottom:4px}th{background:#1a1150;color:white;padding:9px 12px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;font-weight:600}td{padding:9px 12px;border-bottom:1px solid #f1f5f9;vertical-align:middle}tr:last-child td{border-bottom:none}tr:nth-child(even) td{background:#fafafa}.footer{margin-top:32px;background:#1a1150;color:rgba(255,255,255,.45);font-size:10px;padding:18px 40px;display:flex;justify-content:space-between;align-items:center;gap:20px}.footer a{color:#d4a843;text-decoration:none}@media print{body{background:white}.content{padding:16px}}</style>
</head><body>
<div class="header">
  <div><div class="brand"><span class="brand-mark">&#10022;</span><span class="brand-name">KEVRIA</span></div><div class="report-title">NDIS Budget Report</div></div>
  <div class="header-right"><div>Generated: ${escapeHtml(dt)}</div><div style="margin-top:4px;color:rgba(255,255,255,.3)">Rates: 2025&#8211;26 NDIS Price Guide</div></div>
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
    <div class="kpi-card"><div class="kpi-lbl">Plan Cost</div><div class="kpi-val" style="color:#1a1150">${escapeHtml(money(totals.planCost))}</div></div>
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
  <div>Powered by <a href="https://kevria.com"><strong>Kevria</strong></a> Kevria Calc</div>
  <div>Rates based on 2025&#8211;26 NDIS Price Guide. Verify with your plan manager before quoting. Not financial advice.</div>
</div>
<script>window.onload=function(){window.focus();window.print()}</script>
</body></html>`;
  const w=window.open("","_blank");
  if(!w){alert("Popup blocked. Please allow popups for this site.");return}
  w.document.open();
  w.document.write(html);
  w.document.close();
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
    const wkdOrdHrs=wkDays.reduce((s:number,d:string)=>{const r=l.roster[d];if(!r?.enabled||(r.hours||0)<=0)return s;const occ=countDayOccurrences(planDates.start,planDates.end,DAY_DOW[d])*(FREQ[r.frequency]?.multiplier||1);return s+(r.hours||0)*occ;},0);
    const wkdNightHrs=wkDays.reduce((s:number,d:string)=>{const r=l.roster[d];if(!r?.enabled||(r.nightHours||0)<=0)return s;const occ=countDayOccurrences(planDates.start,planDates.end,DAY_DOW[d])*(FREQ[r.frequency]?.multiplier||1);return s+(r.nightHours||0)*occ;},0);
    const satR=l.roster["sat"];const sunR=l.roster["sun"];
    const satOcc=satR?.enabled?countDayOccurrences(planDates.start,planDates.end,6)*(FREQ[satR.frequency]?.multiplier||1):0;
    const sunOcc=sunR?.enabled?countDayOccurrences(planDates.start,planDates.end,0)*(FREQ[sunR.frequency]?.multiplier||1):0;
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
    +"<td style=\"text-align:right;vertical-align:top;white-space:nowrap\">"+(r.price!==null?escapeHtml(money(r.price)):"&mdash;")+"</td>"
    +"<td style=\"text-align:right;vertical-align:top\">"+(r.hours!==null?r.hours:"&mdash;")+"</td>"
    +"<td style=\"text-align:right;vertical-align:top;white-space:nowrap;font-weight:700;color:#1a1150\">"+(r.total!==null?escapeHtml(money(r.total)):"&mdash;")+"</td>"
    +"</tr>";
  }).join("");

  const sreqs=saSpecificReqs;
  const specReqHtml=`<div style="margin-bottom:18px">
  <div style="font-size:8.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#1a1150;padding-bottom:5px;border-bottom:2px solid #1a1150;margin-bottom:10px">Specific Requirements</div>
  <table style="border:1.5px solid #1a1150;border-radius:6px;overflow:hidden;font-size:9pt;margin-bottom:0">
    <tbody>
      <tr><td style="padding:7px 12px;border-bottom:1px solid #e2e8f0;width:60%">Behaviours of Concern</td><td style="padding:7px 12px;border-bottom:1px solid #e2e8f0">${sreqs.behavioursOfConcern?"&#9745; Yes &nbsp;&nbsp;&#9744; No":"&#9744; Yes &nbsp;&nbsp;&#9745; No"}</td></tr>
      <tr><td style="padding:7px 12px;border-bottom:1px solid #e2e8f0">Regulated Restrictive Practice</td><td style="padding:7px 12px;border-bottom:1px solid #e2e8f0">${sreqs.regulatedRestrictivePractice?"&#9745; Yes &nbsp;&nbsp;&#9744; No":"&#9744; Yes &nbsp;&nbsp;&#9745; No"}</td></tr>
      <tr><td style="padding:7px 12px">Medication Management</td><td style="padding:7px 12px">${sreqs.medicationManagement?"&#9745; Yes &nbsp;&nbsp;&#9744; No":"&#9744; Yes &nbsp;&nbsp;&#9745; No"}</td></tr>
    </tbody>
  </table>
  </div>`;

  const estFeeHtml=estFee>0?`<div style="margin-bottom:18px;padding:12px 14px;border:1.5px solid #1a1150;border-radius:6px;display:flex;justify-content:space-between;align-items:center">
  <div style="font-size:9pt;color:#475569">The following establishment fee will be payable if completing +20 hours per week in services</div>
  <div style="font-size:12pt;font-weight:700;color:#1a1150;white-space:nowrap;margin-left:16px">${escapeHtml(money(estFee))}</div>
  </div>`:"";

  const grandTotal=supRows.reduce((s,r)=>s+(r.total||0),0)+(estFee||0);

  const html=`<!doctype html><html><head><meta charset="utf-8"/><title>Schedule of Supports - ${escapeHtml(pName)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;color:#1e293b;background:white;font-size:10pt;line-height:1.5}
.header{background:#1a1150;color:white;padding:14px 40px;display:flex;justify-content:space-between;align-items:center}
.brand{color:#d4a843;font-size:16px;font-weight:bold;letter-spacing:.05em}
.doc-label{font-size:9px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.12em;margin-top:2px}
.content{padding:24px 40px}
.doc-title{font-size:14pt;font-weight:700;color:#1a1150;text-align:center;margin-bottom:3px;text-transform:uppercase;letter-spacing:.06em}
.doc-ref{text-align:center;font-size:9pt;color:#64748b;margin-bottom:18px}
.details-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;margin-bottom:18px;border:1.5px solid #1a1150;border-radius:6px;overflow:hidden}
.det-col{padding:14px 18px}
.det-col+.det-col{border-left:1.5px solid #1a1150}
.det-label{font-size:7.5pt;text-transform:uppercase;letter-spacing:.12em;color:#94a3b8;margin-bottom:3px}
.det-name{font-size:11.5pt;font-weight:700;color:#1a1150;margin-bottom:4px}
.det-info{font-size:9pt;color:#475569;line-height:1.6}
.section-heading{font-size:8.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#1a1150;margin-bottom:8px;padding-bottom:5px;border-bottom:2px solid #1a1150}
table{width:100%;border-collapse:collapse;font-size:9.5pt;margin-bottom:10px}
thead tr{background:#1a1150}
thead th{color:white;padding:8px 10px;text-align:left;font-size:8pt;text-transform:uppercase;letter-spacing:.07em;font-weight:600}
tbody tr{border-bottom:1px solid #e2e8f0}
tbody tr:nth-child(even){background:#f8fafc}
tbody td{padding:9px 10px;vertical-align:top}
.total-row{background:#f1f5f9!important;border-top:2px solid #1a1150}
.total-row td{font-weight:700;padding:10px;font-size:10pt;color:#1a1150}
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
  <div style="text-align:right;font-size:9px;color:rgba(255,255,255,.55)"><div style="font-size:10.5px;color:white;font-weight:700;text-transform:uppercase;letter-spacing:.1em">Schedule of Supports</div><div style="margin-top:3px">Generated: ${escapeHtml(dt)}</div></div>
</div>
<div class="content">
  <div class="doc-title">Schedule of Supports</div>
  <div class="doc-ref">This schedule forms part of the Service Agreement between <strong>${escapeHtml(pd.orgName||"the Provider")}</strong> and <strong>${escapeHtml(pName)}</strong></div>

  <div class="details-grid">
    <div class="det-col">
      <div class="det-label">Participant</div>
      <div class="det-name">${escapeHtml(pName)}</div>
      <div class="det-info">${ndis!=="[NDIS Number]"?"NDIS Number: <strong>"+escapeHtml(ndis)+"</strong><br/>":""}Plan Period: <strong>${escapeHtml(planDates.start)}</strong> to <strong>${escapeHtml(planDates.end)}</strong><br/>State / Territory: ${escapeHtml(planDates.state)} &nbsp;|&nbsp; Duration: ${planWeeks.toFixed(1)} weeks</div>
    </div>
    <div class="det-col">
      <div class="det-label">Provider</div>
      <div class="det-name">${escapeHtml(pd.orgName||"[Provider]")}</div>
      <div class="det-info">${pd.abn?"ABN: "+escapeHtml(pd.abn)+"<br/>":""}${pd.registrationNumber?"NDIS Reg: "+escapeHtml(pd.registrationNumber)+"<br/>":""}${pd.contactName?escapeHtml(pd.contactName)+"<br/>":""}${pd.phone?escapeHtml(pd.phone)+" &nbsp;":""}${pd.email?"<a href='mailto:"+escapeHtml(pd.email)+"' style='color:#1a1150'>"+escapeHtml(pd.email)+"</a>":""}</div>
    </div>
  </div>

  ${specReqHtml}
  ${estFeeHtml}
  <div class="section-heading">Funded Supports &amp; Schedule</div>
  <table>
    <thead><tr>
      <th style="width:28%">Support Category</th>
      <th style="width:25%">Description of Service</th>
      <th style="width:13%;text-align:right">Price</th>
      <th style="width:13%;text-align:right">Hrs / Units</th>
      <th style="width:14%;text-align:right">Total Cost</th>
    </tr></thead>
    <tbody>
    ${supRowsHtml}
    <tr class="total-row"><td colspan="3">Total</td><td style="text-align:right">&mdash;</td><td style="text-align:right">${escapeHtml(money(grandTotal))}</td></tr>
    </tbody>
  </table>
  <div class="note">Prices per the NDIS Pricing Arrangements &amp; Price Limits (2025&#8211;26). Plan totals are estimates and may vary based on actual supports delivered. All prices are GST-inclusive where applicable.</div>

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
        const freq=r.frequency&&r.frequency!=="every"?`<div style="color:#94a3b8;font-size:7pt;margin-top:1px">${r.frequency==="fortnightly"?"ftn":"mth"}</div>`:"";
        const isSat=d==="sat",isSun=d==="sun";
        const dayColour=isSat?"#1e40af":isSun?"#7c3aed":"inherit";
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
  <div class="note" style="margin-top:6px">h = daytime hours &nbsp;|&nbsp; n = night hours &nbsp;|&nbsp; ftn = fortnightly &nbsp;|&nbsp; mth = monthly. Sat shown in blue, Sun in purple.</div>`;
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
  <div>Rates: 2025&#8211;26 NDIS Price Guide. Verify before quoting. Not financial advice.</div>
</div>
<script>window.onload=function(){window.focus();window.print()}</script>
</body></html>`;
  const w=window.open("","_blank");
  if(!w){alert("Popup blocked. Please allow popups for this site.");return}
  w.document.open();
  w.document.write(html);
  w.document.close();
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
  const overviewHtml=clinicalOverview.trim()?`<div style="margin-bottom:18px"><div style="font-size:8.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#1a1150;padding-bottom:5px;border-bottom:2px solid #1a1150;margin-bottom:12px">Overview</div><div style="font-size:9.5pt;color:#374151;line-height:1.7;white-space:pre-wrap">${escapeHtml(clinicalOverview.trim())}</div></div>`:"";
  const html=`<!doctype html><html><head><meta charset="utf-8"/><title>Clinical Schedule of Supports - ${escapeHtml(pName)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;color:#1e293b;background:white;font-size:10pt;line-height:1.5}
.header{background:#1a1150;color:white;padding:14px 40px;display:flex;justify-content:space-between;align-items:center}
.brand{color:#d4a843;font-size:16px;font-weight:bold;letter-spacing:.05em}
.doc-label{font-size:9px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.12em;margin-top:2px}
.content{padding:24px 40px}
.doc-title{font-size:14pt;font-weight:700;color:#1a1150;text-align:center;margin-bottom:3px;text-transform:uppercase;letter-spacing:.04em}
.doc-sub{text-align:center;font-size:10.5pt;font-weight:600;color:#475569;margin-bottom:18px}
.details-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;margin-bottom:18px;border:1.5px solid #1a1150;border-radius:6px;overflow:hidden}
.det-col{padding:14px 18px}
.det-col+.det-col{border-left:1.5px solid #1a1150}
.det-label{font-size:7.5pt;text-transform:uppercase;letter-spacing:.12em;color:#94a3b8;margin-bottom:3px}
.det-name{font-size:11.5pt;font-weight:700;color:#1a1150;margin-bottom:4px}
.det-info{font-size:9pt;color:#475569;line-height:1.6}
.section-heading{font-size:8.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#1a1150;margin-bottom:8px;padding-bottom:5px;border-bottom:2px solid #1a1150}
table{width:100%;border-collapse:collapse;font-size:9.5pt;margin-bottom:10px}
thead tr{background:#1a1150}
thead th{color:white;padding:8px 10px;text-align:left;font-size:8pt;text-transform:uppercase;letter-spacing:.07em;font-weight:600}
tbody tr{border-bottom:1px solid #e2e8f0}
tbody tr:nth-child(even){background:#f8fafc}
tbody td{padding:9px 10px;vertical-align:top}
.total-row{background:#f1f5f9!important;border-top:2px solid #1a1150}
.total-row td{font-weight:700;padding:10px;font-size:10pt;color:#1a1150}
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
  <div style="text-align:right;font-size:9px;color:rgba(255,255,255,.55)"><div style="font-size:10.5px;color:white;font-weight:700;text-transform:uppercase;letter-spacing:.1em">Clinical Schedule of Supports</div><div style="margin-top:3px">Generated: ${escapeHtml(dt)}</div></div>
</div>
<div class="content">
  <div class="doc-title">Schedule of Supports</div>
  <div class="doc-sub">${escapeHtml(titleHours)}-Hour Plan Package</div>

  <div class="details-grid">
    <div class="det-col">
      <div class="det-label">Participant</div>
      <div class="det-name">${escapeHtml(pName)}</div>
      <div class="det-info">${ndis!=="[NDIS Number]"?"NDIS Number: <strong>"+escapeHtml(ndis)+"</strong><br/>":""}Plan Period: <strong>${escapeHtml(planDates.start)}</strong> to <strong>${escapeHtml(planDates.end)}</strong><br/>Total Hours: <strong>${escapeHtml(titleHours)} hrs</strong> &nbsp;|&nbsp; Total Cost: <strong>${escapeHtml(money(grandTotal))}</strong></div>
    </div>
    <div class="det-col">
      <div class="det-label">Service Provider</div>
      <div class="det-name">${escapeHtml(cp.org||providerDetails.orgName||"[Provider]")}</div>
      <div class="det-info">${cp.name?"Practitioner: <strong>"+escapeHtml(cp.name)+"</strong><br/>":""}${cp.title?escapeHtml(cp.title)+"<br/>":""}${cp.phone?escapeHtml(cp.phone)+" &nbsp;":""}${cp.email?"<a href='mailto:"+escapeHtml(cp.email)+"' style='color:#1a1150'>"+escapeHtml(cp.email)+"</a>":""}</div>
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
  <div class="note">All services are delivered in accordance with the NDIS Pricing Arrangements &amp; Price Limits (2025&#8211;26). Total hours and costs are estimates based on assessed clinical need and may be adjusted following review.</div>

  <div class="section-heading" style="margin-top:16px">Practitioner Details &amp; Signatures</div>
  <div style="margin-bottom:18px">
    <div style="font-size:11pt;font-weight:700;color:#1a1150">${escapeHtml(cp.name||"[Practitioner Name]")}</div>
    ${cp.title?`<div style="font-size:9.5pt;color:#475569">${escapeHtml(cp.title)}</div>`:""}
    ${cp.qualifications?`<div style="font-size:9pt;color:#64748b;font-style:italic;margin-top:2px">${escapeHtml(cp.qualifications)}</div>`:""}
    <div style="font-size:9pt;color:#475569;margin-top:4px">${escapeHtml(cp.org||providerDetails.orgName||"")}${cp.phone?" &nbsp;|&nbsp; "+escapeHtml(cp.phone):""}${cp.email?" &nbsp;|&nbsp; <a href='mailto:"+escapeHtml(cp.email)+"' style='color:#1a1150'>"+escapeHtml(cp.email)+"</a>":""}</div>
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
  <div>Rates: 2025&#8211;26 NDIS Price Guide. Verify before quoting. Not financial advice.</div>
</div>
<script>window.onload=function(){window.focus();window.print()}</script>
</body></html>`;
  const w=window.open("","_blank");
  if(!w){alert("Popup blocked. Please allow popups for this site.");return}
  w.document.open();
  w.document.write(html);
  w.document.close();
}
const totalStatus=getBudgetStatus(totals.remaining,totals.totalFunding);
const showSil=calcMode==="sil"||calcMode==="both";
const showClinical=calcMode==="clinical"||calcMode==="both";
const clinicalTotal=clinicalServices.reduce((s,i)=>s+(i.hours||0)*(i.rate||0),0);
const clinicalRemaining=clinicalFunding-clinicalTotal;
const clinicalStatus=getBudgetStatus(clinicalRemaining,clinicalFunding);
const pace=useMemo(()=>{
  if(!planDates.start||!planDates.end||totals.totalFunding<=0)return null;
  const today=new Date();const start=new Date(planDates.start);const end=new Date(planDates.end);
  if(today<start)return{status:"not_started",pctElapsed:0,weeksElapsed:0,expectedSpend:0,projectedSpendToDate:0,variance:0};
  const effective=today>end?end:today;
  const weeksElapsed=(effective.getTime()-start.getTime())/(7*24*60*60*1000);
  const pctElapsed=Math.min(100,planWeeks>0?(weeksElapsed/planWeeks)*100:0);
  const expectedSpend=totals.totalFunding*(pctElapsed/100);
  const projectedSpendToDate=totals.weekly*weeksElapsed;
  const variance=projectedSpendToDate-expectedSpend;
  const pctDiff=expectedSpend>0?(variance/expectedSpend)*100:0;
  const ended=today>end;
  const status=ended?"ended":pctDiff>5?"over_pace":pctDiff<-5?"under_pace":"on_pace";
  return{status,pctElapsed,weeksElapsed,expectedSpend,projectedSpendToDate,variance,ended};
},[planDates,planWeeks,totals.totalFunding,totals.weekly]);
return(
<main className="min-h-screen" style={{background:"#0f0a30",color:"white"}}>
<div className="mx-auto max-w-6xl p-6">
<div className="flex items-center justify-between mb-2">
<div className="flex items-center gap-3"><span style={{fontSize:"1.5rem",color:"#d4a843"}}>✦</span><h1 className="text-3xl font-bold">Kevria Calc</h1></div>
{userEmail&&<span className="text-sm" style={{color:"#8080a0"}}>{userEmail}</span>}
</div>
<div className="text-sm mb-6" style={{color:"#6060a0"}}>Powered by <span style={{color:"#d4a843"}}>Kevria</span></div>

<div className="rounded-2xl p-6 mb-6" style={{background:"rgba(26,17,80,0.4)",border:"1px solid rgba(212,168,67,0.15)"}}>
<div className="flex items-center justify-between mb-4"><h2 className="text-xl font-semibold" style={{color:"#d4a843"}}>Plan Details</h2>{calcMode&&<button onClick={()=>setCalcMode(null)} style={{fontSize:"0.72rem",color:"#7090b0",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"6px",padding:"4px 10px",cursor:"pointer"}}>{calcMode==="sil"?"SIL / Core":calcMode==="clinical"?"Clinical / Therapy":"SIL + Clinical"} · change mode</button>}</div>
<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
<DateField label="Plan Start Date" value={planDates.start} onChange={v=>setPlanDates(p=>({...p,start:v}))}/>
<DateField label="Plan End Date" value={planDates.end} onChange={v=>setPlanDates(p=>({...p,end:v}))}/>
<SelectField label="State / Territory" value={planDates.state} options={STATES.map(s=>({value:s.value,label:s.label}))} onChange={v=>setPlanDates(p=>({...p,state:v}))}/>
</div>
<div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
<div className="rounded-xl p-3" style={{background:"rgba(212,168,67,0.1)",border:"1px solid rgba(212,168,67,0.2)"}}><div className="text-xs flex items-center justify-between" style={{color:"#b0a0d0"}}><span>Weeks of Support</span>{weeksOverride!==null&&<button onClick={()=>setWeeksOverride(null)} style={{color:"#d4a843",fontSize:"0.7rem",background:"none",border:"none",cursor:"pointer",padding:0}}>↺ reset</button>}</div><div className="flex items-center gap-2 mt-1"><input type="number" step="0.5" min="0.5" value={planWeeks} onChange={e=>{const v=num(e.target.value);if(v>=0.5)setWeeksOverride(v)}} onFocus={e=>e.target.select()} className="rounded px-2 py-0 outline-none text-lg font-bold w-20" style={{background:"rgba(26,17,80,0.6)",border:"1px solid rgba(212,168,67,0.3)",color:"#d4a843"}}/><span className="text-lg font-bold" style={{color:"#d4a843"}}>wks</span></div>{weeksOverride!==null&&<div className="text-xs mt-1" style={{color:"#6060a0"}}>From dates: {planWeeksCalc.toFixed(1)} wks</div>}</div>
<div className="rounded-xl p-3" style={{background:"rgba(212,168,67,0.1)",border:"1px solid rgba(212,168,67,0.2)"}}><div className="text-xs" style={{color:"#b0a0d0"}}>Public Holidays</div><div className="text-lg font-bold" style={{color:"#d4a843"}}>{holidays.length} days</div></div>
<div className="rounded-xl p-3" style={{background:"rgba(212,168,67,0.1)",border:"1px solid rgba(212,168,67,0.2)"}}><div className="text-xs" style={{color:"#b0a0d0"}}>State</div><div className="text-lg font-bold" style={{color:"#d4a843"}}>{planDates.state}</div></div>
</div>
{planDates.end&&planDates.start&&new Date(planDates.end)<=new Date(planDates.start)&&(<div className="mt-3 rounded-lg px-4 py-2 text-sm" style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",color:"#f87171"}}>⚠ Plan end date must be after the start date</div>)}
<div className="mt-4">
<div className="text-xs font-semibold mb-2" style={{color:"#6060a0",textTransform:"uppercase",letterSpacing:"0.06em"}}>Optional — Auto-fill from plan PDF</div>
<div className="flex items-center gap-3 flex-wrap">
<input ref={planFileRef} type="file" accept=".pdf,application/pdf" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)handlePlanUpload(f);e.target.value="";}}/>
<button onClick={()=>planFileRef.current?.click()} disabled={uploadingPlan} style={{background:"rgba(212,168,67,0.12)",border:"1px solid rgba(212,168,67,0.35)",color:"#d4a843",padding:"10px 18px",borderRadius:"8px",cursor:"pointer",fontWeight:"600",fontSize:"0.9rem",opacity:uploadingPlan?0.7:1}}>
{uploadingPlan?"⏳ Reading plan...":"📄 Upload NDIS Plan PDF"}
</button>
<span style={{color:"#6060a0",fontSize:"0.82rem"}}>Upload a plan PDF to auto-fill dates, state &amp; funding — or enter manually below</span>
{planUploadError&&<div className="w-full mt-1"><span style={{color:"#ef4444",fontSize:"0.85rem"}}>{planUploadError}</span></div>}
</div>
</div>
{holidays.length>0&&(<div className="mt-4"><div className="text-sm font-semibold mb-2" style={{color:"#b0a0d0"}}>Public Holidays in Plan Period:</div>
<div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">{holidays.map((h,i)=>(<div key={i} className="text-sm py-1 px-2 rounded" style={{background:"rgba(255,255,255,0.03)"}}><span style={{color:"#d4a843"}}>{h.date}</span> <span style={{color:"#8080a0"}}>({getDayName(h.dayOfWeek)})</span> <span style={{color:"#b0a0d0"}}>{h.name}</span></div>))}</div></div>)}
</div>

{showSil&&<><div className="rounded-2xl p-6 mb-6" style={{background:"linear-gradient(135deg, rgba(26,17,80,0.8), rgba(45,27,105,0.8))",border:"2px solid "+totalStatus.border}}>
<div className="flex items-center justify-between mb-4">
<div className="grid gap-2">
<div>Combined funding: <span className="font-semibold" style={{color:"#d4a843"}}>{money(totals.totalFunding)}</span></div>
<div>Weekly cost: <span className="font-semibold">{money(totals.weekly)}</span></div>
<div>PH adjustment: <span className="font-semibold" style={{color:totals.totalPH>0?"#ef4444":totals.totalPH<0?"#22c55e":"#b0a0d0"}}>{totals.totalPH>0?"+":""}{money(totals.totalPH)}</span></div>
<div>Plan cost ({planWeeks.toFixed(1)} wks): <span className="font-semibold">{money(totals.planCost)}</span></div>
{totals.totalClaimed>0&&<div>Actual claimed: <span className="font-semibold" style={{color:"#22c55e"}}>{money(totals.totalClaimed)}</span> <span style={{color:"#6060a0",fontSize:"0.85em"}}>({money(totals.actualRemaining)} remaining)</span></div>}
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
<button onClick={()=>setShowSAModal(true)} style={{padding:"10px 14px",background:"rgba(212,168,67,0.1)",border:"1px solid rgba(212,168,67,0.35)",borderRadius:"12px",cursor:"pointer",textAlign:"left"}}>
  <span style={{display:"block",color:"#d4a843",fontWeight:700,fontSize:"0.88rem"}}>📋 Roster / SIL / Core SoS</span>
  <span style={{display:"block",color:"#8070a0",fontSize:"0.72rem",marginTop:"2px"}}>Hourly roster — day, night, weekend rates</span>
</button>
<button onClick={()=>setShowClinicalModal(true)} style={{padding:"10px 14px",background:"rgba(100,150,212,0.1)",border:"1px solid rgba(100,150,212,0.35)",borderRadius:"12px",cursor:"pointer",textAlign:"left"}}>
  <span style={{display:"block",color:"#7eb8f7",fontWeight:700,fontSize:"0.88rem"}}>🏥 Clinical / Therapy SoS</span>
  <span style={{display:"block",color:"#6080a0",fontSize:"0.72rem",marginTop:"2px"}}>Behaviour support, allied health, therapy packages</span>
</button>
</div></div>

{pace&&pace.status!=="not_started"&&(()=>{
  const paceColors:{[k:string]:{color:string;bg:string;border:string;label:string}}={
    on_pace:{color:"#22c55e",bg:"rgba(34,197,94,0.1)",border:"rgba(34,197,94,0.3)",label:"On Pace"},
    over_pace:{color:"#ef4444",bg:"rgba(239,68,68,0.1)",border:"rgba(239,68,68,0.3)",label:"Spending Ahead of Pace"},
    under_pace:{color:"#f59e0b",bg:"rgba(245,158,11,0.1)",border:"rgba(245,158,11,0.3)",label:"Spending Behind Pace"},
    ended:{color:"#8080a0",bg:"rgba(128,128,160,0.1)",border:"rgba(128,128,160,0.3)",label:"Plan Ended"},
  };
  const pc=paceColors[pace.status];
  return(
    <div className="rounded-2xl p-6 mb-6" style={{background:"rgba(26,17,80,0.4)",border:"1px solid "+pc.border}}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-semibold" style={{color:"#d4a843"}}>Plan Progress</h2>
        <span className="text-sm font-semibold px-3 py-1 rounded-full" style={{background:pc.bg,color:pc.color,border:"1px solid "+pc.border}}>{pc.label}</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-5">
        <div className="rounded-xl p-3" style={{background:"rgba(15,10,48,0.5)",border:"1px solid rgba(212,168,67,0.1)"}}>
          <div className="text-xs mb-1" style={{color:"#b0a0d0"}}>Time elapsed</div>
          <div className="text-lg font-bold" style={{color:"#d4a843"}}>{pace.pctElapsed.toFixed(1)}%</div>
          <div className="text-xs" style={{color:"#6060a0"}}>{pace.weeksElapsed.toFixed(1)} of {planWeeks.toFixed(1)} weeks</div>
        </div>
        <div className="rounded-xl p-3" style={{background:"rgba(15,10,48,0.5)",border:"1px solid rgba(212,168,67,0.1)"}}>
          <div className="text-xs mb-1" style={{color:"#b0a0d0"}}>Expected spend by now</div>
          <div className="text-lg font-bold" style={{color:"white"}}>{money(pace.expectedSpend)}</div>
          <div className="text-xs" style={{color:"#6060a0"}}>based on time elapsed</div>
        </div>
        <div className="rounded-xl p-3" style={{background:"rgba(15,10,48,0.5)",border:"1px solid rgba(212,168,67,0.1)"}}>
          <div className="text-xs mb-1" style={{color:"#b0a0d0"}}>Projected spend to date</div>
          <div className="text-lg font-bold" style={{color:pc.color}}>{money(pace.projectedSpendToDate)}</div>
          <div className="text-xs" style={{color:"#6060a0"}}>
            {pace.variance>0?"+":""}{money(pace.variance)} vs expected
          </div>
        </div>
      </div>
      <div className="mb-1 text-xs" style={{color:"#b0a0d0"}}>Time through plan</div>
      <div style={{background:"rgba(255,255,255,0.08)",borderRadius:"6px",height:"10px",overflow:"hidden",marginBottom:"8px"}}>
        <div style={{width:pace.pctElapsed+"%",height:"100%",borderRadius:"6px",background:"linear-gradient(90deg,#d4a843,#f0c060)",transition:"width 0.3s"}}/>
      </div>
      <div className="mb-1 text-xs" style={{color:"#b0a0d0"}}>Budget consumed at this pace</div>
      <div style={{background:"rgba(255,255,255,0.08)",borderRadius:"6px",height:"10px",overflow:"hidden"}}>
        <div style={{width:Math.min(100,totals.totalFunding>0?(pace.projectedSpendToDate/totals.totalFunding)*100:0)+"%",height:"100%",borderRadius:"6px",background:"linear-gradient(90deg,"+pc.color+","+pc.color+"99)",transition:"width 0.3s"}}/>
      </div>
      {pace.status==="over_pace"&&<div className="mt-3 text-sm" style={{color:"#ef4444"}}>Your roster is costing more than expected for this point in the plan. At this rate the budget will run out before the plan ends.</div>}
      {pace.status==="under_pace"&&<div className="mt-3 text-sm" style={{color:"#f59e0b"}}>Spend is tracking below pace. This may indicate supports aren't being fully delivered — check if hours are being utilised.</div>}
    </div>
  );
})()}

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
const suggestions=getSuggestions(l,l.lineRates||rates);
const belowGuide=isBelowGuide(l.lineRates||rates,l.code);
const lineMode=getLineMode(l.code);
const rosterDays=lineMode==="weekday"?["mon","tue","wed","thu","fri"]:DAYS;
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
<TextField label="Code" value={l.code} onChange={v=>updateLineCode(l.id,v)}/>
<TextField label="Description" value={l.description} onChange={v=>updateLine(l.id,{description:v})}/>
<Field label="Total funding (AUD)" value={l.totalFunding} onChange={v=>updateLine(l.id,{totalFunding:v})} step={100}/>
<SelectField label="Support Ratio" value={l.ratio} options={Object.entries(RATIOS).map(([k,v])=>({value:k,label:v.label}))} onChange={v=>updateLine(l.id,{ratio:v})}/>
</div></div>

{lineMode==="lump"?(
<div className="rounded-xl p-4 lg:col-span-2" style={{background:"rgba(15,10,48,0.6)",border:"1px solid rgba(212,168,67,0.1)",display:"flex",flexDirection:"column",justifyContent:"center"}}>
<div className="text-sm font-semibold mb-2" style={{color:"#d4a843"}}>{CATEGORY_PRESETS[l.code]?.name||"Support Category"}</div>
<div className="text-sm mb-4" style={{color:"#8080a0"}}>This category covers lump sum items (equipment, modifications, transport, consumables). No roster needed — just set the total funding.</div>
<div className="text-sm" style={{color:"#b0a0d0"}}>Budget: <span className="font-semibold" style={{color:"#d4a843"}}>{money(l.totalFunding)}</span></div>
<div className="text-lg font-bold mt-2" style={{color:status.color}}>Remaining: {money(l.remaining)}</div>
</div>
):(
<div className="rounded-xl p-4 lg:col-span-2" style={{background:"rgba(15,10,48,0.6)",border:"1px solid rgba(212,168,67,0.1)"}}>
<div className="text-sm mb-3 font-semibold" style={{color:"#d4a843"}}>Weekly Roster{lineMode==="weekday"&&<span style={{color:"#6060a0",fontWeight:"normal",fontSize:"0.8rem",marginLeft:"8px"}}>Weekdays only</span>}</div>
<div className="grid gap-2">
{rosterDays.map(d=>{const r=l.roster[d];return(
<div key={d} className="flex items-center gap-2 py-1" style={{borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
<div onClick={()=>updateRosterDay(l.id,d,{enabled:!r.enabled})} style={{width:"22px",height:"22px",borderRadius:"4px",flexShrink:0,background:r.enabled?"#22c55e":"rgba(239,68,68,0.2)",border:"1px solid "+(r.enabled?"#22c55e":"rgba(239,68,68,0.4)"),display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:"12px",cursor:"pointer"}}>{r.enabled?"✓":""}</div>
<div style={{width:"80px",color:r.enabled?"#d4a843":"#505060",fontWeight:"600",fontSize:"0.85rem"}}>{DL[d]}</div>
<div className="flex items-center gap-1"><span className="text-xs" style={{color:"#8080a0"}}>Hrs:</span><SmallField value={r.hours} onChange={v=>updateRosterDay(l.id,d,{hours:v})} disabled={!r.enabled}/></div>
{lineMode==="full"&&<div className="flex items-center gap-1"><span className="text-xs" style={{color:"#8080a0"}}>Night:</span><SmallField value={r.nightHours} onChange={v=>updateRosterDay(l.id,d,{nightHours:v})} disabled={!r.enabled}/></div>}
<SmallSelect value={r.frequency} options={Object.entries(FREQ).map(([k,v])=>({value:k,label:v.label}))} onChange={v=>updateRosterDay(l.id,d,{frequency:v})} disabled={!r.enabled}/>
</div>)})}
</div>
<div className="mt-3 grid grid-cols-1 gap-2">
{lineMode==="full"&&<div className="flex items-center gap-2 flex-wrap"><span className="text-xs" style={{color:"#8080a0"}}>Active sleepover hrs/wk:</span><SmallField value={l.activeSleepoverHours} onChange={v=>updateLine(l.id,{activeSleepoverHours:v})}/><SmallSelect value={l.activeSleepoverFreq} options={Object.entries(FREQ).map(([k,v])=>({value:k,label:v.label}))} onChange={v=>updateLine(l.id,{activeSleepoverFreq:v})}/></div>}
{lineMode==="full"&&<div className="flex items-center gap-2 flex-wrap"><span className="text-xs" style={{color:"#8080a0"}}>Fixed sleepovers/wk:</span><SmallField value={l.fixedSleepovers} step={1} onChange={v=>updateLine(l.id,{fixedSleepovers:v})}/><SmallSelect value={l.fixedSleepoverFreq} options={Object.entries(FREQ).map(([k,v])=>({value:k,label:v.label}))} onChange={v=>updateLine(l.id,{fixedSleepoverFreq:v})}/></div>}
<div className="flex items-center gap-2 flex-wrap"><span className="text-xs" style={{color:"#8080a0"}}>KMs per week:</span><SmallField value={l.kmsPerWeek} step={1} onChange={v=>updateLine(l.id,{kmsPerWeek:v})}/><span className="text-xs" style={{color:"#8080a0"}}>@ $</span><SmallField value={l.kmRate} step={0.01} onChange={v=>updateLine(l.id,{kmRate:v})}/><span className="text-xs" style={{color:"#8080a0"}}>/km</span><SmallSelect value={l.kmFreq} options={Object.entries(FREQ).map(([k,v])=>({value:k,label:v.label}))} onChange={v=>updateLine(l.id,{kmFreq:v})}/></div>
</div>
<div className="mt-4 text-sm" style={{color:"#b0a0d0"}}>
<div>Weekly total: <span className="font-semibold" style={{color:"white"}}>{money(l.weeklyWithGST)}</span></div>
{lineMode==="full"&&<div>KM cost/wk: <span className="font-semibold" style={{color:"white"}}>{money(l.kmsPerWeek*l.kmRate*(FREQ[l.kmFreq]?.multiplier||1))}</span></div>}
<div>Base plan cost: <span className="font-semibold" style={{color:"white"}}>{money(l.basePlanCost)}</span></div>
{lineMode==="full"&&<div>PH adjustment: <span className="font-semibold" style={{color:l.phAdjustment>0?"#ef4444":l.phAdjustment<0?"#22c55e":"#b0a0d0"}}>{l.phAdjustment>0?"+":""}{money(l.phAdjustment)}</span></div>}
<div className="mt-1">Plan total: <span className="font-semibold" style={{color:"white"}}>{money(l.planTotal)}</span></div>
<div>Ratio: <span className="font-semibold" style={{color:"#d4a843"}}>{RATIOS[l.ratio]?.label||l.ratio}</span></div>
<div className="text-lg font-bold mt-2" style={{color:status.color}}>Remaining: {money(l.remaining)}</div>
</div></div>
)}
</div>

{lineMode!=="lump"&&<div className="mt-4 rounded-xl overflow-hidden" style={{border:"1px solid "+(belowGuide?"rgba(245,158,11,0.4)":"rgba(212,168,67,0.15)")}}>
<button onClick={()=>toggleRates(l.id)} className="w-full flex items-center justify-between px-4 py-3" style={{background:belowGuide?"rgba(245,158,11,0.06)":"rgba(212,168,67,0.04)",cursor:"pointer",border:"none",color:"white",textAlign:"left"}}>
  <span className="text-sm font-semibold" style={{color:belowGuide?"#f59e0b":"#d4a843"}}>
    Hourly Rates{belowGuide&&<span style={{marginLeft:"8px",fontSize:"0.78rem"}}>⚠ Some rates below price guide</span>}
    <span style={{color:"#6060a0",fontWeight:"normal",marginLeft:"8px",fontSize:"0.8rem"}}>Weekday: {money(l.lineRates?.weekdayOrd||0)}/hr{(l.lineRates?.sat||0)>0?" · Sat: "+money(l.lineRates.sat)+"/hr":""}</span>
  </span>
  <span style={{color:"#d4a843",fontSize:"0.8rem"}}>{openRatesLines.has(l.id)?"▲":"▼"}</span>
</button>
{openRatesLines.has(l.id)&&(
<div className="p-4" style={{background:"rgba(15,10,48,0.4)"}}>
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
          <div className="text-xs mb-1 flex items-center gap-2" style={{color:warn?"#f59e0b":"#b0a0d0"}}>
            {label}
            {guideVal>0&&<span style={{color:warn?"#f59e0b":"#505070",fontSize:"0.75rem"}}>guide: ${guideVal}</span>}
            {warn&&<span style={{color:"#f59e0b",fontSize:"0.75rem"}}>⚠ below</span>}
          </div>
          <input type="number" step={0.01} value={Number.isFinite(curVal)?curVal:0}
            onChange={e=>updateLine(l.id,{lineRates:{...l.lineRates,[key]:num(e.target.value)}})}
            onFocus={e=>e.target.select()}
            className="w-full rounded-lg px-3 py-2 outline-none"
            style={{background:"rgba(26,17,80,0.6)",border:"1px solid "+(warn?"rgba(245,158,11,0.4)":"rgba(212,168,67,0.2)"),color:warn?"#f59e0b":"white"}}
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

<div className="mt-4 rounded-xl overflow-hidden" style={{border:"1px solid rgba(34,197,94,0.2)"}}>
<button onClick={()=>toggleClaims(l.id)} className="w-full flex items-center justify-between px-4 py-3" style={{background:"rgba(34,197,94,0.05)",cursor:"pointer",border:"none",color:"white",textAlign:"left"}}>
  <span className="text-sm font-semibold" style={{color:"#22c55e"}}>Claims / Actual Spend ({(l.claims||[]).length}){(l as any).totalClaimed>0&&<span style={{color:"#b0a0d0",fontWeight:"normal"}}> — {money((l as any).totalClaimed)} claimed, {money((l as any).actualRemaining)} remaining</span>}</span>
  <span style={{color:"#22c55e",fontSize:"0.8rem"}}>{openClaimsLines.has(l.id)?"▲":"▼"}</span>
</button>
{openClaimsLines.has(l.id)&&(
<div className="p-4" style={{background:"rgba(15,10,48,0.4)"}}>
  {(l.claims||[]).length===0&&<div className="text-sm mb-3" style={{color:"#6060a0"}}>No claims logged yet.</div>}
  {(l.claims||[]).length>0&&(
    <div className="mb-3">
      <div className="grid text-xs mb-1 px-2" style={{gridTemplateColumns:"110px 1fr 100px 32px",color:"#8080a0",gap:"8px"}}>
        <span>Date</span><span>Note</span><span className="text-right">Amount</span><span></span>
      </div>
      {(l.claims||[]).map((c:Claim)=>(
        <div key={c.id} className="grid items-center text-sm py-2 px-2 rounded mb-1" style={{gridTemplateColumns:"110px 1fr 100px 32px",gap:"8px",background:"rgba(34,197,94,0.04)",border:"1px solid rgba(34,197,94,0.1)"}}>
          <span style={{color:"#b0a0d0"}}>{c.date}</span>
          <span style={{color:"#c0c0e0"}}>{c.note||"—"}</span>
          <span className="text-right font-semibold" style={{color:"#22c55e"}}>{money(c.amount)}</span>
          <button onClick={()=>deleteClaim(l.id,c.id)} style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",color:"#ef4444",borderRadius:"4px",cursor:"pointer",fontSize:"0.75rem",padding:"2px 6px"}}>✕</button>
        </div>
      ))}
      <div className="text-right text-sm font-bold mt-2" style={{color:"#22c55e"}}>Total claimed: {money((l as any).totalClaimed)}</div>
    </div>
  )}
  {addClaimForm?.lineId===l.id?(
    <div className="rounded-xl p-3 mt-2" style={{background:"rgba(34,197,94,0.05)",border:"1px solid rgba(34,197,94,0.2)"}}>
      <div className="grid gap-2 sm:grid-cols-3 mb-2">
        <div><div className="text-xs mb-1" style={{color:"#b0a0d0"}}>Date</div><input type="date" value={addClaimForm!.date} onChange={e=>setAddClaimForm(f=>f?{...f,date:e.target.value}:f)} className="w-full rounded-lg px-2 py-1 outline-none text-sm" style={{background:"rgba(15,10,48,0.6)",border:"1px solid rgba(34,197,94,0.2)",color:"white"}}/></div>
        <div><div className="text-xs mb-1" style={{color:"#b0a0d0"}}>Amount ($)</div><input type="number" step="0.01" value={addClaimForm!.amount} onChange={e=>setAddClaimForm(f=>f?{...f,amount:e.target.value}:f)} onFocus={e=>e.target.select()} placeholder="0.00" className="w-full rounded-lg px-2 py-1 outline-none text-sm" style={{background:"rgba(15,10,48,0.6)",border:"1px solid rgba(34,197,94,0.2)",color:"white"}}/></div>
        <div><div className="text-xs mb-1" style={{color:"#b0a0d0"}}>Note (optional)</div><input value={addClaimForm!.note} onChange={e=>setAddClaimForm(f=>f?{...f,note:e.target.value}:f)} placeholder="e.g. Invoice #123" className="w-full rounded-lg px-2 py-1 outline-none text-sm" style={{background:"rgba(15,10,48,0.6)",border:"1px solid rgba(34,197,94,0.2)",color:"white"}}/></div>
      </div>
      <div className="flex gap-2">
        <button onClick={()=>{const a=parseFloat(addClaimForm!.amount);if(!a||a<=0)return;addClaim(l.id,addClaimForm!.date,a,addClaimForm!.note);setAddClaimForm(null)}} style={{padding:"6px 16px",background:"rgba(34,197,94,0.2)",border:"1px solid rgba(34,197,94,0.4)",color:"#22c55e",borderRadius:"6px",cursor:"pointer",fontSize:"0.85rem",fontWeight:"600"}}>Save</button>
        <button onClick={()=>setAddClaimForm(null)} style={{padding:"6px 16px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#b0b0d0",borderRadius:"6px",cursor:"pointer",fontSize:"0.85rem"}}>Cancel</button>
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
{suggestions.map((s,i)=>(<div key={i} className="text-sm py-1" style={{color:"#b0a0d0"}}>- {s}</div>))}
</div>)}
</div>)})}
</div>

{planExtract&&(
<div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.82)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}}>
<div style={{background:"#1a1150",border:"1px solid rgba(212,168,67,0.4)",borderRadius:"16px",padding:"32px",maxWidth:"560px",width:"90%",maxHeight:"80vh",overflowY:"auto"}}>
<h3 style={{fontSize:"1.3rem",fontWeight:"700",color:"#d4a843",marginBottom:"16px"}}>Plan extracted — confirm to apply</h3>
{planExtract.planStart&&<div style={{color:"#b0a0d0",marginBottom:"6px",fontSize:"0.9rem"}}>Plan period: <span style={{color:"white",fontWeight:"600"}}>{planExtract.planStart} → {planExtract.planEnd||"?"}</span></div>}
{planExtract.state&&<div style={{color:"#b0a0d0",marginBottom:"6px",fontSize:"0.9rem"}}>State: <span style={{color:"white",fontWeight:"600"}}>{planExtract.state}</span></div>}
{planExtract.participantName&&<div style={{color:"#b0a0d0",marginBottom:"6px",fontSize:"0.9rem"}}>Participant: <span style={{color:"white",fontWeight:"600"}}>{planExtract.participantName}</span></div>}
{Array.isArray(planExtract.supportLines)&&planExtract.supportLines.length>0&&(
<div style={{marginTop:"16px"}}>
<div style={{color:"#d4a843",fontWeight:"600",marginBottom:"8px",fontSize:"0.95rem"}}>Support line funding:</div>
{planExtract.supportLines.map((sl:any,i:number)=>(
<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",marginBottom:"6px",background:"rgba(212,168,67,0.05)",border:"1px solid rgba(212,168,67,0.15)",borderRadius:"8px"}}>
<div><span style={{color:"#d4a843",fontWeight:"600",marginRight:"8px"}}>{sl.code}</span><span style={{color:"#c0c0e0",fontSize:"0.9rem"}}>{sl.description}</span></div>
<div style={{color:"white",fontWeight:"700",flexShrink:0,marginLeft:"12px"}}>{money(sl.totalFunding)}</div>
</div>
))}
</div>
)}
{Array.isArray(planExtract.scheduleOfSupports)&&planExtract.scheduleOfSupports.length>0&&(
<div style={{marginTop:"16px"}}>
<div style={{color:"#d4a843",fontWeight:"600",marginBottom:"8px",fontSize:"0.95rem"}}>Schedule of Supports:</div>
<div style={{overflowX:"auto"}}>
<table style={{width:"100%",borderCollapse:"collapse",fontSize:"0.78rem"}}>
<thead><tr style={{color:"#b0a0d0",borderBottom:"1px solid rgba(212,168,67,0.2)"}}>
<th style={{textAlign:"left",padding:"4px 8px",fontWeight:"600"}}>Item #</th>
<th style={{textAlign:"left",padding:"4px 8px",fontWeight:"600"}}>Description</th>
<th style={{textAlign:"right",padding:"4px 8px",fontWeight:"600"}}>Price</th>
<th style={{textAlign:"right",padding:"4px 8px",fontWeight:"600"}}>Hours</th>
<th style={{textAlign:"right",padding:"4px 8px",fontWeight:"600"}}>Total</th>
</tr></thead>
<tbody>{planExtract.scheduleOfSupports.map((item:any,i:number)=>(
<tr key={i} style={{borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
<td style={{padding:"4px 8px",color:"#d4a843",whiteSpace:"nowrap",fontFamily:"monospace"}}>{item.itemNumber}</td>
<td style={{padding:"4px 8px",color:"#c0c0e0"}}>{item.supportCategory}</td>
<td style={{padding:"4px 8px",color:"white",textAlign:"right",whiteSpace:"nowrap"}}>{money(item.price)}</td>
<td style={{padding:"4px 8px",color:"#c0c0e0",textAlign:"right"}}>{item.hoursRequired??"-"}</td>
<td style={{padding:"4px 8px",color:"white",textAlign:"right",whiteSpace:"nowrap"}}>{item.totalCost?money(item.totalCost):"-"}</td>
</tr>
))}</tbody>
</table>
</div>
</div>
)}
{planExtract.specificRequirements&&(
<div style={{marginTop:"12px",padding:"10px 12px",background:"rgba(212,168,67,0.05)",border:"1px solid rgba(212,168,67,0.15)",borderRadius:"8px",fontSize:"0.85rem"}}>
<div style={{color:"#d4a843",fontWeight:"600",marginBottom:"6px"}}>Specific Requirements:</div>
{([["Behaviours of Concern",planExtract.specificRequirements.behavioursOfConcern],["Regulated Restrictive Practice",planExtract.specificRequirements.regulatedRestrictivePractice],["Medication Management",planExtract.specificRequirements.medicationManagement]] as [string,boolean|null][]).filter(([,v])=>v!==null&&v!==undefined).map(([label,val],i)=>(
<div key={i} style={{color:"#c0c0e0"}}>{label}: <span style={{color:val?"#ef4444":"#22c55e",fontWeight:"600"}}>{val?"Yes":"No"}</span></div>
))}
{planExtract.establishmentFee?<div style={{color:"#c0c0e0",marginTop:"4px"}}>Establishment Fee: <span style={{color:"white",fontWeight:"600"}}>{money(planExtract.establishmentFee)}</span></div>:null}
</div>
)}
<p style={{color:"#6060a0",fontSize:"0.82rem",marginTop:"16px"}}>Existing roster and claims data will be preserved. Funding amounts and rates will be updated.</p>
<div style={{display:"flex",gap:"12px",marginTop:"20px"}}>
<button onClick={applyPlanExtract} style={{flex:1,padding:"12px",backgroundColor:"#d4a843",color:"#1a1150",border:"none",borderRadius:"8px",cursor:"pointer",fontWeight:"700",fontSize:"1rem"}}>Apply to Calculator</button>
<button onClick={()=>setPlanExtract(null)} style={{flex:1,padding:"12px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#b0b0d0",borderRadius:"8px",cursor:"pointer"}}>Cancel</button>
</div>
</div>
</div>
)}
</>}

{showClinical&&(
<div className="rounded-2xl p-6 mb-6" style={{background:"rgba(10,20,45,0.7)",border:"1px solid rgba(100,150,212,0.25)"}}>
  <div className="flex items-center justify-between mb-5">
    <h2 className="text-xl font-semibold" style={{color:"#7eb8f7"}}>🏥 Clinical / Therapy Services</h2>
    {calcMode==="clinical"&&<button onClick={()=>setCalcMode(null)} style={{fontSize:"0.72rem",color:"#7090b0",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"6px",padding:"4px 10px",cursor:"pointer"}}>change mode</button>}
  </div>

  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-5">
    <div>
      <div className="text-xs font-semibold mb-1" style={{color:"#7090b0"}}>Total Clinical Funding</div>
      <input type="number" step="0.01" min="0" value={clinicalFunding||""} onChange={e=>setClinicalFunding(num(e.target.value))} onFocus={e=>e.target.select()} placeholder="0.00"
        className="w-full rounded-lg px-3 py-2 outline-none"
        style={{background:"rgba(15,10,48,0.6)",border:"1px solid rgba(100,150,212,0.3)",color:"white",fontSize:"1.1rem",fontWeight:600}}/>
    </div>
    <div className="rounded-xl p-3" style={{background:"rgba(100,150,212,0.07)",border:"1px solid rgba(100,150,212,0.2)"}}>
      <div className="text-xs" style={{color:"#7090b0"}}>Total Service Hours</div>
      <div className="text-lg font-bold" style={{color:"#7eb8f7"}}>{(()=>{const h=clinicalServices.reduce((s,i)=>s+(i.hours||0),0);return(h%1===0?h:h.toFixed(1))+"h"})()}</div>
      <div className="text-xs mt-1" style={{color:"#506080"}}>Est. cost: {money(clinicalTotal)}</div>
    </div>
  </div>

  <div className="flex items-center justify-between mb-2">
    <div className="text-xs font-semibold" style={{color:"#7090b0",textTransform:"uppercase",letterSpacing:"0.06em"}}>Services</div>
    <button onClick={()=>setClinicalServices(p=>[...p,{id:uid(),code:"15",description:"",hours:0,rate:CATEGORY_PRESETS["15"].rates.weekdayOrd,note:""}])} style={{background:"rgba(100,150,212,0.12)",border:"1px solid rgba(100,150,212,0.3)",color:"#7eb8f7",padding:"5px 12px",borderRadius:"8px",cursor:"pointer",fontSize:"0.8rem",fontWeight:600}}>+ Add service</button>
  </div>

  <div className="rounded-xl mb-5" style={{border:"1px solid rgba(100,150,212,0.15)",overflow:"hidden"}}>
    <div className="grid px-3 py-2" style={{gridTemplateColumns:"1.8fr 2.5fr 1fr 1.3fr 1.5fr auto",gap:"8px",background:"rgba(100,150,212,0.07)"}}>
      <div className="text-xs font-semibold" style={{color:"#7090b0"}}>Category</div>
      <div className="text-xs font-semibold" style={{color:"#7090b0"}}>Service Description</div>
      <div className="text-xs font-semibold" style={{color:"#7090b0"}}>Hours</div>
      <div className="text-xs font-semibold" style={{color:"#7090b0"}}>Rate / hr ($)</div>
      <div className="text-xs font-semibold" style={{color:"#7090b0"}}>Note</div>
      <div/>
    </div>
    {clinicalServices.map((si,idx)=>(
      <div key={si.id} className="grid px-3 py-2" style={{gridTemplateColumns:"1.8fr 2.5fr 1fr 1.3fr 1.5fr auto",gap:"8px",alignItems:"center",borderTop:"1px solid rgba(100,150,212,0.1)"}}>
        <select value={si.code||"15"} onChange={e=>{const i=idx;const c=e.target.value;const preset=CATEGORY_PRESETS[c]?.rates.weekdayOrd||0;setClinicalServices(p=>p.map((x,j)=>j===i?{...x,code:c,rate:preset,description:x.description||CATEGORY_PRESETS[c]?.name||""}:x))}}
          className="rounded px-2 py-1 text-xs outline-none" style={{background:"rgba(15,10,48,0.5)",border:"1px solid rgba(100,150,212,0.15)",color:"white"}}>
          {[["07","07 — Support Coordination"],["11","11 — Health & Wellbeing"],["12","12 — Improved Learning"],["13","13 — Life Choices"],["14","14 — Daily Living"],["15","15 — Relationships"]].map(([v,l])=>(
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <input value={si.description} onChange={e=>{const i=idx;setClinicalServices(p=>p.map((x,j)=>j===i?{...x,description:e.target.value}:x))}} placeholder="e.g. Comprehensive BSP Development"
          className="rounded px-2 py-1 text-sm outline-none w-full" style={{background:"rgba(15,10,48,0.5)",border:"1px solid rgba(100,150,212,0.15)",color:"white"}}/>
        <input type="number" step="0.5" min="0" value={si.hours||""} onChange={e=>{const i=idx;setClinicalServices(p=>p.map((x,j)=>j===i?{...x,hours:num(e.target.value)}:x))}} onFocus={e=>e.target.select()} placeholder="0"
          className="rounded px-2 py-1 text-sm outline-none" style={{background:"rgba(15,10,48,0.5)",border:"1px solid rgba(100,150,212,0.15)",color:"white"}}/>
        <input type="number" step="0.01" min="0" value={si.rate||""} onChange={e=>{const i=idx;setClinicalServices(p=>p.map((x,j)=>j===i?{...x,rate:num(e.target.value)}:x))}} onFocus={e=>e.target.select()} placeholder="0.00"
          className="rounded px-2 py-1 text-sm outline-none" style={{background:"rgba(15,10,48,0.5)",border:"1px solid rgba(100,150,212,0.15)",color:"white"}}/>
        <input value={si.note} onChange={e=>{const i=idx;setClinicalServices(p=>p.map((x,j)=>j===i?{...x,note:e.target.value}:x))}} placeholder="e.g. per term"
          className="rounded px-2 py-1 text-sm outline-none w-full" style={{background:"rgba(15,10,48,0.5)",border:"1px solid rgba(100,150,212,0.15)",color:"white"}}/>
        <button onClick={()=>{const i=idx;setClinicalServices(p=>p.filter((_,j)=>j!==i))}} style={{color:"#ef4444",background:"none",border:"none",cursor:"pointer",fontSize:"1rem",padding:"2px 4px"}}>✕</button>
      </div>
    ))}
    {clinicalServices.length===0&&<div className="px-3 py-5 text-sm text-center" style={{color:"#506080"}}>No services yet — click &ldquo;+ Add service&rdquo; to start</div>}
  </div>

  {clinicalFunding>0&&(
  <div className="rounded-xl p-4 mb-5" style={{background:"linear-gradient(135deg,rgba(10,20,50,0.9),rgba(15,30,65,0.9))",border:`2px solid ${clinicalStatus.border}`}}>
    <div className="flex items-center justify-between mb-3">
      <div className="grid gap-1">
        <div className="text-sm" style={{color:"#7090b0"}}>Total funding: <span style={{color:"#7eb8f7",fontWeight:600}}>{money(clinicalFunding)}</span></div>
        <div className="text-sm" style={{color:"#7090b0"}}>Service cost: <span style={{color:"white",fontWeight:600}}>{money(clinicalTotal)}</span></div>
      </div>
      <div className="text-sm font-semibold px-3 py-1 rounded-full" style={{background:clinicalStatus.bg,color:clinicalStatus.color,border:`1px solid ${clinicalStatus.border}`}}>{clinicalStatus.label}</div>
    </div>
    <div className="text-2xl font-bold mb-3" style={{color:clinicalStatus.color}}>Remaining: {money(clinicalRemaining)}</div>
    <div style={{background:"rgba(255,255,255,0.08)",borderRadius:"8px",height:"10px",overflow:"hidden"}}>
      <div style={{width:Math.min(100,clinicalFunding>0?(clinicalTotal/clinicalFunding)*100:0)+"%",height:"100%",borderRadius:"8px",background:`linear-gradient(90deg,${clinicalStatus.color},${clinicalStatus.color}99)`,transition:"width 0.3s"}}/>
    </div>
  </div>
  )}

  <button onClick={()=>{if(clinicalServices.length>0)setClinicalScheduleItems(clinicalServices.map(s=>({...s})));setShowClinicalModal(true)}} style={{padding:"10px 16px",background:"rgba(100,150,212,0.1)",border:"1px solid rgba(100,150,212,0.35)",borderRadius:"12px",cursor:"pointer",textAlign:"left"}}>
    <span style={{display:"block",color:"#7eb8f7",fontWeight:700,fontSize:"0.88rem"}}>🏥 Generate Clinical Schedule of Supports</span>
    <span style={{display:"block",color:"#506080",fontSize:"0.72rem",marginTop:"2px"}}>Services pre-filled from your list above</span>
  </button>
</div>
)}

<div className="text-xs mt-8" style={{color:"#505080"}}>Auto-saves in your browser.</div>
<div className="text-xs mt-2 mb-8" style={{color:"#6060a0"}}>Powered by <span style={{color:"#d4a843"}}>Kevria</span></div>
</div>

{calcMode===null&&(
<div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(8,4,30,0.97)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:"24px"}}>
  <div style={{maxWidth:"660px",width:"100%",textAlign:"center"}}>
    <div style={{fontSize:"1.8rem",color:"#d4a843",marginBottom:"12px"}}>✦</div>
    <h2 style={{fontSize:"1.5rem",fontWeight:800,color:"white",marginBottom:"8px"}}>What are you calculating for{participantName?" "+participantName:""}?</h2>
    <p style={{color:"#7060a0",fontSize:"0.88rem",marginBottom:"32px",lineHeight:1.6}}>Choose the type of support. This sets up the right calculator view.<br/>You can change it any time from the Plan Details section.</p>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"14px"}}>
      <button onClick={()=>setCalcMode("sil")} style={{padding:"28px 16px",background:"rgba(212,168,67,0.07)",border:"2px solid rgba(212,168,67,0.25)",borderRadius:"16px",cursor:"pointer",textAlign:"center"}}>
        <div style={{fontSize:"2.2rem",marginBottom:"12px"}}>🏠</div>
        <div style={{color:"#d4a843",fontWeight:700,fontSize:"1rem",marginBottom:"8px"}}>SIL / Core Supports</div>
        <div style={{color:"#7060a0",fontSize:"0.78rem",lineHeight:1.6}}>Roster-based with day, night, weekend &amp; public holiday rates</div>
      </button>
      <button onClick={()=>setCalcMode("clinical")} style={{padding:"28px 16px",background:"rgba(100,150,212,0.07)",border:"2px solid rgba(100,150,212,0.25)",borderRadius:"16px",cursor:"pointer",textAlign:"center"}}>
        <div style={{fontSize:"2.2rem",marginBottom:"12px"}}>🏥</div>
        <div style={{color:"#7eb8f7",fontWeight:700,fontSize:"1rem",marginBottom:"8px"}}>Clinical / Therapy</div>
        <div style={{color:"#506080",fontSize:"0.78rem",lineHeight:1.6}}>Behaviour support, allied health, therapy — flat hourly packages</div>
      </button>
      <button onClick={()=>setCalcMode("both")} style={{padding:"28px 16px",background:"rgba(100,200,130,0.07)",border:"2px solid rgba(100,200,130,0.25)",borderRadius:"16px",cursor:"pointer",textAlign:"center"}}>
        <div style={{fontSize:"2.2rem",marginBottom:"12px"}}>📋</div>
        <div style={{color:"#6dd68e",fontWeight:700,fontSize:"1rem",marginBottom:"8px"}}>Both</div>
        <div style={{color:"#3d6050",fontSize:"0.78rem",lineHeight:1.6}}>Participant has roster supports and clinical services</div>
      </button>
    </div>
  </div>
</div>
)}

{showSAModal&&(
<div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:"16px"}}>
<div style={{background:"#1a1150",border:"1px solid rgba(212,168,67,0.3)",borderRadius:"16px",maxWidth:"680px",width:"100%",maxHeight:"90vh",overflowY:"auto",padding:"32px"}}>
  <div className="flex items-center justify-between mb-6">
    <h2 className="text-xl font-bold" style={{color:"#d4a843"}}>📋 Schedule of Supports</h2>
    <button onClick={()=>setShowSAModal(false)} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#b0b0d0",borderRadius:"8px",padding:"6px 12px",cursor:"pointer"}}>✕</button>
  </div>

  <div className="text-sm mb-5" style={{color:"#b0a0d0"}}>Your provider details are saved and reused for every participant. Fill them in once — they&apos;ll pre-fill next time.</div>
  <div className="rounded-lg p-3 mb-4 text-xs" style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",color:"#8080a0"}}>
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
        <div className="text-xs mb-1 font-semibold" style={{color:"#b0a0d0"}}>{f.label}</div>
        <input value={providerDetails[f.key]} onChange={e=>setProviderDetails(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder}
          className="w-full rounded-lg px-3 py-2 outline-none text-sm"
          style={{background:"rgba(15,10,48,0.6)",border:"1px solid rgba(212,168,67,0.2)",color:"white"}}/>
      </div>
    ))}
    <div className="sm:col-span-2">
      <div className="text-xs mb-1 font-semibold" style={{color:"#b0a0d0"}}>Address</div>
      <input value={providerDetails.address} onChange={e=>setProviderDetails(p=>({...p,address:e.target.value}))} placeholder="e.g. 123 Main St, Melbourne VIC 3000"
        className="w-full rounded-lg px-3 py-2 outline-none text-sm"
        style={{background:"rgba(15,10,48,0.6)",border:"1px solid rgba(212,168,67,0.2)",color:"white"}}/>
    </div>
  </div>

  <div className="rounded-xl p-4 mb-6" style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)"}}>
    <div className="text-xs font-semibold mb-2" style={{color:"#6060a0",textTransform:"uppercase",letterSpacing:"0.06em"}}>Agreement will be generated for</div>
    <div className="grid grid-cols-2 gap-3 text-sm">
      <div><span style={{color:"#6060a0"}}>Participant: </span><span style={{color:"white",fontWeight:600}}>{participantName||"—"}</span></div>
      <div><span style={{color:"#6060a0"}}>NDIS No: </span><span style={{color:"white",fontWeight:600}}>{ndisNumber||"—"}</span></div>
      <div><span style={{color:"#6060a0"}}>Plan period: </span><span style={{color:"white",fontWeight:600}}>{planDates.start} → {planDates.end}</span></div>
      <div><span style={{color:"#6060a0"}}>State: </span><span style={{color:"white",fontWeight:600}}>{planDates.state}</span></div>
      <div><span style={{color:"#6060a0"}}>Support lines: </span><span style={{color:"white",fontWeight:600}}>{lines.length}</span></div>
      <div><span style={{color:"#6060a0"}}>Total budget: </span><span style={{color:"#d4a843",fontWeight:600}}>{money(totals.totalFunding)}</span></div>
    </div>
  </div>

  {saRows.length>0&&<div className="rounded-lg p-4 mb-5" style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)"}}>
    <div className="text-xs font-semibold mb-1" style={{color:"#b0a0d0",textTransform:"uppercase",letterSpacing:"0.06em"}}>NDIS Item Numbers</div>
    <div className="text-xs mb-3" style={{color:"#6060a0"}}>Auto-filled from the 2025–26 price guide. Override any item number below if needed.</div>
    {saRows.map(row=>(
      <div key={row.key} className="flex items-center gap-2 mb-2">
        <div className="text-xs flex-1 truncate" style={{color:"#c0c0e0",minWidth:0}}>{row.label}</div>
        <input value={saItemNumbers[row.key]||""} onChange={e=>setSaItemNumbers(p=>({...p,[row.key]:e.target.value}))}
          placeholder={getDefaultItemNumber(row.code,row.rateType)||"e.g. 01_011_0107_1_1"}
          className="rounded px-2 py-1 text-xs outline-none"
          style={{background:"rgba(15,10,48,0.6)",border:"1px solid rgba(212,168,67,0.2)",color:"white",width:"180px",flexShrink:0}}/>
      </div>
    ))}
  </div>}

  <div className="rounded-lg p-4 mb-5" style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)"}}>
    <div className="text-xs font-semibold mb-3" style={{color:"#b0a0d0",textTransform:"uppercase",letterSpacing:"0.06em"}}>Specific Requirements</div>
    <div className="grid grid-cols-1 gap-2">
      {([["behavioursOfConcern","Behaviours of Concern"],["regulatedRestrictivePractice","Regulated Restrictive Practice"],["medicationManagement","Medication Management"]] as [keyof typeof saSpecificReqs,string][]).map(([key,label])=>(
        <label key={key} className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={saSpecificReqs[key]} onChange={e=>setSaSpecificReqs(p=>({...p,[key]:e.target.checked}))} style={{width:"16px",height:"16px",accentColor:"#d4a843"}}/>
          <span className="text-sm" style={{color:"#c0c0e0"}}>{label}</span>
        </label>
      ))}
    </div>
    <div className="mt-3">
      <div className="text-xs mb-1 font-semibold" style={{color:"#b0a0d0"}}>Establishment Fee (leave blank if none)</div>
      <input value={saEstFee} onChange={e=>setSaEstFee(e.target.value)} placeholder="e.g. 654.70" type="number" min="0" step="0.01"
        className="w-full rounded-lg px-3 py-2 outline-none text-sm"
        style={{background:"rgba(15,10,48,0.6)",border:"1px solid rgba(212,168,67,0.2)",color:"white"}}/>
    </div>
  </div>

  <div className="flex gap-3">
    <button onClick={()=>{setShowSAModal(false);generateScheduleOfSupports()}} disabled={!providerDetails.orgName.trim()}
      style={{flex:1,padding:"13px",backgroundColor:providerDetails.orgName.trim()?"#d4a843":"#4a3a20",color:providerDetails.orgName.trim()?"#1a1150":"#888",border:"none",borderRadius:"10px",cursor:providerDetails.orgName.trim()?"pointer":"not-allowed",fontWeight:"bold",fontSize:"1rem"}}>
      Generate PDF →
    </button>
    <button onClick={()=>setShowSAModal(false)} style={{padding:"13px 20px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#b0b0d0",borderRadius:"10px",cursor:"pointer"}}>
      Cancel
    </button>
  </div>
  {!providerDetails.orgName.trim()&&<div className="text-xs mt-2 text-center" style={{color:"#6060a0"}}>Organisation name is required</div>}
</div>
</div>
)}

{showClinicalModal&&(
<div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:"16px"}}>
<div style={{background:"#1a1150",border:"1px solid rgba(100,150,212,0.4)",borderRadius:"16px",maxWidth:"760px",width:"100%",maxHeight:"90vh",overflowY:"auto",padding:"32px"}}>
  <div className="flex items-center justify-between mb-6">
    <h2 className="text-xl font-bold" style={{color:"#7eb8f7"}}>🏥 Clinical Schedule of Supports</h2>
    <button onClick={()=>setShowClinicalModal(false)} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#b0b0d0",borderRadius:"8px",padding:"6px 12px",cursor:"pointer"}}>✕</button>
  </div>
  <div className="text-sm mb-5" style={{color:"#b0a0d0"}}>For clinical/therapeutic services (Behaviour Support, allied health, etc). Enter your price guide, services, and practitioner details. Practitioner details are saved for next time.</div>

  <div className="text-xs font-semibold mb-2" style={{color:"#6060a0",textTransform:"uppercase",letterSpacing:"0.06em"}}>Practitioner Details</div>
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
        <div className="text-xs mb-1 font-semibold" style={{color:"#b0a0d0"}}>{f.label}</div>
        <input value={(clinicalPractitioner as any)[f.key]} onChange={e=>{const k=f.key;setClinicalPractitioner((p:any)=>({...p,[k]:e.target.value}))}} placeholder={f.placeholder}
          className="w-full rounded-lg px-3 py-2 outline-none text-sm"
          style={{background:"rgba(15,10,48,0.6)",border:"1px solid rgba(100,150,212,0.25)",color:"white"}}/>
      </div>
    ))}
  </div>

  <div className="text-xs font-semibold mb-1" style={{color:"#6060a0",textTransform:"uppercase",letterSpacing:"0.06em"}}>Overview / Narrative (optional)</div>
  <div className="text-xs mb-2" style={{color:"#6060a0"}}>Letter-style narrative that appears in the PDF (e.g. addressed to guardian/participant).</div>
  <textarea value={clinicalOverview} onChange={e=>setClinicalOverview(e.target.value)} rows={4} placeholder={"Dear Guardian,\n\nFollowing assessment of [participant name], the following schedule of supports has been prepared..."}
    className="w-full rounded-lg px-3 py-2 outline-none text-sm mb-5"
    style={{background:"rgba(15,10,48,0.6)",border:"1px solid rgba(100,150,212,0.25)",color:"white",resize:"vertical"}}/>

  <div className="flex items-center justify-between mb-2">
    <div className="text-xs font-semibold" style={{color:"#6060a0",textTransform:"uppercase",letterSpacing:"0.06em"}}>NDIS Price Guide Items</div>
    <button onClick={()=>setClinicalPriceItems(p=>[...p,{id:uid(),itemCode:"",description:"",rate:0}])} style={{background:"rgba(100,150,212,0.12)",border:"1px solid rgba(100,150,212,0.3)",color:"#7eb8f7",padding:"4px 10px",borderRadius:"6px",cursor:"pointer",fontSize:"0.78rem"}}>+ Add row</button>
  </div>
  <div className="rounded-lg p-3 mb-5" style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)"}}>
    <div className="grid mb-1" style={{gridTemplateColumns:"2.2fr 3fr 1.4fr auto",gap:"6px"}}>
      <div className="text-xs" style={{color:"#6060a0"}}>Item Code</div>
      <div className="text-xs" style={{color:"#6060a0"}}>Description</div>
      <div className="text-xs" style={{color:"#6060a0"}}>Rate / hr ($)</div>
      <div/>
    </div>
    {clinicalPriceItems.map((pi,idx)=>(
      <div key={pi.id} className="grid mb-2" style={{gridTemplateColumns:"2.2fr 3fr 1.4fr auto",gap:"6px",alignItems:"center"}}>
        <input value={pi.itemCode} onChange={e=>{const i=idx;setClinicalPriceItems(p=>p.map((x,j)=>j===i?{...x,itemCode:e.target.value}:x))}} placeholder="15_056_0128_1_3"
          className="rounded px-2 py-1 text-xs outline-none"
          style={{background:"rgba(15,10,48,0.6)",border:"1px solid rgba(100,150,212,0.2)",color:"white",fontFamily:"monospace"}}/>
        <input value={pi.description} onChange={e=>{const i=idx;setClinicalPriceItems(p=>p.map((x,j)=>j===i?{...x,description:e.target.value}:x))}} placeholder="Service description"
          className="rounded px-2 py-1 text-xs outline-none"
          style={{background:"rgba(15,10,48,0.6)",border:"1px solid rgba(100,150,212,0.2)",color:"white"}}/>
        <input type="number" step="0.01" value={pi.rate||""} onChange={e=>{const i=idx;setClinicalPriceItems(p=>p.map((x,j)=>j===i?{...x,rate:num(e.target.value)}:x))}} placeholder="193.99"
          className="rounded px-2 py-1 text-xs outline-none"
          style={{background:"rgba(15,10,48,0.6)",border:"1px solid rgba(100,150,212,0.2)",color:"white"}}/>
        <button onClick={()=>{const i=idx;setClinicalPriceItems(p=>p.filter((_,j)=>j!==i))}} style={{color:"#ef4444",background:"none",border:"none",cursor:"pointer",fontSize:"0.9rem",padding:"2px 4px"}}>✕</button>
      </div>
    ))}
    <div className="text-xs mt-1" style={{color:"#505070"}}>First item rate is used as the default for schedule items with no rate override.</div>
  </div>

  <div className="flex items-center justify-between mb-2">
    <div className="text-xs font-semibold" style={{color:"#6060a0",textTransform:"uppercase",letterSpacing:"0.06em"}}>Schedule of Services</div>
    <button onClick={()=>setClinicalScheduleItems(p=>[...p,{id:uid(),description:"",hours:0,rate:0,note:""}])} style={{background:"rgba(100,150,212,0.12)",border:"1px solid rgba(100,150,212,0.3)",color:"#7eb8f7",padding:"4px 10px",borderRadius:"6px",cursor:"pointer",fontSize:"0.78rem"}}>+ Add row</button>
  </div>
  <div className="rounded-lg p-3 mb-5" style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)"}}>
    <div className="grid mb-1" style={{gridTemplateColumns:"3fr 1fr 1.4fr 2fr auto",gap:"6px"}}>
      <div className="text-xs" style={{color:"#6060a0"}}>Service Description</div>
      <div className="text-xs" style={{color:"#6060a0"}}>Hours</div>
      <div className="text-xs" style={{color:"#6060a0"}}>Rate (0=default)</div>
      <div className="text-xs" style={{color:"#6060a0"}}>Note (optional)</div>
      <div/>
    </div>
    {clinicalScheduleItems.map((si,idx)=>(
      <div key={si.id} className="grid mb-2" style={{gridTemplateColumns:"3fr 1fr 1.4fr 2fr auto",gap:"6px",alignItems:"center"}}>
        <input value={si.description} onChange={e=>{const i=idx;setClinicalScheduleItems(p=>p.map((x,j)=>j===i?{...x,description:e.target.value}:x))}} placeholder="e.g. Comprehensive BSP Development"
          className="rounded px-2 py-1 text-xs outline-none"
          style={{background:"rgba(15,10,48,0.6)",border:"1px solid rgba(100,150,212,0.2)",color:"white"}}/>
        <input type="number" step="0.5" min="0" value={si.hours||""} onChange={e=>{const i=idx;setClinicalScheduleItems(p=>p.map((x,j)=>j===i?{...x,hours:num(e.target.value)}:x))}} placeholder="0"
          className="rounded px-2 py-1 text-xs outline-none"
          style={{background:"rgba(15,10,48,0.6)",border:"1px solid rgba(100,150,212,0.2)",color:"white"}}/>
        <input type="number" step="0.01" min="0" value={si.rate||""} onChange={e=>{const i=idx;setClinicalScheduleItems(p=>p.map((x,j)=>j===i?{...x,rate:num(e.target.value)}:x))}} placeholder="default"
          className="rounded px-2 py-1 text-xs outline-none"
          style={{background:"rgba(15,10,48,0.6)",border:"1px solid rgba(100,150,212,0.2)",color:"white"}}/>
        <input value={si.note} onChange={e=>{const i=idx;setClinicalScheduleItems(p=>p.map((x,j)=>j===i?{...x,note:e.target.value}:x))}} placeholder="e.g. per session"
          className="rounded px-2 py-1 text-xs outline-none"
          style={{background:"rgba(15,10,48,0.6)",border:"1px solid rgba(100,150,212,0.2)",color:"white"}}/>
        <button onClick={()=>{const i=idx;setClinicalScheduleItems(p=>p.filter((_,j)=>j!==i))}} style={{color:"#ef4444",background:"none",border:"none",cursor:"pointer",fontSize:"0.9rem",padding:"2px 4px"}}>✕</button>
      </div>
    ))}
    {(()=>{const dr=clinicalPriceItems[0]?.rate||0;const th=clinicalScheduleItems.reduce((s,i)=>s+(i.hours||0),0);const tc=clinicalScheduleItems.reduce((s,i)=>s+(i.hours||0)*(i.rate>0?i.rate:dr),0);if(th<=0)return null;return<div className="text-sm font-semibold mt-2 pt-2" style={{borderTop:"1px solid rgba(255,255,255,0.1)",color:"#7eb8f7"}}>Total: {th%1===0?th:th.toFixed(1)} hours — {money(tc)}</div>})()}
  </div>

  <div className="flex gap-3">
    <button onClick={()=>{setShowClinicalModal(false);generateClinicalSoS()}} disabled={!clinicalPractitioner.name.trim()}
      style={{flex:1,padding:"13px",backgroundColor:clinicalPractitioner.name.trim()?"#7eb8f7":"#1e3050",color:clinicalPractitioner.name.trim()?"#0a1628":"#888",border:"none",borderRadius:"10px",cursor:clinicalPractitioner.name.trim()?"pointer":"not-allowed",fontWeight:"bold",fontSize:"1rem"}}>
      Generate Clinical PDF →
    </button>
    <button onClick={()=>setShowClinicalModal(false)} style={{padding:"13px 20px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#b0b0d0",borderRadius:"10px",cursor:"pointer"}}>
      Cancel
    </button>
  </div>
  {!clinicalPractitioner.name.trim()&&<div className="text-xs mt-2 text-center" style={{color:"#6060a0"}}>Practitioner name is required</div>}
</div>
</div>
)}

</main>)}

