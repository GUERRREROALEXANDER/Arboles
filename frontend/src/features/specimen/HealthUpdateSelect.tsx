import { useUpdateSpecimen } from "../../api/queries";
import type { HealthStatus } from "../../api/types";
import { Select } from "../../components/ui/Select";
import { HEALTH, HEALTH_ORDER } from "../../lib/health";

interface HealthUpdateSelectProps {
  specimenId: string;
  health: HealthStatus;
}

function isHealth(value: string): value is HealthStatus {
  return (HEALTH_ORDER as string[]).includes(value);
}

export function HealthUpdateSelect({ specimenId, health }: HealthUpdateSelectProps) {
  const mutation = useUpdateSpecimen(specimenId);
  const id = `health-${specimenId}`;

  return (
    <div className="flex items-center gap-3">
      <label htmlFor={id} className="shrink-0 text-xs font-semibold text-white/70">
        Survey result
      </label>
      <Select
        id={id}
        value={health}
        disabled={mutation.isPending}
        onChange={(event) => {
          const next = event.target.value;
          if (isHealth(next) && next !== health) mutation.mutate({ health: next });
        }}
        className="w-40"
      >
        {HEALTH_ORDER.map((value) => (
          <option key={value} value={value}>
            {HEALTH[value].label}
          </option>
        ))}
      </Select>
    </div>
  );
}
