from __future__ import annotations

from flask.testing import FlaskClient

STATS_FIELDS = {"specimens", "species", "mean_health", "at_risk", "co2_tonnes", "canopy_m2", "health_breakdown"}


def test_location_tree_nests_city_localities_sites(client: FlaskClient) -> None:
    root = client.get("/api/locations/tree").get_json()

    assert (root["id"], root["kind"]) == ("bogota", "city")
    assert set(root) == {"id", "name", "kind", "stats", "children"}
    assert set(root["stats"]) == STATS_FIELDS
    assert [child["id"] for child in root["children"]] == ["chapinero", "teusaquillo"]
    site = root["children"][0]["children"][0]
    assert (site["kind"], site["children"]) == ("site", [])
    assert site["stats"]["specimens"] == 2


def test_location_detail_lists_subtree_specimens(client: FlaskClient) -> None:
    body = client.get("/api/locations/chapinero").get_json()

    assert "children" not in body["node"]
    assert body["node"]["stats"]["specimens"] == 3
    assert body["path"] == [{"id": "bogota", "name": "Bogotá"}, {"id": "chapinero", "name": "Chapinero"}]
    assert [s["id"] for s in body["specimens"]] == ["SP-0001", "SP-0002", "SP-0003"]


def test_location_detail_unknown_id(client: FlaskClient) -> None:
    response = client.get("/api/locations/atlantis")

    assert response.status_code == 404
    assert response.get_json() == {"error": {"code": "not_found", "message": "no location with id 'atlantis'"}}
