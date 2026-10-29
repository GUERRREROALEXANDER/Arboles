# Canopy

Urban forest inventory and arborist workshop for Bogota, built around four tree
data structures.

Bogota's street and park trees are tracked in a public census: tag, species,
location, size and health. Crews use it to decide what to prune, treat or replace.
Canopy reproduces that workflow on a slice of the city (6 localities, 15 sites,
around 200 specimens) and shows how each question maps to a tree operation.

## Why trees

| Question | Structure | Operation |
| --- | --- | --- |
| How healthy is Chapinero, and how much CO2 does it store? | `GeneralTree` (City > Locality > Site > Specimen) | Post-order aggregation over a subtree |
| A borer attacks the genus *Fraxinus*. Which trees are exposed? | `GeneralTree` (Family > Genus > Species) | Subtree collection |
| How closely related are an Andean oak and a sweetgum? | Taxonomy tree | Lowest common ancestor and edge distance |
| Which trees have a trunk diameter between 40 and 60 cm? | `AVLTree` keyed by DBH | Range query, O(log n + k) |
| Which job should the next crew take? | `BinaryHeap` | Pop max priority, O(log n) |

All four structures are written from scratch in `canopy/structures` and are
generic, so the domain layer only decides what goes inside them.

## Features

- **Dashboard**: health breakdown, CO2 stored per locality, top species, the
  most urgent work orders and the trees at risk.
- **Inventory**: collapsible location tree, a map of the selected subtree and a
  filterable table. Add, move and remove specimens.
- **Taxonomy**: family, genus and species tree, a relatedness finder and an
  outbreak simulator that can open inspection orders for exposed trees.
- **Workshop**: work-order queue rendered both as the heap array and as its
  implicit binary tree, so each dispatch shows the sift.
- **DBH index**: the AVL tree with balance factors and rotation count, plus a
  range query that reports how many nodes it visited.
- **Specimen panel**: growth chart from field measurements, risk, stored CO2,
  and its location and taxonomy paths.

## Domain formulas

- Health score: excellent 100, good 80, fair 60, poor 35, critical 15, dead 0.
- Risk (0-100): `(100 - health) * 0.6 + min(height, 30) / 30 * 25 + min(lean, 15)`.
- Above-ground biomass, Chave et al. (2014): `AGB = 0.0673 * (rho * D^2 * H)^0.976`,
  stored CO2 = `AGB * 0.47 * 3.667`.
- Canopy area: `pi * (crown / 2)^2`.

Localities, parks and species are real. Specimen measurements come from a seeded
generator (`scripts/generate_dataset.py`) and are plausible, not surveyed.

## Stack

| Layer | Tools |
| --- | --- |
| Core | Python 3.13, OOP, PEP 695 generics, dataclasses, `StrEnum` |
| API | Flask 3 (application factory, one blueprint per resource) |
| Tests | pytest |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| UI plugins | framer-motion, TanStack Query, Zustand, Recharts, d3-hierarchy, d3-zoom, React Leaflet, lucide-react, sonner, react-hook-form, zod |

## Project layout

```
canopy/          domain package (no web code)
  structures/    GeneralTree, AVLTree, BinaryHeap
  domain/        Species, Specimen, Measurement, WorkOrder, enums
  services/      inventory, taxonomy, workshop, analytics
  persistence/   JSON repository
api/             Flask adapter
frontend/        React single-page app
data/            bogota.json dataset
scripts/         dataset generator
tests/           pytest suite
docs/            architecture and API contract
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/API.md](docs/API.md).

## Running locally

Requirements: Python 3.13+, Node 20+.

```powershell
# backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python run.py                 # http://localhost:5000

# frontend (second terminal)
cd frontend
npm install
npm run dev                   # http://localhost:5173, proxies /api to :5000
```

To serve everything from Flask, run `npm run build` in `frontend/`; Flask then
serves `frontend/dist` at `http://localhost:5000`.

## Tests

```powershell
python -m pytest -q
cd frontend; npm run build
```

## Author

Guerrero Alexander
