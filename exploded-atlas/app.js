const $=id=>document.getElementById(id);
const svg=$('diagram');
let mode='terrain',selected=2;
const terrainRecords=[
 ['Topography','What is the common spatial frame?','Synthetic stepped heightfield; illustrative geometry.','A checked DEM/DTM, metric CRS, vertical datum, survey date and resolution.','One sampled heightfield is triangulated and reused. Side skirts make the cut edge legible.'],
 ['Vegetation','Where do broad cover zones differ?','Authored cover pattern; no habitat observations.','Classified land-cover raster plus field checks and class confidence.','Color patches share the terrain coordinates. The pattern is a drawing rule, not a vegetation survey.'],
 ['Water system','Where are water relationships being described?','Authored blue polylines; no calculated drainage.','Conditioned terrain, flow method, accumulation threshold and observed channels.','The lines are draped onto the heightfield. Their styling is reproducible; the hydrology is not analyzed.'],
 ['Circulation','How do proposed routes connect places?','Authored route network; conceptual proposal.','Verified paths, gradients, access constraints and proposal revision.','Routes are projected from the same coordinates as terrain. A consistent warm stroke distinguishes movement from water.'],
 ['Program','Where might activities be placed?','Original schematic nodes and small masses.','Program brief, capacity, access, area schedule and design revision.','Small geometric masses stand in for built objects. They add spatial detail without a photorealistic asset library.'],
 ['Ecological strategy','Which areas might deserve attention?','Illustrative intervention nodes; no ecological score.','Species, resistance surface, connectivity method and validation.','A few emphasis rings communicate a theme. They are proposed attention areas, not evidence of habitat connectivity.']
];
const buildingRecords=[
 ['Site & landscape','How does the building meet the ground?','Original detailed vector model; authored planting and paving.','Site survey, boundaries, terrain datum and planning constraints.','The base establishes one footprint. All higher groups preserve the same coordinate frame.'],
 ['Public plaza','Where is the shared open space?','Original plaza slab with a courtyard opening.','Site levels, accessible routes, finishes and drainage design.','A polygonal ring is constructed from an outer boundary and an inner courtyard. No boolean engine is required.'],
 ['Reading level','How is an occupied floor organized?','Original vector model; glazing, columns, shelves and reading furniture.','Architect-authored model, room areas, occupancy and access review.','Projected timber seams, mullions, bookshelves and furniture share the floor coordinates. Rear glazing stays tall; the front is lowered for legibility. Contact shading is authored, not physically simulated.'],
 ['Workshop level','Where might flexible activity happen?','Original vector model; workbenches, partitions and a schematic stair.','Storey grouping, equipment clearance, structure and building services.','The model has a base elevation before explosion. Editorial offsets are applied afterward.'],
 ['Roof garden','How does landscape extend into the building?','Original vector model; planters, varied tree crowns and guardrails.','Loads, waterproofing, planting design and maintenance access.','Seeded crown shapes vary consistently across renders. Planter boxes, paving seams and open rails add scale; planting remains illustrative.'],
 ['Canopy','What completes the assembly?','Original vector model; radial roof seams and aligned support bays.','Structural model, connections, actual section depths and material specification.','The courtyard and eight support bays share the floor frame. Roof seams express assembly; member sizes remain illustrative.']
];
const colors=['#8a8778','#899268','#789aa5','#b29b79','#a58e70','#7b896a'];
const paths=[Array.from({length:36},(_,i)=>[-118+i*6,50+28*Math.sin(i/6)]),Array.from({length:30},(_,i)=>[70-30*Math.sin(i/5),-125+i*8])];
const waters=[Array.from({length:35},(_,i)=>[-35+i*4,-115+i*7]),Array.from({length:25},(_,i)=>[-30-i*4,-12+i*5])];
const points=[[-90,-35],[65,65],[80,-72],[-75,100]];
const faces=terrainTriangles(20);
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
function polygon(p,fill,stroke='#ffffff',w=.25){return `<polygon points="${p.map(a=>a.map(v=>v.toFixed(2)).join(',')).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${w}"/>`;}
function line(p,color,width=1,dash=''){return `<polyline points="${p.map(a=>a.join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="${width}" ${dash?`stroke-dasharray="${dash}"`:''}/>`;}
function text(x,y,s,size=13,color='#3b443c',extra=''){return `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" ${extra}>${esc(s)}</text>`;}
function tone(rgb,k){return `rgb(${rgb.map(v=>Math.round(Math.min(255,Math.max(0,v*k)))).join(',')})`;}
function box(x,y,z,w,d,h,color,mesh=false){
 const p=(a,b,c)=>project(a,b,c);
 return polygon([p(x,y+d,z),p(x+w,y+d,z),p(x+w,y+d,z+h),p(x,y+d,z+h)],color,'#5e6357',mesh?1:.4)+polygon([p(x+w,y,z),p(x+w,y+d,z),p(x+w,y+d,z+h),p(x+w,y,z+h)],'#776f60','#5e6357',mesh?1:.4)+polygon([p(x,y,z+h),p(x+w,y,z+h),p(x+w,y+d,z+h),p(x,y+d,z+h)],mesh?'none':'#d2c2a2','#676d60',mesh?1:.5);
}
function terrain(rank,z,view,cut){
 let out='';const mesh=view==='mesh';
 // Surfaces retain painter order within each thematic presentation group.
 for(const f of faces){if(cut&&f.some(p=>p[1]>0))continue;
 const m=f.reduce((s,p)=>s+p[2],0)/3;
 const dx=f[1][0]-f[0][0],dy=f[1][1]-f[0][1],dz=f[1][2]-f[0][2];
 const ex=f[2][0]-f[0][0],ey=f[2][1]-f[0][1],ez=f[2][2]-f[0][2];
 const normal=[dy*ez-dz*ey,dz*ex-dx*ez,dx*ey-dy*ex],len=Math.hypot(...normal);
 const light=.7+.3*Math.max(0,(-normal[0]*.4-normal[1]*.5+normal[2]*.76)/len);
 let rgb=m>48?[151,148,128]:[150,157,118];if(rank===0)rgb=[156,151,135];
 if(rank===1){const c=Math.sin(f[0][0]/32)+Math.cos(f[0][1]/39)>0;rgb=c?[139,155,113]:[175,176,139];}
 const fill=mesh?'#f5f4ed':view==='semantic'?colors[rank]:tone(rgb,light);
 out+=polygon(f.map(p=>project(p[0],p[1],p[2]+z)),fill,mesh?'#9aab96':fill,mesh?.45:.3);
 }
 for(const edge of ['x','y']){if(cut&&edge==='y')continue;for(let k=-140;k<140;k+=14){const a=edge==='x'?[140,k]:[k,140],b=edge==='x'?[140,k+14]:[k+14,140];if(cut&&(a[1]>0||b[1]>0))continue;out+=polygon([project(...a,z+height(...a)),project(...b,z+height(...b)),project(...b,z-11),project(...a,z-11)],mesh?'none':edge==='x'?'#898678':'#777969','#656b5f',.5);}}
 if(cut){const profile=Array.from({length:41},(_,i)=>[-140+i*7,0]);out+=polygon([...profile.map(p=>project(...p,z+height(...p))),project(140,0,z-11),project(-140,0,z-11)],mesh?'none':'#aca28d','#776e5b',.8);}
 if(!mesh){const drape=p=>p.filter(a=>!cut||a[1]<=0).map(a=>project(...a,height(...a)+z+1));
 if(rank===2)for(const p of waters)out+=line(drape(p),'#eef4f2',5)+line(drape(p),'#557f91',2.3);
 if(rank===3||rank===4)for(const p of paths)out+=line(drape(p),'#e9e2d0',5)+line(drape(p),'#9d7f55',1.2);
 if(rank===4)for(const [x,y] of points){if(cut&&y>0)continue;out+=box(x,y,z+height(x,y),19,13,12,'#b9a583');}
 if(rank===5)for(const [x,y] of points){if(cut&&y>0)continue;const p=project(x,y,z+height(x,y)+1);out+=`<ellipse cx="${p[0]}" cy="${p[1]}" rx="24" ry="10" fill="#c5d0b3" fill-opacity=".5" stroke="#627a56" stroke-width="1"/>`+text(p[0]-3,p[1]+4,'+',13,'#516249');}
 }
 return out;
}
// Original architectural model: shared perimeter, courtyard, and column bays.
const outer=ringPoints(72),inner=Array.from({length:72},(_,i)=>{const a=i*Math.PI*2/72;return [38*Math.cos(a),31*Math.sin(a)];});
function ringPoints(n=72){return Array.from({length:n},(_,i)=>{const a=i*Math.PI*2/n,r=1+.06*Math.cos(a*3);return [132*r*Math.cos(a),105*r*Math.sin(a)];});}
function paintDefinitions(){return `<defs>
 <linearGradient id="stone" x2="0.8" y2="1"><stop stop-color="#e4e0d5"/><stop offset="1" stop-color="#bdbbaa"/></linearGradient>
 <linearGradient id="roof" x2=".6" y2="1"><stop stop-color="#b3baa5"/><stop offset="1" stop-color="#828e79"/></linearGradient>
 <linearGradient id="wood" x2="0.5" y2="1"><stop stop-color="#e3cda6"/><stop offset="1" stop-color="#b99a70"/></linearGradient>
 <linearGradient id="glass" x2="0.6" y2="1"><stop stop-color="#e0ece8" stop-opacity=".78"/><stop offset=".5" stop-color="#a2bab6" stop-opacity=".42"/><stop offset="1" stop-color="#7f9b98" stop-opacity=".66"/></linearGradient>
 <radialGradient id="leaf" cx=".3" cy=".2" r=".85"><stop stop-color="#b1be8b"/><stop offset=".55" stop-color="#7d9361"/><stop offset="1" stop-color="#4e6d49"/></radialGradient>
 <radialGradient id="contact"><stop stop-color="#485847" stop-opacity=".23"/><stop offset="1" stop-color="#485847" stop-opacity="0"/></radialGradient>
 <pattern id="mineral" width="13" height="11" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r=".55" fill="#5c6455" opacity=".16"/><circle cx="9" cy="8" r=".4" fill="#fff" opacity=".5"/></pattern>
 </defs>`;}
function modelFace(points,z,fill,stroke='#6e7362',width=.45){return polygon(points.map(p=>project(p[0],p[1],z+(p[2]||0))),fill,stroke,width);}
function modelLine(points,z,color,width=.6){return line(points.map(p=>project(p[0],p[1],z+(p[2]||0))),color,width);}
function solid(x,y,z,w,d,h,color,view='material'){
 const mesh=view==='mesh',semantic=view==='semantic';
 const shades=mesh?['none','none','none']:semantic?[color,color,color]:[color,tone(hexRGB(color),.77),tone(hexRGB(color),1.12)];
 return modelFace([[x,y+d,0],[x+w,y+d,0],[x+w,y+d,h],[x,y+d,h]],z,shades[0])+
 modelFace([[x+w,y,0],[x+w,y+d,0],[x+w,y+d,h],[x+w,y,h]],z,shades[1])+
 modelFace([[x,y,h],[x+w,y,h],[x+w,y+d,h],[x,y+d,h]],z,shades[2]);
}
function hexRGB(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));}
function contact(x,y,z,rx,ry){const p=project(x,y,z);return `<ellipse cx="${p[0]+4}" cy="${p[1]+2}" rx="${rx}" ry="${ry}" fill="url(#contact)"/>`;}
function tree(x,y,z,s=1,seed=0,view='material',theme=colors[4]){
 const p=project(x,y,z),mesh=view==='mesh';let out=view==='material'?contact(x,y,z,23*s,8*s):'';
 out+=modelLine([[x,y,0],[x,y,30*s]],z,'#6e6754',1.8*s);
 for(let i=0;i<3;i++)out+=modelLine([[x,y,15*s],[x+(i-1)*7*s,y,25*s]],z,'#766f56',.8*s);
 // Overlapping crowns vary by a stable seed, with a consistent upper-left light.
 for(let i=0;i<7;i++){const a=i*2.4+seed,cx=p[0]+Math.cos(a)*(i?10:0)*s,cy=p[1]-29*s+Math.sin(a)*(i?7:0)*s;
 out+=`<ellipse cx="${cx}" cy="${cy}" rx="${(10+Math.sin(seed+i)*2)*s}" ry="${(12+Math.cos(i)*2)*s}" fill="${mesh?'none':view==='semantic'?theme:'url(#leaf)'}" stroke="#5e7950" stroke-width=".4"/>`;
 }
 if(view==='material')for(let i=0;i<14;i++){const a=i*2.4+seed,r=(5+i%4)*s;out+=`<circle cx="${p[0]+Math.cos(a)*r}" cy="${p[1]-32*s+Math.sin(a)*r}" r="${.65*s}" fill="#dae0b1" opacity=".6"/>`;}
 return out;
}
function ringPath(points,z){return 'M'+points.map(p=>project(...p,z).map(v=>v.toFixed(2)).join(',')).join('L')+'Z';}
function pavilion(rank,z,view,cut){
 const mesh=view==='mesh',material=view==='material',semantic=view==='semantic',color=colors[rank];let out='';
 const fill=mesh?'none':semantic?color:rank===2||rank===3?'url(#wood)':rank===5?'url(#roof)':'url(#stone)';
 const block=(x,y,level,w,d,h,paint)=>solid(x,y,level,w,d,h,semantic?color:paint,view);
 const edges=outer.map((p,i)=>({p,q:outer[(i+1)%outer.length],ip:inner[i],iq:inner[(i+1)%inner.length],i}));
 const at=(i,t)=>outer[i].map((v,k)=>v*t+inner[i][k]*(1-t));
 const visibleEdge=(p,q)=>!cut||p[0]+p[1]+q[0]+q[1]<=0;
 const border=(points,height,color,width)=>modelLine([...points,points[0]],z+height,color,width);
 if(rank===0){
  out+=block(-163,-133,z-12,326,266,12,'#adae9b',view);
  out+=modelFace([[-163,-133],[163,-133],[163,133],[-163,133]],z,mesh?'none':semantic?color:'url(#stone)');
  if(material)out+=modelFace([[-163,-133],[163,-133],[163,133],[-163,133]],z,'url(#mineral)','none',0);
  for(let k=-150;k<=150;k+=25)out+=modelLine([[k,-133],[k,133]],z+.1,'#a5a898',.4);
  for(let k=-125;k<=125;k+=25)out+=modelLine([[-163,k],[163,k]],z+.1,'#a5a898',.4);
  out+=modelFace([[-30,-24],[30,-24],[30,24],[-30,24]],z+.2,mesh?'none':semantic?color:'#89a9a5','#728c85');
  for(let i=0;i<5;i++)out+=modelLine([[-25,-16+i*8],[25,-16+i*8]],z+.3,'#d8e5dd',.5);
  const trees=[[-143,-103],[-148,-48],[-149,14],[-140,87],[-94,116],[-25,119],[51,118],[125,100],[147,40],[149,-51],[103,-115]];
  for(const [i,p] of trees.entries())out+=tree(...p,z,.8+(i%3)*.09,i,view,color);
  return out+border([[-163,-133],[163,-133],[163,133],[-163,133]],0,'#666f5a',1);
 }
 // Draw supports before the roof, so its surface occludes their upper ends.
 if(rank===5)for(let i=0;i<72;i+=9){const [x,y]=at(i,.91);if(visibleEdge([x,y],[x,y]))out+=block(x-1.5,y-1.5,z-27,3,3,27,semantic?color:'#a5a38b',view);}
 // A single even-odd surface avoids hairline seams between ring faces.
 const path=ringPath(outer,z)+ringPath(inner,z);
 out+=`<path d="${path}" fill="${fill}" fill-rule="evenodd" stroke="#6f7664" stroke-width=".7"/>`;
 const clip=`floor-${rank}`;out+=`<defs><clipPath id="${clip}"><path d="${path}" clip-rule="evenodd"/></clipPath></defs>`;
 out+=`<g clip-path="url(#${clip})">`;
 if(material&&rank!==5)out+=`<path d="${path}" fill="url(#mineral)" fill-rule="evenodd"/>`;
 // Project material seams in model space so they follow the floor plane.
 if(rank===2||rank===3){
  for(let y=-125;y<=125;y+=5){out+=modelLine([[-155,y],[155,y]],z+.1,material?'#a78e69':'#88937e',.36);
   for(let x=-150+(Math.round(y/5)%2)*17;x<155;x+=34)out+=modelLine([[x,y],[x,y+5]],z+.1,'#ab946f',.32);}
 }else if(rank!==5){for(let x=-150;x<150;x+=19)out+=modelLine([[x,-130],[x,130]],z+.1,'#a7ac9b',.45);for(let y=-120;y<125;y+=19)out+=modelLine([[-155,y],[155,y]],z+.1,'#a7ac9b',.45);}
 if(material){
  // Inset shading at perimeter and atrium: an authored contact cue, not simulated AO.
  out+=border(outer,0,'#676b55',5)+border(inner,0,'#555d49',6);
 }
 out+='</g>';
 for(const {p,q,ip,iq} of edges){const front=p[0]+p[1]+q[0]+q[1]>0;
  if(front)out+=modelFace([[...p,0],[...q,0],[...q,-6],[...p,-6]],z,mesh?'none':semantic?color:'#9f9a86','#737967',.45);
  if(!front)out+=modelFace([[...ip,0],[...iq,0],[...iq,-6],[...ip,-6]],z,mesh?'none':semantic?color:'#8c8e7b','#6b735e',.45);
 }
 out+=border(outer,0,'#666e5a',.85)+border(inner,0,'#666e5a',.85);
 if(rank===1){
  // Low plaza seating and a planted courtyard edge.
  for(const i of [7,19,31,43,55,67]){const [x,y]=at(i,.62);out+=block(x-12,y-3,z,24,6,4,'#b3a080',view);out+=modelLine([[x-11,y-1,4.2],[x+11,y-1,4.2]],z,'#786c53',.5);}
  for(const i of [4,16,28,40,52,64]){const [x,y]=at(i,.12);out+=tree(x,y,z,.42,i,view,color);}
 }else if(rank===2||rank===3){
  // Rear curtain wall: transparent glazing, expressed mullions, and a continuous cap.
  for(let i=0;i<72;i+=3){const p=outer[i],q=outer[(i+3)%72],front=p[0]+p[1]+q[0]+q[1]>0;
   if(!visibleEdge(p,q))continue;
   const h=front?10:30;
   out+=modelFace([[...p,1],[...q,1],[...q,h],[...p,h]],z,mesh?'none':semantic?color:'url(#glass)','#7b8c80',.55);
   out+=modelLine([[...p,h],[...q,h]],z,'#6f7766',1.2);
   out+=modelLine([[...p,1],[...p,h]],z,'#78816d',.9);
   if(material&&!front)out+=modelLine([[...p,23],[...q,27]],z,'#f0f3e9',.7);
  }
  const objects=[];const add=(x,y,draw)=>objects.push({depth:x+y,draw});
  // Fixed structural bays remain aligned from floor to floor.
  for(let i=0;i<72;i+=9){const [x,y]=at(i,.91);if(!cut||x+y<=0)add(x,y,()=>block(x-1.6,y-1.6,z,3.2,3.2,32,'#b8a37f',view));}
  if(rank===2){
   for(const [x,y] of [[-83,-43],[-91,18],[34,-70],[55,28]])add(x,y,()=>{
    let s=material?contact(x+10,y+6,z,23,7):'';
    for(const dx of [1,21])for(const dy of [1,10])s+=block(x+dx,y+dy,z,1.3,1.3,7,'#7e806c',view);
    s+=block(x,y,z+7,24,13,1.4,'#baa784',view);
    for(const dx of [3,15])for(const dy of [-6,17])s+=block(x+dx,y+dy,z,5,5,4,'#89967e',view);
    if(material)s+=block(x+5,y+4,z+8.5,6,4,.4,'#d5d1b9',view)+modelLine([[x+8,y+4,9],[x+8,y+8,9]],z,'#a69c80',.4);
    return s;});
   for(const [x,y] of [[-70,-67],[-109,-17],[12,-83]])add(x,y,()=>{
    let s=block(x,y,z,25,5,19,'#a29370',view);
    for(let h=5;h<19;h+=6){s+=block(x,y+5,z+h,25,1,1,'#b6a37f',view);
     if(!mesh)for(let j=0;j<11;j++)s+=block(x+1+j*2.1,y+5.3,z+h+1,1.3,.7,3.6,['#8d9c8a','#b7aa8b','#b48164','#737e71'][j%4],view);}
    return s;});
  }else{
   for(const [x,y] of [[-88,-39],[-85,21],[38,-71],[48,30]])add(x,y,()=>{
    let s=material?contact(x+14,y+5,z,26,7):'';
    s+=block(x+2,y+1,z,3,10,9,'#73816f',view)+block(x+23,y+1,z,3,10,9,'#73816f',view)+block(x,y,z+9,30,13,2,'#c4ad85',view);
    if(!mesh)s+=block(x+3,y+2,z+11,5,5,3,'#82948c',view)+block(x+19,y+3,z+11,7,4,1,'#bcb7a2',view);
    return s;});
   add(-62,-50,()=>block(-62,-50,z,3,54,25,'#b5b6a2',view));
  }
  // A short stair flight expresses circulation without implying surveyed dimensions.
  add(80,-14,()=>{let s='';for(let i=0;i<9;i++)s+=block(80,-14+i*3,z,16,3,1+i*1.1,'#a6aa98',view);
   s+=modelLine([[79,-14,9],[79,13,19]],z,'#6c7c69',.9)+modelLine([[97,-14,9],[97,13,19]],z,'#6c7c69',.9);return s;});
  objects.sort((a,b)=>a.depth-b.depth);for(const o of objects)out+=o.draw();
  // Courtyard guardrail, open front in cutaway mode.
  for(let i=0;i<72;i+=3){const p=inner[i],q=inner[(i+3)%72];if(!visibleEdge(p,q))continue;
   out+=modelLine([[...p,0],[...p,9],[...q,9]],z,'#73816a',.65);}
 }else if(rank===4){
  const objects=[];
  for(let i=0;i<72;i+=6){const [x,y]=at(i,.66);objects.push({depth:x+y,draw:()=>{
   let s=block(x-7,y-5,z,14,10,4,'#9a9c81',view);
   s+=modelFace([[x-6,y-4],[x+6,y-4],[x+6,y+4],[x-6,y+4]],z+4,mesh?'none':semantic?color:'#687650');
   s+=tree(x,y,z+4,.4+(i%4)*.035,i,view,color);return s;}});}
  objects.sort((a,b)=>a.depth-b.depth);for(const o of objects)out+=o.draw();
  for(let i=0;i<72;i+=3){const p=outer[i],q=outer[(i+3)%72];if(visibleEdge(p,q))out+=modelLine([[...p,0],[...p,10],[...q,10]],z,'#6d7d68',.7);}
 }else if(rank===5){
  // Radial timber ribs, narrow standing-seam panels, and expressed roof supports.
  for(let i=0;i<72;i+=2){const a=at(i,.05),b=at(i,.97);out+=modelLine([[...a,1],[...b,1]],z,mesh?'#7d8873':semantic?color:'#ece6d2',1.2);
   if(material)out+=modelLine([[...a,0],[...b,0]],z,'#727e68',.55);}
  out+=border(outer,1,'#5a6858',1.3)+border(inner,1,'#5a6858',1.1);
 }
 return out;
}

function render(){
 const records=mode==='terrain'?terrainRecords:buildingRecords,amount=Number($('explode').value),view=$('render').value,cut=$('section').checked,budget=$('annotations').value;
 $('gapValue').value=amount;
 $('gapHint').textContent=mode==='terrain'?'Themes share one terrain. Spacing is editorial, not depth.':'Storeys retain base elevations. Spacing adds a presentation offset.';
 $('plateTitle').textContent=mode==='terrain'?'UPLAND / THEMATIC ATLAS':'COURTYARD / ASSEMBLY ATLAS';
 $('plateKind').textContent=mode==='terrain'?'SIX VIEWS · ONE SURFACE':'SIX GROUPS · ONE ASSEMBLY';
 let out=paintDefinitions()+`<title id="svgTitle">${esc($('plateTitle').textContent)}</title><desc id="svgDesc">Six separated synthetic layers with registration guides and adjustable annotation. All feature locations are illustrative. Use the layer buttons for accessible records.</desc><rect width="1040" height="1120" fill="#faf9f5"/>`;
 out+=text(38,43,mode==='terrain'?'A / THEMATIC EXPLOSION':'B / ASSEMBLY EXPLOSION',11,'#65735e','letter-spacing="1.4"');
 const z=rank=>offset(rank,amount,mode);
 if($('guides').checked)for(const p of [[-140,-140],[140,-140],[140,140],[-140,140]])out+=line([project(...p,mode==='terrain'?height(...p)+z(0):0),project(...p,(mode==='terrain'?height(...p):0)+z(5))],'#b7bcae',.8,'3 4');
 for(let i=0;i<6;i++){
  out+=`<g data-layer="${i}">`+(mode==='terrain'?terrain(i,z(i),view,cut):pavilion(i,z(i),view,cut));
  if(i===selected&&mode==='building'){
   const outline=i===0?[[-163,-133],[163,-133],[163,133],[-163,133]]:outer;
   out+=modelLine([...outline,outline[0]],z(i),'#8b4535',1.6);
  }
  if(i===selected&&mode==='terrain'){
   const edge=Array.from({length:41},(_,k)=>[140,-140+k*7]).filter(p=>!cut||p[1]<=0);
   out+=line(edge.map(p=>project(...p,z(i)+height(...p))),'#8b4535',1.6);
  }
  out+='</g>';
 }
 const anchors=records.map((r,i)=>({id:i,target:project(140,0,z(i)+(mode==='terrain'?height(140,0):0))[1],anchor:project(140,0,z(i)+(mode==='terrain'?height(140,0):0))}));
 const labels=labelLayout(anchors,100,920,budget==='full'?105:budget==='balanced'?87:60);
 for(const a of labels){const r=records[a.id],color=a.id===selected?'#414f38':'#667060';out+=line([a.anchor,[715,a.anchor[1]],[746,a.y]],'#9da891',.8);out+=`<circle cx="${a.anchor[0]}" cy="${a.anchor[1]}" r="2.5" fill="#6c805c"/>`+text(763,a.y-2,String(a.id+1).padStart(2,'0'),12,'#7a856e')+text(795,a.y-2,r[0],15,color,'font-weight="600"');
 if(budget!=='sparse'){const summaries=mode==='terrain'?['Common geometry','Cover pattern','Authored relationships','Movement network','Spatial activity','Proposed emphasis']:['Ground reference','Shared open space','Occupied floor','Flexible activity','Planted terrace','Roof assembly'];out+=text(795,a.y+19,summaries[a.id],11,'#737d6c');}
 if(budget==='full')out+=text(795,a.y+38,`${mode==='terrain'?'T':'B'}-${a.id+1} / ${mode==='terrain'?'synthetic':'authored'}`,10,'#7a806f')+text(795,a.y+54,a.id===0?'Input needed: survey':mode==='terrain'?'Input needed: verified layer':'Input needed: design model',10,'#7a806f');
 }
 out+=line([[38,1032],[1000,1032]],'#d8ddce',1)+text(38,1055,'MATERIAL / CONTEXT',10,'#75816a','letter-spacing="1.2"');
 const legend=mode==='terrain'?['Stone / base','Planting','Water / overlay']:['Stone / base','Timber / floor','Planting'];const swatches=mode==='terrain'?colors:['#b6b8a8','#c9b292','#7d8869'];
 for(let i=0;i<3;i++){out+=`<circle cx="${46+i*145}" cy="1083" r="7" fill="${swatches[i]}"/>`+text(60+i*145,1087,legend[i],10,'#67725f');}
 out+=text(38,1105,'SYNTHETIC / ILLUSTRATIVE · NO SURVEYED DIMENSIONS',9,'#75816a');
 out+=text(640,1055,'READING RULE',10,'#75816a','letter-spacing="1.2"')+text(640,1080,mode==='terrain'?'Repeated terrain ≠ underground strata':'Separated groups ≠ measured elevations',12,'#65715e');
 svg.innerHTML=out;
 $('labelStatus').textContent=`6 ${budget} labels · fixed gutter`;
 $('recordTitle').textContent=String(selected+1).padStart(2,'0')+' / '+records[selected][0];
 $('recordQuestion').textContent=records[selected][1];$('recordSource').textContent=records[selected][2];$('recordNeeds').textContent=records[selected][3];$('mechanismText').textContent=records[selected][4];
 $('layerButtons').innerHTML=records.map((r,i)=>`<button data-select="${i}" aria-pressed="${i===selected}"><span>${String(i+1).padStart(2,'0')}</span>${r[0]}</button>`).join('');
}
for(const id of ['explode','annotations','render','guides','section'])$(id).addEventListener('input',render);
$('layerButtons').addEventListener('click',e=>{const b=e.target.closest('button');if(b){selected=Number(b.dataset.select);render();$('layerButtons').querySelector(`[data-select="${selected}"]`).focus();}});
for(const id of ['terrain','building'])$(id).addEventListener('click',()=>{mode=id;for(const b of ['terrain','building'])$(b).setAttribute('aria-pressed',String(mode===b));render();});
$('export').addEventListener('click',()=>{const copy=svg.cloneNode(true);copy.setAttribute('xmlns','http://www.w3.org/2000/svg');copy.setAttribute('width','1040');copy.setAttribute('height','1120');const style=document.createElementNS('http://www.w3.org/2000/svg','style');style.textContent='text{font-family:system-ui,sans-serif}';copy.prepend(style);const blob=new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${mode}-atlas.svg`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
render();
