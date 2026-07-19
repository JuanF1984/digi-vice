import { Chip } from "@/components/ui/Chip";

interface InfoTileProps {
  label: string;
  values: string[];
  tone?: "phosphor" | "amber" | "signal";
}

export function InfoTile({ label, values, tone = "signal" }: InfoTileProps) {
  return (
    <div className="space-y-2 rounded-xl border border-screen-line bg-screen-raised p-3">
      <p className="font-data text-[10px] uppercase tracking-[0.2em] text-bone-muted">
        {label}
      </p>
      {values.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <Chip key={v} tone={tone}>
              {v}
            </Chip>
          ))}
        </div>
      ) : (
        <p className="font-body text-xs text-bone-muted">Sin datos</p>
      )}
    </div>
  );
}
