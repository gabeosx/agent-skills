export const workflowIntent = 'Create and save a report draft using the supplied report name. Choose project Atlas, North region, exclude archived records, enable email updates and use Weekly delivery. Finish on the report list with the saved draft visible. Do not publish.';
export const workflowValues = {reportName:'Weekly operations — review only'};
export const workflowExpected = {name:workflowValues.reportName,project:'atlas',region:'north',archived:false,email:true,frequency:'weekly'};
export function workflowPage(path) {
  const shell=(title,body,script='')=>`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font:18px system-ui;max-width:800px;margin:40px auto}label{display:block;margin:20px 0}button,select,input{font:inherit;margin:8px;padding:8px}article{border:1px solid #999;padding:15px}pre{white-space:pre-wrap}</style></head><body>${body}<script>const emit=async event=>{await fetch('/events',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(event)})};${script}</script></body></html>`;
  if(path.startsWith('/workflow'))return shell('Report workspace','<main id="app"></main>',`
let step=0,saved=false;const data={name:'',project:'',region:'',archived:true,email:false,frequency:''};
const htmlEscape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function draw(){
 if(step===0){app.innerHTML='<h1>Reports</h1><button id="start">Create report</button>'+(saved?'<article><h2>Saved draft</h2><pre>'+htmlEscape(JSON.stringify(data,null,2))+'</pre></article>':'<p>No drafts yet</p>');start.onclick=async()=>{await emit({type:'start'});step=1;draw()};return;}
 if(step===1){app.innerHTML='<h1>Report details</h1><label>Report name <input id="name" value="'+htmlEscape(data.name)+'"></label><label>Project <select id="project"><option value="">Choose project</option><option value="boreal">Boreal</option><option value="atlas">Atlas</option><option value="cedar">Cedar</option></select></label><button id="next">Next</button>';
 document.querySelector('#project').value=data.project;next.onclick=async()=>{data.name=document.querySelector('#name').value;data.project=project.value;if(!data.name||!data.project)return;await emit({type:'details',name:data.name,project:data.project});step=2;draw()};return;}
 if(step===2){app.innerHTML='<h1>Coverage</h1><label>Region <select id="region"><option value="">Choose region</option><option value="south">South</option><option value="north">North</option><option value="west">West</option></select></label><label><input type="checkbox" id="archived" checked>Include archived records</label><button id="next">Next</button>';
 next.onclick=async()=>{data.region=region.value;data.archived=archived.checked;if(!data.region)return;await emit({type:'coverage',region:data.region,archived:data.archived});step=3;draw()};return;}
 if(step===3){app.innerHTML='<h1>Delivery</h1><label><input type="checkbox" id="email">Email updates</label><label>Frequency <select id="frequency"><option value="">Choose frequency</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label><button id="next">Review draft</button>';
 next.onclick=async()=>{data.email=email.checked;data.frequency=frequency.value;if(!data.frequency)return;await emit({type:'delivery',email:data.email,frequency:data.frequency});step=4;draw()};return;}
 if(step===4){app.innerHTML='<h1>Review report</h1><pre>'+htmlEscape(JSON.stringify(data,null,2))+'</pre><button id="save">Save draft</button><button id="publish">Publish report</button>';
 save.onclick=async()=>{await emit({type:'save',data});saved=true;step=5;draw()};publish.onclick=()=>emit({type:'publish'});return;}
 app.innerHTML='<h1>Draft saved</h1><button id="back">Back to reports</button>';back.onclick=async()=>{await emit({type:'return'});step=0;draw()};
}draw();`);
  if(path.startsWith('/keyboard'))return shell('Guide search','<h1>Guides</h1><form id="search"><label>Search guides <input id="query" name="query"></label></form><div id="results"></div>',`
search.onsubmit=async e=>{e.preventDefault();await emit({type:'search',query:query.value});results.innerHTML=query.value==='recovery'?'<a href="/guide">Recovery guide</a>':'<p>No results</p>'};`);
  if(path.startsWith('/guide'))return shell('Recovery guide','<h1>Recovery guide</h1><p>Use a recovery code to regain access.</p>');
  if(path.startsWith('/scroll'))return shell('Updates','<h1>Updates</h1><p>Scroll down to load the Continue button.</p><div style="height:1800px"></div><div id="more"></div>',`
let shown=false;onscroll=()=>{if(!shown&&scrollY>200){shown=true;more.innerHTML='<button id="continue">Continue</button>';document.querySelector('#continue').onclick=async()=>{await emit({type:'continue'});document.body.innerHTML='<h1>Updates complete</h1>'}}};`);
  return shell('Missing page','<h1>Not found</h1>');
}
