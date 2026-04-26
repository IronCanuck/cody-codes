import { Flame, Kanban, PawPrint, Timer, type LucideIcon } from 'lucide-react';

export type MemberApp = {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: LucideIcon;
};

/** Apps behind auth; extend this list as you ship more products. */
export const PAYWALLED_APPS: MemberApp[] = [
  {
    id: 'consalty',
    title: 'Consalty',
    description: 'Job and hour tracking — log shifts, earnings, and reports.',
    path: '/consaltyapp',
    icon: Timer,
  },
  {
    id: 'taskmaster',
    title: 'Task Master',
    description: 'Projects and pipeline boards — tasks, stages, and priorities in one place.',
    path: '/taskmaster',
    icon: Kanban,
  },
  {
    id: 'chorios',
    title: 'Chorios',
    description: 'Weekly, monthly, and yearly chores — reminders, categories, and your schedule.',
    path: '/chorios',
    icon: Flame,
  },
  {
    id: 'furries',
    title: 'Furries',
    description:
      'Pet health tracker — profiles, gallery, medical and food logs, reminders, and sitter handouts.',
    path: '/furries',
    icon: PawPrint,
  },
];
