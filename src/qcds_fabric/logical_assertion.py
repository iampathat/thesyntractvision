from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Sequence


def normalize_logic_text(value: str) -> str:
    value = value.casefold().replace("_", " ").replace("’", "'")
    value = re.sub(r"[^\w\s'./:-]+", " ", value)
    return " ".join(value.split()).strip()


def logic_tokens(value: str) -> tuple[str, ...]:
    tokens: list[str] = []
    for token in normalize_logic_text(value).split():
        cleaned = token.strip("./:-")
        if cleaned:
            tokens.append(cleaned)
    return tuple(tokens)


def _needle(value: str) -> tuple[str, ...]:
    return logic_tokens(value)


def _occurrences(tokens: Sequence[str], phrase: str, *, allow_possessive: bool = False) -> tuple[tuple[int, int], ...]:
    needle = _needle(phrase)
    if not needle or len(needle) > len(tokens):
        return ()
    width = len(needle)
    found: list[tuple[int, int]] = []
    for index in range(len(tokens) - width + 1):
        window = tuple(tokens[index:index + width])
        if window == needle:
            found.append((index, index + width - 1))
            continue
        if allow_possessive and width == 1 and window[0] in {needle[0] + "'s", needle[0] + "s'"}:
            found.append((index, index))
    return tuple(found)


COPULA = {
    "is", "are", "was", "were", "be", "been", "being", "became", "becomes",
    "remain", "remains", "remained", "constitutes", "constituted", "serves", "served",
}
SUBJECT_LINKS = {"of", "in", "for", "within"}


@dataclass(frozen=True)
class LogicalAssertionSupport:
    pattern: str
    span_words: int
    start: int
    end: int


def _between(tokens: Sequence[str], left_end: int, right_start: int) -> tuple[str, ...]:
    if right_start <= left_end:
        return ()
    return tuple(tokens[left_end + 1:right_start])


def _has_copula(tokens: Sequence[str]) -> bool:
    return any(token in COPULA for token in tokens)


def _has_subject_link(tokens: Sequence[str]) -> bool:
    return any(token in SUBJECT_LINKS for token in tokens)


def find_logical_assertion(
    text: str,
    *,
    subject: str,
    dimension: str,
    candidate: str,
    max_span_words: int = 32,
) -> LogicalAssertionSupport | None:
    """Find generic textual support that binds three represented logical terms.

    This is intentionally not a catalogue of semantic relation types. It only
    checks whether ordinary assertion syntax connects the represented terms.
    Mere local co-occurrence is rejected.
    """
    if max_span_words <= 0:
        raise ValueError("max_span_words must be positive")
    tokens = logic_tokens(text)
    subjects = _occurrences(tokens, subject, allow_possessive=True)
    dimensions = _occurrences(tokens, dimension)
    candidates = _occurrences(tokens, candidate)
    if not subjects or not dimensions or not candidates:
        return None

    best: LogicalAssertionSupport | None = None
    for s_start, s_end in subjects:
        for d_start, d_end in dimensions:
            for c_start, c_end in candidates:
                start = min(s_start, d_start, c_start)
                end = max(s_end, d_end, c_end)
                span = end - start + 1
                if span > max_span_words:
                    continue

                pattern: str | None = None

                # "Paris is the capital of France" / "French is an official language in France"
                if c_end < d_start < s_start:
                    if _has_copula(_between(tokens, c_end, d_start)) and _has_subject_link(_between(tokens, d_end, s_start)):
                        pattern = "candidate_asserts_dimension_subject"

                # "the capital of France has been Paris"
                elif d_end < s_start < c_start:
                    if _has_subject_link(_between(tokens, d_end, s_start)) and _has_copula(_between(tokens, s_end, c_start)):
                        pattern = "dimension_subject_asserts_candidate"

                # "France's capital is Paris" / "France capital is Paris"
                elif s_end < d_start < c_start:
                    subject_bridge = _between(tokens, s_end, d_start)
                    candidate_bridge = _between(tokens, d_end, c_start)
                    possessive = tokens[s_start].endswith("'s") or tokens[s_start].endswith("s'")
                    if (possessive or len(subject_bridge) <= 2) and _has_copula(candidate_bridge):
                        pattern = "subject_dimension_asserts_candidate"

                # "In France, French is the official language"
                elif s_end < c_start < d_start:
                    if _has_copula(_between(tokens, c_end, d_start)):
                        pattern = "subject_candidate_asserts_dimension"

                if pattern is None:
                    continue
                support = LogicalAssertionSupport(pattern, span, start, end)
                if best is None or (support.span_words, support.start) < (best.span_words, best.start):
                    best = support
    return best
