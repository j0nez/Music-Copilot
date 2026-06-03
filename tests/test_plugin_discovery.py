from plugins import discover_plugins, list_plugins, get_plugin, get_plugin_schema


def test_discovery_finds_sample_analyzer():
    registry = discover_plugins()
    assert "sample_analyzer" in registry


def test_list_plugins_includes_sample_analyzer():
    plugins = list_plugins()
    names = [p["name"] for p in plugins]
    assert "sample_analyzer" in names


def test_get_plugin_returns_instance():
    plugin = get_plugin("sample_analyzer")
    assert plugin is not None
    assert plugin.name == "sample_analyzer"
    assert plugin.version == "0.1.0"


def test_get_plugin_schema_returns_valid_json_schema():
    schema = get_plugin_schema("sample_analyzer")
    assert schema is not None
    assert schema["title"] == "SampleAnalyzerInput"
    assert "file_path" in schema.get("properties", {})


def test_get_plugin_unknown_returns_none():
    assert get_plugin("nonexistent") is None
    assert get_plugin_schema("nonexistent") is None
