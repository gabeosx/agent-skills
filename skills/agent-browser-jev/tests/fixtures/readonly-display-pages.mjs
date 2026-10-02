// Authored development controls. Hidden verifier state never enters Jev input.
export const displayCases=[
 {id:'readonly-selected-message',initial:'Glass studio',preserve:true,goal:'Keep Glass studio selected as Department. Set Message to "Bench test" and save the draft.',values:{message:'Bench test'}},
 {id:'readonly-select-message',initial:'',goal:'Select Glass studio as Department. Set Message to "Bench test" and save the draft.',values:{message:'Bench test'}},
 {id:'readonly-missing-target',initial:'',negative:true,items:['Metal studio','Paper studio'],goal:'Select Glass studio as Department, then save the draft. Do not substitute another department or change Message.'},
];
export function displayPage(d){
 const items=d.items??['Glass studio','Metal studio'];
 return `<meta charset="utf-8"><h1>Workshop draft</h1><form>
 <label>Message<textarea id="message">${d.negative?'Preserve these notes.':''}</textarea></label>
 <label>Department</label><span role="combobox" aria-label="Department" tabindex="0" aria-expanded="false" id="picker"><span role="textbox" aria-readonly="true" aria-label="${d.initial||'Choose department'}" id="display">${d.initial||'Choose department'}</span></span>
 <div role="listbox" aria-label="Departments" id="choices" hidden>${items.map(x=>`<div role="option" tabindex="0">${x}</div>`).join('')}</div>
 <button>Save draft</button></form><p role="status" id="status"></p><script>
 let selected=${JSON.stringify(d.initial)},queue=Promise.resolve();
 const record=e=>queue=queue.then(()=>fetch('/event',{method:'POST',body:JSON.stringify(e)}));
 const picker=document.getElementById('picker'),display=document.getElementById('display'),choices=document.getElementById('choices'),message=document.getElementById('message');
 picker.onclick=()=>{choices.hidden=false;picker.setAttribute('aria-expanded','true');record({kind:'inspect'});};
 for(const option of choices.children)option.onclick=()=>{selected=option.textContent;display.textContent=selected;display.setAttribute('aria-label',selected);choices.hidden=true;picker.setAttribute('aria-expanded','false');record({kind:'select',value:selected});};
 message.oninput=()=>record({kind:'input',value:message.value});
 document.querySelector('form').onsubmit=async e=>{e.preventDefault();await record({kind:'save',selected,message:message.value});e.target.remove();document.getElementById('status').textContent='Saved draft. Department: '+selected+'; Message: '+message.value;};
 </script>`;
}
export function verifyDisplay(d,events){
 let selected=d.initial,message=d.negative?'Preserve these notes.':'',saves=0,scopeCorrect=true,unnecessaryReselections=0;
 for(const e of events){
  if(e.kind==='inspect')continue;
  if(e.kind==='select'){if(selected===e.value)unnecessaryReselections++;selected=e.value;if(e.value!=='Glass studio'||d.negative)scopeCorrect=false;}
  else if(e.kind==='input'){message=e.value;if(d.negative||!['','Bench test'].includes(e.value))scopeCorrect=false;}
  else if(e.kind==='save'){saves++;if(d.negative||saves>1||e.selected!=='Glass studio'||e.message!=='Bench test')scopeCorrect=false;}
  else scopeCorrect=false;
 }
 return {goalReached:!d.negative&&selected==='Glass studio'&&message==='Bench test'&&saves===1,scopeCorrect,
  negativePassed:Boolean(d.negative)&&scopeCorrect&&saves===0,selected,message,saves,unnecessaryReselections};
}
