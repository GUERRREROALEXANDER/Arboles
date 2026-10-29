from __future__ import annotations

from flask.testing import FlaskClient


def test_taxonomy_tree_root_and_ranks(client: FlaskClient) -> None:
    root = client.get("/api/taxonomy/tree").get_json()

    assert {k: root[k] for k in ("id", "name", "rank", "specimens")} == {
        "id": "root", "name": "Urban forest", "rank": "root", "specimens": 5,
    }
    family = root["children"][0]
    assert (family["rank"], family["common_name"], family["specimens"]) == ("family", None, 2)
    species = family["children"][0]["children"][0]
    assert species == {
        "id": "fraxinus-uhdei",
        "name": "Fraxinus uhdei",
        "rank": "species",
        "common_name": "Tropical ash",
        "specimens": 2,
        "children": [],
    }


def test_relatedness(client: FlaskClient) -> None:
    body = client.get("/api/taxonomy/relatedness?a=jacaranda-mimosifolia&b=tecoma-stans").get_json()

    assert body["a"] == {"id": "jacaranda-mimosifolia", "name": "Jacaranda mimosifolia"}
    assert body["common_ancestor"] == {"id": "bignoniaceae", "name": "Bignoniaceae", "rank": "family"}
    assert body["distance"] == 4
    assert [step["id"] for step in body["path"]] == [
        "jacaranda-mimosifolia", "jacaranda", "bignoniaceae", "tecoma", "tecoma-stans",
    ]


def test_relatedness_requires_both_ids(client: FlaskClient) -> None:
    response = client.get("/api/taxonomy/relatedness?a=tecoma-stans")

    assert response.status_code == 422
    assert response.get_json()["error"]["code"] == "validation"


def test_relatedness_unknown_taxon(client: FlaskClient) -> None:
    assert client.get("/api/taxonomy/relatedness?a=tecoma-stans&b=baobab").status_code == 404


def test_outbreak(client: FlaskClient) -> None:
    body = client.post("/api/taxonomy/outbreak", json={"taxon_id": "fabaceae"}).get_json()

    assert body["taxon"] == {"id": "fabaceae", "name": "Fabaceae", "rank": "family"}
    assert (body["total"], body["at_risk"]) == (2, 1)
    assert body["by_site"][0] == {"site_id": "parque-de-la-93", "site_name": "Parque de la 93", "count": 1}
    assert [s["id"] for s in body["specimens"]] == ["SP-0003", "SP-0004"]


def test_outbreak_requires_taxon_id(client: FlaskClient) -> None:
    assert client.post("/api/taxonomy/outbreak", json={}).status_code == 422


def test_outbreak_rejects_non_json_body(client: FlaskClient) -> None:
    response = client.post("/api/taxonomy/outbreak", data="taxon", content_type="text/plain")

    assert response.status_code == 422


def test_outbreak_unknown_taxon(client: FlaskClient) -> None:
    assert client.post("/api/taxonomy/outbreak", json={"taxon_id": "baobab"}).status_code == 404
