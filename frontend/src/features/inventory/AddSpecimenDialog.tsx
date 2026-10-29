import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateSpecimen, useTaxonomyTree } from "../../api/queries";
import type { LocationNode } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { Field } from "../../components/ui/Field";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { todayIso } from "../../lib/format";
import { HEALTH, HEALTH_ORDER } from "../../lib/health";
import { createSpecimenSchema, type CreateSpecimenForm } from "../../lib/schemas";
import { flattenTaxa, taxonLabel } from "../../lib/trees";

interface AddSpecimenDialogProps {
  open: boolean;
  onClose: () => void;
  sites: LocationNode[];
  defaultSiteId: string;
  center: [number, number];
}

export function AddSpecimenDialog({ open, onClose, ...rest }: AddSpecimenDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Add specimen" description="Registers a new tree in the census and the DBH index.">
      {open ? <AddSpecimenForm onDone={onClose} {...rest} /> : null}
    </Dialog>
  );
}

type FormProps = Omit<AddSpecimenDialogProps, "open" | "onClose"> & { onDone: () => void };

function AddSpecimenForm({ sites, defaultSiteId, center, onDone }: FormProps) {
  const mutation = useCreateSpecimen();
  const taxonomy = useTaxonomyTree();
  const species = flattenTaxa(taxonomy.data).filter((t) => t.rank === "species");
  const { register, handleSubmit, formState: { errors } } = useForm<CreateSpecimenForm>({
    resolver: zodResolver(createSpecimenSchema),
    defaultValues: {
      site_id: defaultSiteId,
      species_id: "",
      tag: "",
      planted_on: todayIso(),
      health: "good",
      height_m: 2,
      dbh_cm: 5,
      crown_m: 1.5,
      lean_deg: 0,
      lat: Number(center[0].toFixed(6)),
      lng: Number(center[1].toFixed(6)),
    },
  });

  const onSubmit = handleSubmit((values) => mutation.mutate(values, { onSuccess: onDone }));
  const num = { valueAsNumber: true } as const;

  return (
    <form onSubmit={onSubmit} noValidate className="grid grid-cols-2 gap-3">
      <Field label="Site" htmlFor="add-site" error={errors.site_id?.message}>
        <Select id="add-site" invalid={!!errors.site_id} {...register("site_id")}>
          <option value="">Choose a site</option>
          {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </Field>
      <Field label="Species" htmlFor="add-species" error={errors.species_id?.message}>
        <Select id="add-species" invalid={!!errors.species_id} {...register("species_id")}>
          <option value="">{taxonomy.isPending ? "Loading species..." : "Choose a species"}</option>
          {species.map((s) => <option key={s.id} value={s.id}>{taxonLabel(s)}</option>)}
        </Select>
      </Field>
      <Field label="Tag" htmlFor="add-tag" error={errors.tag?.message}>
        <Input id="add-tag" placeholder="BOG-CH-0999" invalid={!!errors.tag} {...register("tag")} />
      </Field>
      <Field label="Planted on" htmlFor="add-planted" error={errors.planted_on?.message}>
        <Input id="add-planted" type="date" invalid={!!errors.planted_on} {...register("planted_on")} />
      </Field>
      <Field label="Health" htmlFor="add-health" error={errors.health?.message}>
        <Select id="add-health" {...register("health")}>
          {HEALTH_ORDER.map((h) => <option key={h} value={h}>{HEALTH[h].label}</option>)}
        </Select>
      </Field>
      <Field label="Lean (deg)" htmlFor="add-lean" error={errors.lean_deg?.message}>
        <Input id="add-lean" type="number" step="0.5" invalid={!!errors.lean_deg} {...register("lean_deg", num)} />
      </Field>
      <Field label="Height (m)" htmlFor="add-height" error={errors.height_m?.message}>
        <Input id="add-height" type="number" step="0.1" invalid={!!errors.height_m} {...register("height_m", num)} />
      </Field>
      <Field label="DBH (cm)" htmlFor="add-dbh" error={errors.dbh_cm?.message}>
        <Input id="add-dbh" type="number" step="0.1" invalid={!!errors.dbh_cm} {...register("dbh_cm", num)} />
      </Field>
      <Field label="Crown (m)" htmlFor="add-crown" error={errors.crown_m?.message}>
        <Input id="add-crown" type="number" step="0.1" invalid={!!errors.crown_m} {...register("crown_m", num)} />
      </Field>
      <div />
      <Field label="Latitude" htmlFor="add-lat" error={errors.lat?.message}>
        <Input id="add-lat" type="number" step="0.000001" invalid={!!errors.lat} {...register("lat", num)} />
      </Field>
      <Field label="Longitude" htmlFor="add-lng" error={errors.lng?.message}>
        <Input id="add-lng" type="number" step="0.000001" invalid={!!errors.lng} {...register("lng", num)} />
      </Field>
      <div className="col-span-2 flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" variant="primary" loading={mutation.isPending}>Add specimen</Button>
      </div>
    </form>
  );
}
