// Original procedural fields. The visual principle is continuous density -> printed ink.
const common = `
precision highp float;
uniform vec2 resolution;
uniform float time, grain, warp, mode;
out vec4 color;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float cloud(vec2 p){float v=0.,a=.5; for(int i=0;i<4;i++){v+=a*noise(p);p=mat2(.84,.54,-.54,.84)*p*2.1+7.3;a*=.5;}return v;}
float printThreshold(vec2 p){return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715))));}
`;
export const vertex = `#version 300 es
in vec2 position;void main(){gl_Position=vec4(position,0.,1.);}`;
export const tunnelFragment = `#version 300 es
${common}
void main(){
 vec2 p=(gl_FragCoord.xy-.5*resolution)/resolution.y;
 vec2 eye=vec2(.09,.035),d=p-eye;
 float r=length(d);vec2 direction=d/max(r,.0001);
 float z=.5/max(r,.018);
 float turbulence=cloud(direction*3.+vec2(z*.3,-time*.17));
 float rings=.5+.5*sin(z*4.2-time*1.8+(turbulence-.5)*warp*3.);
 float band=smoothstep(.22,.78,rings);
 float torn=cloud(direction*5.+vec2(z*.65-time*.25,time*.12));
 float wall=(.27+band*.6+(torn-.5)*1.15)*smoothstep(.018,.22,r);
 wall*=.72+.38*smoothstep(-.2,.5,d.y);
 float sea=cloud(vec2(p.x*8.+time*.15,p.y*20.-time*.7));
 float ground=(1.-smoothstep(-.55,-.26,p.y))*(.35+sea*.8);
 float density=clamp(max(wall,ground),0.,1.);
 if(mode>1.5) density=band*smoothstep(.018,.12,r);
 float ink=mode>.5?density:step(printThreshold(floor(gl_FragCoord.xy/grain)),density);
 vec3 paper=vec3(1.,.22,.12),black=vec3(.035,.031,.025);
 color=vec4(mix(paper,black,ink),1.);
}`;
export const signalFragment = `#version 300 es
${common}
uniform float scene;
float gaussian(float x,float w){return exp(-x*x/(w*w));}
void main(){
 vec2 p=vec2(gl_FragCoord.x/resolution.x,1.-gl_FragCoord.y/resolution.y)*vec2(1000.,330.);
 float light=0.;float travel=mod(scene,4.)-.8;
 float front=150.+clamp(travel/2.4,0.,1.)*668.;
 float distortion=(cloud(vec2(p.y*.035,time*.17))-.5)*12.;
 float x=p.x+distortion;
 float relayMask=smoothstep(365.,371.,p.x)*(1.-smoothstep(589.,595.,p.x))*smoothstep(113.,119.,p.y)*(1.-smoothstep(211.,217.,p.y));
 float since=travel-(p.x-150.)/668.*2.4;
 float wake=step(0.,since)*exp(-max(0.,since)*2.1);
 float beam=gaussian(x-front,5.)*.65+gaussian(x-front,35.)*.14;
 float texture=cloud(vec2(p.x*.035-time*.2,p.y*.05+scene*.4));
 float hatch=step(.7,fract((p.x+p.y)*.085));
 light+=relayMask*(beam+(.2*texture+.035*hatch)*wake)*step(0.,travel)*step(travel,3.2);
 float cross=.8+(745.-150.)/668.*2.4;
 float age=mod(scene,4.)-cross;
 float press=gaussian(age,.11);
 float dy=p.y-165.;
 float rip=gaussian(abs(dy)-max(0.,age)*115.,10.)*exp(-max(0.,age)*2.4)*step(0.,age);
 float membrane=745.+sin(p.y*.04+time*.4)*1.2+press*6.*gaussian(dy,18.)+rip*3.;
 float dx=p.x-membrane;
 float ends=smoothstep(28.,42.,p.y)*(1.-smoothstep(288.,302.,p.y));
 float energy=.055+press*.95*gaussian(dy,28.)+rip*.45;
 light+=(gaussian(dx,1.1)+exp(-abs(dx)/8.)*.4*texture)*energy*ends;
 int route=int(floor(mod(scene,12.)/4.));
 float destY=route==0?75.:(route==1?165.:255.);
 float arrival=mod(scene,4.)-3.2;
 float radius=18.+sqrt(max(0.,arrival))*45.;
 float burst=exp(-length((p-vec2(818.,destY))/radius)*2.)*exp(-max(0.,arrival)*4.)*step(0.,arrival);
 light+=burst*(.45*texture+.12*hatch);
 float stipple=step(printThreshold(floor(gl_FragCoord.xy/1.5)),light)*.25;
 float alpha=clamp(light*.85+stipple*.3,0.,.9);
 color=vec4(vec3(.92,.89,.82)*alpha,alpha);
}`;
