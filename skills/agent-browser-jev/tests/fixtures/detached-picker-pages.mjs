const message='Keep these notes.';
export const detachedCases=[
 {id:'resolve-depot',goal:'Set the delivery destination to the Riverton depot and save. Preserve Notes.',query:'Riverton',expected:'Riverton — Depot',save:true},
 {id:'literal-detached-query',goal:'Type exactly "Riverton" in Destination. Leave suggestions unselected and do not save. Preserve Notes.',query:'Riverton',expected:'Riverton',queryOnly:true},
 {id:'article-search-results',search:true,goal:'Search articles for Riverton and open the depot article. Preserve Notes.',query:'Riverton',expected:'Riverton depot — Read article'},
 {id:'optional-detached-text',freeText:true,goal:'Set Memo to exactly "Riverton" and save. Suggestions are optional; do not select one. Preserve Notes.',query:'Riverton',expected:'Riverton',save:true},
 {id:'unrelated-bookmarks',unrelated:true,freeText:true,goal:'Set Memo to exactly "Riverton" and save. Leave bookmarks untouched and preserve Notes.',query:'Riverton',expected:'Riverton',save:true},
 {id:'missing-depot',negative:true,goal:'Set the delivery destination to the Harbor office and save. Do not substitute another location or alter Notes.',query:'Harbor',expected:'Harbor — Office'},
];
export const detachedItems=d=>d.search?['Riverton depot — Read article','Riverton station — Read article']:d.negative?['Harbor — Station']:['Riverton — Depot','Riverton — Station'];
export const detachedLabel=d=>d.search?'Search articles':d.freeText?'Memo':'Destination';
export function detachedPage(d){
 const label=detachedLabel(d);
 return `<meta charset="utf-8"><h1>${d.search?'Knowledge search':'Delivery draft'}</h1><form><label>Notes<textarea id="notes">${message}</textarea></label><label>${label}<input id="query" autocomplete="off"></label>${d.freeText&&!d.unrelated?'<p>Memo accepts free text. Suggestions are optional.</p>':''}<section id="results" hidden><h2>${d.search?'Article search results':d.unrelated?'Unrelated bookmarks':'Suggested destinations'}</h2><ul id="choices"></ul></section><p id="selected"></p>${d.search?'':'<button>Save</button>'}</form><p role="status" id="status"></p><script>
 const query=document.getElementById('query'),notes=document.getElementById('notes'),results=document.getElementById('results'),choices=document.getElementById('choices');let selected='',queue=Promise.resolve();
 const record=e=>queue=queue.then(()=>fetch('/event',{method:'POST',body:JSON.stringify(e)}));
 notes.oninput=()=>record({kind:'input',field:'Notes',value:notes.value});
 query.oninput=()=>{selected='';document.getElementById('selected').textContent='';record({kind:'input',field:'query',value:query.value});choices.replaceChildren();results.hidden=!query.value;if(query.value)for(const value of ${JSON.stringify(detachedItems(d))}){const item=document.createElement('li');item.textContent=value;item.tabIndex=0;item.onclick=()=>{${d.search||d.unrelated?`record({kind:'open',value});document.querySelector('form').remove();document.getElementById('status').textContent='Article opened: '+value;`:`selected=value;query.value=value;results.hidden=true;document.getElementById('selected').textContent='Selected destination: '+value;record({kind:'select',value});`}};choices.append(item);}};
 document.querySelector('form').onsubmit=async e=>{e.preventDefault();await record({kind:'save',value:${d.freeText?'query.value':'selected'},selected,notes:notes.value});e.target.remove();document.getElementById('status').textContent='Saved. ${label}: '+${d.freeText?'query.value':'selected'}+'; Notes: '+notes.value;};
 </script>`;
}
export function verifyDetached(d,events){
 const inputs=events.filter(e=>e.kind==='input'),selected=events.filter(e=>e.kind==='select'),opened=events.filter(e=>e.kind==='open'),saved=events.filter(e=>e.kind==='save');
 const scopeCorrect=saved.length<=1&&opened.length<=1&&events.every(e=>['input','select','open','save'].includes(e.kind))&&inputs.every(e=>e.field==='query'&&(!(d.queryOnly||d.freeText)||['',d.expected].includes(e.value)))&&selected.every(e=>!d.queryOnly&&!d.freeText&&!d.negative&&e.value===d.expected)&&opened.every(e=>d.search&&e.value===d.expected)&&saved.every(e=>d.save&&e.value===d.expected&&e.notes===message&&(!d.freeText||e.selected===''));
 const goalReached=!d.negative&&scopeCorrect&&(d.queryOnly?inputs.at(-1)?.value===d.expected&&selected.length===0&&saved.length===0:d.search?opened.length===1:saved.length===1);
 return {goalReached,scopeCorrect,negativePassed:Boolean(d.negative)&&scopeCorrect&&!saved.length&&!selected.length&&!opened.length};
}
