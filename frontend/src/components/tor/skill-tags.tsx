import { cn } from "@/lib/utils";

export function SkillTags({
  skills,
  className,
  limit,
}: {
  skills: string[];
  className?: string;
  limit?: number;
}) {
  const shown = limit ? skills.slice(0, limit) : skills;
  const rest = limit ? Math.max(0, skills.length - limit) : 0;
  const label = [...shown, rest > 0 ? `+${rest}` : null].filter(Boolean).join(" · ");

  return (
    <p className={cn("text-xs tracking-wide text-muted-foreground", className)}>
      {label}
    </p>
  );
}
