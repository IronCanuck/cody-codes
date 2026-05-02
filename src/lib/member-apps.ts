import {
  DollarSign,
  Flame,
  FlameKindling,
  Kanban,
  Leaf,
  PawPrint,
  PiggyBank,
  StickyNote,
  type LucideIcon,
} from 'lucide-react';

/** Visual tokens for app library cards and the slide-out menu (maps to tailwind.config.js palettes). */
export type AppLibraryScheme = {
  menuLink: string;
  menuIconWrap: string;
  menuIconColor: string;
  menuTitle: string;
  menuArrow: string;
  card: string;
  cardIconWrap: string;
  cardIcon: string;
  cardTitle: string;
  cardCta: string;
};

export const APP_LIBRARY_SCHEMES = {
  cody: {
    menuLink:
      'hover:bg-evergreen-light/40 hover:border-evergreen/25 focus-visible:ring-evergreen',
    menuIconWrap: 'bg-slate-50 ring-1 ring-evergreen/20',
    menuIconColor: 'text-evergreen-dark',
    menuTitle: 'text-evergreen-dark',
    menuArrow: 'text-evergreen-dark opacity-60',
    card: 'border-evergreen/20 hover:border-evergreen/45 focus-visible:ring-evergreen',
    cardIconWrap:
      'bg-slate-50 ring-evergreen/30 group-hover:ring-evergreen/55',
    cardIcon: 'text-evergreen-dark',
    cardTitle: 'text-evergreen-dark',
    cardCta: 'text-evergreen-dark',
  },
  tiffany: {
    menuLink: 'hover:bg-tiffany/8 hover:border-tiffany/20 focus-visible:ring-tiffany',
    menuIconWrap: 'bg-tiffany-light',
    menuIconColor: 'text-tiffany-darker',
    menuTitle: 'text-tiffany-darker',
    menuArrow: 'text-tiffany-darker opacity-60',
    card: 'border-tiffany/20 hover:border-tiffany/45 focus-visible:ring-tiffany',
    cardIconWrap:
      'bg-gradient-to-br from-tiffany-light to-tiffany ring-tiffany/20 group-hover:ring-tiffany/40',
    cardIcon: 'text-tiffany-darker',
    cardTitle: 'text-tiffany-darker',
    cardCta: 'text-tiffany-darker',
  },
  chorios: {
    menuLink:
      'hover:bg-flames-orange/10 hover:border-flames-orange/25 focus-visible:ring-flames-orange-dark',
    menuIconWrap: 'bg-flames-yellow-light/80',
    menuIconColor: 'text-flames-red-dark',
    menuTitle: 'text-flames-red-dark',
    menuArrow: 'text-flames-orange-dark opacity-70',
    card: 'border-flames-orange/25 hover:border-flames-orange/50 focus-visible:ring-flames-orange-dark',
    cardIconWrap:
      'bg-gradient-to-br from-flames-yellow-light to-flames-orange ring-flames-orange/20 group-hover:ring-flames-orange/45',
    cardIcon: 'text-flames-red-dark',
    cardTitle: 'text-flames-red-dark',
    cardCta: 'text-flames-orange-dark',
  },
  furries: {
    menuLink:
      'hover:bg-squirtle-blue/10 hover:border-squirtle-blue/25 focus-visible:ring-squirtle-blue-deep',
    menuIconWrap: 'bg-squirtle-surface',
    menuIconColor: 'text-squirtle-ink',
    menuTitle: 'text-squirtle-ink',
    menuArrow: 'text-squirtle-blue-deep opacity-65',
    card: 'border-squirtle-blue/25 hover:border-squirtle-blue-deep/45 focus-visible:ring-squirtle-blue-deep',
    cardIconWrap:
      'bg-gradient-to-br from-squirtle-cream to-squirtle-blue ring-squirtle-blue/15 group-hover:ring-squirtle-blue-deep/30',
    cardIcon: 'text-squirtle-ink',
    cardTitle: 'text-squirtle-ink',
    cardCta: 'text-squirtle-blue-deep',
  },
  budget: {
    menuLink: 'hover:bg-sabres-blue/8 hover:border-sabres-gold/35 focus-visible:ring-sabres-blue',
    menuIconWrap: 'bg-sabres-gold/25',
    menuIconColor: 'text-sabres-blue',
    menuTitle: 'text-sabres-ink',
    menuArrow: 'text-sabres-blue opacity-65',
    card: 'border-sabres-blue/20 hover:border-sabres-blue-bright/40 focus-visible:ring-sabres-blue',
    cardIconWrap:
      'bg-gradient-to-br from-sabres-gold-light to-sabres-gold ring-sabres-blue/15 group-hover:ring-sabres-blue/35',
    cardIcon: 'text-sabres-blue',
    cardTitle: 'text-sabres-ink',
    cardCta: 'text-sabres-blue',
  },
  plantBased: {
    menuLink:
      'hover:bg-evergreen-light/55 hover:border-evergreen/25 focus-visible:ring-evergreen',
    menuIconWrap: 'bg-evergreen-light',
    menuIconColor: 'text-evergreen-dark',
    menuTitle: 'text-evergreen-dark',
    menuArrow: 'text-evergreen-dark opacity-65',
    card: 'border-evergreen/20 hover:border-evergreen/45 focus-visible:ring-evergreen',
    cardIconWrap:
      'bg-gradient-to-br from-evergreen-light to-evergreen ring-evergreen/15 group-hover:ring-evergreen/35',
    cardIcon: 'text-evergreen-dark',
    cardTitle: 'text-evergreen-dark',
    cardCta: 'text-evergreen-dark',
  },
  firewatch: {
    menuLink:
      'hover:bg-firewatch-flame-deep/10 hover:border-firewatch-flame-deep/30 focus-visible:ring-firewatch-flame-deep',
    menuIconWrap:
      'bg-gradient-to-br from-firewatch-spark via-firewatch-ember to-firewatch-flame-deep',
    menuIconColor: 'text-firewatch-coal',
    menuTitle: 'text-firewatch-flame-deep',
    menuArrow: 'text-firewatch-flame-deep opacity-70',
    card: 'border-firewatch-flame-deep/30 hover:border-firewatch-flame-deep/55 focus-visible:ring-firewatch-flame-deep',
    cardIconWrap:
      'bg-gradient-to-br from-firewatch-spark via-firewatch-ember to-firewatch-flame-deep ring-firewatch-flame-deep/25 group-hover:ring-firewatch-flame-deep/50',
    cardIcon: 'text-firewatch-coal',
    cardTitle: 'text-firewatch-flame-deep',
    cardCta: 'text-firewatch-flame-deep',
  },
  sticky: {
    menuLink:
      'hover:bg-miami-pink/10 hover:border-miami-pink/30 focus-visible:ring-miami-pink',
    menuIconWrap: 'bg-gradient-to-br from-miami-pink-bright to-miami-cyan',
    menuIconColor: 'text-white',
    menuTitle: 'text-miami-pink-bright',
    menuArrow: 'text-miami-pink-bright opacity-75',
    card: 'border-miami-pink/30 hover:border-miami-cyan/55 focus-visible:ring-miami-pink',
    cardIconWrap:
      'bg-gradient-to-br from-miami-pink-bright via-miami-purple to-miami-cyan ring-miami-pink/30 group-hover:ring-miami-cyan/50',
    cardIcon: 'text-white',
    cardTitle: 'text-miami-pink-bright',
    cardCta: 'text-miami-blue-deep',
  },
} as const satisfies Record<string, AppLibraryScheme>;

export type AppLibrarySchemeKey = keyof typeof APP_LIBRARY_SCHEMES;

export type MemberApp = {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: LucideIcon;
  scheme: AppLibrarySchemeKey;
  iconStrokeWidth?: number;
};

/** Apps behind auth; extend this list as you ship more products. */
export const PAYWALLED_APPS: MemberApp[] = [
  {
    id: 'consalty',
    title: 'Consalty',
    description: 'Job and hour tracking — log shifts, earnings, and reports.',
    path: '/consaltyapp',
    icon: DollarSign,
    scheme: 'cody',
    iconStrokeWidth: 3,
  },
  {
    id: 'taskmaster',
    title: 'Task Master',
    description: 'Projects and pipeline boards — tasks, stages, and priorities in one place.',
    path: '/taskmaster',
    icon: Kanban,
    scheme: 'tiffany',
  },
  {
    id: 'chorios',
    title: 'Chorios',
    description: 'Weekly, monthly, and yearly chores — reminders, categories, and your schedule.',
    path: '/chorios',
    icon: Flame,
    scheme: 'chorios',
  },
  {
    id: 'furries',
    title: 'Furries',
    description:
      'Pet health tracker — profiles, gallery, medical and food logs, reminders, and sitter handouts.',
    path: '/furries',
    icon: PawPrint,
    scheme: 'furries',
  },
  {
    id: 'plant-based-menu',
    title: 'Plant-Based Menu',
    description:
      'Recipe builder with an ingredient library and automatic scaling by people to feed.',
    path: '/plant-based-menu',
    icon: Leaf,
    scheme: 'plantBased',
  },
  {
    id: 'budget-pal',
    title: 'Budget Pal',
    description:
      'Profiles and bank accounts, monthly budgets, spending vs plan, and savings goals in one place.',
    path: '/budget-pal',
    icon: PiggyBank,
    scheme: 'budget',
  },
  {
    id: 'fire-watch',
    title: 'Fire Watch',
    description:
      'Calgary Fire Department shift tracker — see the next 7 shifts and which crew is on duty.',
    path: '/fire-watch',
    icon: FlameKindling,
    scheme: 'firewatch',
  },
  {
    id: 'sticky',
    title: 'Sticky',
    description:
      'Miami Vice sticky-note board — drag, type, attach images, and organize reminders by category.',
    path: '/sticky',
    icon: StickyNote,
    scheme: 'sticky',
  },
];
