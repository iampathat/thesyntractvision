# One oracle, three executions

QCDS Security Lab 1.13.0 · quantum executor 1.0.0  
QCDS by Patrik Sundblom. Contributor: ChatGPT (OpenAI). [License](./LICENSE.md).

The browser now runs actual small quantum circuits on the CPU. It does not
submit hardware jobs. The same selected attack predicate and dimension mask
feed an exact classical reference, an ideal statevector simulator and a noisy
density-matrix simulator. These are inspectable executions, not a promise of
quantum advantage or a security verdict.

## Try it

1. Open a worked case or your current investigation.
2. Select **Run dimensional inference**.
3. Expand **Compare classical, ideal & noisy execution**.
4. If the facts are all fixed, select **Reopen this path’s assumptions**.
   This explicitly changes those research assumptions to `?`; your declared
   system facts remain saved. Recursive control dimensions keep their current
   values and can be changed in **Edit mask**.
5. Select **Run the execution comparison**. Read the three bars together.

Noise, iteration count, shot count and seed are under one optional disclosure.
Changing scope or settings clears the previous result. There is no automatic
change of predicate, hidden truncation, fallback probability or hardware job.
The result belongs to its exported `bindingKey` and is included in the complete
dimensional-run JSON and Markdown while that run remains open. Save an export
before closing or changing the run; simulation results are not persisted as
evidence or restored from project imports.

## What the three bars mean

| Execution | Calculation | Meaning |
| --- | --- | --- |
| Classical reference | Exact BDD counts `M/N`, then the ideal Grover formula | Predicted accepted-subspace mass after the selected iterations |
| Ideal circuit | Complex amplitudes updated by every H, X, RZ and CX gate | Actual ideal simulation of the compiled circuit |
| Noisy circuit | Density matrix updated by those gates and local noise channels | Accepted-subspace mass for that exact circuit and noise model |

The reference is a prediction of ideal Grover behaviour, not a classical search
success-rate benchmark. None of the bars means probability of a real attack.
The separate seeded samples mimic finite measurements; their 95% Wilson
intervals cover sampling uncertainty only. They do not establish that the
modeled facts, threats or noise parameters are correct.

## Oracle and coordinate reduction

The circuit marks the conjunction of required facts, the disjunction of
`requiresAny` facts, and the failure (`0`) of each modeled protective barrier.
Known values substitute into the predicate before compilation. An absent
dependency makes the predicate inactive and prevents execution.

Multi-controlled phases are synthesized through a parity phase polynomial into
H, X, RZ and CX instructions. No marked-state amplitude update substitutes for
executing the circuit. The independent truth table comes from the original
BDD, and the ideal result is checked against the classical formula at every
iteration. A discrepancy above `1e-8` stops the comparison.

Unresolved coordinates unused by the simplified predicate are uniform
spectator factors. Factoring them out preserves ideal success mass exactly:
the compiler checks `full_M * reduced_N == full_N * reduced_M` using integers.
The export retains full-mask counts, every fixed coordinate, every factored
coordinate and every probability of the reduced register. Noise applies to
the compiled reduced circuit only; this does not model noisy spectator qubits
or device-wide idle behaviour.

`2^0 = 1`: a fully fixed mask contains one assignment. It does not imply zero
states. A constant predicate needs no quantum circuit; the UI asks the user to
reopen relevant assumptions before running a circuit comparison.

By default, the comparator chooses the first ideal peak within the selected
iteration budget using the classical count. This is an informed simulation
comparison, not a count-free quantum search algorithm. The optional formula
explorer instead finds the best value anywhere in the finite budget. Users
can set 0–40 iterations explicitly. All three executions use the same count;
the noisy circuit is not independently optimized or error-mitigated.

## Noise model

After every one-qubit H, X or RZ gate and every two-qubit CX gate, apply:

`E_A(rho) = (1 − lambda) rho + lambda (I_A / d_A) tensor Tr_A(rho)`.

Default depolarizing strengths are `lambda_1 = 0.001` and
`lambda_2 = 0.01`. Each measured bit then flips independently with probability
`0.01`. Parameters range from 0 to 1. Depolarizing strength is not the same
quantity as average gate infidelity. RZ is noisy in this chosen model even
though a device may implement it virtually. No device calibration is implied.

The model excludes relaxation (T1/T2), leakage, crosstalk, drift, idle noise,
hardware connectivity, transpilation and error mitigation. The circuit has
all-to-all logical connectivity and no auxiliary qubits. Gate counts and depth
are for this explicit synthesis, not an optimized hardware compilation.

Default simulated measurements: 4,096 shots, seed 173. The ideal sampler uses
that seed and the noisy sampler uses seed + 1. Qiskit/Aer has an independent
RNG; its sample counts need not match the browser's seeded counts.

## Explicit resource limits

| Quantity | Current limit |
| --- | --- |
| Logical dimensions in the symbolic workbench | 128 binary coordinates |
| Interacting qubits in the ideal circuit | 8 |
| Interacting qubits in the noisy circuit | 6 |
| Compiled gates | 150,000 |
| Density work budget | `gate_count × 4^qubits <= 35,000,000` |
| Grover iterations | 0–40 |
| Simulated shots | 128–16,384 |

If the noisy circuit exceeds its budget, the ideal result can still be shown
with **Noisy: Not run** and the precise reason. The UI never presents an ideal
formula as a noisy result. If the ideal budget is exceeded, the comparison
stops and asks for an explicitly smaller scope or iteration count.

This release does not represent 512 unknown coordinates on a quantum device.
It also does not support arbitrary multi-valued coordinates: a single
5-billion-value coordinate needs 33 qubits in an ordinary binary encoding,
plus constraints that reject unused encodings. That already exceeds this
browser's circuit limit. Large symbolic descriptions and feasible physical
quantum execution are distinct resource questions. Substrate independence
requires a correct compiler and validated executor for each target; this
release validates a specific binary predicate family on CPU simulators.

## Reproduce the independent checks

The repository contains five independent Qiskit/Aer fixtures: AND; OR with a
negative control barrier; fixed facts plus uniform spectators; a six-qubit
noisy circuit; and an eight-qubit ideal circuit with an explicit noisy limit.
Every outcome is compared, not just total success mass.

Verified distributions agree within `1e-8`; observed maximum ideal error is
below `6e-14` and maximum noisy error below `4e-15` for these fixtures. Golden
probabilities are stored in `tests/fixtures/quantum-aer.json`. The browser does
not load Qiskit or call Aer; these are independent implementation checks.

From the repository root:

```sh
python -m venv .venv-quantum
.venv-quantum/bin/python -m pip install qiskit==2.1.2 qiskit-aer==0.17.1
node qcds-security-lab/scripts/quantum-fixtures.mjs output/quantum-cases.json
.venv-quantum/bin/python qcds-security-lab/scripts/verify-quantum.py \
  output/quantum-cases.json --output output/quantum-verification.json
node --test qcds-security-lab/tests/*.test.mjs
```

To check your own exported comparison (or complete dimensional-run JSON):

```sh
.venv-quantum/bin/python qcds-security-lab/scripts/verify-quantum.py \
  qcds-execution-comparison.json --output verification.json
```

**Save circuit QASM** exports the ideal gate sequence as OpenQASM 2.0.
Noise parameters remain in the accompanying comparison JSON. The JSON also
contains all reduced-register outcomes, shot counts, iteration traces,
metrics and scope binding. No IBM account or credential is required for these
local verification commands.

Primary specifications:

- [IBM Quantum: Grover analysis](https://quantum.cloud.ibm.com/learning/en/courses/fundamentals-of-quantum-algorithms/grover-algorithm/analysis)
- [Qiskit Aer: depolarizing channel](https://qiskit.github.io/qiskit-aer/stubs/qiskit_aer.noise.depolarizing_error.html)
- [Qiskit Aer: density-matrix simulator](https://qiskit.github.io/qiskit-aer/stubs/qiskit_aer.AerSimulator.html)
