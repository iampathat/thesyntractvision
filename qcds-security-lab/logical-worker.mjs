import { runDimensionExperiment } from "./logical-space.mjs?v=1.14.0";
self.onmessage = ({ data }) => {
  try {
    self.postMessage({
      id: data.id,
      result: runDimensionExperiment(data.model, data.config),
    });
  } catch (error) {
    self.postMessage({ id: data.id, error: error.message });
  }
};
