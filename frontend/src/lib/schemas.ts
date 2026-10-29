import { z } from "zod";

const healthEnum = z.enum(["excellent", "good", "fair", "poor", "critical", "dead"]);
const kindEnum = z.enum(["inspection", "pruning", "pest_treatment", "cabling", "removal", "planting"]);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD");

const positive = (label: string, max: number) =>
  z
    .number({ error: `${label} is required` })
    .positive(`${label} must be greater than 0`)
    .max(max, `${label} must be at most ${max}`);

/** Mirrors POST /specimens. */
export const createSpecimenSchema = z.object({
  site_id: z.string().min(1, "Choose a site"),
  species_id: z.string().min(1, "Choose a species"),
  tag: z
    .string()
    .trim()
    .min(3, "Tag is too short")
    .max(32, "Tag is too long")
    .regex(/^[A-Z0-9-]+$/, "Use uppercase letters, digits and dashes"),
  planted_on: isoDate,
  health: healthEnum,
  height_m: positive("Height", 60),
  dbh_cm: positive("DBH", 400),
  crown_m: positive("Crown", 40),
  lean_deg: z.number({ error: "Lean is required" }).min(0, "Lean cannot be negative").max(90),
  lat: z.number({ error: "Latitude is required" }).min(-90).max(90),
  lng: z.number({ error: "Longitude is required" }).min(-180).max(180),
});
export type CreateSpecimenForm = z.infer<typeof createSpecimenSchema>;

/** Mirrors POST /specimens/<id>/measurements. */
export const measurementSchema = z.object({
  date: isoDate,
  height_m: positive("Height", 60),
  dbh_cm: positive("DBH", 400),
  crown_m: positive("Crown", 40),
});
export type MeasurementForm = z.infer<typeof measurementSchema>;

/** Mirrors POST /workorders. */
export const workOrderSchema = z.object({
  specimen_id: z.string().min(1, "Choose a specimen"),
  kind: kindEnum,
  notes: z.string().trim().max(500, "Keep notes under 500 characters"),
  priority: z.number().int().min(1, "Minimum is 1").max(100, "Maximum is 100").optional(),
});
export type WorkOrderForm = z.infer<typeof workOrderSchema>;

/** Mirrors POST /specimens/<id>/move. */
export const moveSpecimenSchema = z.object({
  site_id: z.string().min(1, "Choose a destination site"),
});
export type MoveSpecimenForm = z.infer<typeof moveSpecimenSchema>;

/** react-hook-form `setValueAs` for optional numeric inputs. */
export const optionalNumber = (value: unknown): number | undefined =>
  value === "" || value === null || value === undefined ? undefined : Number(value);
