import test from 'node:test';import assert from 'node:assert/strict';import {createScopeDiscovery} from '../scripts/scope-discovery.mjs';
const r={sessionId:'s',stepIndex:0,binding:'b',intent:'Mark top items in the requested collection.',candidates:{open:{op:'click',role:'link',name:'Collections',ref:'@e2'},sort:{op:'click',role:'button',name:'Sort',ref:'@e5'}},observation:{snapshot:'Empty front page with collection directory',refs:{e1:{role:'searchbox'},e2:{role:'link',name:'Collections'},e3:{role:'link',name:'Home'},e4:{role:'link',name:'Help'},e5:{role:'button',name:'Sort'}}}};
const answer=values=>({usage:{cost:0.001},answers:Object.fromEntries(Object.entries(values).map(([id,choice])=>[id,{type:'choice',choice}]))});
test('missing scope proposes one offered route then independently reviews its navigation purpose',()=>{const t=createScopeDiscovery();let p=t.prepare(r);assert.equal(p.stage,'discover');assert.equal(t.accept(r,p,answer({scope:'missing',route:'open'})).assessment,true);p=t.prepare(r);assert.equal(p.stage,'review');assert.equal(t.accept(r,p,answer({purpose:'navigation'})).choice,'open');});
test('effect or unknown review cannot dispatch a proposed route',()=>{for(const purpose of ['other','unknown']){const t=createScopeDiscovery();t.accept(r,t.prepare(r),answer({scope:'missing',route:'sort'}));assert.equal(t.accept(r,t.prepare(r),answer({purpose})).assessment,true);assert.equal(t.prepare(r),null);}});
test('ready scope disables discovery and simple component pages have no discovery calls',()=>{const t=createScopeDiscovery();t.accept(r,t.prepare(r),answer({scope:'ready',route:'unknown'}));assert.equal(t.prepare({...r,observation:{...r.observation,snapshot:'changed'}}),null);assert.equal(createScopeDiscovery().prepare({...r,observation:{snapshot:'button',refs:{e1:{role:'button'}}}}),null);});
test('changed observations expire proposed refs; invalid answers are rejected',()=>{const t=createScopeDiscovery();t.accept(r,t.prepare(r),answer({scope:'missing',route:'open'}));assert.equal(t.prepare({...r,observation:{...r.observation,snapshot:'new page'}}).stage,'discover');assert.throws(()=>createScopeDiscovery().accept(r,createScopeDiscovery().prepare(r),answer({scope:'missing',route:'invented'})));});

test('a successful no-op navigation is withheld after ref churn while other routes remain available',()=>{
 const t=createScopeDiscovery(),before={...r.observation,snapshot:'- link "Collections" [ref=e2]'},first={...r,observation:before};
 t.accept(first,t.prepare(first),answer({scope:'missing',route:'open'}));t.accept(first,t.prepare(first),answer({purpose:'navigation'}));
 const next={...first,observation:{...before,snapshot:'- link "Collections" [ref=e32]'},candidates:{...r.candidates,open:{...r.candidates.open,ref:'@e32'}},executedTransitions:[{action:r.candidates.open,outcome:'tool_succeeded',before,after:{...before,snapshot:'- link "Collections" [ref=e32]'}}]};
 const p=t.prepare(next);assert.equal(p.stage,'discover');assert.equal(p.payload.questions.route.criteria.open,undefined);assert.ok(p.payload.questions.route.criteria.sort);assert.equal(p.payload.state.ineffectiveRoutes.length,1);
 assert.equal(t.prepare({...next,observation:{...next.observation,snapshot:'- link "Collections" [ref=e62]'},candidates:{...next.candidates,open:{...next.candidates.open,ref:'@e62'}}}),null);
});
test('changed page, unknown effect, and ambiguous route labels do not prove no-op identity',()=>{
 for(const variant of ['changed','unknown','duplicate']){
  const t=createScopeDiscovery(),first={...r,observation:{...r.observation,snapshot:'- link "Collections" [ref=e2]'}};
  t.accept(first,t.prepare(first),answer({scope:'missing',route:'open'}));t.accept(first,t.prepare(first),answer({purpose:'navigation'}));
  const after={...first.observation,snapshot:variant==='changed'?'New directory':'- link "Collections" [ref=e52]'},next={...first,observation:after,candidates:{...r.candidates,open:{...r.candidates.open,ref:'@e52'},...(variant==='duplicate'?{alias:{...r.candidates.open,ref:'@e53'}}:{})},executedTransitions:[{action:r.candidates.open,outcome:variant==='unknown'?'unknown':'tool_succeeded',before:first.observation,after}]};
  const p=t.prepare(next);if(p)assert.ok(p.payload.questions.route.criteria.open);
 }
});
