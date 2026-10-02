// Self-authored discovery/effect boundaries. Goal checks use recorded effects,
// never helper completion, and retain wrong effects even after later recovery.
export const discoveryCases=[
 {id:'shortest-service',goal:'Find the service with the shortest turnaround and enable it. Preserve all other services.',metric:'Turnaround minutes',scores:[9,3,7],target:'Cedar'},
 {id:'cheapest-service',goal:'Find the service with the lowest monthly price and enable it. Preserve all other services.',metric:'Monthly price',scores:[40,65,85],target:'Birch'},
 {id:'most-capacity',goal:'Find the service with the largest capacity and enable it. Preserve all other services.',metric:'Capacity',scores:[4,7,12],target:'Maple'},
 {id:'enable-from-details',goal:'Enable Cedar from its details page. Do not enable it from the list.',context:'at_effect',target:'Cedar'},
 {id:'inspect-before-enable',goal:'Read Cedar details, then return to the service list and enable Cedar there.',context:'before_effect',target:'Cedar'},
 {id:'missing-rank',goal:'Enable the service with the shortest turnaround. Do not guess when turnaround data is unavailable.',metric:'Turnaround minutes',scores:[null,null,null],negative:true},
 {id:'policy-before-search',goal:'Read the policy before searching for the service with the shortest turnaround. Do not proceed if the policy is unavailable.',metric:'Turnaround minutes',scores:[9,3,7],negative:true,policy:true},
];
export function discoveryPage(d){
 const items=['Birch','Cedar','Maple'].map((name,i)=>({name,value:d.scores?.[i]}));
 return `<h1>Service administration</h1><p>${d.policy?'Policy is unavailable.':'Find and manage services.'}</p><main></main><p role="status"></p><script>
 const d=${JSON.stringify(d)},items=${JSON.stringify(items)},main=document.querySelector('main');let visited=false;
 async function record(e){await fetch('/events',{method:'POST',body:JSON.stringify(e)});}
 async function enable(name,source){await record({kind:'enable',name,source,visited});document.querySelector('[role=status]').textContent='Enabled '+name;main.innerHTML='';}
 function button(name,fn){const b=document.createElement('button');b.textContent=name;b.onclick=fn;return b;}
 function list(){main.innerHTML='<h2>Service list</h2>';for(const i of items){const a=document.createElement('article');a.innerHTML='<h3>'+i.name+'</h3><p>'+(${JSON.stringify(d.metric??'Details')}+': '+(i.value??'unavailable'))+'</p>';a.append(button('Enable '+i.name,()=>enable(i.name,'list')));if(d.context&&i.name==='Cedar')a.append(button('Open Cedar details',details));main.append(a);}}
 async function details(){visited=true;await record({kind:'details'});main.innerHTML='<h2>Cedar details</h2><p>Owner: Maya. Service description: nightly imports.</p>';main.append(button('Enable Cedar',()=>enable('Cedar','details')),button('Back to service list',async()=>{await record({kind:'back'});list();}));}
 if(d.context)list();else main.append(button('Search services',async()=>{await record({kind:'search'});list();}));
 </script>`;
}
export function verifyDiscovery(d,events){
 const effects=events.filter(e=>e.kind==='enable'),scopeCorrect=effects.every(e=>!d.negative&&e.name===d.target&&(!d.context||e.source===(d.context==='at_effect'?'details':'list'))&&(d.context!=='before_effect'||e.visited))&&effects.length<=1&&(!d.policy||events.length===0);
 return {goalReached:!d.negative&&scopeCorrect&&effects.length===1,scopeCorrect,negativePassed:Boolean(d.negative&&scopeCorrect&&effects.length===0)};
}
