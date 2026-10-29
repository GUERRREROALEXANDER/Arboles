import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Eraser, Network } from "lucide-react";
import { useOutbreak, useRelatedness, useTaxonomyTree } from "../api/queries";
import { PageHeader } from "../components/layout/PageHeader";
import { PageSkeleton } from "../components/layout/PageSkeleton";
import { Button } from "../components/ui/Button";
import { CardHeader } from "../components/ui/CardHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { GlassCard } from "../components/ui/GlassCard";
import { OutbreakPicker, OutbreakResults } from "../features/taxonomy/OutbreakPanel";
import { findDatum, subtreeIds, toTreeDatum } from "../features/taxonomy/rank";
import { RelatednessPanel } from "../features/taxonomy/RelatednessPanel";
import { RankLegend, TaxonomyTree } from "../features/taxonomy/TaxonomyTree";
import { formatInt } from "../lib/format";
import { staggerContainer } from "../lib/motion";
import { flattenTaxa } from "../lib/trees";
import { useUi } from "../store/ui";

export default function TaxonomyPage() {
  const treeQuery = useTaxonomyTree();
  const highlight = useUi((s) => s.highlight);
  const setHighlight = useUi((s) => s.setHighlight);

  const [speciesA, setSpeciesA] = useState<string | null>(null);
  const [speciesB, setSpeciesB] = useState<string | null>(null);
  const [taxonId, setTaxonId] = useState<string | null>(null);

  const relatedness = useRelatedness(speciesA, speciesB);
  const outbreak = useOutbreak(taxonId);

  useEffect(() => () => setHighlight(null), [setHighlight]);

  const datum = useMemo(() => (treeQuery.data ? toTreeDatum(treeQuery.data) : null), [treeQuery.data]);
  const taxa = useMemo(() => flattenTaxa(treeQuery.data), [treeQuery.data]);
  const species = useMemo(
    () =>
      taxa
        .filter((option) => option.rank === "species")
        .sort((x, y) => (x.common_name ?? x.name).localeCompare(y.common_name ?? y.name)),
    [taxa],
  );

  const highlightIds = useMemo<ReadonlySet<string> | null>(() => {
    if (!datum || !highlight) return null;
    if (highlight.kind === "outbreak") {
      const node = findDatum(datum, highlight.taxonId);
      return node ? subtreeIds(node) : null;
    }
    if (!relatedness.data) return null;
    return new Set(relatedness.data.path.map((crumb) => crumb.id));
  }, [datum, highlight, relatedness.data]);

  const changePair = (a: string | null, b: string | null) => {
    setSpeciesA(a);
    setSpeciesB(b);
    setHighlight(a !== null && b !== null && a !== b ? { kind: "relatedness", a, b } : null);
  };

  const changeTaxon = (id: string | null) => {
    setTaxonId(id);
    setHighlight(id === null ? null : { kind: "outbreak", taxonId: id });
  };

  const clear = () => {
    setSpeciesA(null);
    setSpeciesB(null);
    setTaxonId(null);
    setHighlight(null);
  };

  if (treeQuery.isPending) return <PageSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Taxonomy"
        title="Family, genus and species"
        description="How the census is distributed across the tree of life, which species are close relatives, and how far a host-specific pest could spread."
        actions={
          highlight ? (
            <Button variant="ghost" size="sm" icon={<Eraser className="size-3.5" aria-hidden />} onClick={clear}>
              Clear highlight
            </Button>
          ) : null
        }
      />
      {treeQuery.isError ? (
        <GlassCard>
          <ErrorState error={treeQuery.error} onRetry={() => void treeQuery.refetch()} />
        </GlassCard>
      ) : !datum || datum.children.length === 0 ? (
        <GlassCard>
          <EmptyState icon={Network} title="No taxa recorded" description="Add specimens to build the taxonomy tree." />
        </GlassCard>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="flex flex-col gap-6">
          <GlassCard staggered>
            <CardHeader
              title="Taxonomy tree"
              caption={`${formatInt(datum.specimens)} specimens across ${formatInt(species.length)} species. Click a node to simulate an outbreak.`}
              actions={<RankLegend />}
            />
            <TaxonomyTree
              data={datum}
              highlightIds={highlightIds}
              selectedId={highlight?.kind === "outbreak" ? highlight.taxonId : null}
              onSelect={changeTaxon}
            />
          </GlassCard>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="flex flex-col gap-6">
              <RelatednessPanel
                species={species}
                a={speciesA}
                b={speciesB}
                onChange={changePair}
                result={relatedness.data}
                isLoading={relatedness.isPending}
                error={relatedness.error}
                onRetry={() => void relatedness.refetch()}
              />
              <OutbreakPicker taxa={taxa} taxonId={taxonId} onChange={changeTaxon} />
            </div>
            <OutbreakResults
              taxonId={taxonId}
              outbreak={outbreak.data}
              isLoading={outbreak.isPending}
              error={outbreak.error}
              onRetry={() => void outbreak.refetch()}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}
