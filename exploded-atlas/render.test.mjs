import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Exercise the actual renderer without a browser; DOM stubs only store controls.
function renderer(){
 const elements=new Map();
 const document={getElementById(id){
  if(!elements.has(id))elements.set(id,{value:'',checked:false,innerHTML:'',textContent:'',addEventListener(){},setAttribute(){}});
  return elements.get(id);
 }};
 const context=vm.createContext({document});
 for(const [id,value] of [['explode','78'],['render','material'],['annotations','balanced']])document.getElementById(id).value=value;
 document.getElementById('guides').checked=true;
 const code=readFileSync(new URL('mechanics.mjs',import.meta.url),'utf8').replace(/export /g,'')+'\n'+readFileSync(new URL('app.js',import.meta.url),'utf8');
 vm.runInContext(code,context);
 return {context,document,draw(){vm.runInContext('render()',context);return document.getElementById('diagram').innerHTML;}};
}

test('all supported plate states retain valid coordinates and self-contained SVG resources',()=>{
 const r=renderer();let count=0;
 for(const mode of ['building','terrain'])for(const view of ['material','semantic','mesh'])for(const cut of [false,true])for(const gap of [0,78,100])for(const budget of ['sparse','balanced','full']){
  vm.runInContext(`mode='${mode}'`,r.context);
  r.document.getElementById('render').value=view;
  r.document.getElementById('section').checked=cut;
  r.document.getElementById('explode').value=String(gap);
  r.document.getElementById('annotations').value=budget;
  const markup=r.draw();
  assert.doesNotMatch(markup,/NaN|Infinity|undefined/);
  const ids=[...markup.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(ids).size,ids.length,'SVG IDs must be unique');
  for(const match of markup.matchAll(/url\(#([^)]*)\)/g))assert.ok(ids.includes(match[1]),`Missing paint or clip resource: ${match[1]}`);
  assert.equal([...markup.matchAll(/data-layer=/g)].length,6);
  assert.equal(r.draw(),markup,'Stable crowns and materials must not change on redraw');
  count++;
 }
 assert.equal(count,108);
});
