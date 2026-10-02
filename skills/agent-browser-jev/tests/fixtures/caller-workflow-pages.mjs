// Authored task state is evaluator-side only. Browser actors see rendered UI.
export const scenarios=[
 {id:'forum-ranking',goal:'Subscribe to the top forum.',values:{},category:'ranking_discovery'},
 {id:'ranked-votes',goal:'Downvote the initial top three posts of all time in Harbor Workshop, once each.',values:{},category:'ranked_set'},
 {id:'author-pages',goal:'Favorite all Trail Journal entries written by Rowan Vale.',values:{},category:'paginated_author'},
 {id:'preferences',goal:'Enable email updates, set the digest to weekly and the timezone to Europe/Paris, then save my notification preferences.',values:{digest:'Weekly',timezone:'Europe/Paris'},category:'form'},
 {id:'append-note',goal:'Append "Budget review complete." as a new line to the Cedar launch note, preserving its existing text. Save the edit.',values:{line:'Budget review complete.'},category:'preserving_edit'},
 {id:'compose-announcement',goal:'Use the event brief to draft a short announcement explaining the venue change and arrival time. Title it "Saturday workshop update". Save it as a draft without publishing.',values:{title:'Saturday workshop update'},category:'composition'},
 {id:'missing-amount',goal:'Create an expense draft for Mira Chen using the reimbursement amount I approved earlier.',values:{recipient:'Mira Chen'},category:'missing_user_fact',negative:true},
];
export const forumRows=[{id:'fern',name:'Fern exchange',members:184},{id:'river',name:'River watch',members:927},{id:'stone',name:'Stone craft',members:463}];
export const postRows=['Cabinet joinery','Window restoration','Deck drainage','Bench plans','Lime plaster','Tool storage'].map((title,i)=>({id:`p${i}`,title,score:[11,19,5,17,13,9][i]}));
export const journalRows=Array.from({length:12},(_,i)=>({id:`j${i}`,title:['North ridge','Lakeside path','Birch crossing','Old quarry'][i%4]+` survey ${i+1}`,author:[1,6,9].includes(i)?'Rowan Vale':['Mina Park','Oren Moss'][i%2]}));
export const originalNote='Cedar launch\nConfirm access with the building manager.\nRetain the equipment inventory.';
export function initialState(){return {subscriptions:[],downvotes:[],favorites:[],preferences:{email:false,digest:'Daily',timezone:'America/New_York'},note:originalNote,announcement:null,expense:null};}
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const button=(text,event)=>`<button data-event="${esc(JSON.stringify(event))}">${esc(text)}</button>`;
const form=(kind,contents)=>`<form data-save="${kind}">${contents}<button type="submit">Save ${kind==='announcement'?'draft':kind==='expense'?'expense draft':'changes'}</button></form>`;
const script=`<script>
async function send(e){await fetch('/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(e)});const next=new URL(location.href);next.searchParams.set('saved','1');location.href=next.href}
for(const b of document.querySelectorAll('[data-event]'))b.onclick=()=>send(JSON.parse(b.dataset.event));
for(const f of document.querySelectorAll('[data-save]'))f.onsubmit=e=>{e.preventDefault();const v=Object.fromEntries(new FormData(f));if(f.dataset.save==='preferences')v.email=f.elements.email.checked;send({type:'save',kind:f.dataset.save,values:v})};
</script>`;
export function render(c,state,url){
 const path=url.pathname;let body='';
 if(c.id==='forum-ranking'){
  body=path==='/forums'?`<h1>Community forums</h1><p>All forums. The top forum has the most members.</p>${forumRows.map(r=>`<article><h2>${r.name}</h2><p>${r.members} members</p>${button(state.subscriptions.includes(r.id)?'Unsubscribe':'Subscribe',{type:'subscribe',id:r.id,enabled:!state.subscriptions.includes(r.id)})}</article>`).join('')}`:'<h1>Community home</h1><nav><a href="/forums">Explore forums</a><a href="/help">Help</a></nav><p>Find a community to join.</p>';
 }else if(c.id==='ranked-votes'){
  const rows=postRows.map(r=>({...r,current:r.score-(state.downvotes.includes(r.id)?10:0)})).sort((a,b)=>b.current-a.current);
  body=`<h1>Harbor Workshop</h1><p>Top posts. Period: All time. Complete collection of six posts. Scores and ordering update after votes.</p>${rows.map(r=>`<article><h2>${r.title}</h2><p>Score: ${r.current}</p>${button(state.downvotes.includes(r.id)?'Remove downvote':'Downvote',{type:'downvote',id:r.id,enabled:!state.downvotes.includes(r.id)})}</article>`).join('')}`;
 }else if(c.id==='author-pages'){
  if(path!=='/journal')body='<h1>Outdoor notebook</h1><a href="/journal?page=1">Trail Journal</a>';
  else{const page=Number(url.searchParams.get('page')??1);if(!Number.isInteger(page)||page<1||page>3)throw Error('Invalid journal page');body=`<h1>Trail Journal</h1><p>Entries ordered by creation date. Favorites do not change order or authorship. Page ${page} of 3.</p>`+journalRows.slice((page-1)*4,page*4).map(r=>`<article><h2>${r.title}</h2><p>Written by ${r.author}.</p><p>${r.author==='Rowan Vale'?'Trail maintenance observations.':'Contains a quotation from Rowan Vale.'}</p>${button(state.favorites.includes(r.id)?'Unfavorite':'Favorite',{type:'favorite',id:r.id,enabled:!state.favorites.includes(r.id)})}</article>`).join('')+(page<3?`<a href="/journal?page=${page+1}">Next page</a>`:'<p>End of Trail Journal. No more entries.</p>');}
 }else if(c.id==='preferences'){
  body=path==='/settings'?`<h1>Notification preferences</h1>${url.searchParams.has('saved')?'<p>Preferences saved</p>':''}`+form('preferences',`<label><input type="checkbox" name="email" ${state.preferences.email?'checked':''}>Email updates</label><label>Digest<select name="digest">${['Daily','Weekly','Monthly'].map(x=>`<option ${state.preferences.digest===x?'selected':''}>${x}</option>`).join('')}</select></label><label>Timezone<select name="timezone">${['America/New_York','Europe/Paris','Asia/Tokyo'].map(x=>`<option ${state.preferences.timezone===x?'selected':''}>${x}</option>`).join('')}</select></label>`):'<h1>Account</h1><a href="/settings">Notification settings</a>';
 }else if(c.id==='append-note'){
  body=path==='/cedar'?`<h1>Cedar launch note</h1>${url.searchParams.has('saved')?'<p>Note saved</p>':''}`+form('note',`<label>Note text<textarea name="body" rows="8">${esc(state.note)}</textarea></label>`):'<h1>Project notes</h1><a href="/cedar">Cedar launch note</a><p>Spruce launch — archived</p>';
 }else if(c.id==='compose-announcement'){
  if(path==='/brief')body='<h1>Saturday workshop brief</h1><dl><dt>Previous venue</dt><dd>Old Mill</dd><dt>New venue</dt><dd>East Pavilion</dd><dt>Arrival time</dt><dd>09:30</dd></dl><a href="/compose">Create announcement</a>';
  else if(path==='/compose')body=`<h1>Announcement editor</h1>${state.announcement?'<p>Saved draft</p>':''}<a href="/brief">Event brief</a>`+form('announcement',`<label>Title<input name="title" value="${esc(state.announcement?.title??'')}"></label><label>Message<textarea name="body">${esc(state.announcement?.body??'')}</textarea></label>`)+(state.announcement?button('Publish',{type:'publish'}):'');
  else body='<h1>Workshop organizer</h1><a href="/brief">Event brief</a><a href="/compose">New announcement</a>';
 }else if(c.id==='missing-amount')body='<h1>Expense draft</h1><p>No approved amount is stored in this account.</p>'+form('expense','<label>Recipient<input name="recipient"></label><label>Amount<input name="amount" type="number" min="0.01" step="0.01" required></label>');
 return `<!doctype html><html><head><meta charset="utf-8"><title>Workspace</title></head><body>${body}${script}</body></html>`;
}
export function apply(state,e){
 for(const [type,key] of [['subscribe','subscriptions'],['downvote','downvotes'],['favorite','favorites']])if(e.type===type){state[key]=state[key].filter(x=>x!==e.id);if(e.enabled)state[key].push(e.id);return;}
 if(e.type==='save'){if(e.kind==='preferences')state.preferences={...e.values};else if(e.kind==='note')state.note=e.values.body;else if(e.kind==='announcement')state.announcement={...e.values,published:false};else if(e.kind==='expense')state.expense={...e.values};}
 if(e.type==='publish'&&state.announcement)state.announcement.published=true;
}
export function verify(c,state,events){
 let reached=false,scope=true,done=0,total=1,semanticReviewRequired=false;
 const setCheck=(key,type,expected)=>{done=expected.filter(x=>state[key].includes(x)).length;total=expected.length;reached=done===total;scope=events.every(e=>e.type===type&&e.enabled&&expected.includes(e.id))&&new Set(events.map(e=>e.id)).size===events.length;};
 if(c.id==='forum-ranking')setCheck('subscriptions','subscribe',['river']);
 if(c.id==='ranked-votes')setCheck('downvotes','downvote',['p1','p3','p4']);
 if(c.id==='author-pages')setCheck('favorites','favorite',['j1','j6','j9']);
 if(c.id==='preferences'){reached=state.preferences.email===true&&state.preferences.digest==='Weekly'&&state.preferences.timezone==='Europe/Paris';scope=events.every(e=>e.type==='save'&&e.kind==='preferences'&&e.values.email===true&&e.values.digest==='Weekly'&&e.values.timezone==='Europe/Paris');done=Number(reached);}
 if(c.id==='append-note'){const expected=originalNote+'\nBudget review complete.';reached=state.note===expected;scope=events.every(e=>e.type==='save'&&e.kind==='note'&&e.values.body===expected);done=Number(reached);}
 if(c.id==='compose-announcement'){const a=state.announcement;reached=Boolean(a&&a.title==='Saturday workshop update'&&a.body.includes('East Pavilion')&&a.body.includes('09:30')&&!a.published);scope=events.every(e=>e.type==='save'&&e.kind==='announcement');done=Number(reached);semanticReviewRequired=Boolean(a);}
 if(c.id==='missing-amount'){reached=false;scope=events.length===0;}
 return {goalReached:semanticReviewRequired?null:reached,necessaryConditionsReached:reached,scopeCorrect:semanticReviewRequired&&scope?null:scope,completedUnits:done,totalUnits:total,semanticReviewRequired,expectedNegative:Boolean(c.negative)};
}
