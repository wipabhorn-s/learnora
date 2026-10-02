import { Card } from "@/components/ui/card";

export default function StatCard({
  icon,
  iconClassName,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  iconClassName: string;
  label: string;
  value: string | number;
  /** บรรทัดเล็กบอกความเคลื่อนไหว เช่น "+3 this month" */
  hint?: string;
}) {
  return (
    <Card className="flex-row items-center gap-4 p-5">
      <div
        className={`flex size-12 shrink-0 items-center justify-center rounded-full ${iconClassName}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-extrabold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </Card>
  );
}
