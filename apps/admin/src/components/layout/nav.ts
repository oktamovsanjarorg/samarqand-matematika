import type { RoleName } from "@samarqand/shared";
import {
  BookOpen,
  CalendarCheck,
  ChartColumn,
  ClipboardList,
  LayoutDashboard,
  CreditCard,
  FileSpreadsheet,
  History,
  Megaphone,
  Settings,
  Sparkles,
  Trash2,
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

/** Admin bo'limlari guruhlab: o'quv jarayoni, odamlar, to'lov */
export function navGroups(role: RoleName): NavGroup[] {
  const groups: NavGroup[] = [
    {
      title: "Asosiy",
      items: [
        { to: "/", label: "Bosh sahifa", Icon: LayoutDashboard },
        // T-177: AI bitta bo'limda — buyruq va savol (T-156), o'quvchilar suhbatlari (T-042)
        { to: "/ai", label: "AI yordamchi", Icon: Sparkles },
        // T-162: oy bo'yicha o'quv natijalari
        { to: "/stats", label: "Statistika", Icon: ChartColumn },
      ],
    },
    {
      title: "Oʻquv jarayoni",
      items: [
        { to: "/content", label: "Kontent", Icon: BookOpen },
        { to: "/weekly", label: "Haftalik", Icon: CalendarCheck },
        { to: "/mocks", label: "Mock", Icon: ClipboardList },
        { to: "/offline", label: "Offline", Icon: FileSpreadsheet },
        // T-099: o'chirilgan kontentni tiklash
        { to: "/trash", label: "Axlat qutisi", Icon: Trash2 },
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
      title: "Toʻlov",
      items: [{ to: "/payments", label: "Toʻlovlar", Icon: CreditCard }],
    },
  ];
  // BR-B05: tarif va karta faqat ustozda
  if (role === "TEACHER")
    groups.push({
      title: "Sozlash",
      items: [
        { to: "/settings", label: "Sozlamalar", Icon: Settings },
        // T-116: hamma o'quvchi va ota-onaga xabar faqat ustozdan
        { to: "/broadcast", label: "Eʼlon yuborish", Icon: Megaphone },
        // T-075: yordamchilar amallarini ustoz ko'radi
        { to: "/audit", label: "Jurnal", Icon: History },
      ],
    });
  return groups;
}
