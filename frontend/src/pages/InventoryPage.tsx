import { useState } from "react";
import { Plus } from "lucide-react";
import { useLocation, useLocationTree } from "../api/queries";
import type { HealthStatus, SpecimenSummary } from "../api/types";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { CardHeader } from "../components/ui/CardHeader";
import { ErrorState } from "../components/ui/ErrorState";
import { GlassCard } from "../components/ui/GlassCard";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Skeleton, SkeletonRows } from "../components/ui/Skeleton";
import { AddSpecimenDialog } from "../features/inventory/AddSpecimenDialog";
import { LocationTreeExplorer } from "../features/inventory/LocationTreeExplorer";
import { MoveSpecimenDialog } from "../features/inventory/MoveSpecimenDialog";
import { SpecimenMap } from "../features/inventory/SpecimenMap";
import { SpecimenTable } from "../features/inventory/SpecimenTable";
import { formatOne, formatTwo } from "../lib/format";
import { HEALTH, HEALTH_ORDER } from "../lib/health";
import { collectSites } from "../lib/trees";
import { useUi } from "../store/ui";

const BOGOTA: [number, number] = [4.65, -74.08];

export default function InventoryPage() {
  const tree = useLocationTree();
  const storedId = useUi((s) => s.selectedLocationId);
  const selectLocation = useUi((s) => s.selectLocation);
  const selectedId = storedId ?? tree.data?.id ?? null;
  const location = useLocation(selectedId);

  const [search, setSearch] = useState("");
  const [health, setHealth] = useState<HealthStatus | "">("");
  const [species, setSpecies] = useState("");
  const [adding, setAdding] = useState(false);
  const [moving, setMoving] = useState<SpecimenSummary | null>(null);

  const sites = collectSites(tree.data);
  const all = location.data?.specimens ?? [];
  const speciesOptions = [...new Map(all.map((s) => [s.species_id, s.common_name])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const term = search.trim().toLowerCase();
  const filtered = all.filter(
    (s) =>
      (!health || s.health === health) &&
      (!species || s.species_id === species) &&
      (!term || s.tag.toLowerCase().includes(term) || s.common_name.toLowerCase().includes(term) || s.scientific_name.toLowerCase().includes(term)),
  );
  const node = location.data?.node;
  const first = filtered[0];
  const center: [number, number] = first ? [first.lat, first.lng] : BOGOTA;
  const defaultSiteId = node?.kind === "site" ? node.id : "";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Inventory"
        title="Location explorer"
        description="Walk the City > Locality > Site tree. Each ring shows the mean health aggregated post-order over its subtree."
        actions={
          <Button variant="primary" icon={<Plus className="size-4" aria-hidden />} onClick={() => setAdding(true)} disabled={!tree.data}>
            Add specimen
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(300px,380px)_1fr]">
        <GlassCard>
          <CardHeader title="Locations" caption="Click a node to load its specimens. Use +/- to fold." />
          {tree.isPending ? (
            <SkeletonRows rows={8} />
          ) : tree.isError ? (
            <ErrorState error={tree.error} onRetry={() => void tree.refetch()} />
          ) : (
            <LocationTreeExplorer root={tree.data} selectedId={selectedId ?? tree.data.id} onSelect={selectLocation} />
          )}
        </GlassCard>

        <div className="flex min-w-0 flex-col gap-6">
          <GlassCard>
            <CardHeader
              title={node?.name ?? "Specimens"}
              caption={
                location.data
                  ? `${location.data.path.map((p) => p.name).join(" / ")} · ${node?.stats.specimens ?? 0} trees · mean health ${formatOne(node?.stats.mean_health ?? 0)} · ${formatTwo(node?.stats.co2_tonnes ?? 0)} t CO2`
                  : "Select a location"
              }
            />
            {location.isError ? (
              <ErrorState error={location.error} onRetry={() => void location.refetch()} />
            ) : location.isPending ? (
              <Skeleton className="h-[360px]" />
            ) : (
              <SpecimenMap specimens={filtered} />
            )}
          </GlassCard>

          <GlassCard>
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input type="search" aria-label="Search specimens" placeholder="Search tag or name" value={search} onChange={(e) => setSearch(e.target.value)} />
              <Select aria-label="Filter by health" value={health} onChange={(e) => setHealth(e.target.value as HealthStatus | "")}>
                <option value="">All health states</option>
                {HEALTH_ORDER.map((h) => <option key={h} value={h}>{HEALTH[h].label}</option>)}
              </Select>
              <Select aria-label="Filter by species" value={species} onChange={(e) => setSpecies(e.target.value)}>
                <option value="">All species</option>
                {speciesOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </Select>
            </div>
            {location.isPending ? <SkeletonRows rows={6} /> : location.isError ? null : (
              <SpecimenTable key={`${selectedId}-${health}-${species}-${term}`} specimens={filtered} onMove={setMoving} />
            )}
          </GlassCard>
        </div>
      </div>

      <AddSpecimenDialog open={adding} onClose={() => setAdding(false)} sites={sites} defaultSiteId={defaultSiteId} center={center} />
      <MoveSpecimenDialog specimen={moving} sites={sites} onClose={() => setMoving(null)} />
    </div>
  );
}
