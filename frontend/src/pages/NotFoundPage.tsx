import { Link } from "react-router-dom";
import { TreePine } from "lucide-react";
import { EmptyState } from "../components/ui/EmptyState";
import { GlassCard } from "../components/ui/GlassCard";

export default function NotFoundPage() {
  return (
    <GlassCard className="mx-auto mt-16 max-w-lg">
      <EmptyState
        icon={TreePine}
        title="This path leads nowhere"
        description="The page you asked for does not exist in Canopy."
        action={
          <Link
            to="/"
            className="focus-ring rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-forest-950"
          >
            Back to the dashboard
          </Link>
        }
      />
    </GlassCard>
  );
}
