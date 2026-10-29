from __future__ import annotations

from pathlib import Path

from flask.testing import FlaskClient

from api import create_app
from tests.conftest import NOW


def test_health(client: FlaskClient) -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_summary_shape(client: FlaskClient) -> None:
    body = client.get("/api/summary").get_json()

    assert set(body) == {"stats", "sites", "localities", "open_work_orders", "top_species", "co2_by_locality"}
    assert body["sites"] == 3
    assert body["localities"] == 2
    assert body["open_work_orders"] == 4
    assert body["top_species"][0] == {"species_id": "fraxinus-uhdei", "common_name": "Tropical ash", "count": 2}
    assert set(body["co2_by_locality"][0]) == {"id", "name", "co2_tonnes", "mean_health"}


def test_summary_stats_shape(client: FlaskClient) -> None:
    stats = client.get("/api/summary").get_json()["stats"]

    assert stats["specimens"] == 5
    assert stats["species"] == 4
    assert stats["mean_health"] == 55.0
    assert stats["at_risk"] == 2
    assert stats["health_breakdown"] == {
        "excellent": 1, "good": 1, "fair": 1, "poor": 1, "critical": 0, "dead": 1,
    }
    assert isinstance(stats["co2_tonnes"], float)
    assert isinstance(stats["canopy_m2"], float)


def test_reset_discards_changes(client: FlaskClient) -> None:
    client.delete("/api/specimens/SP-0001")

    response = client.post("/api/reset")

    assert response.get_json() == {"status": "ok"}
    assert client.get("/api/specimens/SP-0001").status_code == 200


def test_unknown_api_route_returns_json_not_found(client: FlaskClient) -> None:
    response = client.get("/api/nothing-here")

    assert response.status_code == 404
    assert response.get_json()["error"]["code"] == "not_found"


def test_wrong_method_returns_json_error(client: FlaskClient) -> None:
    response = client.put("/api/health")

    assert response.status_code == 405
    assert response.get_json()["error"]["code"] == "method_not_allowed"


def test_cors_header_only_in_debug_for_dev_origin(data_file: Path, tmp_path: Path) -> None:
    config = {"DATA_PATH": data_file, "CLOCK": lambda: NOW, "FRONTEND_DIST": tmp_path / "none"}
    debug_client = create_app({**config, "DEBUG": True}).test_client()
    plain_client = create_app(config).test_client()
    origin = {"Origin": "http://localhost:5173"}

    allowed = debug_client.get("/api/health", headers=origin)
    preflight = debug_client.options("/api/specimens", headers=origin)
    foreign = debug_client.get("/api/health", headers={"Origin": "http://evil.example"})
    production = plain_client.get("/api/health", headers=origin)

    assert allowed.headers["Access-Control-Allow-Origin"] == "http://localhost:5173"
    assert "PATCH" in preflight.headers["Access-Control-Allow-Methods"]
    assert "Access-Control-Allow-Origin" not in foreign.headers
    assert "Access-Control-Allow-Origin" not in production.headers


def test_frontend_is_served_with_spa_fallback(data_file: Path, tmp_path: Path) -> None:
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<!doctype html><title>Canopy</title>", encoding="utf-8")
    (dist / "assets" / "app.js").write_text("console.log(1)", encoding="utf-8")
    client = create_app({"DATA_PATH": data_file, "FRONTEND_DIST": dist}).test_client()

    assert b"Canopy" in client.get("/").data
    assert client.get("/assets/app.js").data == b"console.log(1)"
    assert b"Canopy" in client.get("/specimens/SP-0001").data
    assert client.get("/api/unknown").get_json()["error"]["code"] == "not_found"


def test_root_is_not_found_without_built_frontend(client: FlaskClient) -> None:
    assert client.get("/").status_code == 404
