TEMPLATES = {
    ("minor", "dark"): [
        ["i", "VII", "VI", "VII"],
        ["i", "iv", "VII", "i"],
        ["i", "VII", "VI", "V"],
        ["i", "VI", "VII", "i"],
        ["i", "iv", "i", "VII"],
        ["i", "VII", "i", "VII", "i", "VII", "VI", "VII"],
        ["i", "VII", "VI", "VII", "i", "iv", "VII", "i"],
    ],
    ("minor", "melancholic"): [
        ["i", "iv", "VII", "i"],
        ["i", "VI", "VII", "i"],
        ["i", "III", "VII", "VI"],
        ["i", "iv", "i", "v"],
        ["i", "VI", "III", "VII"],
        ["i", "iv", "VII", "i", "i", "VI", "III", "VII"],
    ],
    ("minor", "uplifting"): [
        ["i", "VI", "VII", "i"],
        ["i", "III", "VII", "VI"],
        ["i", "VI", "III", "VII"],
        ["i", "VII", "VI", "VII"],
        ["i", "III", "VII", "VI", "i", "VI", "III", "VII"],
    ],
    ("minor", "emotional"): [
        ["i", "VI", "III", "VII"],
        ["i", "iv", "i", "VII"],
        ["i", "VI", "VII", "i"],
        ["i", "iv", "i", "VI"],
        ["i", "VI", "III", "VII", "i", "iv", "VII", "i"],
    ],
    ("minor", "energetic"): [
        ["i", "VII", "VI", "VII"],
        ["i", "iv", "VII", "i"],
        ["i", "VII", "i", "VII"],
        ["i", "VII", "VI", "VII", "i", "VII", "i", "VII"],
    ],
    ("minor", "dreamy"): [
        ["i", "VI", "III", "VII"],
        ["i", "iv", "VII", "VI"],
        ["i", "III", "VI", "VII"],
        ["i", "VI", "VII", "IV"],
        ["i", "VI", "III", "VII", "i", "iv", "VII", "VI"],
    ],
    ("minor", "aggressive"): [
        ["i", "VII", "VI", "VII"],
        ["i", "VII", "i", "VII"],
        ["i", "VII", "VI", "V"],
        ["i", "iv", "V", "i"],
        ["i", "VII", "VI", "V", "i", "VII", "i", "VII"],
    ],
    ("major", "uplifting"): [
        ["I", "V", "vi", "IV"],
        ["I", "IV", "V", "I"],
        ["I", "vi", "IV", "V"],
        ["I", "V", "vi", "iii", "IV", "I", "IV", "V"],
        ["I", "IV", "I", "V", "vi", "IV", "V", "I"],
    ],
    ("major", "emotional"): [
        ["vi", "IV", "I", "V"],
        ["I", "V", "vi", "IV"],
        ["vi", "I", "IV", "V"],
        ["I", "iii", "IV", "V"],
        ["vi", "IV", "I", "V", "I", "V", "vi", "IV"],
    ],
    ("major", "energetic"): [
        ["I", "IV", "V", "IV"],
        ["I", "V", "IV", "I"],
        ["I", "IV", "V", "vi"],
        ["I", "IV", "V", "IV", "I", "V", "IV", "I"],
    ],
    ("major", "melancholic"): [
        ["I", "iii", "IV", "V"],
        ["vi", "IV", "I", "V"],
        ["I", "V", "vi", "IV"],
        ["I", "vi", "IV", "V"],
        ["I", "iii", "IV", "V", "vi", "IV", "I", "V"],
    ],
    ("major", "dark"): [
        ["i", "VII", "VI", "VII"],
        ["I", "bIII", "bVII", "IV"],
        ["i", "VI", "VII", "i"],
        ["I", "bIII", "IV", "bVII"],
        ["i", "bVII", "bVI", "bVII", "i", "iv", "bVII", "i"],
    ],
    ("major", "dreamy"): [
        ["I", "V", "vi", "iii"],
        ["I", "ii", "iii", "IV"],
        ["vi", "iii", "IV", "I"],
        ["I", "ii", "vi", "IV"],
        ["I", "V", "vi", "iii", "IV", "I", "ii", "V"],
    ],
}


def get_templates(mode: str, mood: str) -> list[list[str]]:
    return TEMPLATES.get((mode, mood), [])


def get_fallback(mode: str = "minor") -> list[str]:
    return ["i", "VI", "VII", "i"] if mode == "minor" else ["I", "V", "vi", "IV"]
