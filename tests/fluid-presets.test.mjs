import test from 'node:test';
import assert from 'node:assert/strict';
import {FLUID_PRESETS,fluidPresetCopy,matchingFluidPreset} from '../js/fluid-presets.js';
import {INITIAL_INK_RULES,validateInkRules} from '../js/simulations/ink.js';
import {INITIAL_OIL_RULES,validateOilRules} from '../js/simulations/oil.js';
test('fluid presets use existing valid rules, distinct choices and four-language explanations',()=>{
 for(const [kind,defaults,validate] of [['ink',INITIAL_INK_RULES,validateInkRules],['oil',INITIAL_OIL_RULES,validateOilRules]]){
  const presets=FLUID_PRESETS[kind];assert.equal(presets.length,5);assert.equal(new Set(presets.map(p=>JSON.stringify(p.rules))).size,5);
  assert.deepEqual(presets[0].rules,defaults);assert.equal(matchingFluidPreset(kind,defaults).id,'balanced');
  for(const p of presets){assert.deepEqual(validate(p.rules),p.rules);assert.equal(matchingFluidPreset(kind,p.rules).id,p.id);for(const lang of ['en','he','ru','nl']){const [name,description]=fluidPresetCopy(p,lang);assert(name.length>0&&description.length>10);}}
  assert.equal(matchingFluidPreset(kind,Object.fromEntries(Object.keys(defaults).map(key=>[key,1]))),undefined);
 }
});
