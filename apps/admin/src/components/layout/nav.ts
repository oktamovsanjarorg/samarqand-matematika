import type { RoleName } from "@samarqand/shared";
import {
  Bot,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  LayoutDashboard,
  CreditCard,
  FileSpreadsheet,
  History,
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
    { title: "Asosiy", items: [{ to: "/", label: "Bosh sahifa", Icon: LayoutDashboard }] },
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
    groups.push({
      title: "Sozlash",
      items: [
        { to: "/settings", label: "Sozlamalar", Icon: Settings },
        // T-075: yordamchilar amallarini ustoz ko'radi
        { to: "/audit", label: "Jurnal", Icon: History },
      ],
    });
  return groups;
}
