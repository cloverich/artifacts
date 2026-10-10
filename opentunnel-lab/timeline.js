export const DURATION = 12;
export const CROSSING = .8 + (745 - 150) / 668 * 2.4;
export const EVENTS = [0,1,2].flatMap(route => [
 {at:route*4+.3,type:'pick',route},
 {at:route*4+.55,type:'seal',route},
 {at:route*4+.8,type:'dispatch',route},
 {at:route*4+.8+(365-150)/668*2.4,type:'relay',route},
 {at:route*4+CROSSING,type:'cross',route},
 {at:route*4+3.2,type:'arrival',route}
]).sort((a,b)=>a.at-b.at);
// Absolute clock values allow crossing the loop boundary without dropping events.
// Seeking, backwards clocks, and discontinuities deliberately produce no sounds.
export function eventsBetween(before,after){
 if(after<=before||after-before>.12)return [];
 const result=[];
 for(let loop=Math.floor(before/DURATION);loop<=Math.floor(after/DURATION);loop++)
  for(const event of EVENTS){const at=loop*DURATION+event.at;if(at>before&&at<=after)result.push({...event,at});}
 return result;
}
export function transitAt(time){
 const local=((time%DURATION)+DURATION)%DURATION%4;
 return {active:local>=.8&&local<3.2,depth:local>=1.572&&local<2.399?1:0,progress:Math.max(0,Math.min(1,(local-.8)/2.4))};
}
