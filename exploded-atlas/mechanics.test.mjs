import test from 'node:test';
import assert from 'node:assert/strict';
import {project,offset,labelLayout,terrainTriangles} from './mechanics.mjs';
test('explosion preserves registration and distinguishes thematic from assembly elevation',()=>{
 const a=project(90,20,10),b=project(90,20,10+offset(5,78,'terrain'));assert.equal(a[0],b[0]);assert.equal(a[1]-b[1],663);
 assert.equal(offset(5,0,'terrain'),0);assert.equal(offset(5,0,'building'),220);
});
test('annotation gutter handles collapsed anchors without overlaps or out of bounds',()=>{
 for(const targets of [[900,900,900,900,900,900],[10,80,160,700,900,1100],[100,200,300,400,500,600]]){
 const result=labelLayout(targets.map((target,id)=>({target,id})),100,920,105);
 assert.ok(result[0].y>=100);assert.ok(result.at(-1).y<=920);
 result.slice(1).forEach((p,i)=>assert.ok(p.y-result[i].y>=105));assert.equal(new Set(result.map(p=>p.id)).size,6);
 }assert.throws(()=>labelLayout(Array.from({length:12},()=>({target:0})),100,920,105));
});
test('terrain has finite consistently oriented triangles for lighting and projection',()=>{
 const faces=terrainTriangles(20);assert.equal(faces.length,800);
 for(const [a,b,c] of faces){assert.ok([...a,...b,...c].every(Number.isFinite));assert.ok((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])>0);}
});
