// Original Web Audio voices: no recorded samples. All sources pass through one mute bus.
export class SoundEngine {
 constructor(){this.enabled=false;this.volume=.3;this.ctx=null;this.count=0;this.rms=0;}
 async enable(){
  const Constructor=window.AudioContext||window.webkitAudioContext;
  if(!Constructor)throw new Error('Web Audio unavailable');
  if(!this.ctx){
   this.ctx=new Constructor();const c=this.ctx;
   this.bus=c.createGain();this.bus.gain.value=0;
   const compressor=c.createDynamicsCompressor();compressor.threshold.value=-16;compressor.ratio.value=5;
   this.analyser=c.createAnalyser();this.analyser.fftSize=256;this.samples=new Float32Array(256);
   this.bus.connect(compressor).connect(this.analyser).connect(c.destination);
   this.noiseBuffer=c.createBuffer(1,c.sampleRate*2,c.sampleRate);
   const data=this.noiseBuffer.getChannelData(0);let seed=5489;
   for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;data[i]=seed/2147483648;}
   this.bed=c.createOscillator();this.bed.type='sine';this.bed.frequency.value=220;
   this.bedGain=c.createGain();this.bedGain.gain.value=0;this.bed.connect(this.bedGain).connect(this.bus);this.bed.start();
   this.air=c.createBufferSource();this.air.buffer=this.noiseBuffer;this.air.loop=true;
   this.filter=c.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=900;
   this.airGain=c.createGain();this.airGain.gain.value=0;this.air.connect(this.filter).connect(this.airGain).connect(this.bus);this.air.start();
  }
  await this.ctx.resume();if(this.ctx.state!=='running')throw new Error('Audio needs a user gesture');this.enabled=true;
 }
 mute(){if(this.ctx){this.bus.gain.cancelScheduledValues(this.ctx.currentTime);this.bus.gain.setTargetAtTime(0,this.ctx.currentTime,.008);}}
 follow(audible,transit){
  if(!this.ctx)return;const t=this.ctx.currentTime;
  this.bus.gain.setTargetAtTime(this.enabled&&audible?this.volume:0,t,.012);
  this.bedGain.gain.setTargetAtTime(transit.active ? .034 : 0,t,.045);
  this.airGain.gain.setTargetAtTime(transit.active ? .027 : 0,t,.045);
  this.bed.frequency.setTargetAtTime(210+transit.progress*70-transit.depth*65,t,.05);
  this.filter.frequency.setTargetAtTime(transit.depth?380:1100+transit.progress*1000,t,.05);
  this.analyser.getFloatTimeDomainData(this.samples);this.rms=Math.sqrt(this.samples.reduce((sum,n)=>sum+n*n,0)/this.samples.length);
 }
 voice({frequency=330,end=frequency,length=.16,type='sine',gain=.15,pan=0,noise=false,cutoff=1800,offset=0}){
  const c=this.ctx,t=c.currentTime+offset,source=noise?c.createBufferSource():c.createOscillator();
  if(noise)source.buffer=this.noiseBuffer;else{source.type=type;source.frequency.setValueAtTime(frequency,t);source.frequency.exponentialRampToValueAtTime(end,t+length);}
  const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.setValueAtTime(cutoff,t);if(noise)filter.frequency.exponentialRampToValueAtTime(Math.max(120,cutoff*.25),t+length);
  const env=c.createGain();env.gain.setValueAtTime(.0001,t);env.gain.exponentialRampToValueAtTime(gain,t+.007);env.gain.exponentialRampToValueAtTime(.0001,t+length);
  const stereo=c.createStereoPanner();stereo.pan.value=pan;
  source.connect(filter).connect(env).connect(stereo).connect(this.bus);source.start(t);source.stop(t+length+.02);
  source.onended=()=>{source.disconnect();filter.disconnect();env.disconnect();stereo.disconnect();};
 }
 event({type,route}){
  if(!this.enabled||this.ctx?.state!=='running')return;this.count++;
  if(type==='pick'){this.voice({frequency:290,end:420,length:.11,gain:.09,pan:-.7});this.voice({noise:true,length:.025,gain:.06,cutoff:4800,pan:-.7});}
  if(type==='seal'){this.voice({frequency:140,end:65,length:.23,gain:.19,pan:-.6});this.voice({noise:true,length:.12,gain:.08,cutoff:1600,pan:-.6});}
  if(type==='dispatch')this.voice({frequency:650,end:280,length:.13,gain:.1,pan:-.4});
  if(type==='relay')this.voice({noise:true,length:.19,gain:.1,cutoff:750,pan:0});
  if(type==='cross'){this.voice({noise:true,length:.08,gain:.16,cutoff:3500,pan:.5});this.voice({frequency:180,end:420,length:.13,gain:.09,pan:.5});}
  if(type==='arrival'){
   const note=[330,412.5,495][route];
   this.voice({frequency:note*1.05,end:note,length:.24,gain:.17,pan:.75});
   this.voice({frequency:note*2,length:.42,gain:.07,pan:.65,offset:.08});
   this.voice({frequency:note*3,length:.3,gain:.025,pan:.85,offset:.13});
  }
 }
 dispose(){if(this.ctx){this.bed.stop();this.air.stop();this.ctx.close();}}
}
