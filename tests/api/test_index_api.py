from __future__ import annotations

from typing import Any

import pytest
from flask.testing import FlaskClient


def walk(node: dict[str, Any] | None) -> list[dict[str, Any]]:
    if node is None:
        return []
    return [*walk(node["left"]), node, *walk(node["right"])]


def test_dbh_range_is_inclusive_and_ascending(client: FlaskClient) -> None:
    body = client.get("/api/index/dbh?min=25&max=38").get_json()

    assert (body["min"], body["max"]) == (25.0, 38.0)
    assert [s["id"] for s in body["items"]] == ["SP-0002", "SP-0001", "SP-0005"]
    assert 1 <= body["visited"] <= 5


def test_dbh_range_defaults_to_full_span(client: FlaskClient) -> None:
    body = client.get("/api/index/dbh").get_json()

    assert len(body["items"]) == 5
    assert body["max"] == 45.0


@pytest.mark.parametrize("query", ["min=abc", "min=50&max=10", "min=-5"])
def test_dbh_range_rejects_bad_bounds(client: FlaskClient, query: str) -> None:
    assert client.get(f"/api/index/dbh?{query}").status_code == 422


def test_dbh_tree_shape(client: FlaskClient) -> None:
    body = client.get("/api/index/dbh/tree").get_json()

    nodes = walk(body["root"])
    assert body["size"] == 5
    assert body["height"] == body["root"]["height"]
    assert isinstance(body["rotations"], int)
    assert set(body["root"]) == {"key", "specimen_id", "tag", "height", "balance", "left", "right"}
    assert [node["key"] for node in nodes] == [15.0, 25.0, 38.0, 38.0, 45.0]
    assert [node["specimen_id"] for node in nodes if node["key"] == 38.0] == ["SP-0001", "SP-0005"]
    assert all(-1 <= node["balance"] <= 1 for node in nodes)


def test_dbh_tree_shrinks_after_delete(client: FlaskClient) -> None:
    client.delete("/api/specimens/SP-0003")

    assert client.get("/api/index/dbh/tree").get_json()["size"] == 4
