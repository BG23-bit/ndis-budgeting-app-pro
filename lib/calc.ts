// Pure NDIS calculation engine — no React, no DOM. Everything financial the
// app computes lives here so it can be unit-tested (scripts/calc.test.ts)
// and shared by the calculator UI and the dashboard mirror.

export type Rates = { weekdayOrd: number; weekdayNight: number; sat: number; sun: number; publicHoliday: number; activeSleepoverHourly: number; fixedSleepoverUnit: number; gstRate: number };
export type PlanDates = { start: string; end: string; state: string; serviceStart?: string; serviceEnd?: string };
export type Shift = { s: string; e: string };
export type DayRoster = { enabled: boolean; hours: number; nightHours: number; frequency: string; times?: string; shifts?: Shift[] };
export type Claim = { id: string; date: string; amount: number; note: string };
export type BudgetAllocation = { id: string; name: string; amount: number; item?: string };
export type SupportLine = { id: string; code: string; description: string; totalFunding: number; ratio: string; allocations?: BudgetAllocation[]; excludedHolidays: string[]; roster: { [key: string]: DayRoster }; activeSleepoverHours: number; activeSleepoverFreq: string; fixedSleepovers: number; fixedSleepoverFreq: string; kmsPerWeek: number; kmRate: number; kmFreq: string; claims: Claim[]; lineRates: Rates; hoursMode?: "weekly" | "sessions"; sessionCount?: number; sessionLength?: number };
export const DAYS = ["mon","tue","wed","thu","fri","sat","sun"];
export const DAY_DOW:{[k:string]:number}={mon:1,tue:2,wed:3,thu:4,fri:5,sat:6,sun:0};
export const DL: {[k:string]:string} = {mon:"Monday",tue:"Tuesday",wed:"Wednesday",thu:"Thursday",fri:"Friday",sat:"Saturday",sun:"Sunday"};
export const FREQ: {[k:string]:{label:string;multiplier:number}} = {"every":{label:"Every week",multiplier:1},"2nd":{label:"Every 2nd week",multiplier:0.5},"3rd":{label:"Every 3rd week",multiplier:0.333},"4th":{label:"Every 4th week",multiplier:0.25},"monthly":{label:"Monthly",multiplier:0.2308}};
export const RATIOS: {[k:string]:{label:string;divisor:number}} = {"1:1":{label:"1:1 (Full rate)",divisor:1},"2:1":{label:"2:1 (Two workers — double rate)",divisor:0.5},"3:1":{label:"3:1 (Three workers — triple rate)",divisor:1/3},"2:3":{label:"2:3 (Two workers, three participants — ⅔ rate)",divisor:1.5},"1:2":{label:"1:2 (Shared — half rate)",divisor:2},"1:3":{label:"1:3 (Shared — third rate)",divisor:3},"1:4":{label:"1:4 (Shared — quarter rate)",divisor:4}};
export function defaultRoster():{[k:string]:DayRoster}{const r:{[k:string]:DayRoster}={};DAYS.forEach(d=>{r[d]={enabled:false,hours:0,nightHours:0,frequency:"every"}});return r}
export function getDayName(d:number):string{return["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][d]}
export function getWeeksInPlan(s:string,e:string):number{if(!s||!e)return 52;return Math.max(1,(new Date(e).getTime()-new Date(s).getTime()+86400000)/(7*24*60*60*1000))}
export function countDayOccurrences(start:string,end:string,dow:number):number{if(!start||!end)return 0;const sd=new Date(start);const ed=new Date(end);const daysToFirst=(dow-sd.getDay()+7)%7;const first=new Date(sd.getTime()+daysToFirst*86400000);if(first>ed)return 0;return Math.floor((ed.getTime()-first.getTime())/604800000)+1}
// Category behaviour: lump-sum categories have no roster; "hourly" categories
// (therapy, coordination, plan management…) are flat hourly services priced by
// exact fractional weeks — never by counting day occurrences.
export function getLineMode(code:string):"full"|"weekday"|"hourly"|"lump"{if(["02","03","05","06","17","18","19"].includes(code))return"lump";if(["07","11","12","13","14","15","20"].includes(code))return"hourly";if(code==="10")return"weekday";return"full"}
// Total service hours for an hourly-mode line across the plan: either a number
// of sessions × session length, or weekly hours × exact (fractional) weeks.
export function hourlyTotalHours(line:SupportLine,planWeeks:number):number{
  if(line.hoursMode==="sessions")return Math.max(0,(line.sessionCount||0)*(line.sessionLength||0));
  let wk=0;for(const d of DAYS){const r=line.roster[d];if(!r?.enabled)continue;wk+=((r.hours||0)+(r.nightHours||0))*(FREQ[r.frequency]?.multiplier||1);}
  return wk*planWeeks;
}
// Hourly-mode plan cost: hours × the line's hourly rate (ratio-adjusted), plus
// kms. Uses fractional weeks so a 5.45-week window bills exactly 5.45 weeks.
export function calcHourlyPlanCost(line:SupportLine,planWeeks:number,rates:Rates):number{
  const divisor=RATIOS[line.ratio]?.divisor||1;
  const hours=hourlyTotalHours(line,planWeeks);
  const km=(line.kmsPerWeek||0)*(line.kmRate||0)*(FREQ[line.kmFreq]?.multiplier||1)*planWeeks;
  return hours*(rates.weekdayOrd/divisor)+km;
}
export function calcDayCountPlanCost(line:SupportLine,start:string,end:string,planWeeks:number,rates:Rates):number{if(getLineMode(line.code)==="hourly")return calcHourlyPlanCost(line,planWeeks,rates);if(!start||!end)return calcWeeklyCost(line,rates)*planWeeks;const divisor=RATIOS[line.ratio]?.divisor||1;let total=0;for(const d of DAYS){const r=line.roster[d];if(!r||!r.enabled)continue;const fm=FREQ[r.frequency]?.multiplier||1;const occ=countDayOccurrences(start,end,DAY_DOW[d])*fm;const isSat=d==="sat";const isSun=d==="sun";const dr=isSat?rates.sat/divisor:isSun?rates.sun/divisor:rates.weekdayOrd/divisor;const nr=isSat?rates.sat/divisor:isSun?rates.sun/divisor:rates.weekdayNight/divisor;total+=(r.hours*dr+r.nightHours*nr)*occ}const sf=FREQ[line.activeSleepoverFreq]?.multiplier||1;total+=line.activeSleepoverHours*(rates.activeSleepoverHourly/divisor)*sf*planWeeks;const ff=FREQ[line.fixedSleepoverFreq]?.multiplier||1;total+=line.fixedSleepovers*(rates.fixedSleepoverUnit/divisor)*ff*planWeeks;const kf=FREQ[line.kmFreq]?.multiplier||1;total+=line.kmsPerWeek*line.kmRate*kf*planWeeks;return total}
export function calcWeeklyCost(line:SupportLine,rates:Rates){const divisor=RATIOS[line.ratio]?.divisor||1;let wt=0;for(const d of DAYS){const r=line.roster[d];if(!r||!r.enabled)continue;const fm=FREQ[r.frequency]?.multiplier||1;const isSat=d==="sat";const isSun=d==="sun";const dr=isSat?rates.sat/divisor:isSun?rates.sun/divisor:rates.weekdayOrd/divisor;const nr=isSat?rates.sat/divisor:isSun?rates.sun/divisor:rates.weekdayNight/divisor;wt+=(r.hours*dr+r.nightHours*nr)*fm}const sf=FREQ[line.activeSleepoverFreq]?.multiplier||1;wt+=line.activeSleepoverHours*(rates.activeSleepoverHourly/divisor)*sf;const ff=FREQ[line.fixedSleepoverFreq]?.multiplier||1;wt+=line.fixedSleepovers*(rates.fixedSleepoverUnit/divisor)*ff;const kf=FREQ[line.kmFreq]?.multiplier||1;wt+=line.kmsPerWeek*line.kmRate*kf;return wt}
export function shiftWindowBands(st:string,en:string,from:number,to:number):{day:number;eve:number}{
  const toMin=(t:string)=>{const[a,b]=t.split(":").map(Number);return Number.isFinite(a)&&Number.isFinite(b)?a*60+b:NaN};
  let a=toMin(st),b=toMin(en);
  if(!Number.isFinite(a)||!Number.isFinite(b))return{day:0,eve:0};
  if(b<=a)b+=1440;
  let day=0,eve=0;
  for(const off of[0,1440]){
    const lo=Math.max(a,from+off),hi=Math.min(b,to+off);
    if(hi<=lo)continue;
    const dayLo=Math.max(lo,360+off),dayHi=Math.min(hi,1200+off);
    const dOv=Math.max(0,dayHi-dayLo);
    day+=dOv/60;eve+=(hi-lo-dOv)/60;
  }
  return{day,eve};
}
export function calcPHImpact(line:SupportLine,holidays:{date:string;name:string;dayOfWeek:number;partFrom?:number;partTo?:number}[],rates:Rates){
// Therapy/coordination categories bill one flat hourly cap with no public
// holiday penalty — a PH "adjustment" there would corrupt the plan cost.
if(getLineMode(line.code)==="hourly")return{extraCost:0,savedCost:0,details:[] as {name:string;date:string;day:string;impact:number;included:boolean;part?:boolean;partHours?:number}[]};
const divisor=RATIOS[line.ratio]?.divisor||1;let extraCost=0,savedCost=0;const dm:{[k:number]:string}={0:"sun",1:"mon",2:"tue",3:"wed",4:"thu",5:"fri",6:"sat"};const details:{name:string;date:string;day:string;impact:number;included:boolean;part?:boolean;partHours?:number}[]=[];for(const h of holidays){const isExcluded=line.excludedHolidays.includes(h.date);const rd=dm[h.dayOfWeek];const r=line.roster[rd];if(!r||!r.enabled){details.push({name:h.name,date:h.date,day:getDayName(h.dayOfWeek),impact:0,included:!isExcluded,...(h.partFrom!=null?{part:true}:{})});continue}const isSat=rd==="sat";const isSun=rd==="sun";const normalDayRate=isSat?rates.sat/divisor:isSun?rates.sun/divisor:rates.weekdayOrd/divisor;const normalNightRate=isSat?rates.sat/divisor:isSun?rates.sun/divisor:rates.weekdayNight/divisor;const phRate=rates.publicHoliday/divisor;
// Part-day holiday (e.g. QLD Christmas Eve 6pm-midnight): the penalty applies only
// to worked time inside the window — measured from shift times when present,
// otherwise approximated by the day's evening hours.
if(h.partFrom!=null&&h.partTo!=null){
  let dayOv=0,eveOv=0;
  const shifts=(r.shifts||[]).filter((x:Shift)=>x.s&&x.e);
  if(shifts.length){for(const sh of shifts){const o=shiftWindowBands(sh.s,sh.e,h.partFrom,h.partTo);dayOv+=o.day;eveOv+=o.eve;}}
  else{eveOv=r.nightHours||0;}
  if(isExcluded||dayOv+eveOv<=0){details.push({name:h.name,date:h.date,day:getDayName(h.dayOfWeek),impact:0,included:!isExcluded,part:true});continue}
  const extra=(phRate-normalDayRate)*dayOv+(phRate-normalNightRate)*eveOv;
  extraCost+=extra;
  details.push({name:h.name,date:h.date,day:getDayName(h.dayOfWeek),impact:extra,included:true,part:true,partHours:Math.round((dayOv+eveOv)*100)/100});
  continue;
}
if(!isExcluded){const extra=(phRate-normalDayRate)*r.hours+(phRate-normalNightRate)*r.nightHours;extraCost+=extra;details.push({name:h.name,date:h.date,day:getDayName(h.dayOfWeek),impact:extra,included:true})}else{const saved=normalDayRate*r.hours+normalNightRate*r.nightHours;savedCost+=saved;details.push({name:h.name,date:h.date,day:getDayName(h.dayOfWeek),impact:saved,included:false})}}return{extraCost,savedCost,details}}
export const NDIS_RATES_2026_27:Rates={weekdayOrd:73.58,weekdayNight:81.07,sat:103.54,sun:133.50,publicHoliday:163.46,activeSleepoverHourly:82.57,fixedSleepoverUnit:311.79,gstRate:0};
export const CATEGORY_PRESETS:{[code:string]:{name:string;rates:Rates}}={
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
  // 15 preset carries the Other Professional cap (matches its default item
  // 15_056); each discipline's own cap comes from the service-type picker.
  "15":{name:"Improved Daily Living",rates:{weekdayOrd:156.16,weekdayNight:0,sat:0,sun:0,publicHoliday:0,activeSleepoverHourly:0,fixedSleepoverUnit:0,gstRate:0}},
  "16":{name:"Home and Living",rates:{weekdayOrd:73.58,weekdayNight:81.07,sat:103.54,sun:133.50,publicHoliday:163.46,activeSleepoverHourly:82.57,fixedSleepoverUnit:311.79,gstRate:0}},
  "17":{name:"Specialist Disability Accommodation",rates:{weekdayOrd:0,weekdayNight:0,sat:0,sun:0,publicHoliday:0,activeSleepoverHourly:0,fixedSleepoverUnit:0,gstRate:0}},
  "18":{name:"Recurring Transport",rates:{weekdayOrd:0,weekdayNight:0,sat:0,sun:0,publicHoliday:0,activeSleepoverHourly:0,fixedSleepoverUnit:0,gstRate:0}},
  "19":{name:"Assistive Technology Maintenance",rates:{weekdayOrd:0,weekdayNight:0,sat:0,sun:0,publicHoliday:0,activeSleepoverHourly:0,fixedSleepoverUnit:0,gstRate:0}},
  "20":{name:"Behaviour Support",rates:{weekdayOrd:252.99,weekdayNight:0,sat:0,sun:0,publicHoliday:0,activeSleepoverHourly:0,fixedSleepoverUnit:0,gstRate:0}},
  "21":{name:"YPIRAC",rates:{weekdayOrd:73.58,weekdayNight:81.07,sat:103.54,sun:133.50,publicHoliday:163.46,activeSleepoverHourly:82.57,fixedSleepoverUnit:311.79,gstRate:0}},
};
export function getPresetRates(code:string):Rates{return CATEGORY_PRESETS[code]?.rates||NDIS_RATES_2026_27}
export function migrateSleepoverRate(ratio:string,lineRates:any):any{
  const dv=RATIOS[ratio]?.divisor||1;
  if(dv>1&&lineRates&&Math.abs(((lineRates.fixedSleepoverUnit||0)*dv)-311.79)<1)return{...lineRates,fixedSleepoverUnit:311.79};
  return lineRates;
}
export function applyProviderDefaults(preset:Rates,def?:Partial<Rates>|null):Rates{
  if(!def)return preset;
  const out={...preset};
  (Object.keys(NDIS_RATES_2026_27) as (keyof Rates)[]).forEach(k=>{
    const dv=def[k];
    if(typeof dv==="number"&&dv>0&&NDIS_RATES_2026_27[k]>0&&preset[k]===NDIS_RATES_2026_27[k])(out as any)[k]=dv;
  });
  return out;
}
export const NDIS_ITEM_DEFAULTS:{[code:string]:{[rateType:string]:string}}={
  // 01 defaults to the Assistance with Daily Life (self-care) items — the SIL
  // 01_8xx series is only used when the schedule is marked as a SIL roster.
  "01":{weekday:"01_011_0107_1_1",weekdayNight:"01_015_0107_1_1",sat:"01_013_0107_1_1",satNight:"01_013_0107_1_1",sun:"01_014_0107_1_1",sunNight:"01_014_0107_1_1",publicHoliday:"01_012_0107_1_1",activeSleepover:"01_002_0107_1_1",fixedSleepover:"01_010_0107_1_1",lump:"01_011_0107_1_1"},
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
export const SIL_ITEM_DEFAULTS:{[rateType:string]:string}={weekday:"01_801_0115_1_1",weekdayNight:"01_802_0115_1_1",sat:"01_804_0115_1_1",satNight:"01_804_0115_1_1",sun:"01_805_0115_1_1",sunNight:"01_805_0115_1_1",publicHoliday:"01_806_0115_1_1",activeSleepover:"01_803_0115_1_1",fixedSleepover:"01_832_0115_1_1",lump:"01_801_0115_1_1"};
export function getDefaultItemNumber(code:string,rateType:string,useSilItems?:boolean):string{if(useSilItems&&code==="01"&&SIL_ITEM_DEFAULTS[rateType])return SIL_ITEM_DEFAULTS[rateType];return NDIS_ITEM_DEFAULTS[code]?.[rateType]||""}
export function splitShiftBands(s:string,e:string):{day:number;eve:number}{
  const toMin=(t:string)=>{const[a,b]=t.split(":").map(Number);return Number.isFinite(a)&&Number.isFinite(b)?a*60+b:NaN};
  let a=toMin(s),b=toMin(e);
  if(!Number.isFinite(a)||!Number.isFinite(b))return{day:0,eve:0};
  if(b<=a)b+=1440;
  let day=0;
  for(const[ds,de]of[[360,1200],[1800,2640]]){const lo=Math.max(a,ds),hi=Math.min(b,de);if(hi>lo)day+=hi-lo;}
  const total=b-a;
  return{day:day/60,eve:(total-day)/60};
}
export function shiftsToText(shifts?:Shift[],legacy?:string):string{const v=(shifts||[]).filter(x=>x.s&&x.e).map(x=>x.s+"–"+x.e);return v.length?v.join(", "):(legacy||"")}
export function shiftHoursTotal(shifts?:Shift[]):number{let t=0;for(const x of shifts||[]){if(!x.s||!x.e)continue;const[sh,sm]=x.s.split(":").map(Number);const[eh,em]=x.e.split(":").map(Number);if([sh,sm,eh,em].some(n=>!Number.isFinite(n)))continue;let mins=eh*60+em-(sh*60+sm);if(mins<=0)mins+=24*60;t+=mins/60;}return Math.round(t*100)/100}
