// Created by Patrik Sundblom — with OpenAI / ChatGPT as R&D support.
import {analyze} from './core/engine.mjs';
import {runDimensionExperiment} from './core/logical-space.mjs';
import {compareExecution} from './core/quantum-compare.mjs';
self.onmessage = ({data}) => {
  const {id,type,project,research,run} = data;
  try {
    let result;
    if(type === 'analyze') {
      self.postMessage({id,phase:0});
      result = analyze(project.input,project.evidence,project.excludedLenses);
      self.postMessage({id,phase:3});
    } else if(type === 'dimensions') {
      const model = analyze(project.input,project.evidence,project.excludedLenses);
      result = runDimensionExperiment(model,research);
    } else if(type === 'quantum') result = compareExecution(run,{shots:4096,seed:173});
    else throw new Error('Okänd beräkning.');
    self.postMessage({id,result});
  } catch(error) {self.postMessage({id,error:error.message});}
};
