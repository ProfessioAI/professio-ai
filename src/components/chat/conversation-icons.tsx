import type { ConversationIcon } from "@/lib/library";
import {
  AlertIcon,
  BriefcaseIcon,
  BuildingIcon,
  CalendarIcon,
  ChatIcon,
  ClockIcon,
  DocIcon,
  DollarIcon,
  FlagIcon,
  ScaleIcon,
  StarIcon,
  UserIcon,
} from "./Icons";

type IconComponent = (p: {
  size?: number;
  className?: string;
}) => React.ReactNode;

/** The icons a conversation can be given, with a plain name for screen readers. */
export const CONVERSATION_ICONS: Record<
  ConversationIcon,
  { label: string; Icon: IconComponent }
> = {
  doc: { label: "Document", Icon: DocIcon },
  chat: { label: "Chat", Icon: ChatIcon },
  calendar: { label: "Calendar", Icon: CalendarIcon },
  star: { label: "Star", Icon: StarIcon },
  flag: { label: "Flag", Icon: FlagIcon },
  alert: { label: "Alert", Icon: AlertIcon },
  dollar: { label: "Money", Icon: DollarIcon },
  briefcase: { label: "Briefcase", Icon: BriefcaseIcon },
  clock: { label: "Clock", Icon: ClockIcon },
  user: { label: "Person", Icon: UserIcon },
  building: { label: "Business", Icon: BuildingIcon },
  scale: { label: "Legal", Icon: ScaleIcon },
};
