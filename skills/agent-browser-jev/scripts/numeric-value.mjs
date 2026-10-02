// Jev chooses the caller-authorized relation. Code offers exact arithmetic only.
import {createHash} from 'node:crypto';
import {goalLiterals} from './goal-literals.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
export const numericFrame=o=>sha(JSON.stringify(o));
const meanings={add:'Increase the CURRENT field value by the operand amount.',subtract:'Decrease the CURRENT field value by the operand amount.',percent_add:'Increase the CURRENT field value BY the operand percent.',percent_subtract:'Decrease the CURRENT field value BY the operand percent.'};
function decimal(s){
 if(typeof s!=='string'||s.length>24||!/^[-+]?\d+(?:\.\d{1,6})?$/.test(s))return null;
 const neg=s.startsWith('-'),parts=s.replace(/^[-+]/,'').split('.'),scale=parts[1]?.length??0;
 return {n:BigInt(parts.join(''))*(neg?-1n:1n),scale};
}
function operand(literal){
 if(literal.ordinal||literal.representation!=='exact')return null;
 const text=/^[-+]?\d/.test(literal.text)?literal.text.replaceAll(',',''):
  Number.isSafeInteger(literal.value)?String(literal.value):null;
 return decimal(text);
}
const ten=n=>10n**BigInt(n);
export function exactNumericChange(source,number,operation){
 const a=decimal(source),b=decimal(number);if(!a||!b||!Object.hasOwn(meanings,operation))return null;
 let n,scale,min;
 if(operation.startsWith('percent_')){const factor=100n*ten(b.scale)+(operation==='percent_add'?b.n:-b.n);n=a.n*factor;scale=a.scale+b.scale+2;min=a.scale;}
 else {scale=Math.max(a.scale,b.scale);n=a.n*ten(scale-a.scale)+(operation==='add'?b.n:-b.n)*ten(scale-b.scale);min=scale;}
 while(scale>min&&n%10n===0n){n/=10n;scale--;}
 const neg=n<0n,raw=(neg?-n:n).toString().padStart(scale+1,'0');
 return (neg?'-':'')+(scale?raw.slice(0,-scale)+'.'+raw.slice(-scale):raw);
}
export function numericValueOptions(request,field){
 const c=request.observation?.refs?.[field.ref?.slice(1)];
 if(request.numericEditBound||!request.numericLedger&&request.history?.some(x=>x.action?.source==='numeric_value_binding')||field.op!=='request_input'||!['textbox','spinbutton'].includes(field.role)||c?.readonly||c?.disabled||['password','hidden','file','date'].includes(c?.inputType)||!new RegExp('\\bref='+field.ref.slice(1)+'\\b').test(request.observation.snapshot??''))return {};
 const a=decimal(c?.exactValue);if(!a)return {};
 const literals=goalLiterals(request.intent).numbers;if(literals.length>6)return {};
 const options={};for(const [index,literal] of literals.entries()){
  const b=operand(literal);if(!b)continue;
  const number=(b.n<0n?'-':'')+(b.scale?(b.n<0n?-b.n:b.n).toString().padStart(b.scale+1,'0').slice(0,-b.scale)+'.'+(b.n<0n?-b.n:b.n).toString().padStart(b.scale+1,'0').slice(-b.scale):(b.n<0n?-b.n:b.n).toString());
  for(const operation of Object.keys(meanings)){
   const value=exactNumericChange(c.exactValue,number,operation);if(value===null||value===c.exactValue)continue;
   options[`derived:${index}:${operation}`]={description:meanings[operation],value,numeric:{operation,number,sourceValue:c.exactValue,sourceSha256:sha(c.exactValue),goalSha256:sha(request.intent),operandSpan:{start:literal.start,end:literal.end,text:literal.text},ref:field.ref,role:field.role,name:field.name??''}};
  }
 }return options;
}
export function groundedNumericAction(request,candidates,binding){
 const n=binding?.numeric;if(!n||binding.frame!==numericFrame(request.observation)||n.goalSha256!==sha(request.intent))return null;
 const field=Object.values(candidates).find(a=>a.op==='request_input'&&a.ref===binding.ref),c=request.observation.refs?.[binding.ref?.slice(1)];
 if(!field||field.role!==n.role||field.name!==n.name||n.ref!==binding.ref||c?.exactValue!==n.sourceValue||sha(n.sourceValue)!==n.sourceSha256)return null;
 const literal=goalLiterals(request.intent).numbers.find(l=>l.start===n.operandSpan.start&&l.end===n.operandSpan.end&&l.text===n.operandSpan.text),b=literal&&operand(literal),expected=b&&decimal(n.number);
 if(!b||!expected||b.n*ten(expected.scale)!==expected.n*ten(b.scale))return null;
 const value=exactNumericChange(n.sourceValue,n.number,n.operation);if(value===null||value!==binding.value)return null;
 return {op:'fill',ref:field.ref,role:field.role,name:field.name,value,source:'numeric_value_binding',valueOrigin:{kind:'computed_numeric',...n},modelAssessed:true};
}
export function validateNumericSource(action,currentValue){
 const n=action.valueOrigin;if(n?.kind!=='computed_numeric'||typeof currentValue!=='string'||currentValue!==n.sourceValue||sha(currentValue)!==n.sourceSha256||exactNumericChange(currentValue,n.number,n.operation)!==action.value){const e=new Error('Numeric source changed before dispatch');e.code='JEV_NOT_DISPATCHED';throw e;}
}
