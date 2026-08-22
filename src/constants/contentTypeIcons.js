import {
  Linkedin,
  Mail,
  Twitter,
  Facebook,
  Instagram,
  Youtube,
  Calendar,
  Megaphone,
  FileText,
  MessageSquare,
  Send,
  Globe,
  Newspaper,
  Briefcase,
  Users,
  Image,
  Video,
  Mic,
  Phone,
  ShoppingCart,
  Star,
  Heart,
  PenLine,
  Bell,
  Rss,
  Presentation,
} from "lucide-react";

// Curated set of icons an admin can attach to a content-type button.
// The `key` is the machine name stored in the DB (`icon` field) and sent to
// the client; the client resolves it back to a lucide component by the same key.
export const CONTENT_TYPE_ICONS = [
  { key: "linkedin", icon: Linkedin, label: "LinkedIn" },
  { key: "mail", icon: Mail, label: "Email" },
  { key: "twitter", icon: Twitter, label: "X / Twitter" },
  { key: "facebook", icon: Facebook, label: "Facebook" },
  { key: "instagram", icon: Instagram, label: "Instagram" },
  { key: "youtube", icon: Youtube, label: "YouTube" },
  { key: "calendar", icon: Calendar, label: "Event" },
  { key: "megaphone", icon: Megaphone, label: "Announcement" },
  { key: "newspaper", icon: Newspaper, label: "Article" },
  { key: "message-square", icon: MessageSquare, label: "Message" },
  { key: "send", icon: Send, label: "Outreach" },
  { key: "globe", icon: Globe, label: "Web" },
  { key: "briefcase", icon: Briefcase, label: "Business" },
  { key: "users", icon: Users, label: "Community" },
  { key: "image", icon: Image, label: "Image" },
  { key: "video", icon: Video, label: "Video" },
  { key: "mic", icon: Mic, label: "Podcast" },
  { key: "phone", icon: Phone, label: "Call" },
  { key: "shopping-cart", icon: ShoppingCart, label: "Sales" },
  { key: "star", icon: Star, label: "Featured" },
  { key: "heart", icon: Heart, label: "Engagement" },
  { key: "pen-line", icon: PenLine, label: "Copy" },
  { key: "bell", icon: Bell, label: "Notification" },
  { key: "rss", icon: Rss, label: "Feed" },
  { key: "presentation", icon: Presentation, label: "Pitch" },
  { key: "file-text", icon: FileText, label: "Generic" },
];

const ICON_MAP = CONTENT_TYPE_ICONS.reduce((acc, item) => {
  acc[item.key] = item.icon;
  return acc;
}, {});

export const DEFAULT_CONTENT_ICON = "file-text";

// Resolve a stored icon key to a lucide component. Falls back to FileText.
export function getContentTypeIcon(iconKey) {
  return ICON_MAP[iconKey] || FileText;
}

// Sensible default palette offered in the color picker for a new button.
export const CONTENT_TYPE_COLOR_PRESETS = [
  "#0a66c2",
  "#22c55e",
  "#a855f7",
  "#ec4899",
  "#f97316",
  "#eab308",
  "#14b8a6",
  "#ef4444",
];

export const DEFAULT_CONTENT_COLOR = CONTENT_TYPE_COLOR_PRESETS[0];
