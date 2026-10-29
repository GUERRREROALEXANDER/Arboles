import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMoveSpecimen } from "../../api/queries";
import type { LocationNode, SpecimenSummary } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { Field } from "../../components/ui/Field";
import { Select } from "../../components/ui/Select";
import { moveSpecimenSchema, type MoveSpecimenForm } from "../../lib/schemas";

interface MoveSpecimenDialogProps {
  specimen: SpecimenSummary | null;
  sites: LocationNode[];
  onClose: () => void;
}

export function MoveSpecimenDialog({ specimen, sites, onClose }: MoveSpecimenDialogProps) {
  return (
    <Dialog
      open={specimen !== null}
      onClose={onClose}
      title="Move specimen"
      description={specimen ? `${specimen.tag} · ${specimen.common_name}, now at ${specimen.site_name}` : undefined}
    >
      {specimen ? <MoveForm key={specimen.id} specimen={specimen} sites={sites} onDone={onClose} /> : null}
    </Dialog>
  );
}

function MoveForm({ specimen, sites, onDone }: { specimen: SpecimenSummary; sites: LocationNode[]; onDone: () => void }) {
  const mutation = useMoveSpecimen();
  const { register, handleSubmit, formState: { errors } } = useForm<MoveSpecimenForm>({
    resolver: zodResolver(moveSpecimenSchema),
    defaultValues: { site_id: "" },
  });
  const onSubmit = handleSubmit(({ site_id }) =>
    mutation.mutate({ id: specimen.id, siteId: site_id }, { onSuccess: onDone }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Field label="Destination site" htmlFor="move-site" error={errors.site_id?.message}>
        <Select id="move-site" invalid={!!errors.site_id} {...register("site_id")}>
          <option value="">Choose a site</option>
          {sites.filter((s) => s.id !== specimen.site_id).map((site) => (
            <option key={site.id} value={site.id}>{site.name}</option>
          ))}
        </Select>
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" variant="primary" loading={mutation.isPending}>Move</Button>
      </div>
    </form>
  );
}
