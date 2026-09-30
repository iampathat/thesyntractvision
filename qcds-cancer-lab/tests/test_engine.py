import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from engine import expand_mask, Oracle, Syntract, KernelConfig, QCDSCancerEngine
from case_cancer import DIMENSIONS, ORACLES, open_cancer_syntract, complete_logic_syntract

def test_complete_logic_does_not_require_unknowns():
    s = complete_logic_syntract()
    assert s.unknowns == 0
    assert s.compatible_state_count == 1
    assert expand_mask(s.logic) == ["01101001"]

def test_unknown_expansion():
    assert sorted(expand_mask("10?1?0")) == sorted(["100100", "100110", "101100", "101110"])

def test_128_8_1_shape():
    engine = QCDSCancerEngine(KernelConfig(shots=256, seed=7), parallel_branches=128, recursion_depth=1)
    r = engine.run(open_cancer_syntract())
    assert len(r.rounds) == 1
    assert len(r.rounds[0].families) == 8
    assert r.final_state
    assert len(r.final_state) == 8

def test_recursive_oracle_is_created():
    engine = QCDSCancerEngine(KernelConfig(shots=256, seed=9), parallel_branches=128, recursion_depth=2)
    r = engine.run(open_cancer_syntract())
    assert any(o.provenance == "QCDS:128→8→1 consensus" for o in r.final_oracles)

def test_no_known_target_field_is_required():
    s = Syntract(DIMENSIONS, "????????", [Oracle("x", "1???????")])
    engine = QCDSCancerEngine(KernelConfig(shots=128), parallel_branches=128, recursion_depth=1)
    r = engine.run(s)
    assert r.final_state in expand_mask("????????")

def test_complete_logic_survives_engine():
    engine = QCDSCancerEngine(KernelConfig(shots=256, seed=11), parallel_branches=128, recursion_depth=2)
    r = engine.run(complete_logic_syntract())
    assert r.rounds[0].state_count == 1
