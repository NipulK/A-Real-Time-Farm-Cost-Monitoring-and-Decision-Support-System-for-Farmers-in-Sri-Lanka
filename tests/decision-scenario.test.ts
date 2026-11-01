import test from "node:test";
import assert from "node:assert/strict";
import { scenario } from "../lib/domain";
test("whole-season scenarios keep costs and additional forecast costs separate from actual sales",()=>{
 const a=scenario(1000000,200000,100,15000);assert.equal(a.valid,true);assert.equal(a.revenue,1500000);assert.equal(a.profit,300000);assert.equal(a.breakEven,12000);
 assert.equal(scenario(1000000,0,0,10000).breakEven,null);
});
test("unsafe, negative and nonfinite scenario assumptions cannot yield misleading figures",()=>{
 for(const args of [[-1,0,100,100],[100,-1,100,100],[100,0,-1,100],[100,0,100,-1],[100,0,Infinity,100],[100,NaN,100,100],[100,0,100,NaN],[100,0,1e300,1e300],[100,0,1e-320,100]]){
  const a=scenario(args[0],args[1],args[2],args[3]);assert.equal(a.valid,false);assert.equal(a.profit,null);assert.equal(a.revenue,null);assert.equal(a.breakEven,null);
 }
});
