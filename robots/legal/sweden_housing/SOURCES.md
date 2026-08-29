# Sources — Swedish Housing Law Logical Robot

Legal snapshot: **2026-08-29**

The robot keeps source provenance explicit. A source being represented does not by itself make every interpretation of that source automatic truth.

## Statutes

### Jordabalk (1970:994), 12 kap. Hyra

Authority: Sveriges riksdag / Svensk författningssamling  
Current source used by the represented universe:

https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/jordabalk-1970994_sfs-1970-994/

Current represented areas include Chapter 12 scope, second-hand letting, permission, outsiders/lodgers, forfeiture, rectification/recovery, extension/security of tenure and residential rent review.

### Privatuthyrningslag (2026:772)

Authority: Sveriges riksdag / Svensk författningssamling  
Effective from: **2026-07-01**

https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/privatuthyrningslag-2026772_sfs-2026-772/

### Lag (2012:978) om uthyrning av egen bostad

Status at snapshot: repealed from 1 July 2026 but preserved for qualifying agreements through the transition provisions of the new legislation.

https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-2012978-om-uthyrning-av-egen-bostad_sfs-2012-978/

## Preparatory work

### Prop. 2025/26:187 — En mer flexibel hyresmarknad

Official source: Regeringskansliet

https://www.regeringen.se/rattsliga-dokument/proposition/2026/03/prop2.-202526187

Role in this robot: **interpretive background** to the 2026 reform and related tenancy-law changes. It is not installed as a statutory Logical Transform.

## Högsta domstolen

The following represented decisions are stored as interpretive precedent candidates with authority metadata, statutory links, similarity factors and counter-factors.

### NJA 2020 s. 681 — Lokalerna i Gulddragaren

https://www.domstol.se/hogsta-domstolen/avgoranden2/2020/34423/

Represented themes: classification, residential/commercial purpose, Chapter 12 scope.

### NJA 2022 s. 188 — Lägenheten i Fältskären

https://www.domstol.se/hogsta-domstolen/avgoranden2/2021/102529/

Represented themes: defect, hindrance/detriment, legal usability, habitability.

### NJA 2022 s. 329 — Brandskadan i asyllägenheten

https://www.domstol.se/hogsta-domstolen/avgoranden2/2021/103480/

Represented themes: use by others, independent use, tenant responsibility, damage.

### NJA 2019 s. 445 — Entré Malmö

https://www.domstol.se/hogsta-domstolen/avgoranden2/2019/20814/

Represented themes: hindrance/detriment, rent reduction, serious defect consequences.

### NJA 2011 s. 454

https://rattspraxis.etjanst.domstol.se/sok/publicering/77a9d4b1-7f12-4478-a291-7b8f08e8b031

Represented themes: tenant responsibility, negligence, significance of contractual/house-rule language.

### NJA 2024 s. 657 — Kylbaffeln

https://www.domstol.se/hogsta-domstolen/avgoranden2/2024/145340/

Represented themes: defect, hindrance/detriment, notice/reclamation structure and the relationship between tenancy-specific and general contract-law principles.

### NJA 2025 s. 515 — Bergrumsgaraget

https://rattspraxis.etjanst.domstol.se/sok/publicering/0a05be5a-3e01-4467-9da4-5c0c25f8b96c?domstolskod=HDO

Represented themes: Chapter 12 classification, what counts as a house/building, design/function and the material meaning of the agreement.

## Svea hovrätt — identified housing-law decisions

These decisions are represented with lower authority classes than HD precedent. They can still be factually close to a case and therefore become active interpretive candidates.

### ÖH 10840-20 — Inneboende under frihetsberövande

https://www.domstol.se/svea-hovratt/svea-hovratts-hyresrattsliga-avgoranden/2021/100229/

Represented theme: actual use can turn an arrangement described as lodging into independent second-hand use.

### ÖH 9160-21 / RH 2022:24 — Otillåten andrahandsupplåtelse

https://www.domstol.se/svea-hovratt/svea-hovratts-hyresrattsliga-avgoranden/2022/148236/

Represented themes: unauthorized second-hand letting, forfeiture and minor significance.

### ÖH 14177-21 — Brister och bevisbörda

https://www.domstol.se/svea-hovratt/svea-hovratts-hyresrattsliga-avgoranden/2022/116372/

Represented themes: defects, burden of proof, tenant responsibility and evidential presumptions.

### H 14449-22 — Återbetalning av andrahandshyra

https://www.domstol.se/svea-hovratt/svea-hovratts-hyresrattsliga-avgoranden/2024/141368/

Represented themes: second-hand rent, repayment, reasonable rent and the actual proportion of an apartment sublet.

### ÖH 4781-18 / RH 2018:41 — Större ombyggnad och förlängning

https://www.domstol.se/svea-hovratt/svea-hovratts-hyresrattsliga-avgoranden/2018/59764/

Represented themes: section 46, major renovation, reasonableness and replacement-housing circumstances.

### ÖH 4455-20 — Vilken privatupplåtelse var den första?

https://www.domstol.se/svea-hovratt/svea-hovratts-hyresrattsliga-avgoranden/2020/85331/

Represented themes: legacy private-letting law, first letting and the legal significance of contract formation versus physical move-in.

## Source classes are not flattened

The current robot keeps these concepts separate:

```text
statute
  ≠ preparatory work
  ≠ HD precedent
  ≠ guiding appellate decision
  ≠ ordinary case fact
```

And inside the praxis layer:

```text
authority weight
      ≠ factual similarity
      ≠ QCDS relevance
      ≠ automatic legal outcome
```

This separation is intentional. The goal is to let the source hierarchy and the case-specific logical fit both remain inspectable.

## Updating the snapshot

Any case with an `as_of_date` later than the current legal snapshot should be treated as requiring source revalidation. The robot already emits a stale-snapshot discriminator rather than silently assuming that the 2026-08-29 corpus remains current forever.
