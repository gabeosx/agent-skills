// A seeded, disposable booking site. The answer key stays in the harness process.
const airports = [
  { code:'BOS', name:'Boston Logan' }, { code:'SEA', name:'Seattle Tacoma' },
  { code:'DEN', name:'Denver International' }, { code:'AUS', name:'Austin Bergstrom' },
  { code:'MIA', name:'Miami International' }, { code:'SFO', name:'San Francisco International' },
];
const airlines = ['Northstar Air','Blue Finch','Cedar Airlines','Meridian Air'];
const times = ['07:15','09:40','13:25','17:55'];
const cabins = ['Economy','Premium Economy','Business'];
const seats = ['Window','Aisle','No preference'];
const meals = ['Standard','Vegetarian','Vegan'];
const escapeHtml = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');

export function createTravelChallenge(seed) {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('seed must be an unsigned 32-bit integer');
  let x = seed || 0x9e3779b9;
  const rand = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 0x100000000; };
  const pick = a => a[Math.floor(rand()*a.length)];
  const shuffled = a => a.map(v=>({v,k:rand()})).sort((a,b)=>a.k-b.k).map(x=>x.v);
  const [from,to] = shuffled(airports);
  const airline = pick(airlines), time = pick(times), cabin = pick(cabins);
  const seat = pick(seats), meal = pick(meals);
  const bag = rand() > .4;
  const dateMode = seed % 2 === 0 ? 'native' : 'text';
  const date = `2026-11-${String(5+Math.floor(rand()*20)).padStart(2,'0')}`;
  const person = pick(['Jordan Lee','Morgan Ellis','Avery Chen','Taylor Brooks']);
  const email = `${person.toLowerCase().replace(' ','.')}@example.test`;
  const target = { id:`F-${Math.floor(rand()*9000)+1000}`, from:from.code, to:to.code, airline, time, cabin };
  const airportOptions = shuffled(airports);
  const flights = shuffled([
    target,
    { ...target, id:`${target.id}-T`, time:times[(times.indexOf(time)+1)%times.length] },
    { ...target, id:`${target.id}-A`, airline:airlines[(airlines.indexOf(airline)+1)%airlines.length] },
    { ...target, id:`${target.id}-C`, cabin:cabins[(cabins.indexOf(cabin)+1)%cabins.length] },
  ]);
  const expected = {from:from.code,to:to.code,date,cabin,flightId:target.id,name:person,email,seat,meal,bag,bagWeight:bag?'15 kg':null};
  const seatInstruction = seat==='No preference'?'choose no seat preference':`choose ${seat==='Aisle'?'an':'a'} ${seat.toLowerCase()} seat`;
  const goal = `On this demo travel site, hold ${cabin==='Economy'?'an':'a'} ${cabin} itinerary from ${from.name} to ${to.name} on ${date}. Choose ${airline} departing at ${time}. The traveler is ${person} (${email}); ${seatInstruction} and a ${meal.toLowerCase()} meal.${bag?' Add one checked bag at 15 kg.':' Do not add a checked bag.'} Accept the booking terms and finish on the confirmation page. This is a local fake booking; no payment is involved.`;
  const publicTask = {goal, startingPath:'/search', suppliedValues:{
    'From airport':from.name,'To airport':to.name,'Departure date':date,'Cabin':cabin,
    Airline:airline,'Departure time':time,'Full name':person,Email:email,
    'Seat preference':seat,'Meal preference':meal,...(bag?{'Bag weight':'15 kg'}:{}),
  }};
  const features={dateMode,airportPicker:'delayed suggestions',flightDecoys:3,travelerBelowFold:true,conditionalBag:true,reviewTerms:true};
  const state = {step:'search',events:[],search:null,flightId:null,traveler:null,held:false};
  const json = value => JSON.stringify(value).replaceAll('<','\\u003c');
  const shell = (title,body,script='') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)} · Northstar Demo</title><style>
    body{font:17px system-ui;margin:0;color:#17212e;background:#f4f7fb}header{background:#143860;color:white;padding:18px 8%}main{max-width:780px;margin:32px auto;padding:28px;background:white;border-radius:16px;box-shadow:0 3px 18px #dce4ed}h1{margin-top:0}label{display:block;margin:16px 0 5px;font-weight:600}input,select,button{font:inherit;padding:10px;border:1px solid #9aaabd;border-radius:8px}input,select{width:100%;box-sizing:border-box}button{cursor:pointer;background:#1d65a2;color:white;border:0;margin-top:16px}button.secondary{background:#eee;color:#17212e}.choices{border:1px solid #9aaabd;border-radius:8px}.choices button{display:block;width:100%;margin:0;text-align:left;background:white;color:#17212e;border-radius:0}.choices button:hover{background:#e6f2ff}.flight{padding:16px;border:1px solid #c9d6e4;border-radius:10px;margin:18px 0}.flight button{margin-top:8px}.spacer{height:780px;background:linear-gradient(white,#f8fbff)}.inline{display:flex;gap:10px;align-items:center}.inline input{width:auto}.error{color:#b00020;min-height:1.5em}</style></head><body><header>Northstar Demo · itinerary holds</header><main><h1>${escapeHtml(title)}</h1>${body}</main><script>${script}</script></body></html>`;
  const api = `async function act(body){const r=await fetch('/action',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const x=await r.json();if(x.next)location.href=x.next;else document.querySelector('.error').textContent=x.error||'Please check your entries.';}`;
  function render(path) {
    if (path==='/search') {
      const body = `<p>Find an itinerary. Select airports from suggestions; typing alone does not select one.</p><form id="search-form">
        <label for="from">From airport</label><input id="from" role="combobox" autocomplete="off" required><div id="from-options" class="choices"></div>
        <label for="to">To airport</label><input id="to" role="combobox" autocomplete="off" required><div id="to-options" class="choices"></div>
        <label for="date">Departure date</label><input id="date" type="${dateMode==='native'?'date':'text'}" ${dateMode==='text'?'placeholder="YYYY-MM-DD" pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}"':''} required>
        <label for="cabin">Cabin</label><select id="cabin" required><option value="">Choose cabin</option>${cabins.map(c=>`<option>${escapeHtml(c)}</option>`).join('')}</select>
        <button>Find flights</button><p class="error" role="alert"></p></form>`;
      const script = `${api}const airports=${json(airportOptions)};for(const field of ['from','to']){const input=document.getElementById(field),box=document.getElementById(field+'-options');let timer;input.addEventListener('input',()=>{input.dataset.code='';box.innerHTML='';clearTimeout(timer);timer=setTimeout(()=>{for(const a of airports.filter(a=>a.name.toLowerCase().includes(input.value.toLowerCase())||a.code.toLowerCase().includes(input.value.toLowerCase()))){const b=document.createElement('button');b.type='button';b.textContent=a.name+' ('+a.code+')';b.onclick=()=>{input.value=a.name;input.dataset.code=a.code;box.innerHTML=''};box.append(b)}},300)});}document.getElementById('search-form').onsubmit=e=>{e.preventDefault();act({type:'search',from:document.getElementById('from').dataset.code,to:document.getElementById('to').dataset.code,date:document.getElementById('date').value,cabin:document.getElementById('cabin').value})};`;
      return shell('Search flights',body,script);
    }
    if (path==='/results') {
      if (state.step!=='results') return shell('Search first','<p>Start with flight search.</p><a href="/search">Search flights</a>');
      const body = `<p>${escapeHtml(from.name)} to ${escapeHtml(to.name)} · ${date} · ${cabin}</p><p>Several flights meet part of your search. Check the airline and departure time.</p>${flights.map(f=>`<article class="flight"><strong>${escapeHtml(f.airline)}</strong><p>Departs ${escapeHtml(f.time)} · ${escapeHtml(f.cabin)} · ${escapeHtml(from.code)} → ${escapeHtml(to.code)}</p><button type="button" data-flight="${f.id}">Choose this flight</button></article>`).join('')}<p class="error" role="alert"></p>`;
      return shell('Choose a flight',body,`${api}document.querySelectorAll('[data-flight]').forEach(b=>b.onclick=()=>act({type:'flight',id:b.dataset.flight}));`);
    }
    if (path==='/traveler') {
      if (state.step!=='traveler') return shell('Choose a flight first','<a href="/results">Flight results</a>');
      const body=`<p>Enter passenger details for the selected flight.</p><form id="traveler-form">
        <label for="name">Full name</label><input id="name" required>
        <label for="email">Email address</label><input id="email" type="email" required>
        <label for="meal">Meal preference</label><select id="meal" required><option value="">Choose meal</option>${meals.map(v=>`<option>${v}</option>`).join('')}</select>
        <div class="spacer" aria-hidden="true"></div>
        <label for="seat">Seat preference</label><select id="seat" required><option value="">Choose seat</option>${seats.map(v=>`<option>${v}</option>`).join('')}</select>
        <label class="inline"><input id="bag" type="checkbox">Add a checked bag</label><div id="weight-wrap" hidden><label for="weight">Bag weight</label><select id="weight"><option value="">Choose weight</option><option>15 kg</option><option>23 kg</option></select></div>
        <button>Continue to review</button><p class="error" role="alert"></p></form>`;
      const script=`${api}const bag=document.getElementById('bag');bag.onchange=()=>document.getElementById('weight-wrap').hidden=!bag.checked;document.getElementById('traveler-form').onsubmit=e=>{e.preventDefault();act({type:'traveler',name:document.getElementById('name').value,email:document.getElementById('email').value,meal:document.getElementById('meal').value,seat:document.getElementById('seat').value,bag:bag.checked,bagWeight:bag.checked?document.getElementById('weight').value:null})};`;
      return shell('Traveler details',body,script);
    }
    if (path==='/review') {
      if (state.step!=='review') return shell('Complete traveler details first','<a href="/traveler">Traveler details</a>');
      const f=flights.find(f=>f.id===state.flightId),t=state.traveler;
      const body=`<p>Review before placing this free, fake hold.</p><dl><dt>Route</dt><dd>${from.name} → ${to.name}, ${date}</dd><dt>Flight</dt><dd>${f.airline}, ${f.time}, ${f.cabin}</dd><dt>Traveler</dt><dd>${escapeHtml(t.name)} · ${escapeHtml(t.email)}</dd><dt>Seat and meal</dt><dd>${t.seat} · ${t.meal}</dd><dt>Bag</dt><dd>${t.bag?t.bagWeight:'None'}</dd></dl><label class="inline"><input id="terms" type="checkbox">I accept the demo booking terms</label><button id="hold">Hold itinerary</button><p class="error" role="alert"></p>`;
      return shell('Review itinerary',body,`${api}document.getElementById('hold').onclick=()=>act({type:'hold',terms:document.getElementById('terms').checked});`);
    }
    if (path==='/confirmation' && state.held) return shell('Itinerary held',`<p>Your fake itinerary is held. Reference ${escapeHtml(target.id)}.</p>`);
    return shell('Page not found','<a href="/search">Search flights</a>');
  }
  function act(body) {
    state.events.push({type:body.type,body:structuredClone(body)});
    if (body.type==='search' && state.step==='search') {
      if (!body.from||!body.to||body.from===body.to||!body.date||!body.cabin) return {error:'Select both airports, date and cabin.'};
      state.search={from:body.from,to:body.to,date:body.date,cabin:body.cabin};state.step='results';return {next:'/results'};
    }
    if (body.type==='flight' && state.step==='results') {
      if (!flights.some(f=>f.id===body.id)) return {error:'Select a listed flight.'};
      state.flightId=body.id;state.step='traveler';return {next:'/traveler'};
    }
    if (body.type==='traveler' && state.step==='traveler') {
      if (!body.name?.trim()||!body.email?.includes('@')||!seats.includes(body.seat)||!meals.includes(body.meal)||body.bag&&!body.bagWeight) return {error:'Complete every required traveler field.'};
      state.traveler={name:body.name,email:body.email,seat:body.seat,meal:body.meal,bag:body.bag,bagWeight:body.bagWeight};state.step='review';return {next:'/review'};
    }
    if (body.type==='hold' && state.step==='review') {
      if (!body.terms) return {error:'Accept the demo booking terms first.'};
      state.held=true;state.step='confirmation';return {next:'/confirmation'};
    }
    return {error:'This action is not available on the current step.'};
  }
  function verify() {
    const actual={...state.search,flightId:state.flightId,...state.traveler};
    const mismatches=Object.entries(expected).filter(([key,value])=>actual[key]!==value).map(([key])=>key);
    return {passed:state.held&&mismatches.length===0&&state.events.some(e=>e.type==='hold'&&e.body.terms===true),mismatches,held:state.held,stageReached:state.step,actual,events:structuredClone(state.events)};
  }
  return {seed,features,publicTask,render,act,verify};
}
