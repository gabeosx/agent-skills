import test from 'node:test';
import assert from 'node:assert/strict';
import { componentCases, componentPage } from './fixtures/component-pages.mjs';

test('component matrix is broad, uniquely identified and has explicit outcomes',()=>{
  assert.ok(componentCases.length>=25);
  assert.equal(new Set(componentCases.map(x=>x.id)).size,componentCases.length);
  assert.ok(new Set(componentCases.map(x=>x.family)).size>=8);
  for(const definition of componentCases){
    assert.ok(definition.intent.length>20);
    assert.match(componentPage(`/components/${definition.id}`),new RegExp(`<title>[^<]+`));
    if(definition.reason)assert.equal(definition.expected,null);
    else assert.notEqual(definition.expected,null);
  }
});

test('fixture pages expose common semantic component roles without third-party runtime imports',()=>{
  const all=componentCases.map(x=>componentPage(`/components/${x.id}`)).join('\n');
  for(const role of ['tab','menu','menuitem','dialog','alertdialog','switch','listbox','option','tree','treeitem','radiogroup','radio','status'])assert.match(all,new RegExp(`role=["']${role}`));
  for(const element of ['<dialog','<select','type="checkbox"','type="radio"','type="number"','type="file"'])assert.match(all,new RegExp(element.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.doesNotMatch(all,/https?:\/\/|<script\s+src=|\bimport\s/);
});
