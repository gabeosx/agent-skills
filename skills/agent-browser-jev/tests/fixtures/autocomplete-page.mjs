// Synthetic controls: their committed IDs are distinct from the visible query.
export const autocompleteExpected={contact:'contact-adobe-systems',account:'account-software-subscriptions'};
export const autocompleteIntent='Select Adobe Systems as the contact and Software subscriptions as the account, using the supplied search queries. Finish on the Selection confirmed screen.';
export function autocompletePage(mode='click') {
  if(!['click','enter','tab'].includes(mode))throw Error('Unknown fixture mode');
  return `<!doctype html><meta charset="utf-8"><title>Record selection</title>
<style>body{font:18px system-ui;margin:40px}label{display:block;margin-top:20px}[role=option]{padding:8px}[aria-selected=true]{background:#def}input,button{font:inherit}</style>
<h1>Choose records</h1><p>${mode==='click'?'Type to search, then select a matching suggestion.':'Use arrow keys and '+(mode==='tab'?'Tab':'Enter')+' to choose each suggestion. Suggestions cannot be selected by mouse.'}</p>
<div id="fields"></div><button id="finish">Confirm selection</button><p id="status" role="status"></p>
<script>
const mode=${JSON.stringify(mode)},selected={contact:null,account:null};
const records={contact:[{id:'contact-adobe-stock',label:'Adobe Stock'},{id:'contact-adobe-systems',label:'Adobe Systems'}],account:[{id:'account-software-assets',label:'Software assets'},{id:'account-software-subscriptions',label:'Software subscriptions'}]};
for(const key of ['contact','account']){
 const wrapper=document.createElement('section');
 wrapper.innerHTML='<label>'+key+' <input id="'+key+'" role="'+(key==='contact'?'combobox':'textbox')+'" aria-autocomplete="list" aria-haspopup="listbox" aria-controls="'+key+'-options" aria-expanded="false" autocomplete="off"></label><div id="'+key+'-options" role="listbox" aria-label="'+key+' matches" hidden></div><p id="'+key+'-selected">No '+key+' selected</p>';
 fields.append(wrapper);
 const input=wrapper.querySelector('input'),list=wrapper.querySelector('[role=listbox]'),committed=wrapper.querySelector('p');let matches=[],active=-1,timer;
 function draw(){list.innerHTML='';matches.forEach((record,i)=>{const option=document.createElement('div');option.id=key+'-option-'+i;option.role='option';option.textContent=record.label;option.setAttribute('aria-selected',String(active===i));option.onmousedown=e=>e.preventDefault();option.onclick=()=>{if(mode==='click')commit(i)};list.append(option)});if(active>=0)input.setAttribute('aria-activedescendant',key+'-option-'+active);else input.removeAttribute('aria-activedescendant');}
 function commit(i){if(!matches[i])return;selected[key]=matches[i].id;input.value=matches[i].label;committed.textContent='Selected '+key+': '+matches[i].label;list.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');}
 input.oninput=()=>{clearTimeout(timer);selected[key]=null;committed.textContent='No '+key+' selected';active=-1;list.hidden=true;input.setAttribute('aria-expanded','false');document.querySelector('#status').textContent='Searching '+key+'…';timer=setTimeout(()=>{matches=records[key].filter(r=>r.label.toLowerCase().includes(input.value.toLowerCase()));list.hidden=false;input.setAttribute('aria-expanded','true');draw();document.querySelector('#status').textContent=matches.length+' '+key+' matches';},180)};
 input.onkeydown=e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(!matches.length)return;list.hidden=false;input.setAttribute('aria-expanded','true');active=e.key==='ArrowDown'?Math.min(active+1,matches.length-1):Math.max(active-1,0);draw()}else if((e.key==='Enter'&&mode!=='tab')||(e.key==='Tab'&&mode==='tab')){if(e.key==='Enter')e.preventDefault();commit(active)}else if(e.key==='Escape'){list.hidden=true;input.setAttribute('aria-expanded','false')}};
}
finish.onclick=async()=>{if(!selected.contact||!selected.account){document.querySelector('#status').textContent='Select both records; typed text alone is not a selection.';return;}await fetch('/events',{method:'POST',body:JSON.stringify({type:'confirm',selected})});document.body.innerHTML='<h1>Selection confirmed</h1>'+['contact','account'].map(key=>'<p>'+key+': '+records[key].find(r=>r.id===selected[key]).label+'</p>').join('')};
</script>`;
}
