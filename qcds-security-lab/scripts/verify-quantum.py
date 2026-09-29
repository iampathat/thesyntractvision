"""Verify exported QCDS circuits independently with Qiskit 2.1.2 / Aer 0.17.1.

python verify-quantum.py comparison.json --output verification.json
Accepts a comparison JSON, a full dimension-run JSON or quantum-fixtures.mjs output.
No IBM account, tokens, target access or hardware submission is used.
QCDS by Patrik Sundblom. Contributor: ChatGPT (OpenAI). See LICENSE.md.
"""
import argparse
import json
from pathlib import Path
import numpy as np
import qiskit
import qiskit_aer
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector
from qiskit_aer import AerSimulator
from qiskit_aer.noise import NoiseModel, depolarizing_error, ReadoutError

def verify(result):
    n = result['circuit']['qubits']
    if not n:
        return {'status': 'constant_oracle', 'qubits': 0}
    circuit = QuantumCircuit(n)
    for operation in result['circuit']['gates']:
        name, qubits = operation['name'], operation['qubits']
        if name not in ['h', 'x', 'rz', 'cx']:
            raise ValueError(f'Unsupported gate {name}')
        if name == 'rz':
            circuit.rz(operation['angle'], qubits[0])
        else:
            getattr(circuit, name)(*qubits)
    ideal = Statevector.from_instruction(circuit).probabilities()
    expected = np.array([x['ideal'] for x in result['distribution']])
    ideal_error = float(np.max(np.abs(ideal - expected)))
    if ideal_error > 1e-8:
        raise AssertionError(f'Ideal distribution differs: {ideal_error}')
    answer = {'status': 'verified', 'qubits': n, 'idealMaxError': ideal_error,
              'idealProbabilities': ideal.tolist(), 'noisyProbabilities': None}
    if result['noisy']['status'] != 'completed':
        answer['noisyStatus'] = result['noisy']['reason']
        return answer
    parameters = result['noise']
    noise = NoiseModel()
    if parameters['single']:
        noise.add_all_qubit_quantum_error(depolarizing_error(parameters['single'], 1), ['h', 'x', 'rz'])
    if parameters['two']:
        noise.add_all_qubit_quantum_error(depolarizing_error(parameters['two'], 2), ['cx'])
    simulator = AerSimulator(method='density_matrix', noise_model=noise,
                             max_parallel_threads=1)
    density_circuit = circuit.copy()
    density_circuit.save_density_matrix()
    density = np.asarray(simulator.run(density_circuit, shots=1).result().data(0)['density_matrix'])
    p = parameters['readout']
    # Independent full transition matrix, in place of the browser's bit-pair loop.
    transition = np.array([[1.0]])
    for _ in range(n):
        transition = np.kron(transition, [[1-p, p], [p, 1-p]])
    noisy = transition @ np.real(np.diag(density))
    noisy_error = float(np.max(np.abs(noisy - np.array([x['noisy'] for x in result['distribution']]))))
    if noisy_error > 1e-8:
        raise AssertionError(f'Noisy distribution differs: {noisy_error}')
    # Also execute Aer measurements with its own RNG and readout implementation.
    noise.add_all_qubit_readout_error(ReadoutError([[1-p, p], [p, 1-p]]))
    measured = circuit.copy()
    measured.measure_all()
    sampled = AerSimulator(method='density_matrix', noise_model=noise,
                           max_parallel_threads=1).run(measured, shots=parameters['shots'],
                                                      seed_simulator=parameters['seed']).result().get_counts()
    marked = {x['bits'] for x in result['distribution'] if x['marked']}
    hits = sum(count for bits, count in sampled.items() if bits in marked)
    answer.update(noisyMaxError=noisy_error, noisyProbabilities=noisy.tolist(),
                  aerShots=parameters['shots'], aerHits=hits,
                  aerSampleProbability=hits/parameters['shots'])
    return answer

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    payload = json.loads(args.input.read_text())
    items = payload if isinstance(payload, list) else [{'name': 'exported-case', 'comparison': payload.get('quantumComparison', payload)}]
    output = {'qiskit': qiskit.__version__, 'aer': qiskit_aer.__version__, 'cases': []}
    for item in items:
        checked = verify(item['comparison'])
        output['cases'].append({'name': item['name'], 'spec': item.get('spec'),
                                'options': item.get('options'), **checked})
        print(json.dumps({k:v for k,v in output['cases'][-1].items() if k not in ['idealProbabilities','noisyProbabilities','spec','options']}), flush=True)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2)+'\n')
