from engine import Oracle, Syntract

DIMENSIONS = [
    "mutation_load",
    "dna_repair_state",
    "growth_signal",
    "apoptosis_escape",
    "immune_evasion",
    "drug_target_engagement",
    "resistance_state",
    "cell_process_state",
]

# These are research/demo hypotheses carried forward from the historical QCDS cancer case.
# They are not clinical rules and do not encode a known target state.
ORACLES = [
    Oracle("dna_repair",     "11??0???", 1.20, "legacy cancer hypothesis"),
    Oracle("pi3k_axis",      "??1?1???", 1.00, "legacy cancer hypothesis"),
    Oracle("receptor_axis",  "???111??", 1.10, "legacy cancer hypothesis"),
    Oracle("hr_plus_broad",  "1??1????", 0.90, "legacy cancer hypothesis"),
    Oracle("pi3k_hr_combo",  "??11????", 1.05, "legacy cancer hypothesis"),
]

def open_cancer_syntract() -> Syntract:
    # Unknowns are genuine unresolved logical dimensions, not a third truth value.
    return Syntract(DIMENSIONS, "????????", list(ORACLES), name="cancer_open_syntract")

def complete_logic_syntract() -> Syntract:
    # QCDS must also accept already-bound logic. No '?' is required.
    return Syntract(DIMENSIONS, "01101001", list(ORACLES), name="cancer_complete_logic")
