// Fixed orthographic-like affine view: the same map point keeps its x position.
export function project(x, y, z) { return [385 + (x-y)*1.04, 930 + (x+y)*0.43-z]; }
export function height(x,y) {
  const mountain=64*Math.exp(-((x+30)**2/6500+(y+36)**2/4700));
  return 7+Math.floor(mountain/7)*7+3*Math.sin(x/28)*Math.cos(y/31);
}
export function offset(rank, amount, mode) { return rank*(mode==='terrain'?amount*1.7:44+amount*1.24); }
export function labelLayout(items, min, max, gap) {
  if ((items.length-1)*gap>max-min) throw new Error('Label budget exceeds gutter capacity');
  const sorted=items.map(i=>({...i})).sort((a,b)=>a.target-b.target);
  sorted.forEach((a,i)=>a.y=Math.max(a.target,i?sorted[i-1].y+gap:min));
  if(sorted.length) sorted[sorted.length-1].y=Math.min(max,sorted.at(-1).y);
  for(let i=sorted.length-2;i>=0;i--) sorted[i].y=Math.min(sorted[i].y,sorted[i+1].y-gap);
  return sorted;
}
export function terrainTriangles(n=22) {
  const faces=[];
  for(let j=0;j<n;j++) for(let i=0;i<n;i++) {
    const x=-140+i*280/n,y=-140+j*280/n,d=280/n;
    const p=[[x,y],[x+d,y],[x+d,y+d],[x,y+d]];
    for(const ids of [[0,1,2],[0,2,3]]) faces.push(ids.map(k=>[...p[k],height(...p[k])]));
  }
  return faces.sort((a,b)=>a.reduce((s,p)=>s+p[0]+p[1],0)-b.reduce((s,p)=>s+p[0]+p[1],0));
}
