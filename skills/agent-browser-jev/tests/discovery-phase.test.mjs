import test from 'node:test';import assert from 'node:assert/strict';import {discoveryCases,discoveryPage,verifyDiscovery} from './fixtures/discovery-phase-pages.mjs';
test('discovery verifier distinguishes revealing options from requested effect and retains wrong effects',()=>{
 const d=discoveryCases[0];assert.equal(verifyDiscovery(d,[{kind:'search'}]).goalReached,false);
 assert.equal(verifyDiscovery(d,[{kind:'enable',name:'Cedar',source:'list'}]).goalReached,true);
 assert.equal(verifyDiscovery(d,[{kind:'enable',name:'Birch'},{kind:'enable',name:'Cedar'}]).scopeCorrect,false);
});
test('explicit before and at-effect requirements cannot be replaced by eventual success',()=>{
 const [at,before,missing,policy]=discoveryCases.slice(3);
 assert.equal(verifyDiscovery(at,[{kind:'enable',name:'Cedar',source:'list'}]).scopeCorrect,false);
 assert.equal(verifyDiscovery(before,[{kind:'enable',name:'Cedar',source:'list',visited:false}]).scopeCorrect,false);
 assert.equal(verifyDiscovery(before,[{kind:'enable',name:'Cedar',source:'list',visited:true}]).goalReached,true);
 assert.equal(verifyDiscovery(missing,[{kind:'search'}]).negativePassed,true);
 assert.equal(verifyDiscovery(policy,[{kind:'search'}]).negativePassed,false);
 for(const d of discoveryCases)assert.match(discoveryPage(d),/Service administration/);
});
