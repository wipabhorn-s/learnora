import {
  Award,
  BarChart2,
  Globe,
  MessageSquare,
  PenTool,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_META: {
  value: string;
  label: string;
  icon: LucideIcon;
  color: string;
}[] = [
  {
    value: "PROGRAMMING",
    label: "Programming",
    icon: Globe,
    color: "bg-purple-100 text-purple-700",
  },
  {
    value: "BUSINESS",
    label: "Business",
    icon: BarChart2,
    color: "bg-cyan-100 text-cyan-700",
  },
  {
    value: "DESIGN",
    label: "Design",
    icon: PenTool,
    color: "bg-pink-100 text-pink-700",
  },
  {
    value: "MARKETING",
    label: "Marketing",
    icon: TrendingUp,
    color: "bg-green-100 text-green-700",
  },
  {
    value: "PERSONAL_DEVELOPMENT",
    label: "Personal Development",
    icon: Award,
    color: "bg-orange-100 text-orange-700",
  },
  {
    value: "LANGUAGE",
    label: "Language",
    icon: MessageSquare,
    color: "bg-yellow-100 text-yellow-700",
  },
];
