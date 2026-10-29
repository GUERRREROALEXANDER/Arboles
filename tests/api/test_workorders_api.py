from __future__ import annotations

from flask.testing import FlaskClient

ORDER_FIELDS = {
    "id", "specimen_id", "specimen_tag", "common_name", "site_name", "kind", "status",
    "priority", "notes", "created_at", "completed_at",
}


def ids(items: list[dict]) -> list[str]:
    return [item["id"] for item in items]


def test_list_orders_queue_then_in_progress_then_done(client: FlaskClient) -> None:
    items = client.get("/api/workorders").get_json()["items"]

    assert ids(items) == ["WO-0001", "WO-0003", "WO-0002", "WO-0005", "WO-0004"]
    assert set(items[0]) == ORDER_FIELDS
    assert items[0]["specimen_tag"] == "BOG-CH-0002"
    assert items[0]["site_name"] == "Parque El Virrey"
    assert items[0]["created_at"] == "2026-10-10T09:00:00+00:00"
    assert items[-1]["completed_at"] == "2026-09-03T12:00:00+00:00"


def test_list_filtered_by_status(client: FlaskClient) -> None:
    items = client.get("/api/workorders?status=in_progress").get_json()["items"]

    assert ids(items) == ["WO-0005"]


def test_list_rejects_unknown_status(client: FlaskClient) -> None:
    assert client.get("/api/workorders?status=lost").status_code == 422


def test_heap_snapshot_is_raw_array(client: FlaskClient) -> None:
    body = client.get("/api/workorders/heap").get_json()

    assert body["size"] == 3
    assert body["items"][0] == {
        "index": 0, "id": "WO-0001", "priority": 77, "kind": "removal", "specimen_tag": "BOG-CH-0002",
    }
    assert [item["index"] for item in body["items"]] == [0, 1, 2]


def test_create_order(client: FlaskClient) -> None:
    response = client.post(
        "/api/workorders", json={"specimen_id": "SP-0003", "kind": "cabling", "notes": "Brace leader"}
    )

    body = response.get_json()
    assert response.status_code == 201
    assert (body["id"], body["priority"], body["status"]) == ("WO-0006", 70, "queued")
    assert body["created_at"] == "2026-10-29T15:00:00+00:00"
    assert body["completed_at"] is None


def test_create_order_with_priority(client: FlaskClient) -> None:
    body = client.post("/api/workorders", json={"specimen_id": "SP-0004", "kind": "pruning", "priority": 99}).get_json()

    assert body["priority"] == 99
    assert client.get("/api/workorders/heap").get_json()["items"][0]["id"] == body["id"]


def test_create_order_validation(client: FlaskClient) -> None:
    assert client.post("/api/workorders", json={"specimen_id": "SP-0004", "kind": "felling"}).status_code == 422
    assert client.post("/api/workorders", json={"specimen_id": "SP-0004"}).status_code == 422
    assert client.post(
        "/api/workorders", json={"specimen_id": "SP-0004", "kind": "pruning", "priority": 500}
    ).status_code == 422


def test_create_order_unknown_specimen(client: FlaskClient) -> None:
    assert client.post("/api/workorders", json={"specimen_id": "SP-9", "kind": "pruning"}).status_code == 404


def test_create_duplicate_open_order_conflicts(client: FlaskClient) -> None:
    response = client.post("/api/workorders", json={"specimen_id": "SP-0003", "kind": "pruning"})

    assert response.status_code == 409


def test_dispatch_pops_top_order(client: FlaskClient) -> None:
    body = client.post("/api/workorders/dispatch").get_json()

    assert (body["id"], body["status"]) == ("WO-0001", "in_progress")
    assert client.get("/api/workorders/heap").get_json()["size"] == 2


def test_dispatch_empty_queue_conflicts(client: FlaskClient) -> None:
    for _ in range(3):
        client.post("/api/workorders/dispatch")

    response = client.post("/api/workorders/dispatch")

    assert response.status_code == 409
    assert response.get_json()["error"]["code"] == "conflict"


def test_complete_order(client: FlaskClient) -> None:
    body = client.post("/api/workorders/WO-0005/complete").get_json()

    assert (body["status"], body["completed_at"]) == ("done", "2026-10-29T15:00:00+00:00")


def test_complete_done_order_conflicts(client: FlaskClient) -> None:
    assert client.post("/api/workorders/WO-0004/complete").status_code == 409


def test_complete_unknown_order(client: FlaskClient) -> None:
    assert client.post("/api/workorders/WO-9999/complete").status_code == 404


def test_patch_priority_resifts_heap(client: FlaskClient) -> None:
    body = client.patch("/api/workorders/WO-0002", json={"priority": 90}).get_json()

    assert body["priority"] == 90
    assert client.get("/api/workorders/heap").get_json()["items"][0]["id"] == "WO-0002"


def test_patch_priority_validation(client: FlaskClient) -> None:
    assert client.patch("/api/workorders/WO-0002", json={}).status_code == 422
    assert client.patch("/api/workorders/WO-0002", json={"priority": "urgent"}).status_code == 422


def test_patch_priority_of_started_order_conflicts(client: FlaskClient) -> None:
    assert client.patch("/api/workorders/WO-0005", json={"priority": 50}).status_code == 409


def test_delete_order(client: FlaskClient) -> None:
    response = client.delete("/api/workorders/WO-0003")

    assert response.status_code == 204
    assert "WO-0003" not in ids(client.get("/api/workorders").get_json()["items"])


def test_delete_unknown_order(client: FlaskClient) -> None:
    assert client.delete("/api/workorders/WO-9999").status_code == 404
