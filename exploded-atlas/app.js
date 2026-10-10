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
 ['Site & landscape','How does the building meet the ground?','Original schematic base and trees.','Site survey, boundaries, terrain datum and planning constraints.','The base establishes one footprint. All higher groups preserve the same coordinate frame.'],
 ['Public plaza','Where is the shared open space?','Original plaza slab with a courtyard opening.','Site levels, accessible routes, finishes and drainage design.','A polygonal ring is constructed from an outer boundary and an inner courtyard. No boolean engine is required.'],
 ['Reading level','How is an occupied floor organized?','Original floor plate, cutaway walls and furniture blocks.','Architect-authored model, room areas, occupancy and access review.','Furniture uses small boxes. Partial-height perimeter walls make the floor readable as a room rather than a floating plate.'],
 ['Workshop level','Where might flexible activity happen?','Original schematic partitions and benches.','Storey grouping, equipment clearance, structure and building services.','The model has a base elevation before explosion. Editorial offsets are applied afterward.'],
 ['Roof garden','How does landscape extend into the building?','Original terrace, planting symbols and guard edge.','Loads, waterproofing, planting design and maintenance access.','Repeated plant symbols add a material cue. Their number and size are illustrative, not a planting schedule.'],
 ['Canopy','What completes the assembly?','Original roof ring and schematic support posts.','Structural model, connections, actual section depths and material specification.','The same courtyard opening aligns vertically. Support posts are schematic and are not a structural calculation.']
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
function plant(x,y,z,scale=1){const p=project(x,y,z);return line([p,[p[0],p[1]-12*scale]],'#766d58',1.4)+`<ellipse cx="${p[0]}" cy="${p[1]-14*scale}" rx="${7*scale}" ry="${10*scale}" fill="#7d8869" stroke="#646f55" stroke-width=".6"/>`;}
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
function ringPoints(n=48){return Array.from({length:n},(_,i)=>{const a=i*Math.PI*2/n,r=1+.09*Math.cos(a*3);return [132*r*Math.cos(a),105*r*Math.sin(a)];});}
const outer=ringPoints(),inner=Array.from({length:48},(_,i)=>{const a=i*Math.PI*2/48;return [38*Math.cos(a),31*Math.sin(a)];});
function pavilion(rank,z,view,cut){let out='';const mesh=view==='mesh',color=view==='semantic'?colors[rank]:rank===5?'#858a80':rank===4?'#b8bea6':rank===1?'#d1cec1':'#c9b292';
 if(rank===0){out+=box(-155,-125,z,310,250,12,'#b6b8a8',mesh);if(!mesh)for(let i=0;i<11;i++){const a=i*Math.PI*2/11;out+=plant(140*Math.cos(a),110*Math.sin(a),z+12,1.25);}return out;}
 const edges=outer.map((p,i)=>({p,q:outer[(i+1)%48],ip:inner[i],iq:inner[(i+1)%48]}));
 // Each ring quad remains editable vector geometry and leaves a real opening.
 for(const {p,q,ip,iq} of edges)out+=polygon([project(...p,z),project(...q,z),project(...iq,z),project(...ip,z)],mesh?'none':color,mesh?'#83927d':color,mesh?.7:.35);
 for(const {p,q,ip,iq} of edges){const front=p[0]+p[1]+q[0]+q[1]>0;
 if(front)out+=polygon([project(...p,z),project(...q,z),project(...q,z-8),project(...p,z-8)],mesh?'none':'#999486','#73786b',.5);
 if(!front)out+=polygon([project(...ip,z),project(...iq,z),project(...iq,z-8),project(...ip,z-8)],mesh?'none':'#8b8a7b','#70786a',.5);
 }
 if(rank===2||rank===3){
 // Back perimeter walls are always cut to a schematic low height; cutaway removes front walls.
 for(const {p,q} of edges){if(cut&&p[0]+p[1]+q[0]+q[1]>0)continue;out+=polygon([project(...p,z),project(...q,z),project(...q,z+29),project(...p,z+29)],mesh?'none':'#b19d7f','#7f806c',.65);}
 for(const [x,y] of [[-88,-30],[-70,40],[40,-65],[55,40]])out+=box(x,y,z,29,16,rank===3?10:7,'#a3947b',mesh);
 if(rank===3)out+=box(-60,-55,z,4,85,31,'#989b8f',mesh);
 }else if(rank===4&&!mesh){for(let i=0;i<18;i++){const a=i*Math.PI*2/18;out+=plant(106*Math.cos(a),83*Math.sin(a),z,.75);}}
 else if(rank===5){for(const [x,y] of [[-90,-45],[75,-45],[-75,60],[85,50]])out+=line([project(x,y,z-35),project(x,y,z)],'#848c7c',mesh?1:2);}
 return out;
}
function render(){
 const records=mode==='terrain'?terrainRecords:buildingRecords,amount=Number($('explode').value),view=$('render').value,cut=$('section').checked,budget=$('annotations').value;
 $('gapValue').value=amount;
 $('gapHint').textContent=mode==='terrain'?'Themes share one terrain. Spacing is editorial, not depth.':'Storeys retain base elevations. Spacing adds a presentation offset.';
 $('plateTitle').textContent=mode==='terrain'?'UPLAND / THEMATIC ATLAS':'COURTYARD / ASSEMBLY ATLAS';
 $('plateKind').textContent=mode==='terrain'?'SIX VIEWS · ONE SURFACE':'SIX GROUPS · ONE ASSEMBLY';
 let out=`<title id="svgTitle">${esc($('plateTitle').textContent)}</title><desc id="svgDesc">Six separated synthetic layers with registration guides and adjustable annotation. All feature locations are illustrative. Use the layer buttons for accessible records.</desc><rect width="1040" height="1120" fill="#faf9f5"/>`;
 out+=text(38,43,mode==='terrain'?'A / THEMATIC EXPLOSION':'B / ASSEMBLY EXPLOSION',11,'#65735e','letter-spacing="1.4"');
 const z=rank=>offset(rank,amount,mode);
 if($('guides').checked)for(const p of [[-140,-140],[140,-140],[140,140],[-140,140]])out+=line([project(...p,mode==='terrain'?height(...p)+z(0):0),project(...p,(mode==='terrain'?height(...p):0)+z(5))],'#b7bcae',.8,'3 4');
 for(let i=0;i<6;i++){out+=`<g data-layer="${i}" opacity="${i===selected?1:.72}">`+(mode==='terrain'?terrain(i,z(i),view,cut):pavilion(i,z(i),view,cut))+'</g>';}
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
