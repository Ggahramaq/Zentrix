import test from 'node:test';
import assert from 'node:assert/strict';
import { bayerChannel, createCheckerboard, demosaicBilinear, sampleBayer } from '../lib/bayer.ts';
import { demosaicNearest, demosaicEdgeAware } from '../lib/demosaic.ts';
import { gaussianBlur } from '../lib/blur.ts';
import { createPattern } from '../lib/patterns.ts';
import { falseColorScore, meanSquaredError, detailRatio } from '../lib/metrics.ts';

const algorithms = [demosaicNearest, demosaicBilinear, demosaicEdgeAware];
const offsets = [{x:0,y:0},{x:1,y:0},{x:0,y:1},{x:1,y:1}];
function image(width, height, rgb) { const data = new Float32Array(width * height * 3); for (let i=0;i<width*height;i++) data.set(rgb,i*3); return {width,height,data}; }
const near = (a,b) => assert.ok(Math.abs(a-b)<1e-6, `${a} differs from ${b}`);

test('all methods preserve every actual measurement, for each phase and boundary', () => {
  const source = createPattern(9, 7, 'texture', 2, 'vertical');
  for (const offset of offsets) { const mosaic = sampleBayer(source, offset); assert.equal(mosaic.data.length, source.width * source.height);
    for (const decode of algorithms) { const output = decode(mosaic); for(let y=0;y<source.height;y++) for(let x=0;x<source.width;x++) { const i=y*source.width+x, channel=bayerChannel(x,y,offset); assert.equal(mosaic.data[i],source.data[i*3+channel]); assert.equal(output.data[i*3+channel],mosaic.data[i]); for(let c=0;c<3;c++) assert.ok(Number.isFinite(output.data[i*3+c]) && output.data[i*3+c]>=0 && output.data[i*3+c]<=1); } }
  }
});
test('all methods recover uniform neutral and colored fields at image edges', () => {
  for (const color of [[.37,.37,.37],[.1,.6,.9]]) for (const offset of offsets) for (const decode of algorithms) {
    const output=decode(sampleBayer(image(5,3,color),offset)); for(let i=0;i<output.data.length;i++) near(output.data[i],color[i%3]);
  }
});
test('bilinear uses horizontal, vertical and diagonal color neighbors', () => {
  const data = new Float32Array(25); data[2*5+1]=.2; data[2*5+3]=.6; data[1*5+2]=.4; data[3*5+2]=.8; data[1*5+1]=.1; data[1*5+3]=.3; data[3*5+1]=.5; data[3*5+3]=.7; data[2*5+2]=.9;
  const out=demosaicBilinear({width:5,height:5,data,offset:{x:0,y:0}}); near(out.data[(2*5+2)*3],.9); near(out.data[(2*5+2)*3+1],.5); near(out.data[(2*5+2)*3+2],.4);
});
test('checkerboard aliases to false colors and alignment flips the result', () => {
  const src=createCheckerboard(16,16,1); const a=demosaicBilinear(sampleBayer(src)); const b=demosaicBilinear(sampleBayer(src,{x:1,y:0}));
  assert.deepEqual([...a.data.slice(0,3)],[1,0,1]); assert.deepEqual([...b.data.slice(0,3)],[0,1,0]); assert.ok(falseColorScore(a)>99);
});
test('Gaussian prefilter is linear, normalized at boundaries, and suppresses checkerboard color', () => {
  const constant=image(6,5,[.2,.5,.8]); for(const v of gaussianBlur(constant,1).data) assert.ok(Number.isFinite(v));
  const smoothed=gaussianBlur(constant,1); for(let i=0;i<smoothed.data.length;i++) near(smoothed.data[i],constant.data[i]);
  const src=createCheckerboard(32,32,1), filtered=gaussianBlur(src,1); assert.deepEqual([...gaussianBlur(src,0).data], [...src.data]);
  assert.ok(falseColorScore(demosaicBilinear(sampleBayer(filtered))) < falseColorScore(demosaicBilinear(sampleBayer(src))));
  assert.ok(detailRatio(src,filtered)<1);
});
test('metric references are unfiltered linear images and dimensions must match', () => {
  const a=image(3,3,[0,0,0]), b=image(3,3,[1,1,1]); assert.equal(falseColorScore(a),0); assert.equal(falseColorScore(b),0); assert.equal(meanSquaredError(a,b),1); assert.equal(detailRatio(a,b),null);
  assert.throws(()=>meanSquaredError(a,image(2,2,[0,0,0])),RangeError);
});
test('edge-aware chooses the lower-gradient green direction', () => {
  const data=new Float32Array(25).fill(.5); data[2*5+1]=.2; data[2*5+3]=.2; data[1*5+2]=0; data[3*5+2]=1;
  const out=demosaicEdgeAware({width:5,height:5,data,offset:{x:0,y:0}}); near(out.data[(2*5+2)*3+1],.2);
});
test('methods produce different reconstructions from the same measured stripe samples', () => {
  const mosaic=sampleBayer(createPattern(12,12,'stripes',3,'vertical'));
  const nearest=demosaicNearest(mosaic), bilinear=demosaicBilinear(mosaic), edge=demosaicEdgeAware(mosaic);
  assert.ok(nearest.data.some((v,i)=>Math.abs(v-bilinear.data[i])>1e-6));
  assert.ok(edge.data.some((v,i)=>Math.abs(v-bilinear.data[i])>1e-6));
});
