import { compareExecution } from "./quantum-compare.mjs?v=1.1.0";
self.onmessage = ({ data }) => {
  try {
    self.postMessage({
      id: data.id,
      result: compareExecution(data.run, data.options),
    });
  } catch (error) {
    self.postMessage({ id: data.id, error: error.message });
  }
};
