export type ShowcaseProject = {
  title: string;
  description: string;
  href: string;
  image: string;
};

/** Public portfolio sites; used on the landing page and member dashboard. */
export const SHOWCASE_PROJECTS: readonly ShowcaseProject[] = [
  {
    title: 'Podium Nation Custom Apparel',
    description: 'Custom apparel for teams and events.',
    href: 'https://www.podiumnation.com',
    image: '/showcase/podiumnation.png',
  },
  {
    title: 'Grow Your Sport',
    description: 'Team development community.',
    href: 'https://www.growyoursport.com',
    image: '/showcase/growyoursport.png',
  },
  {
    title: 'Podium Lab',
    description: 'Performance training and scheduling system.',
    href: 'https://www.thepodiumlab.com',
    image: '/showcase/podiumlab.png',
  },
  {
    title: 'Podium HQ',
    description: 'All-in-one team and event management.',
    href: 'https://www.podiumhq.co',
    image: '/showcase/podiumhq.png',
  },
  {
    title: 'Wrestling Studio Pro',
    description: 'Wrestling match recording software.',
    href: 'https://www.wrestlingstudiopro.com',
    image: '/showcase/wrestlingstudiopro.png',
  },
  {
    title: 'Wrestling Dual Meet Scoreboard',
    description: 'Real-time wrestling scoreboard.',
    href: 'https://www.podiumwrestlinghq.com/',
    image: '/showcase/wrestlingdualscoreboard.png',
  },
  {
    title: 'Wrestling Round Robin Scoreboard',
    description: 'Round robin meet scoring.',
    href: 'https://www.quadmeet.ca',
    image: '/showcase/quadmeet.png',
  },
  {
    title: 'Calgary Spartan Wrestling Club',
    description: 'Club information and resources.',
    href: 'https://www.spartanwrestling.ca',
    image: '/showcase/spartanwrestling.png',
  },
  {
    title: 'Canada Wrestling HQ',
    description: 'Tournament database for Canadian wrestling.',
    href: 'https://www.wrestlingtournaments.ca',
    image: '/showcase/canadawrestlinghq.png',
  },
  {
    title: 'Fire Report Pro',
    description: 'Fire inspection management.',
    href: 'https://www.firereportpro.com',
    image: '/showcase/firereportpro.png',
  },
];
