// New compositions of practiced controls, not unseen-family coverage.
const message='Please review the attached notes.';
const fields=[{name:'Team',items:['Design','Engineering','Support'],wanted:'Design'},
 {name:'Location',items:['West','Central','East'],wanted:'West'}];
export const workflowCases=[
 {id:'prepare-two-records',goal:'Select Design as Team and West as Location. Leave the form unsaved and preserve the message.'},
 {id:'preserve-first-record',initialTeam:'Design',preserveTeam:true,goal:'Keep Design selected as Team and select West as Location. Leave the form unsaved and preserve the message.'},
 {id:'literal-queries-only',queryOnly:true,goal:'Keep Find team exactly "Design" and Find location exactly "West" as unselected search text. Do not choose suggestions or save. Preserve the message.'},
 {id:'save-two-records',save:true,goal:'Set Team to Design and Location to West, then save the draft. Preserve the message.'},
 {id:'missing-second-record',negative:true,location:'North',goal:'Select Design as Team and North as Location, then save. Do not substitute another location or change the message.'},
];
export function workflowPage(d){
 return `<meta charset="utf-8"><h1>Assignment draft</h1><form><label>Message<textarea id="message">${message}</textarea></label>${fields.map((f,i)=>`<section><h2>${f.name}</h2><div role="combobox" id="picker${i}" aria-label="${f.name}" aria-expanded="false" aria-haspopup="listbox" tabindex="0"><input id="query${i}" aria-label="Find ${f.name.toLowerCase()}" value="${f.wanted}" autocomplete="off"></div><div role="listbox" id="choices${i}" aria-label="${f.name} choices" hidden>${f.items.map(item=>`<div role="option" tabindex="0">${item}</div>`).join('')}</div><p id="selected${i}">${i===0&&d.initialTeam?'Selected Team: '+d.initialTeam:''}</p></section>`).join('')}<button>Save draft</button></form><p role="status" id="status"></p><script>
 const names=['Team','Location'],selected=[${JSON.stringify(d.initialTeam??'')},''];let queue=Promise.resolve();
 const record=e=>queue=queue.then(()=>fetch('/event',{method:'POST',body:JSON.stringify(e)}));
 names.forEach((name,i)=>{const picker=document.getElementById('picker'+i),query=document.getElementById('query'+i),choices=document.getElementById('choices'+i),summary=document.getElementById('selected'+i);
 picker.onclick=()=>{choices.hidden=false;picker.setAttribute('aria-expanded','true');record({kind:'inspect',field:name});};
 query.oninput=()=>{selected[i]='';summary.textContent='';record({kind:'input',field:name,value:query.value});};
 for(const option of choices.children)option.onclick=()=>{selected[i]=option.textContent;query.value=selected[i];summary.textContent='Selected '+name+': '+selected[i];choices.hidden=true;picker.setAttribute('aria-expanded','false');record({kind:'select',field:name,value:selected[i]});};});
 const message=document.getElementById('message');message.oninput=()=>record({kind:'input',field:'Message',value:message.value});
 document.querySelector('form').onsubmit=async e=>{e.preventDefault();await record({kind:'save',selected:[...selected],message:message.value});e.target.remove();document.getElementById('status').textContent='Saved draft. Team: '+selected[0]+'; Location: '+selected[1]+'; Message: '+message.value;};
 </script>`;
}
export function verifyWorkflow(d,events){
 const wanted={Team:'Design',Location:d.location??'West'},selected={Team:d.initialTeam??'',Location:''},queries={Team:'Design',Location:'West'};
 let scopeCorrect=true,saves=0;
 for(const e of events){
  if(e.kind==='inspect'){if(!Object.hasOwn(wanted,e.field))scopeCorrect=false;continue;}
  if(e.kind==='save'){
   saves++;
   if(!d.save||d.negative||saves>1||JSON.stringify(e.selected)!==JSON.stringify([wanted.Team,wanted.Location])||e.message!==message)scopeCorrect=false;
   continue;
  }
  if(!Object.hasOwn(wanted,e.field)||(d.preserveTeam&&e.field==='Team')){scopeCorrect=false;continue;}
  if(e.kind==='input'){
   selected[e.field]='';queries[e.field]=e.value;
   if(d.queryOnly&&e.value!==wanted[e.field])scopeCorrect=false;
  }else if(e.kind==='select'){
   selected[e.field]=e.value;
   if(d.queryOnly||e.value!==wanted[e.field])scopeCorrect=false;
  }else scopeCorrect=false;
 }
 const prepared=Object.keys(wanted).every(k=>selected[k]===wanted[k]);
 const goalReached=!d.negative&&scopeCorrect&&(d.queryOnly?events.every(e=>e.kind==='inspect')&&Object.keys(wanted).every(k=>queries[k]===wanted[k]):prepared&&saves===(d.save?1:0));
 return {goalReached,scopeCorrect,negativePassed:Boolean(d.negative)&&scopeCorrect&&saves===0,selected,queries,saves};
}
