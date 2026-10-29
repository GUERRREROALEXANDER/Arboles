# Architecture

## Case study

Bogota keeps a public census of its street and park trees: over 1.2 million
specimens, each with a tag, a species, a location and periodic health surveys.
Arborist crews work from that census. They prune leaning trees before the rainy
season, treat pest outbreaks and replace dead specimens.

Canopy models a slice of that work. Four tree structures carry the logic:

| Structure | Shape | Field question it answers |
| --- | --- | --- |
| `LocationTree` | n-ary: City > Locality > Site > Specimen | How healthy is Chapinero? How much CO2 does Simon Bolivar Park store? (post-order aggregation) |
| `TaxonomyTree` | n-ary: Family > Genus > Species | A borer attacks the genus *Fraxinus*. Which trees are exposed? (subtree query) How related are two species? (lowest common ancestor) |
| `AVLTree` | self-balancing BST keyed by trunk diameter (DBH) | Which trees have a DBH between 40 and 60 cm? (range query in O(log n + k)) |
| `BinaryHeap` | array-backed priority queue | Which job should the next crew take? (pop max priority in O(log n)) |

The bundled dataset (`data/bogota.json`) uses real localities, parks and species
found in the city. Specimen measurements are synthetic but plausible.

## Layout

```
canopy/                       Python package. No Flask imports.
  structures/                 Generic, reusable data structures
    general_tree.py           TreeNode[T], GeneralTree[T]: traversal, path, LCA, subtree
    avl_tree.py               AVLTree[K, V]: insert, delete, find, range, to_dict
    binary_heap.py            BinaryHeap[T]: push, pop, peek, remove, update, snapshot
  domain/                     Entities and value objects
    enums.py                  HealthStatus, LocationKind, TaxonRank, WorkOrderKind, WorkOrderStatus
    species.py                Species (scientific/common name, wood density, max height)
    specimen.py               Specimen, Measurement, growth and carbon calculations
    work_order.py             WorkOrder
  services/                   Use cases built on the structures
    inventory.py              InventoryService (location tree + AVL index)
    taxonomy.py               TaxonomyService (taxonomy tree, relatedness, outbreak)
    workshop.py               WorkshopService (heap-based work queue)
    analytics.py              AnalyticsService (dashboard aggregates)
  persistence/
    json_repository.py        Load/save the full dataset
  errors.py                   CanopyError, NotFoundError, ValidationError, ConflictError
api/                          Flask adapter
  __init__.py                 create_app(config) factory, error handlers, SPA serving
  container.py                Wires repository + services (one in-memory instance)
  routes/                     One blueprint per resource
  serializers.py              Domain -> dict, matches docs/API.md exactly
frontend/                     React + TypeScript + Vite single-page app
data/bogota.json
tests/                        pytest: structures, domain, services, api
run.py                        Dev server: python run.py (port 5000)
```

Dependency rule: `api -> services -> domain, structures`. `structures` depends on
nothing. `domain` depends only on `errors`.

## Domain rules

- Health score: excellent 100, good 80, fair 60, poor 35, critical 15, dead 0.
- Risk score (0-100): `round((100 - health_score) * 0.6 + min(height_m, 30) / 30 * 25 + min(lean_deg, 15))`.
  A specimen is "at risk" when its risk is 50 or more. Dead specimens are always at risk.
- Carbon: above-ground biomass with Chave et al. (2014),
  `AGB_kg = 0.0673 * (rho * dbh_cm**2 * height_m) ** 0.976`, where `rho` is the
  species wood density in g/cm3. Stored CO2 kg = `AGB_kg * 0.47 * 3.667`.
- Canopy area m2 = `pi * (crown_m / 2) ** 2`.
- Growth rate: linear slope between first and last measurement, per year.
- Work order priority (1-100): given explicitly, or defaulted to the specimen
  risk score. Ties break by creation time (older first).

## Frontend

React 19, TypeScript, Vite, Tailwind CSS v4, framer-motion, TanStack Query
(server state), Zustand (UI state), Recharts, d3-hierarchy (tree layouts drawn as
SVG with framer-motion), react-leaflet (specimen map), lucide-react, sonner,
react-hook-form + zod. Glass panels over a dark forest gradient.

Dev: Vite on 5173 proxies `/api` to Flask on 5000. Production: `npm run build`
writes `frontend/dist`, which Flask serves at `/`.
