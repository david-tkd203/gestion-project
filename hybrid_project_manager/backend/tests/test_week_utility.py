import datetime
from apps.core.models import (
    parse_week_spec,
    parse_duration_range,
    parse_acceptance_criteria,
)


def test_parse_week_spec_valid():
    date_val = parse_week_spec("Junio S2", base_year=2026)
    assert date_val is not None
    assert isinstance(date_val, datetime.date)
    # The returned date should always be a Monday (weekday 0)
    assert date_val.weekday() == 0
    assert date_val.year == 2026
    assert date_val.month == 6
    assert date_val.day == 8


def test_parse_week_spec_various_months():
    for month_str in ["mayo S1", "agosto S3", "diciembre S4", "OCTUBRE S2"]:
        res = parse_week_spec(month_str, base_year=2026)
        assert res is not None
        assert res.weekday() == 0


def test_parse_week_spec_invalid():
    assert parse_week_spec("Invalido S1") is None
    assert parse_week_spec("Junio S5") is None  # week > 4
    assert parse_week_spec("Junio S0") is None  # week < 1
    assert parse_week_spec("Not a week") is None
    assert parse_week_spec("") is None


def test_parse_duration_range_valid():
    start, end = parse_duration_range("Junio S2 - Julio S1", base_year=2026)
    assert start is not None
    assert end is not None
    assert start.weekday() == 0  # Monday
    assert end.weekday() == 6    # Sunday (+6 days)
    assert end > start


def test_parse_duration_range_invalid():
    start, end = parse_duration_range("Junio S2", base_year=2026)
    assert start is None
    assert end is None

    start_inv, end_inv = parse_duration_range("Invalido - TambienInvalido", base_year=2026)
    assert start_inv is None
    assert end_inv is None


def test_parse_acceptance_criteria():
    raw_text = """
    ☐ Diseñar modelo de datos
    ✅ Configurar entorno de pruebas
    ❌ Descartar dependencias obsoletas
    ★ Añadir fixtures reutilizables
    
    """
    items = parse_acceptance_criteria(raw_text)
    assert len(items) == 4
    assert items[0] == {"text": "Diseñar modelo de datos", "done": False}
    assert items[1] == {"text": "Configurar entorno de pruebas", "done": False}
    assert items[2] == {"text": "Descartar dependencias obsoletas", "done": False}
    assert items[3] == {"text": "Añadir fixtures reutilizables", "done": False}


def test_parse_acceptance_criteria_empty():
    assert parse_acceptance_criteria("") == []
    assert parse_acceptance_criteria("   \n\n  ") == []
