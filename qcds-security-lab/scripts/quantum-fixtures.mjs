// Prepare cases for an independent Qiskit Aer validation.
import { writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { cases, fixture } from "../tests/quantum-cases.mjs";
import { compareExecution } from "../quantum-compare.mjs";
const output = resolve(process.argv[2] || "output/quantum-cases.json");
await mkdir(dirname(output), { recursive: true });
const data = cases.map((c) => ({
  ...c,
  comparison: compareExecution(fixture({ ...c.spec, name: c.name }), c.options),
}));
await writeFile(output, JSON.stringify(data));
console.log(
  JSON.stringify(
    data.map((c) => ({
      name: c.name,
      qubits: c.comparison.circuit.qubits,
      ideal: c.comparison.ideal.probability,
      noisy: c.comparison.noisy.probability ?? c.comparison.noisy.status,
    })),
  ),
);
