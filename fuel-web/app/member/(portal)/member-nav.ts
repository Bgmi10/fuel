import {
  LayoutDashboard,
  CreditCard,
  ClipboardCheck,
  TrendingUp,
  Dumbbell,
  Apple,
  Bell,
  Users,
  CalendarPlus2,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: any;
};
export const memberNavItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/member/dashboard",
    icon: LayoutDashboard,
  },

  {
    label: "Workouts",
    href: "/member/workout-plans",
    icon: Dumbbell,
  },

  {
    label: "Nutrition",
    href: "/member/nutrition/diet-plans",
    icon: Apple,
  },
  {
    label: "Progress",
    href: "/member/progress",
    icon: TrendingUp,
  },
  {
    label: "Membership",
    href: "/member/membership",
    icon: CreditCard,
  },
  {
    label: "Book Session",
    href: "/member/slot",
    icon: CalendarPlus2,
  },

  {
    label: "Referrals",
    href: "/member/referrals",
    icon: Users,
  },
];