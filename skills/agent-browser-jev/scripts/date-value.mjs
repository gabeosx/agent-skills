// Civil Gregorian date arithmetic from exact caller-goal anchors. Jev chooses
// the intended relation and field; this module never reads the wall clock,
// infers a workflow, or supplies a date absent an explicit dated source.
import {createHash} from 'node:crypto';
import {goalLiterals} from './goal-literals.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
const monthPattern=months.join('|');
function civil(y,m,d){
 if(!Number.isInteger(y)||y<1000||y>9999)return null;
 const date=new Date(Date.UTC(y,m,d));
 return date.getUTCFullYear()===y&&date.getUTCMonth()===m&&date.getUTCDate()===d?date:null;
}
export function callerDateAnchors(text){
 if(typeof text!=='string'||text.length>8192)return [];
 const matches=[];
 const patterns=[[/\b(\d{4})-(\d{2})-(\d{2})\b/g,m=>civil(+m[1],+m[2]-1,+m[3])],
  [new RegExp('\\b('+monthPattern+')\\s+(\\d{1,2}),?\\s+(\\d{4})\\b','gi'),m=>civil(+m[3],months.findIndex(x=>x.toLowerCase()===m[1].toLowerCase()),+m[2])],
  [new RegExp('\\b(\\d{1,2})\\s+('+monthPattern+')\\s+(\\d{4})\\b','gi'),m=>civil(+m[3],months.findIndex(x=>x.toLowerCase()===m[2].toLowerCase()),+m[1])]];
 for(const[pattern,parse]of patterns)for(const m of text.matchAll(pattern)){const date=parse(m);if(date)matches.push({start:m.index,end:m.index+m[0].length,text:m[0],iso:date.toISOString().slice(0,10)});}
 return matches.sort((a,b)=>a.start-b.start);
}
const describe={
 anchor_date:'The explicit anchor date itself; the endpoint of a period running through that date, such as year-to-date',
 previous_month_start:'First day of the calendar month before the anchor month',previous_month_end:'Last day of the calendar month before the anchor month',
 current_month_start:'First day of the anchor calendar month',current_month_end:'Last day of the anchor calendar month',
 previous_quarter_start:'First day of the previous calendar quarter (January–March, April–June, July–September, October–December); not a fiscal quarter or rolling three months',
 previous_quarter_end:'Last day of the previous calendar quarter (January–March, April–June, July–September, October–December); not a fiscal quarter or rolling three months',
 current_quarter_start:'First day of the calendar quarter containing the anchor date; not a fiscal quarter',
 current_quarter_end:'Last day of the calendar quarter containing the anchor date, including days after the anchor; not quarter-to-date or a fiscal quarter',
 previous_year_start:'First day of the calendar year before the anchor year',previous_year_end:'Last day of the calendar year before the anchor year',
 current_year_start:'January 1 of the anchor calendar year; also the start of year-to-date',current_year_end:'December 31 of the anchor calendar year, including days after the anchor; not the endpoint of year-to-date',
 previous_week_monday_start:'First day of the previous calendar week when weeks begin Monday',previous_week_monday_end:'Last day of the previous calendar week when weeks begin Monday',
 previous_week_sunday_start:'First day of the previous calendar week when weeks begin Sunday',previous_week_sunday_end:'Last day of the previous calendar week when weeks begin Sunday'
};
export function calculateCivilDate(iso,operation,amount){
 const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(iso??'');if(!match)return null;
 const anchor=civil(+match[1],+match[2]-1,+match[3]);if(!anchor)return null;
 const y=anchor.getUTCFullYear(),m=anchor.getUTCMonth(),d=anchor.getUTCDate();let result;
 const shift=/^(days|weeks|months|quarters|years)_(before|after)$/.exec(operation??'');
 if(shift){
  if(!Number.isSafeInteger(amount)||amount<1||amount>10000)return null;
  const n=amount*(shift[2]==='before'?-1:1);
  if(['days','weeks'].includes(shift[1]))result=new Date(Date.UTC(y,m,d+n*(shift[1]==='weeks'?7:1)));
  else{const target=new Date(Date.UTC(y,m+n*({months:1,quarters:3,years:12}[shift[1]]),1));if(target.getUTCFullYear()<1000||target.getUTCFullYear()>9999)return null;const last=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();result=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth(),Math.min(d,last)));}
 }else if(Object.hasOwn(describe,operation)){
  if(operation==='anchor_date')result=anchor;
  else if(operation.includes('_quarter_')){const month=Math.floor(m/3)*3-(operation.startsWith('previous_')?3:0);result=new Date(Date.UTC(y,month+(operation.endsWith('_end')?3:0),operation.endsWith('_end')?0:1));}
  else if(operation.includes('_week_')){const start=operation.includes('_monday_')?1:0,back=(anchor.getUTCDay()-start+7)%7;result=new Date(Date.UTC(y,m,d-back-7+(operation.endsWith('_end')?6:0)));}
  else if(operation.includes('_month_')){const month=m-(operation.startsWith('previous_')?1:0);result=new Date(Date.UTC(y,month+(operation.endsWith('_end')?1:0),operation.endsWith('_end')?0:1));}
  else{const year=y-(operation.startsWith('previous_')?1:0);result=new Date(Date.UTC(year,operation.endsWith('_end')?11:0,operation.endsWith('_end')?31:1));}
 }
 return result&&result.getUTCFullYear()>=1000&&result.getUTCFullYear()<=9999?result.toISOString().slice(0,10):null;
}
function displayDate(iso,inputType){if(inputType==='date')return iso;const[y,m,d]=iso.split('-').map(Number);return `${months[m-1]} ${d}, ${y}`;}
export function dateValueOptions(request,field){
 const goal=request.intent,control=request.observation?.refs?.[field.ref?.slice(1)];
 if(field.op!=='request_input'||field.role!=='textbox'||!control||control.readonly||control.disabled||['password','hidden','file','number','datetime-local','time'].includes(control.inputType)||!new RegExp('\\bref='+field.ref.slice(1)+'\\b').test(request.observation.snapshot??''))return {};
 const anchors=callerDateAnchors(goal);if(!anchors.length||anchors.length>2)return {};
 const operands=goalLiterals(goal).numbers.filter(n=>n.representation==='exact'&&!n.ordinal&&Number.isSafeInteger(n.value)&&n.value>0&&n.value<=10000&&!anchors.some(a=>n.start>=a.start&&n.end<=a.end)&&!/%/.test(goal.slice(n.end,n.end+1)));
 if(operands.length>4)return {};
 const options={};
 for(const[a,anchor]of anchors.entries()){
  const relations=Object.entries(describe).map(([operation,description])=>({operation,description}));
  for(const[n,operand]of operands.entries())for(const unit of['days','weeks','months','quarters','years'])for(const direction of['before','after'])relations.push({operation:`${unit}_${direction}`,amount:operand.value,operandSpan:{start:operand.start,end:operand.end,text:operand.text},operandIndex:n,description:`${operand.value} calendar ${unit} ${direction} the anchor${['months','quarters','years'].includes(unit)?'; preserve day-of-month, clamping to the last valid day if necessary':''}`});
  for(const relation of relations){const iso=calculateCivilDate(anchor.iso,relation.operation,relation.amount);if(!iso)continue;const id=`derived_date:${a}:${relation.operation}:${relation.operandIndex??'calendar'}`;const value=displayDate(iso,control.inputType);options[id]={value,description:relation.description,date:{id,anchor,operation:relation.operation,...(relation.amount?{amount:relation.amount,operandSpan:relation.operandSpan}:{}),iso,format:control.inputType==='date'?'ISO date':'English month day, year',goalSha256:sha(goal),ref:field.ref,role:field.role,name:field.name??''}};}
 }
 return options;
}
export function groundedDateAction(request,candidates,binding){
 const date=binding?.date,field=Object.values(candidates).find(c=>c.op==='request_input'&&c.ref===binding?.ref);
 if(!date||!field||binding.frame!==sha(JSON.stringify(request.observation))||date.goalSha256!==sha(request.intent))return null;
 const expected=dateValueOptions(request,field)[date.id];
 if(!expected||expected.value!==binding.value||JSON.stringify(expected.date)!==JSON.stringify(date))return null;
 return {op:'fill',ref:field.ref,role:field.role,name:field.name,value:expected.value,source:'date_value_binding',valueOrigin:{kind:'computed_date',...date},modelAssessed:true};
}
