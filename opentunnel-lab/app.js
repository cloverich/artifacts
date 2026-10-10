import {vertex,tunnelFragment,signalFragment} from './shaders.js';
import {SoundEngine} from './audio.js';
import {eventsBetween,transitAt} from './timeline.js';
const $=id=>document.getElementById(id), duration=12, reduced=matchMedia('(prefers-reduced-motion: reduce)');
let playing=!reduced.matches, clock=0, elapsed=0, fieldTime=0, previous=performance.now(), visible=true, tunnelVisible=true, diagramVisible=false;
const audio=new SoundEngine();
const settings={grain:1.5,warp:3.5,speed:1,mode:0};
function renderer(canvas,fragment,transparent=false){
 const gl=canvas.getContext('webgl2',{alpha:transparent,antialias:false,premultipliedAlpha:true,powerPreference:'low-power'});
 if(!gl) return null;
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
 const program=gl.createProgram(),vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment);
 gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
 gl.deleteShader(vs);gl.deleteShader(fs);gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
 const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
 const locations=Object.fromEntries(['resolution','time','grain','warp','mode','scene'].map(k=>[k,gl.getUniformLocation(program,k)]));
 return {draw(){const ratio=Math.min(devicePixelRatio||1,2),w=Math.max(1,Math.round(canvas.clientWidth*ratio)),h=Math.max(1,Math.round(canvas.clientHeight*ratio));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}gl.useProgram(program);gl.uniform2f(locations.resolution,w,h);gl.uniform1f(locations.time,fieldTime);gl.uniform1f(locations.grain,settings.grain*ratio);gl.uniform1f(locations.warp,settings.warp);gl.uniform1f(locations.mode,settings.mode);gl.uniform1f(locations.scene,clock);gl.drawArrays(gl.TRIANGLES,0,3);},dispose(){gl.deleteBuffer(buffer);gl.deleteProgram(program);}};
}
let tunnel,signal;
try{tunnel=renderer($('tunnel'),tunnelFragment);signal=renderer($('field'),signalFragment,true);$('runtime').textContent=tunnel&&signal?'WEBGL2 · LOCAL · SOUND OFF':'WebGL2 unavailable · vector fallback';}catch(e){$('runtime').textContent='Shader error · vector fallback';console.error(e);}
if(!tunnel)$('tunnel').classList.add('shader-fallback');
const namespace='http://www.w3.org/2000/svg';
function node(tag,attrs,parent){const n=document.createElementNS(namespace,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);parent.append(n);return n;}
const packet=node('g',{},$('packets')),shape=node('path',{},packet),cipher=node('g',{},packet);
for(let i=0;i<12;i++)node('path',{},cipher);
const shapes=['M-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0','M0-10L10 8H-10Z','M-8-8H8V8H-8Z'];
function updateScene(){
 const local=clock%4,route=Math.floor(clock/4)%3,travel=local-.8,progress=Math.max(0,Math.min(1,travel/2.4));
 const x=150+668*progress,target=[75,165,255][route],bend=Math.max(0,Math.min(1,(x-745)/73));
 const y=165+(target-165)*bend*bend*(3-2*bend);
 packet.setAttribute('transform',`translate(${x} ${y})`);packet.style.opacity=local<.3||local>3.7?'0':String(local>3.2?1-(local-3.2)/.5:1);
 shape.setAttribute('d',shapes[route]);
 const scrambled=$('cipher-toggle').checked&&x>165&&x<770;
 shape.style.display=scrambled?'none':'';cipher.style.display=scrambled?'':'none';
 [...cipher.children].forEach((line,i)=>{const jitter=Math.sin(i*19.7+Math.floor(clock*16)*3.3);const yy=(i-5.5)*1.7;line.setAttribute('d',`M${-10+jitter*5} ${yy}h${8+(jitter+1)*6}`);line.setAttribute('opacity',.25+(Math.sin(i*3+clock*7)+1)*.35);});
 const label=local<.3?'Waiting for dispatch':local<.55?'Pick / route '+(route+1):local<.8?'Seal / shape becomes opaque':x<365?'Dispatch / encrypted transit':x<595?'Relay / activity without content':x<745?'Transit / approaching membrane':local<3.2?'Membrane / crossing': 'Arrival / '+['app','api','hook'][route];
 $('event').textContent=label;$('seek').value=clock;$('time').value=`${clock.toFixed(2).padStart(5,'0')} / 12.00`;
}
function draw(){tunnel?.draw();signal?.draw();updateScene();}
function syncPlay(){$('play').textContent=playing?'Pause':'Play';}
$('play').onclick=()=>{playing=!playing;if(!playing)audio.mute();syncPlay();};
$('restart').onclick=()=>{clock=0;elapsed=0;fieldTime=0;audio.mute();draw();};
$('seek').addEventListener('input',()=>{playing=false;audio.mute();syncPlay();clock=Math.min(Number($('seek').value),duration-.001);elapsed=clock;draw();});
$('sound').onclick=async()=>{
 try{if(audio.enabled){audio.enabled=false;audio.mute();}else await audio.enable();
 $('sound').textContent=audio.enabled?'Sound on':'Sound off';$('sound').setAttribute('aria-pressed',audio.enabled);
 $('runtime').textContent=(tunnel&&signal?'WEBGL2':'VECTOR FALLBACK')+' · LOCAL · SOUND '+(audio.enabled?'ON':'OFF');
 }catch(e){audio.enabled=false;$('runtime').textContent=e.message;}
};
$('volume').oninput=()=>{audio.volume=Number($('volume').value);};
$('surface').onchange=()=>{settings.mode=Number($('surface').value);draw();};
for(const key of ['grain','warp','speed'])$(key).addEventListener('input',()=>{settings[key]=Number($(key).value);$(key+'-value').value=settings[key]+(key==='grain'?' px':key==='speed'?'×':'');draw();});
for(const[layer,target]of [['structure','structure'],['field','field'],['packets','packets']])$(layer+'-toggle').onchange=()=>{$(target).style.display=$(layer+'-toggle').checked?'':'none';draw();};
$('cipher-toggle').onchange=draw;
const visibilityObserver=new IntersectionObserver(entries=>{
 for(const entry of entries){if(entry.target===$('scene'))diagramVisible=entry.isIntersecting;else tunnelVisible=entry.isIntersecting;}
 visible=tunnelVisible||diagramVisible;if(!diagramVisible)audio.mute();
},{threshold:0});
visibilityObserver.observe($('scene'));visibilityObserver.observe($('tunnel'));
new ResizeObserver(draw).observe(document.querySelector('main'));
document.addEventListener('visibilitychange',()=>{previous=performance.now();if(document.hidden)audio.mute();});
reduced.addEventListener('change',()=>{if(reduced.matches){playing=false;audio.mute();syncPlay();}});
function frame(now){
 const raw=(now-previous)/1000,dt=Math.min(raw,.05);previous=now;
 const advancing=playing&&!document.hidden&&visible,audible=advancing&&diagramVisible;
 if(advancing){const before=elapsed;elapsed+=dt*settings.speed;clock=elapsed%duration;fieldTime+=dt*settings.speed;
  if(audible&&raw<=.12)for(const event of eventsBetween(before,elapsed))audio.event(event);
  draw();
 }
 audio.follow(audible,transitAt(clock));
 $('sound').dataset.context=audio.ctx?.state||'uninitialized';$('sound').dataset.events=audio.count;
 $('sound').dataset.rms=audio.rms.toFixed(6);$('sound').dataset.audible=String(audible&&audio.enabled);
 requestAnimationFrame(frame);
}
syncPlay();draw();requestAnimationFrame(frame);
window.addEventListener('pagehide',event=>{audio.mute();if(!event.persisted){tunnel?.dispose();signal?.dispose();audio.dispose();}},{once:true});
