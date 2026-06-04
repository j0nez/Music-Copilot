import random

SUBSTITUTIONS: dict[str, list[str]] = {
    "V": ["bII", "bVII"],
    "IV": ["ii", "bVI"],
    "i": ["VI", "III"],
    "vi": ["I", "III"],
    "VII": ["V", "III"],
    "III": ["i", "VI"],
}

SECONDARY_DOMINANTS: dict[str, str] = {
    "ii": "V/ii",
    "iii": "V/iii",
    "IV": "V/IV",
    "V": "V/V",
    "vi": "V/vi",
}


def apply_substitution(roman: str, complexity: str = "advanced") -> str:
    if complexity != "advanced":
        return roman

    key = roman.lower().strip("°")
    if key not in SUBSTITUTIONS:
        return roman

    subs = SUBSTITUTIONS[key]
    return random.choice(subs)


def maybe_add_secondary_dominant(progression: list[str], probability: float = 0.3) -> list[str]:
    if random.random() > probability:
        return progression

    result = list(progression)
    idx = random.randint(0, len(result) - 2)
    target = result[idx + 1].lower().strip("°")
    if target in SECONDARY_DOMINANTS:
        result.insert(idx + 1, SECONDARY_DOMINANTS[target])
    return result


def maybe_deceptive_cadence(progression: list[str], probability: float = 0.3) -> list[str]:
    if random.random() > probability:
        return progression
    result = list(progression)
    if len(result) >= 2 and result[-2].upper() == "V":
        result[-1] = "vi" if "V" in result[-2] else "VI"
    return result
