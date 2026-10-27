import type { SkillId } from "@/lib/skills";
import { BookIcon, CalcIcon, CalendarIcon, SearchIcon } from "./Icons";

type IconComponent = (p: {
  size?: number;
  className?: string;
}) => React.ReactNode;

/** The small icon for each skill, shown in the skills row and the picker. */
export const SKILL_ICONS: Record<SkillId, IconComponent> = {
  search: SearchIcon,
  calculate: CalcIcon,
  dates: CalendarIcon,
  notice: BookIcon,
};
