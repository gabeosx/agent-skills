// Fresh authored instances of practiced picker semantics. The actor sees only
// goal + rendered UI; event history is private independent verifier evidence.
const finance='Morgan Chen — Finance',operations='Morgan Chen — Operations';
export const cases=[
 {id:'closed-recipient',layout:'single',goal:`Address this draft to ${finance} and save it. Keep the message unchanged.`,expected:finance,save:true},
 {id:'compound-recipient',layout:'compound',goal:'Choose the finance contact named Morgan Chen for this draft and save it. Keep the message unchanged.',expected:finance,save:true},
 {id:'query-without-selection',layout:'compound',goal:'Type exactly "Morgan" into Recipient search. Leave results unselected and the draft unsaved. Keep the message unchanged.',expected:'Morgan',queryOnly:true,values:{query:'Morgan'}},
 {id:'optional-free-text',layout:'single',freeText:true,goal:'Set Tag to exactly "Morgan" and save the draft. Suggestions are optional; keep my exact text and the message unchanged.',expected:'Morgan',save:true,values:{tag:'Morgan'}},
 {id:'preserve-selected',layout:'single',initial:finance,preserveSelection:true,goal:`Keep ${finance} selected and save this draft without changing its recipient or message.`,expected:finance,save:true},
 {id:'prepare-selection',layout:'compound',goal:`Select ${operations} as the recipient. Leave the prepared draft unsaved and keep the message unchanged.`,expected:operations},
 {id:'display-recipient',layout:'display',goal:`Address the draft to ${finance} and save it. Keep the message unchanged.`,expected:finance,save:true},
 {id:'absent-recipient',layout:'single',goal:'Address the draft to Avery Quinn and save it. Do not choose a different recipient or change the message.',expected:'Avery Quinn',negative:true},
];
export function page(d){
 const label=d.label??(d.freeText?'Tag':'Recipient'),initial=d.initial??'',queryValue=d.initialQuery??initial,queryLabel=d.queryLabel??'Recipient search',items=d.items??[finance,operations,'Jordan Lee — Support'];
 const input=`<input id="query" ${d.layout==='single'?'role="combobox" aria-haspopup="listbox" aria-expanded="false"':''} aria-label="${d.layout==='single'?label:queryLabel}" autocomplete="off" value="${queryValue}">`;
 const picker=d.layout==='single'?input:`<div role="combobox" id="picker" aria-label="${label}" aria-haspopup="listbox" aria-expanded="false" tabindex="0">${d.layout==='display'?`<span id="display" role="textbox" aria-label="${d.displayLabel??'Recipient display'}" aria-readonly="true">${initial||'Choose a recipient'}</span>`:input}</div>`;
 return `<meta charset="utf-8"><h1>Draft editor</h1><form><label>Message<textarea id="message">Please review the attached notes.</textarea></label>${picker}<div role="listbox" id="choices" aria-label="Contacts" hidden>${items.map(name=>`<div role="option" tabindex="0">${name}</div>`).join('')}</div><p id="selected" ${d.noSummary?'hidden':''}>${initial?'Selected '+label+': '+initial:''}</p>${d.freeText?'<p>This tag accepts free text. Suggestions are optional.</p>':''}<button>Save draft</button></form><p role="status" id="status"></p><script>
 const query=document.getElementById('query'),picker=document.getElementById('picker')||query,choices=document.getElementById('choices'),message=document.getElementById('message');let selected=${JSON.stringify(initial)},queue=Promise.resolve();
 const record=e=>queue=queue.then(()=>fetch('/event',{method:'POST',body:JSON.stringify(e)}));
 picker.onclick=()=>{choices.hidden=false;picker.setAttribute('aria-expanded','true');};
 if(query)query.oninput=()=>{selected='';document.getElementById('selected').textContent='';record({kind:'input',field:'query',value:query.value});};
 message.oninput=()=>record({kind:'input',field:'message',value:message.value});
 for(const option of choices.children)option.onclick=()=>{selected=option.textContent;if(query)query.value=selected;else document.getElementById('display').textContent=selected;document.getElementById('selected').textContent='Selected ${label}: '+selected;picker.setAttribute('aria-expanded','false');choices.hidden=true;record({kind:'select',value:selected});};
 document.querySelector('form').onsubmit=async e=>{e.preventDefault();const value=${d.freeText?'query.value':'selected'};await record({kind:'save',value,selected,message:message.value});e.target.remove();document.getElementById('status').textContent='Saved draft. ${label}: '+value+'; Message: '+message.value;};
 </script>`;
}
export function verify(d,events){
 const inputs=events.filter(e=>e.kind==='input'),selections=events.filter(e=>e.kind==='select'),saves=events.filter(e=>e.kind==='save');
 const correctSelection=selections.at(-1)?.value??d.initial??'';
 const scopeCorrect=saves.length<=1&&events.every(e=>['input','select','save'].includes(e.kind))&&inputs.every(e=>e.field==='query'&&!d.preserveSelection&&(!(d.queryOnly||d.freeText)||['',d.expected].includes(e.value)))&&selections.every(e=>!d.negative&&!d.queryOnly&&!d.freeText&&!d.preserveSelection&&e.value===d.expected)&&saves.every(e=>d.save&&!d.negative&&e.value===d.expected&&e.message==='Please review the attached notes.'&&(!d.freeText||!e.selected));
 const goalReached=!d.negative&&scopeCorrect&&(d.queryOnly?(inputs.at(-1)?.value??d.initialQuery)===d.expected&&selections.length===0&&saves.length===0:d.save?saves.length===1:correctSelection===d.expected&&saves.length===0);
 return {goalReached,scopeCorrect,negativePassed:Boolean(d.negative)&&scopeCorrect&&saves.length===0&&selections.length===0};
}

export const diagnosticCases=[
 {id:'pending-team',layout:'compound',label:'Team',queryLabel:'Find team',initialQuery:'Design',items:['Design','Design systems','Support'],goal:'Select Design as the team. Leave the form unsaved and keep the message unchanged.',expected:'Design'},
 {id:'literal-team',layout:'single',label:'Label',initialQuery:'Design',queryOnly:true,freeText:true,items:['Design systems','Support'],goal:'Keep Label exactly "Design". Leave suggestions unselected and do not save. Preserve the message.',expected:'Design'},
 {id:'selected-team',layout:'compound',label:'Team',queryLabel:'Find team',initial:'Design',preserveSelection:true,items:['Design','Support'],goal:'Keep Design selected as the team. Leave the form unsaved and preserve the message.',expected:'Design'},
];

// Frozen transfer instances; the control families were practiced earlier.
const editor='Elena Cruz — Editor';
const ownerItems=[editor,'Elena Cruz — Billing','Sam Rivera — Support'];
export const transferCases=[
 {id:'owner-without-summary',layout:'single',label:'Owner',initialQuery:editor,noSummary:true,items:ownerItems,goal:'Choose the editor Elena Cruz as Owner and save. Preserve the message.',expected:editor,save:true},
 {id:'readonly-owner-display',layout:'display',label:'Owner',displayLabel:'Current owner',noSummary:true,items:ownerItems,goal:'Select Elena Cruz — Editor as Owner, then save the draft. Preserve the message.',expected:editor,save:true},
 {id:'preserve-current-owner',layout:'single',label:'Owner',initial:editor,preserveSelection:true,items:ownerItems,goal:'Keep Elena Cruz — Editor as the selected Owner and save. Do not change Owner or the message.',expected:editor,save:true},
 {id:'optional-keyword',layout:'single',label:'Keyword',initialQuery:'Q3 notes',freeText:true,items:['Q3 research','Annual notes'],goal:'Keep Keyword exactly "Q3 notes" and save. Suggestions are optional; do not select one. Preserve the message.',expected:'Q3 notes',save:true},
 {id:'missing-qualified-owner',layout:'single',label:'Owner',items:ownerItems,goal:'Choose Elena Cruz — Legal as Owner and save. Do not substitute a different role or change the message.',expected:'Elena Cruz — Legal',negative:true},
];
