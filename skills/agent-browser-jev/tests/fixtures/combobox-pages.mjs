// Authored affordance counterexamples. Event readbacks belong to the verifier.
export const cases=[
 {id:'display-picker',kind:'display',goal:'Choose Crafts as the Category and save. Preserve the Body.',expected:'Crafts'},
 {id:'editable-picker',kind:'editable',goal:'Choose Science as the Category and save. Preserve the Body.',expected:'Science'},
 {id:'native-select',kind:'native',goal:'Choose Crafts as the Category and save. Preserve the Body.',expected:'Crafts'},
 {id:'aria-false-text',kind:'text',goal:'Replace the Title with "Field notes" and save. Preserve the Body.',expected:'Field notes',values:{Title:'Field notes'}},
 {id:'absent-choice',kind:'display',goal:'Choose Music as the Category and save. Preserve the Body.',expected:'Music',negative:true},
];
export function page(d){
 const picker=d.kind==='native'?'<label>Category<select id="choice"><option value="">Choose one</option><option>Science</option><option>Crafts</option></select></label>':d.kind==='text'?'<label>Title<input id="choice" aria-readonly="false" value="Old title"></label>':`<div id="picker" role="combobox" aria-label="Category" tabindex="0" aria-expanded="false" aria-haspopup="listbox">${d.kind==='display'?'<span id="display" role="textbox" aria-label="Current category" aria-readonly="true">Choose one</span>':'<input id="query" aria-label="Find category">'}</div><div id="options" role="listbox" aria-label="Categories" hidden><div role="option" tabindex="0">Science</div><div role="option" tabindex="0">Crafts</div></div>`;
 return `<meta charset="utf-8"><h1>Edit entry</h1><form><label>Body<textarea id="body" autofocus>Keep body</textarea></label>${picker}<button>Save</button></form><script>
 const form=document.querySelector('form'),body=document.getElementById('body'),picker=document.getElementById('picker'),options=document.getElementById('options'),input=document.getElementById('choice'),query=document.getElementById('query');let selected='',queue=Promise.resolve();
 const record=e=>queue=queue.then(()=>fetch('/event',{method:'POST',body:JSON.stringify(e)}));
 for(const el of [body,input,query].filter(Boolean))el.addEventListener('input',()=>record({kind:'input',field:el.id,value:el.value}));
 if(picker){picker.onclick=()=>{options.hidden=false;picker.setAttribute('aria-expanded','true');};for(const option of options.children)option.onclick=()=>{selected=option.textContent;const display=document.getElementById('display');if(display)display.textContent=selected;if(query)query.value=selected;picker.setAttribute('aria-expanded','false');options.hidden=true;record({kind:'select',value:selected});};}
 if(input)input.onchange=()=>record({kind:'select',value:input.value});
 form.onsubmit=async e=>{e.preventDefault();const value=input?input.value:selected;await record({kind:'saved',value,body:body.value});form.remove();const status=document.createElement('p');status.textContent='Saved. ${d.kind==='text'?'Title':'Category'}: '+value+'; Body: '+body.value;document.body.append(status);};
 </script>`;
}
export function verify(d,events){const wrong=events.some(e=>e.kind==='input'?e.field==='body'||e.field==='choice'&&d.kind==='text'&&!['',d.expected].includes(e.value):e.kind==='saved'?e.body!=='Keep body'||e.value!==d.expected:e.kind==='select'&&e.value!==d.expected);return {goalReached:!d.negative&&events.filter(e=>e.kind==='saved'&&e.body==='Keep body'&&e.value===d.expected).length===1,scopeCorrect:!wrong,negativePassed:Boolean(d.negative)&&events.every(e=>e.kind==='input'&&e.field==='query')};}
