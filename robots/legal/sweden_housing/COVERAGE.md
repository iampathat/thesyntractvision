# Coverage — Swedish Housing Law Logical Robot

Snapshot: **2026-08-29**

This file describes what the current represented legal universe covers and, just as importantly, **how each part is represented**.

Coverage does not mean the robot claims to reproduce every possible interpretation of Swedish housing law. The purpose is to make the represented scope inspectable and falsifiable.

## Representation model

| Kind | Representation | Example |
|---|---|---|
| Scope / temporal gate | hard declared condition | contract before/after 1 July 2026 |
| Explicit statutory requirement | hard declared condition | consent required for independent second-hand use |
| Explicit statutory consequence | hard conclusion when all represented conditions match | late rent can create a forfeiture ground |
| Rescue / cure path | separate hard path | section 44 recovery after late residential rent |
| Open statutory standard | unresolved assessment question until facts discriminate it | minor significance, reasonableness, materiality |
| Case law | interpretive candidate, never installed as statute | HD/Svea decision with similarity and counter-factors |
| Preparatory work | interpretive/source context | Prop. 2025/26:187 |
| Case evidence | case-scoped fact/evidence only | consent, delay, defect, tenant hardship |

## Statutory universe

### Privatuthyrningslag (2026:772)

Current represented themes include:

| Theme | Representation |
|---|---|
| applicability after 1 July 2026 | hard scope gate |
| eligible private actor | hard scope gate |
| exclusions for regular letting of more than two external units | hard exclusion |
| exclusion where landlord holds the unit with tenancy right | hard exclusion |
| holiday-purpose exclusion | hard exclusion, without inventing the fallback regime |
| tenant-adverse contractual terms | hard represented consequence |
| fixed/indefinite duration | hard represented consequence |
| rent review | hard route to the represented comparison framework |
| material defect | hard consequence only when represented materiality/remedy facts are supplied |
| independent second-hand letting | hard consent rule |
| late rent | hard threshold path + cure path |
| unauthorized second-hand letting | hard termination-ground path with represented excuse fact |

### Legacy law — lag (2012:978) om uthyrning av egen bostad

Current represented themes include:

| Theme | Representation |
|---|---|
| preservation for qualifying pre-1 July 2026 agreements | temporal transition gate |
| outside-business condition | hard scope gate |
| exclusion for tenancy sublet | hard scope gate |
| first-let limitation | hard scope gate |
| Chapter 12 residual application | declared relation |
| tenant/landlord notice | hard represented consequences |
| no statutory extension right unless agreed | hard represented consequence |
| rent-review framework | hard represented route |

### Jordabalken, 12 kap.

The current Chapter 12 expansion is intentionally focused on areas where hard rules and judgment interact.

| Section area | Current representation | Logic character |
|---|---|---|
| 1 § | general Chapter 12 scope / classification links | scope + interpretation |
| 9–16 §§ | selected defect/use links through represented rules and praxis | mixed |
| 24 § | selected tenant-responsibility links through praxis | interpretive/evidential |
| 39 § | independent second-hand use requires consent/permission | hard gate |
| 40 § | tribunal permission criteria | multi-condition + assessment |
| 41 § | outsiders/lodgers beyond reasonable extent | open reasonableness standard |
| 42 § | selected forfeiture grounds, including late rent and unauthorized second-hand letting | hard grounds + minor-significance safeguard |
| 43 § | selected rectification/time-limit effects | hard procedural safeguards |
| 44 § | residential late-rent recovery | hard rescue path with required conditions |
| 45 a § | waiver-of-extension-right source representation | statutory context |
| 46 § | default extension right and selected exceptions | hard default + open balancing |
| 49 § | extension-dispute referral | procedural condition |
| 50 § | right to remain while extension dispute is pending | hard represented consequence with exception |
| 53 § | scope of residential rent-review provisions | scope context |
| 54 § | written notice / tribunal rent-change procedure | hard procedure |
| 55 § | reasonable rent / use-value / second-hand ceiling | hard ceiling + evaluative comparison |
| 55 f § | repayment of excess second-hand rent | hard remedy path + amount/time/application discriminators |

## Open assessment zones

The following are examples where the current robot deliberately **does not force an answer** from statute alone:

```text
Section 40
  Are the tenant's reasons considerable?
  Does the landlord have a justified reason to refuse?
  Is the proposed second-hand rent reasonable?

Section 41
  What is the apartment size?
  How many people stay there?
  For how long?
  What are the living conditions?
  Does use create management difficulty or cost?
  Is there disturbance risk?
  → what must the landlord reasonably accept?

Section 42 / 43
  Is the breach of minor significance?
  Was it corrected in time?
  Were termination/time-limit requirements met?

Section 46
  How serious is the breach?
  Is renovation genuinely necessary?
  Can the tenant remain during the works?
  What replacement housing exists?
  How strong is tenant hardship?
  How strong is the landlord's disposal interest?
  → is non-extension reasonable?
```

These questions are a feature of the legal model, not missing UI polish. They mark where additional facts, argument or authority is required.

## Praxis corpus

The current represented praxis layer contains both Högsta domstolen precedent and identified Svea hovrätt housing-law guidance.

### Högsta domstolen

- NJA 2020 s. 681 — **Lokalerna i Gulddragaren** — classification / Chapter 12 scope.
- NJA 2022 s. 188 — **Lägenheten i Fältskären** — defects, hindrance/detriment, legal usability.
- NJA 2022 s. 329 — **Brandskadan i asyllägenheten** — use by others, responsibility and second-hand character.
- NJA 2019 s. 445 — **Entré Malmö** — hindrance/detriment, rent reduction and serious defect consequences.
- NJA 2011 s. 454 — tenant responsibility / negligence / contract terms.
- NJA 2024 s. 657 — **Kylbaffeln** — defects, notice/reclamation structure and tenancy-specific rules.
- NJA 2025 s. 515 — **Bergrumsgaraget** — what counts as a house/tenancy under Chapter 12.

### Svea hovrätt

- ÖH 10840-20 — actual use can turn an alleged lodger arrangement into independent use.
- ÖH 9160-21 / RH 2022:24 — unauthorized second-hand letting and the minor-significance question.
- ÖH 14177-21 — defects and burden-of-proof structure.
- H 14449-22 — second-hand rent repayment / proportion of apartment actually sublet.
- ÖH 4781-18 / RH 2018:41 — major renovation and reasonableness in an extension dispute.
- ÖH 4455-20 — which private letting counts as the first under the legacy Act.

## Full universe vs active QCDS space

The robot does not send every represented decision into every inference run.

```text
FULL PRAXIS CORPUS
13 represented decisions
       │
       │ compare case terms with explicit
       │ similarity + counter-factors
       ▼
CONDITION FORMATION
       │
       ├── unrelated decision → stays represented, inactive
       ├── related decision   → active candidate
       └── counter-analogy    → active candidate with negative evidence
       │
       ▼
ACTIVE QCDS WORKING SPACE
N relevant decisions → 2^N candidate space
       │
       ▼
recursive inference / challenge / stabilization
```

This is the main classical scaling strategy for the current legal robot: **grow the represented universe, keep each active working space bounded by the case**.

## Executable case coverage

| Fixture | Main question | Why it matters for QCDS |
|---|---|---|
| `new_private_let_2026.json` | Which post-reform regime applies? | temporal/scope gate |
| `legacy_private_let_2026.json` | Can repealed law still govern? | temporal logical universe |
| `jordabalk_12_fallback_2026.json` | Why does Chapter 12 take over? | explicit exclusion/fallback |
| `material_defect_praxis_2026.json` | What happens when defects meet competing case law? | hard consequence + interpretive competition |
| `jb_unauthorized_sublet_forfeiture_2026.json` | Does unauthorized subletting create forfeiture, and what remains open? | hard rule + safeguards + praxis |
| `jb_late_rent_recovery_2026.json` | Can a forfeiture ground and recovery both be true? | competing but compatible legal states |
| `jb_extension_renovation_balance_2026.json` | Does major renovation defeat extension? | open balancing + guiding praxis |
| `jb_excess_second_hand_rent_2026.json` | Is second-hand rent above the ceiling and what repayment follows? | hard ceiling + remedy discriminators |
| `jb_outsider_reasonableness_2026.json` | Is outsider use beyond what is reasonable? | intentionally unresolved open standard |
| `jb_second_hand_permission_2026.json` | Are section 40 permission criteria represented? | multi-condition assessment |

## Not represented yet

The robot is growing, but the current snapshot is not the whole Swedish tenancy system. Important future areas include broader coverage of:

- condition/maintenance and rent-reduction remedies;
- disturbance and particularly serious disturbance paths;
- access obligations;
- transfers/exchanges;
- demolition/redevelopment and more section 46 variants;
- collective negotiation interactions;
- commercial tenancy in greater depth;
- procedural law and appeal structure;
- broader Hyresnämnd/Svea corpus;
- richer preparatory works and later case treatment;
- evidence disputes, documents, witness claims and competing party narratives.

Those should be added as distinct represented layers rather than flattened into one rule table.
