import assert from 'node:assert/strict';
import {EVENTS,CROSSING,eventsBetween,transitAt} from './timeline.js';
// Every event must fire once across a full loop at ordinary and double-speed frame intervals.
for(const dt of [1/60,2/60]){
 const emitted=[];
 for(let before=0;before<24;before+=dt)emitted.push(...eventsBetween(before,Math.min(24,before+dt)));
 assert.equal(emitted.length,EVENTS.length*2);
 assert.equal(new Set(emitted.map(e=>e.at.toFixed(6))).size,EVENTS.length*2);
}
assert.deepEqual(eventsBetween(.3,.3),[]);
assert.deepEqual(eventsBetween(3,1),[]);
assert.deepEqual(eventsBetween(0,8),[]);
assert.deepEqual(eventsBetween(11.99,12.09),[]);
assert.equal(eventsBetween(12.29,12.31)[0].type,'pick');
assert.equal(eventsBetween(CROSSING-.01,CROSSING+.01)[0].type,'cross');
assert.equal(transitAt(1.9).depth,1);
assert.equal(transitAt(2.5).depth,0);
assert.equal(transitAt(3.21).active,false);
console.log('Timeline: event uniqueness, loop wrap, discontinuities, and relay state passed.');
