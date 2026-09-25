import test from 'node:test';
import assert from 'node:assert/strict';
import { createTravelChallenge } from './fixtures/generated-travel.mjs';

const codes = {
  'Boston Logan':'BOS','Seattle Tacoma':'SEA','Denver International':'DEN',
  'Austin Bergstrom':'AUS','Miami International':'MIA','San Francisco International':'SFO',
};

test('seed is replayable and changes the task without exposing the flight answer',()=>{
  const a=createTravelChallenge(100),b=createTravelChallenge(100),c=createTravelChallenge(101);
  assert.deepEqual(a.publicTask,b.publicTask);
  assert.equal(a.render('/search'),b.render('/search'));
  assert.equal(a.render('/search'),a.render('/search'));
  assert.notDeepEqual(a.publicTask,c.publicTask);
  assert.doesNotMatch(JSON.stringify(a.publicTask),/F-\d{4}/);
});

test('server-side verifier requires the exact selections and a completed hold',()=>{
  for(const seed of [0,7,100,0xffffffff]){
    const c=createTravelChallenge(seed),v=c.publicTask.suppliedValues;
    const from=v['From airport'],to=v['To airport'],date=v['Departure date'],cabin=v.Cabin;
    const airline=v.Airline,time=v['Departure time'],name=v['Full name'],email=v.Email;
    const seat=v['Seat preference'],meal=v['Meal preference'],bag=Boolean(v['Bag weight']);
    assert.equal(c.verify().passed,false);
    assert.deepEqual(c.act({type:'search',from:codes[from],to:codes[to],date,cabin}),{next:'/results'});
    const page=c.render('/results');
    const card=[...page.matchAll(/<article class="flight">([\s\S]*?)<\/article>/g)].find(x=>x[1].includes(`<strong>${airline}</strong>`)&&x[1].includes(`Departs ${time} · ${cabin}`));
    assert.ok(card);
    const id=card[1].match(/data-flight="([^"]+)"/)[1];
    assert.deepEqual(c.act({type:'flight',id}),{next:'/traveler'});
    assert.deepEqual(c.act({type:'traveler',name,email,seat,meal,bag,bagWeight:bag?'15 kg':null}),{next:'/review'});
    assert.equal(c.verify().passed,false);
    assert.match(c.act({type:'hold',terms:false}).error,/terms/);
    assert.deepEqual(c.act({type:'hold',terms:true}),{next:'/confirmation'});
    assert.equal(c.verify().passed,true);
    assert.match(c.render('/confirmation'),/Itinerary held/);
  }
});

test('a held but incorrect itinerary is rejected by the hidden verifier',()=>{
  const c=createTravelChallenge(55),v=c.publicTask.suppliedValues;
  const from=v['From airport'],to=v['To airport'],date=v['Departure date'],cabin=v.Cabin;
  c.act({type:'search',from:codes[from],to:codes[to],date,cabin});
  const wrong=c.render('/results').match(/data-flight="([^"]+)"/)[1];
  c.act({type:'flight',id:wrong});
  c.act({type:'traveler',name:'Wrong Name',email:'wrong@example.test',seat:'Window',meal:'Standard',bag:false,bagWeight:null});
  c.act({type:'hold',terms:true});
  assert.equal(c.verify().passed,false);
  assert.ok(c.verify().mismatches.includes('name'));
});
