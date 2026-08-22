import { Building2, User, Mail, LineChart, Globe, FileText } from "lucide-react";

// Global scope — the instruction is applied to every group in the organization.
export const GLOBAL_OPTION = {
  value: "all",
  label: "All groups",
  description: "Applied globally to every group in this organization",
  icon: Globe,
};

export const GROUP_OPTIONS = [
  {
    value: "company",
    label: "Companies",
    description: "Applied when analyzing companies",
    icon: Building2,
  },
  {
    value: "person",
    label: "People",
    description: "Applied when analyzing people",
    icon: User,
  },
  {
    value: "email",
    label: "Emails",
    description: "Applied when generating emails",
    icon: Mail,
  },
  {
    value: "analysis",
    label: "Analyses",
    description: "Applied when generating analyses",
    icon: LineChart,
    hidden: true,
  },
];

// Groups the user can actually pick when creating/editing an instruction or type.
export const SELECTABLE_GROUP_OPTIONS = GROUP_OPTIONS.filter((g) => !g.hidden);

export function getGroupMeta(groupType) {
  if (groupType === "all") return GLOBAL_OPTION;
  return (
    GROUP_OPTIONS.find((g) => g.value === groupType) || {
      value: groupType,
      label: groupType || "Unknown",
      icon: FileText,
    }
  );
}

// Sensible default palette offered in the color picker for a new type.
export const TYPE_COLOR_PRESETS = [
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
  "#f97316",
  "#eab308",
  "#14b8a6",
  "#ef4444",
];

export const DEFAULT_TYPE_COLOR = TYPE_COLOR_PRESETS[1];
