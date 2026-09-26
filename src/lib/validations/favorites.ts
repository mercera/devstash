import { z } from "zod";

/**
 * The favorite toggles' payload: the state to set, never a bare flip, so a
 * double click or a retried request cannot land on the opposite of what the
 * user asked for.
 */
export const isFavoriteSchema = z.boolean();
