import { useState } from "react";
import { useSpecimens } from "../../api/queries";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { useDebouncedValue } from "../../lib/hooks";

interface SpecimenPickerProps {
  id: string;
  value: string;
  onChange: (specimenId: string) => void;
  invalid?: boolean;
}

/** Search box over GET /specimens?q= feeding a native select of matches. */
export function SpecimenPicker({ id, value, onChange, invalid = false }: SpecimenPickerProps) {
  const [text, setText] = useState("");
  const q = useDebouncedValue(text.trim(), 220);
  const { data, isFetching } = useSpecimens({ q: q || undefined, limit: 25 });
  const items = data?.items ?? [];

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Input
        type="search"
        aria-label="Filter specimens"
        placeholder="Filter by tag or name"
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="sm:w-48"
      />
      <Select
        id={id}
        value={value}
        invalid={invalid}
        onChange={(event) => onChange(event.target.value)}
        className="flex-1"
      >
        <option value="">{isFetching ? "Searching..." : `Choose one of ${items.length} matches`}</option>
        {items.map((specimen) => (
          <option key={specimen.id} value={specimen.id}>
            {specimen.tag} · {specimen.common_name} · risk {specimen.risk}
          </option>
        ))}
      </Select>
    </div>
  );
}
