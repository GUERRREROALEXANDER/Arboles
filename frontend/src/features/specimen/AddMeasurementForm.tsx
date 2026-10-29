import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ruler } from "lucide-react";
import { useAddMeasurement } from "../../api/queries";
import type { SpecimenDetail } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Input } from "../../components/ui/Input";
import { todayIso } from "../../lib/format";
import { measurementSchema, type MeasurementForm } from "../../lib/schemas";

interface AddMeasurementFormProps {
  specimen: SpecimenDetail;
}

export function AddMeasurementForm({ specimen }: AddMeasurementFormProps) {
  const mutation = useAddMeasurement(specimen.id);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MeasurementForm>({
    resolver: zodResolver(measurementSchema),
    defaultValues: {
      date: todayIso(),
      height_m: specimen.height_m,
      dbh_cm: specimen.dbh_cm,
      crown_m: specimen.crown_m,
    },
  });

  const onSubmit = handleSubmit((values) =>
    mutation.mutate(values, { onSuccess: (updated) => reset({ ...values, height_m: updated.height_m, dbh_cm: updated.dbh_cm, crown_m: updated.crown_m }) }),
  );

  const id = (name: string) => `measure-${specimen.id}-${name}`;

  return (
    <form onSubmit={onSubmit} noValidate className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Field label="Date" htmlFor={id("date")} error={errors.date?.message} className="col-span-2 sm:col-span-1">
        <Input id={id("date")} type="date" invalid={!!errors.date} {...register("date")} />
      </Field>
      <Field label="Height (m)" htmlFor={id("height")} error={errors.height_m?.message}>
        <Input
          id={id("height")}
          type="number"
          step="0.1"
          inputMode="decimal"
          invalid={!!errors.height_m}
          {...register("height_m", { valueAsNumber: true })}
        />
      </Field>
      <Field label="DBH (cm)" htmlFor={id("dbh")} error={errors.dbh_cm?.message}>
        <Input
          id={id("dbh")}
          type="number"
          step="0.1"
          inputMode="decimal"
          invalid={!!errors.dbh_cm}
          {...register("dbh_cm", { valueAsNumber: true })}
        />
      </Field>
      <Field label="Crown (m)" htmlFor={id("crown")} error={errors.crown_m?.message}>
        <Input
          id={id("crown")}
          type="number"
          step="0.1"
          inputMode="decimal"
          invalid={!!errors.crown_m}
          {...register("crown_m", { valueAsNumber: true })}
        />
      </Field>
      <div className="col-span-2 flex justify-end sm:col-span-4">
        <Button type="submit" variant="primary" size="sm" loading={mutation.isPending} icon={<Ruler className="size-3.5" aria-hidden />}>
          Record measurement
        </Button>
      </div>
    </form>
  );
}
