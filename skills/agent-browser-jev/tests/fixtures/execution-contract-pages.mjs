// Authored fixture truth is independent of the helper. Not a public benchmark.
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
export function initialState(c){return {marked:[...(c.initial??[])]};}
function renderBase(c,state,url){
 if(c.pages&&c.count!==c.pages*6)throw Error('Fixture page count must expose every record');
 if(c.landing&&!url.searchParams.has('records'))return '<!doctype html><h1>Research portal</h1><p>Choose a collection.</p><a href="?records=1">Estuary Records</a><a href="?unrelated=1">Office directory</a>';
 const page=Number(url.searchParams.get('page')??1),start=c.pages?(page-1)*6:0,end=c.pages?page*6:c.count;
 let rows=Array.from({length:c.count},(_,i)=>({id:`x${i}`,title:`${['Reed','Driftwood','Marsh','Willow','Sandbar'][i%5]} observations ${i+1}`,author:i%15===2?'Neri':'Pavel',score:300-i*3-(!c.static&&state.marked.includes(`x${i}`)?90:0),saves:i===3?81:i===7?75:10+i,comments:400-i*21}));
 if(c.kind==='rank')rows.sort((a,b)=>b.score-a.score);if(c.reverse)rows.reverse();rows=rows.slice(start,end);
 let html=`<h1>Estuary Records</h1><p>${c.pages?`Page ${page} of ${c.pages}.`:`Complete collection: ${c.count} entries, all on this page. There are no other pages.`} ${c.static?'All-time score totals are frozen for this archive.':c.metric==='saves'?'Saves and comments are independent totals.':'All-time vote scores. Each vote changes the score and updates the displayed order immediately.'}</p>`;
 const elements=rows.map(r=>`<${c.table?'tr':'article'}>${c.table?'<td>':''}<h2>${r.title}</h2><p>Written by ${r.author}. ${r.author==='Pavel'?'Includes an interview with Neri.':''}</p><p>${c.metric==='saves'?`Saves: ${r.saves}. Comments: ${r.comments}.`:`Score: ${r.score}.`}</p>${c.large?'<p>This field record describes shoreline observations, local materials, maintenance schedules, planting trials and water conditions. The survey notes separate measured changes from expectations and include context about equipment, access, weather and the participants who recorded them. Entries are retained so the next survey team can compare conditions and check the history of repairs.</p>':''}<button data-event="${escape(JSON.stringify({type:'mark',id:r.id,enabled:!state.marked.includes(r.id)}))}">${state.marked.includes(r.id)?c.effect?'Unfavorite':'Remove downvote':c.effect?'Favorite':'Downvote'}</button>${c.table?'</td>':''}</${c.table?'tr':'article'}>`).join('');
 html+=c.table?`<table>${elements}</table>`:elements;
 if(c.pages&&page<c.pages)html+=`<a href="?page=${page+1}">Next page</a>`;if(c.pages&&page===c.pages)html+='<p>End of the complete collection.</p>';
 return `<!doctype html><html><body>${html}<script>for(const b of document.querySelectorAll('[data-event]'))b.onclick=async()=>{await fetch('/event',{method:'POST',body:b.dataset.event});location.reload()};</script></body></html>`;
}
export function apply(state,e,c){if(c?.noEffect)return;state.marked=state.marked.filter(id=>id!==e.id);if(e.enabled)state.marked.push(e.id);}
export function verify(c,state,events){return {goalReached:!c.negative&&state.marked.length===c.target.length&&c.target.every(id=>state.marked.includes(id)),scopeCorrect:events.every(e=>c.target.includes(e.id)&&e.enabled)&&new Set(events.map(e=>e.id)).size===events.length,correctEffects:state.marked.filter(id=>c.target.includes(id)).length,requiredEffects:c.target.length};}

function renderStandard(c,state,url){
 let html=renderBase(c,state,url).replaceAll('Estuary Records','Cypress Archive').replaceAll('Neri','Asha');
 if(c.kind==='author')html=html.replace('All-time vote scores. Each vote changes the score and updates the displayed order immediately.','Entries are ordered by creation time. Favoriting does not change order or authorship.');
 if(c.presentation){
  html=html.replace(/<p>Score: [^<]*<\/p>/g,'<p>Recorded field entry.</p>');
  const order=c.presentation==='featured'?'This is a rotating featured list. No ranking or popularity data is available.':`Sort: ${c.presentation==='ascending'?'Lowest score first':'Top, highest score first'}. Period: All time. ${c.static?'Archived order is fixed.':'Voting updates the order.'}`;
  html=html.replace('All-time vote scores. Each vote changes the score and updates the displayed order immediately.',order).replace('All-time score totals are frozen for this archive.',order);
 }
 return html;
}

export const cases=[
 {id:'routing-prefixed-collection',kind:'rank',presentation:'descending',prefix:true,count:16,goal:'Downvote the initial top four Cypress Archive entries of all time, once each.',target:['x0','x1','x2','x3']},
 {id:'routing-grouped-metric',kind:'rank',grouped:true,count:18,goal:'Downvote the two Cypress Archive entries with the highest initial all-time scores.',target:['x0','x1']},
 {id:'routing-large-members',kind:'author',count:110,large:true,reverse:true,goal:'Favorite all Cypress Archive entries written by Asha.',target:['x2','x17','x32','x47','x62','x77','x92','x107'],effect:'favorite'},
 {id:'routing-wrong-scope',kind:'rank',presentation:'descending',count:16,goal:'Downvote the three highest-scoring entries in Harbor Records.',target:[],negative:true},
 {id:'routing-missing-effect',kind:'author',count:16,noEffect:true,goal:'Favorite every entry by Asha in Cypress Archive.',target:['x2'],effect:'favorite',negative:true},
];
export function render(c,state,url){let html=renderStandard(c,state,url);if(c.prefix)html=html.replace('<h1>Cypress Archive</h1>','<h1>/collections/Cypress Archive</h1>');if(c.grouped)html=html.replace(/Score: ([+-]?\d+)/g,(_,n)=>`Score: ${(Number(n)*1000).toLocaleString('en-US')}`);return html;}
