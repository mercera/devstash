import { z } from "zod";

export const billingPeriodSchema = z.enum(["monthly", "yearly"]);
