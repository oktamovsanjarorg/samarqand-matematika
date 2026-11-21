import type { RoleName } from "@samarqand/shared";
import {
  Bot,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  CreditCard,
  FileSpreadsheet,
  Settings,
  UserRound,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  Icon: LucideIcon;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/** Admin bo'limlari guruhlab: o'quv jarayoni, odamlar, to'lov va AI */
export function navGroups(role: RoleName): NavGroup[] {
  const groups: NavGroup[] = [
    {
      title: "Oʻquv jarayoni",
      items: [
        { to: "/content", label: "Kontent", Icon: BookOpen },
        { to: "/weekly", label: "Haftalik", Icon: CalendarCheck },
        { to: "/mocks", label: "Mock", Icon: ClipboardList },
        { to: "/offline", label: "Offline", Icon: FileSpreadsheet },
      ],
    },
    {
      title: "Odamlar",
      items: [
        { to: "/students", label: "Oʻquvchilar", Icon: UserRound },
        { to: "/groups", label: "Guruhlar", Icon: UsersRound },
        { to: "/parents", label: "Ota-onalar", Icon: Users },
      ],
    },
    {
      title: "Toʻlov va AI",
      items: [
        { to: "/payments", label: "Toʻlovlar", Icon: CreditCard },
        { to: "/tutor", label: "Yordamchi", Icon: Bot },
      ],
    },
  ];
  // BR-B05: tarif va karta faqat ustozda
  if (role === "TEACHER")
    groups.push({ title: "Sozlash", items: [{ to: "/settings", label: "Sozlamalar", Icon: Settings }] });
  return groups;
}

/** Joriy sahifa nomi (telefondagi tepa panel uchun) */
export const currentLabel = (groups: NavGroup[], path: string) =>
  groups.flatMap((g) => g.items).find((i) => path === i.to || path.startsWith(`${i.to}/`))?.label ?? "";
