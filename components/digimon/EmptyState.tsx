interface EmptyStateProps {
  title: string;
  message: string;
}

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div
        aria-hidden="true"
        className="grid h-16 w-16 place-items-center rounded-full border border-dashed border-bone-muted/40"
      >
        <span className="font-data text-xl text-bone-muted">?</span>
      </div>
      <p className="font-display text-base font-semibold text-bone">
        {title}
      </p>
      <p className="mx-auto max-w-xs font-body text-sm text-bone-muted">
        {message}
      </p>
    </div>
  );
}
