import {
  Award,
  Bot,
  Box,
  Boxes,
  BookOpen,
  Building2,
  Check,
  Cpu,
  Factory,
  Gauge,
  Github,
  Globe,
  GraduationCap,
  Handshake,
  LayoutDashboard,
  LifeBuoy,
  Linkedin,
  Lock,
  Mail,
  MessageSquare,
  Newspaper,
  Phone,
  Rocket,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Tv,
  Twitter,
  Users,
  Wallet,
  Wrench,
  Youtube,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** Curated icon set for admin-managed nav links, footer socials and badges. */
export const NAV_ICONS: Record<string, LucideIcon> = {
  box: Box,
  cpu: Cpu,
  gauge: Gauge,
  wrench: Wrench,
  boxes: Boxes,
  tv: Tv,
  bot: Bot,
  dashboard: LayoutDashboard,
  factory: Factory,
  shield: ShieldCheck,
  trending: TrendingUp,
  wallet: Wallet,
  users: Users,
  rocket: Rocket,
  sparkles: Sparkles,
  book: BookOpen,
  message: MessageSquare,
  phone: Phone,
  mail: Mail,
  globe: Globe,
  building: Building2,
  graduation: GraduationCap,
  lifebuoy: LifeBuoy,
  newspaper: Newspaper,
  handshake: Handshake,
  award: Award,
  lock: Lock,
  check: Check,
  zap: Zap,
  linkedin: Linkedin,
  twitter: Twitter,
  youtube: Youtube,
  github: Github,
};

export const NAV_ICON_NAMES = Object.keys(NAV_ICONS);

/** Render a curated icon by name; renders nothing for an unknown/empty name. */
export function NavIcon({ name, className }: { name?: string; className?: string }) {
  if (!name) return null;
  const Icon = NAV_ICONS[name];
  if (!Icon) return null;
  return <Icon className={className} />;
}
