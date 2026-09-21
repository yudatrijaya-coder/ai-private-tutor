#!/usr/bin/env python3.12
"""Regression checks for supported official textbook mappings."""
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "scripts" / "sibi-content-agent-v2.py"
spec = importlib.util.spec_from_file_location("sibi_content_agent_v2", SCRIPT)
module = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(module)


def test_sma2_pai_uses_the_official_moodle_textbook() -> None:
    subject = "Pendidikan Agama Islam"
    expected = "moodle-files/4584_Kls_XI_Pendidikan_Agama_Islam_dan_Budi_Pekerti.pdf"
    assert module.PDF_MAP["SMA_2"][subject] == expected
    assert (ROOT / expected).is_file()


if __name__ == "__main__":
    test_sma2_pai_uses_the_official_moodle_textbook()
    print("PASS: SMA_2 PAI official textbook mapping")
