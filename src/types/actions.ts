/**
 * The `{ success, data, error }` shape every server action returns.
 *
 * `Failure` adds the extra fields a failure can carry, such as
 * `FieldIssues` for a form or `upgradeRequired` for a plan limit. Leave it out
 * for a plain error message.
 */
export type ActionResult<T, Failure = unknown> =
  | { success: true; data: T }
  | ({ success: false; error: string } & Failure);

/** Per-field validation messages, keyed by payload field. */
export interface FieldIssues<Field extends PropertyKey> {
  issues?: Partial<Record<Field, string[]>>;
}

/** Set when the Free plan refused the request, so the UI can offer an upgrade. */
export interface UpgradeRequired {
  upgradeRequired?: true;
}
