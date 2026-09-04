/** Validation messages for a single input. Renders nothing when there are none. */
export function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) {
    return null;
  }

  return (
    <p className="text-xs text-destructive">{messages.join(". ")}</p>
  );
}

/** A form-level failure message, shown above the fields. */
export function FormError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </p>
  );
}
