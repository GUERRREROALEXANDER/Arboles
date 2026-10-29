from __future__ import annotations

from flask import Flask

from api.routes import index, locations, specimens, system, taxonomy, workorders


def register_blueprints(app: Flask) -> None:
    for module in (system, locations, taxonomy, specimens, index, workorders):
        app.register_blueprint(module.blueprint)
