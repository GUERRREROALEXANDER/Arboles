import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardPlus } from "lucide-react";
import { useCreateWorkOrder } from "../../api/queries";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { WORK_ORDER_KIND_LABEL, WORK_ORDER_KINDS } from "../../lib/format";
import { optionalNumber, workOrderSchema, type WorkOrderForm as WorkOrderValues } from "../../lib/schemas";
import { SpecimenPicker } from "./SpecimenPicker";

interface WorkOrderFormProps {
  /** Fixed specimen (drawer). When omitted the form shows a specimen search. */
  specimenId?: string;
  onCreated?: () => void;
}

export function WorkOrderForm({ specimenId, onCreated }: WorkOrderFormProps) {
  const mutation = useCreateWorkOrder();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WorkOrderValues>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: { specimen_id: specimenId ?? "", kind: "inspection", notes: "", priority: undefined },
  });

  const onSubmit = handleSubmit(({ specimen_id, kind, notes, priority }) =>
    mutation.mutate(
      { specimen_id, kind, notes: notes || undefined, priority },
      {
        onSuccess: () => {
          reset({ specimen_id: specimenId ?? "", kind, notes: "", priority: undefined });
          onCreated?.();
        },
      },
    ),
  );

  const prefix = `wo-${specimenId ?? "new"}`;

  return (
    <form onSubmit={onSubmit} noValidate className="grid grid-cols-2 gap-3">
      {specimenId ? null : (
        <Field label="Specimen" htmlFor={`${prefix}-specimen`} error={errors.specimen_id?.message} className="col-span-2">
          <Controller
            control={control}
            name="specimen_id"
            render={({ field }) => (
              <SpecimenPicker
                id={`${prefix}-specimen`}
                value={field.value}
                onChange={field.onChange}
                invalid={!!errors.specimen_id}
              />
            )}
          />
        </Field>
      )}
      <Field label="Kind" htmlFor={`${prefix}-kind`} error={errors.kind?.message}>
        <Select id={`${prefix}-kind`} {...register("kind")}>
          {WORK_ORDER_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {WORK_ORDER_KIND_LABEL[kind]}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="Priority (1-100)"
        htmlFor={`${prefix}-priority`}
        error={errors.priority?.message}
        hint="Empty uses the specimen risk score."
      >
        <Input
          id={`${prefix}-priority`}
          type="number"
          min={1}
          max={100}
          placeholder="Risk score"
          invalid={!!errors.priority}
          {...register("priority", { setValueAs: optionalNumber })}
        />
      </Field>
      <Field label="Notes" htmlFor={`${prefix}-notes`} error={errors.notes?.message} className="col-span-2">
        <Textarea
          id={`${prefix}-notes`}
          placeholder="What should the crew look for?"
          invalid={!!errors.notes}
          {...register("notes")}
        />
      </Field>
      <div className="col-span-2 flex justify-end">
        <Button
          type="submit"
          variant="primary"
          size="sm"
          loading={mutation.isPending}
          icon={<ClipboardPlus className="size-3.5" aria-hidden />}
        >
          Queue work order
        </Button>
      </div>
    </form>
  );
}
