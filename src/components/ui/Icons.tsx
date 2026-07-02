"use client";
/**
 * Thuận Chuyến icon set — wrapper quanh lucide-react (thư viện icon chuẩn, hiện đại).
 *
 * Giữ NGUYÊN tên export + props (size / color / style / className / strokeWidth…)
 * nên mọi nơi đang dùng không phải sửa; chỉ glyph đổi sang bộ icon thư viện nhất quán.
 */
import {
  Car, Bus, Truck, MapPin, Navigation, Crosshair, Route, Repeat,
  Search, ArrowUpDown, RefreshCw, Check, CheckCircle, X, AlertTriangle,
  Star, Clock, Bell, Users, User, Armchair, Wallet, Coins, Zap, Shield,
  Activity, TrendingUp, Layers, Package, Key, Mail, Flame, Home, List,
  History, FileText, LogOut, Send, Map, Tag, Phone, Flag, ToggleRight,
  ToggleLeft, Plus, ArrowLeft, Ruler, Edit, Gift, Ticket, Image, Calendar,
  Trash2, Percent, SlidersHorizontal, Megaphone, MessageSquare, ChevronDown,
  ChevronUp, Merge, Menu, ExternalLink, CreditCard,
  type LucideIcon, type LucideProps,
} from "lucide-react";

type IconProps = LucideProps & { size?: number };

const make = (Cmp: LucideIcon) =>
  function Icon({ size = 24, strokeWidth = 1.8, ...p }: IconProps) {
    return <Cmp size={size} strokeWidth={strokeWidth} {...p} />;
  };

/* ── Transport / Navigation ─────────────────────────────────────────────────── */
export const CarIcon = make(Car);
export const BusIcon = make(Bus);
export const TruckIcon = make(Truck);
export const MapPinIcon = make(MapPin);
export const NavigationIcon = make(Navigation);
export const CrosshairIcon = make(Crosshair);
export const RouteIcon = make(Route);
export const ReturnRouteIcon = make(Repeat);
export const BackhaulIcon = make(Repeat);
export const MapIcon = make(Map);

/* ── Actions ────────────────────────────────────────────────────────────────── */
export const SearchIcon = make(Search);
export const ArrowUpDownIcon = make(ArrowUpDown);
export const RefreshIcon = make(RefreshCw);
export const CheckIcon = make(Check);
export const CheckCircleIcon = make(CheckCircle);
export const XIcon = make(X);
export const AlertTriangleIcon = make(AlertTriangle);
export const PlusIcon = make(Plus);
export const ArrowLeftIcon = make(ArrowLeft);
export const EditIcon = make(Edit);
export const TrashIcon = make(Trash2);
export const SendIcon = make(Send);
export const LogOutIcon = make(LogOut);
export const MergeIcon = make(Merge);
export const ChevronDownIcon = make(ChevronDown);
export const ChevronUpIcon = make(ChevronUp);
export const MenuIcon = make(Menu);
export const ExternalLinkIcon = make(ExternalLink);
export const CreditCardIcon = make(CreditCard);

/* ── UI / Misc ──────────────────────────────────────────────────────────────── */
export const ClockIcon = make(Clock);
export const BellIcon = make(Bell);
export const UsersIcon = make(Users);
export const UsersGroupIcon = make(Users);
export const UserIcon = make(User);
export const SeatIcon = make(Armchair);
export const HomeIcon = make(Home);
export const ListIcon = make(List);
export const HistoryIcon = make(History);
export const DocumentIcon = make(FileText);
export const TagIcon = make(Tag);
export const PhoneIcon = make(Phone);
export const FlagIcon = make(Flag);
export const EnvelopeIcon = make(Mail);
export const KeyIcon = make(Key);
export const ToggleRightIcon = make(ToggleRight);
export const ToggleLeftIcon = make(ToggleLeft);
export const RulerIcon = make(Ruler);
export const GiftIcon = make(Gift);
export const TicketIcon = make(Ticket);
export const ImageIcon = make(Image);
export const CalendarIcon = make(Calendar);
export const PercentIcon = make(Percent);
export const SlidersIcon = make(SlidersHorizontal);
export const MegaphoneIcon = make(Megaphone);
export const ChatIcon = make(MessageSquare);

/* ── Finance / Tech / Analytics ─────────────────────────────────────────────── */
export const WalletIcon = make(Wallet);
export const CoinIcon = make(Coins);
export const ZapIcon = make(Zap);
export const ShieldIcon = make(Shield);
export const ActivityIcon = make(Activity);
export const TrendingUpIcon = make(TrendingUp);
export const LayersIcon = make(Layers);
export const PackageIcon = make(Package);
export const FireIcon = make(Flame);

/* ── Star (giữ prop `filled`) ───────────────────────────────────────────────── */
export function StarIcon({ size = 24, strokeWidth = 1.8, filled = false, ...p }: IconProps & { filled?: boolean }) {
  return <Star size={size} strokeWidth={strokeWidth} fill={filled ? "currentColor" : "none"} {...p} />;
}
