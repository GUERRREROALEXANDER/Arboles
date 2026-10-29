from __future__ import annotations

from typing import Any

import pytest
from flask.testing import FlaskClient

SUMMARY_FIELDS = {
    "id", "tag", "species_id", "common_name", "scientific_name", "site_id", "site_name",
    "health", "health_score", "risk", "height_m", "dbh_cm", "crown_m", "lat", "lng",
}
DETAIL_FIELDS = SUMMARY_FIELDS | {
    "planted_on", "lean_deg", "co2_kg", "canopy_m2", "path", "taxonomy", "measurements", "growth",
    "open_work_orders",
}


def new_specimen(**overrides: Any) -> dict[str, Any]:
    payload = {
        "site_id": "parque-de-la-93",
        "species_id": "tecoma-stans",
        "tag": "BOG-CH-0100",
        "planted_on": "2025-05-01",
        "health": "good",
        "height_m": 2.5,
        "dbh_cm": 6,
        "crown_m": 1.5,
        "lean_deg": 1,
        "lat": 4.6767,
        "lng": -74.0485,
    }
    payload.update(overrides)
    return payload


def test_list_returns_summaries_and_total(client: FlaskClient) -> None:
    body = client.get("/api/specimens").get_json()

    assert body["total"] == 5
    assert set(body["items"][0]) == SUMMARY_FIELDS


def test_list_filters(client: FlaskClient) -> None:
    by_site = client.get("/api/specimens?site=parque-el-virrey").get_json()
    by_species = client.get("/api/specimens?species=fraxinus-uhdei&health=fair").get_json()
    by_text = client.get("/api/specimens?q=wattle").get_json()

    assert [s["id"] for s in by_site["items"]] == ["SP-0001", "SP-0002"]
    assert [s["id"] for s in by_species["items"]] == ["SP-0005"]
    assert [s["id"] for s in by_text["items"]] == ["SP-0004"]


def test_list_limit_keeps_total(client: FlaskClient) -> None:
    body = client.get("/api/specimens?limit=1").get_json()

    assert (len(body["items"]), body["total"]) == (1, 5)


@pytest.mark.parametrize("query", ["health=sickly", "limit=abc", "limit=0"])
def test_list_rejects_bad_query(client: FlaskClient, query: str) -> None:
    response = client.get(f"/api/specimens?{query}")

    assert response.status_code == 422
    assert response.get_json()["error"]["code"] == "validation"


def test_list_unknown_site(client: FlaskClient) -> None:
    assert client.get("/api/specimens?site=atlantis").status_code == 404


def test_detail_shape(client: FlaskClient) -> None:
    body = client.get("/api/specimens/SP-0001").get_json()

    assert set(body) == DETAIL_FIELDS
    assert body["risk"] == 24
    assert body["co2_kg"] == 887.2
    assert body["canopy_m2"] == 38.5
    assert [step["id"] for step in body["path"]] == ["bogota", "chapinero", "parque-el-virrey"]
    assert body["taxonomy"] == [
        {"id": "oleaceae", "name": "Oleaceae"},
        {"id": "fraxinus", "name": "Fraxinus"},
        {"id": "fraxinus-uhdei", "name": "Fraxinus uhdei"},
    ]
    assert body["measurements"][0] == {"date": "2020-03-01", "height_m": 10.0, "dbh_cm": 30.0, "crown_m": 6.0}
    assert body["growth"] == {"height_m_per_year": 0.5, "dbh_cm_per_year": 2.0, "crown_m_per_year": 0.25}
    assert body["open_work_orders"] == []


def test_detail_includes_open_work_orders(client: FlaskClient) -> None:
    body = client.get("/api/specimens/SP-0002").get_json()

    assert [order["id"] for order in body["open_work_orders"]] == ["WO-0001"]


def test_detail_unknown(client: FlaskClient) -> None:
    assert client.get("/api/specimens/SP-9999").status_code == 404


def test_create_returns_detail(client: FlaskClient) -> None:
    response = client.post("/api/specimens", json=new_specimen())

    body = response.get_json()
    assert response.status_code == 201
    assert body["id"] == "SP-0006"
    assert body["measurements"] == [{"date": "2026-10-29", "height_m": 2.5, "dbh_cm": 6.0, "crown_m": 1.5}]
    assert client.get("/api/specimens").get_json()["total"] == 6


def test_create_duplicate_tag_conflicts(client: FlaskClient) -> None:
    response = client.post("/api/specimens", json=new_specimen(tag="BOG-CH-0001"))

    assert response.status_code == 409
    assert response.get_json()["error"]["code"] == "conflict"


@pytest.mark.parametrize(
    "overrides",
    [
        {"tag": None},
        {"health": "sickly"},
        {"planted_on": "May 2025"},
        {"height_m": "tall"},
        {"lat": 120},
        {"site_id": "chapinero"},
    ],
)
def test_create_rejects_invalid_fields(client: FlaskClient, overrides: dict[str, Any]) -> None:
    response = client.post("/api/specimens", json=new_specimen(**overrides))

    assert response.status_code == 422


def test_create_unknown_site_or_species(client: FlaskClient) -> None:
    assert client.post("/api/specimens", json=new_specimen(site_id="atlantis")).status_code == 404
    assert client.post("/api/specimens", json=new_specimen(species_id="baobab")).status_code == 404


def test_patch_updates_health_and_lean(client: FlaskClient) -> None:
    body = client.patch("/api/specimens/SP-0001", json={"health": "critical", "lean_deg": 15}).get_json()

    assert (body["health"], body["health_score"], body["lean_deg"], body["risk"]) == ("critical", 15, 15.0, 76)


def test_patch_requires_a_field(client: FlaskClient) -> None:
    assert client.patch("/api/specimens/SP-0001", json={}).status_code == 422


def test_patch_unknown_specimen(client: FlaskClient) -> None:
    assert client.patch("/api/specimens/SP-9999", json={"health": "good"}).status_code == 404


def test_add_measurement_updates_size_and_index(client: FlaskClient) -> None:
    payload = {"date": "2026-09-01", "height_m": 13, "dbh_cm": 44, "crown_m": 8}

    response = client.post("/api/specimens/SP-0001/measurements", json=payload)

    assert response.status_code == 201
    assert response.get_json()["dbh_cm"] == 44.0
    found = client.get("/api/index/dbh?min=44&max=44").get_json()
    assert [s["id"] for s in found["items"]] == ["SP-0001"]


def test_add_measurement_rejects_backdated_survey(client: FlaskClient) -> None:
    payload = {"date": "2023-01-01", "height_m": 13, "dbh_cm": 44, "crown_m": 8}

    assert client.post("/api/specimens/SP-0001/measurements", json=payload).status_code == 422


def test_add_measurement_requires_all_fields(client: FlaskClient) -> None:
    payload = {"date": "2026-09-01", "height_m": 13}

    assert client.post("/api/specimens/SP-0001/measurements", json=payload).status_code == 422


def test_move_changes_site(client: FlaskClient) -> None:
    body = client.post("/api/specimens/SP-0002/move", json={"site_id": "parque-de-los-novios"}).get_json()

    assert (body["site_id"], body["site_name"]) == ("parque-de-los-novios", "Parque de los Novios")
    assert body["path"][1] == {"id": "teusaquillo", "name": "Teusaquillo"}
    tree = client.get("/api/locations/tree").get_json()
    assert tree["children"][1]["stats"]["specimens"] == 3


def test_move_to_unknown_site(client: FlaskClient) -> None:
    assert client.post("/api/specimens/SP-0002/move", json={"site_id": "atlantis"}).status_code == 404


def test_move_requires_site_id(client: FlaskClient) -> None:
    assert client.post("/api/specimens/SP-0002/move", json={}).status_code == 422


def test_delete_removes_specimen_and_its_orders(client: FlaskClient) -> None:
    response = client.delete("/api/specimens/SP-0002")

    assert response.status_code == 204
    assert response.data == b""
    assert client.get("/api/specimens/SP-0002").status_code == 404
    orders = client.get("/api/workorders").get_json()["items"]
    assert "WO-0001" not in [order["id"] for order in orders]


def test_delete_unknown_specimen(client: FlaskClient) -> None:
    assert client.delete("/api/specimens/SP-9999").status_code == 404
