import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Flame, Settings as SettingsIcon, Users } from 'lucide-react';
import { useFireWatch } from './FireWatchContext';
import { nextShifts, platoonAccent, todayTomorrowDayAfter, type ShiftEntry } from './schedule';
import { PLATOONS, type Firefighter, type Platoon } from './types';

function rosterByPlatoon(firefighters: Firefighter[]): Record<Platoon, Firefighter[]> {
  const out: Record<Platoon, Firefighter[]> = { A: [], B: [], C: [], D: [] };
  for (const f of firefighters) out[f.platoon].push(f);
  for (const k of PLATOONS) out[k].sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

export function FireWatchDashboard() {
  const { data } = useFireWatch();
  const upcoming: ShiftEntry[] = useMemo(() => nextShifts(7), []);
  const { today } = useMemo(() => todayTomorrowDayAfter(), []);
  const roster = useMemo(() => rosterByPlatoon(data.firefighters), [data.firefighters]);

  const totalFirefighters = data.firefighters.length;
  const todayAccent = platoonAccent(today.platoon);
  const todayCrew = roster[today.platoon];

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-10 max-w-5xl mx-auto w-full space-y-8">
      {/* Hero: Next 7 shifts */}
      <section
        aria-labelledby="firewatch-next7"
        className="rounded-3xl border-2 border-firewatch-flame-deep/30 bg-gradient-to-br from-firewatch-coal via-firewatch-ash to-firewatch-smoke text-firewatch-cream shadow-2xl shadow-firewatch-flame/30 overflow-hidden"
      >
        <div className="relative px-5 sm:px-7 pt-6 pb-5 border-b border-firewatch-flame/30">
          <div
            className="pointer-events-none absolute -top-12 -right-10 h-44 w-44 rounded-full bg-firewatch-ember/30 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-firewatch-spark/20 blur-3xl"
            aria-hidden
          />
          <div className="relative flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-firewatch-spark via-firewatch-ember to-firewatch-flame-deep ring-2 ring-firewatch-spark/40 shadow-lg shadow-firewatch-flame/40">
              <Flame className="h-6 w-6 text-firewatch-coal" strokeWidth={2.5} aria-hidden />
            </span>
            <div className="min-w-0">
              <h2
                id="firewatch-next7"
                className="text-xl sm:text-2xl font-bold tracking-tight text-firewatch-cream"
              >
                Next 7 shifts
              </h2>
              <p className="mt-1 text-sm text-firewatch-spark-light/85">
                Calgary Fire Department platoon rotation
              </p>
            </div>
            <div className="ml-auto flex shrink-0 flex-col items-end text-right">
              <span className="text-[10px] font-bold uppercase tracking-widest text-firewatch-spark">
                Today
              </span>
              <span
                className={`mt-1 inline-flex items-center justify-center rounded-lg px-3 py-1 text-base font-black tracking-wide ${todayAccent.badge}`}
              >
                {today.platoon} · {todayAccent.label}
              </span>
            </div>
          </div>
        </div>

        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 px-5 sm:px-7 py-5">
          {upcoming.map((shift, idx) => {
            const accent = platoonAccent(shift.platoon);
            const crew = roster[shift.platoon];
            const isToday = idx === 0;
            return (
              <li
                key={shift.iso}
                className={`relative rounded-2xl border bg-firewatch-coal/55 backdrop-blur-sm px-4 py-3 transition-shadow ${
                  isToday
                    ? 'border-firewatch-spark/55 shadow-md shadow-firewatch-flame/30'
                    : 'border-firewatch-flame/20'
                }`}
              >
                {isToday && (
                  <span className="absolute -top-2 left-3 inline-flex items-center rounded-full bg-firewatch-spark px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-firewatch-coal">
                    On duty
                  </span>
                )}
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-firewatch-spark-light/80">
                      {shift.weekday}
                    </p>
                    <p className="text-lg font-bold text-firewatch-cream truncate">
                      {shift.monthDay}
                    </p>
                  </div>
                  <span
                    className={`inline-flex h-9 min-w-[2.5rem] items-center justify-center rounded-lg px-2 text-sm font-black tracking-wide ${accent.badge}`}
                    title={accent.label}
                  >
                    {shift.platoon}
                  </span>
                </div>
                {crew.length > 0 ? (
                  <p className="mt-2 text-xs text-firewatch-cream/85 leading-snug">
                    <span className="font-semibold text-firewatch-spark-light">{accent.label}:</span>{' '}
                    {crew.map((f) => f.name).join(', ')}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-firewatch-cream/55 italic leading-snug">
                    {accent.label} platoon — add crew in the menu
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Today highlight */}
      <section
        aria-labelledby="firewatch-today"
        className={`rounded-3xl border-2 ${todayAccent.borderSoft} bg-firewatch-cream p-5 sm:p-7 shadow-lg shadow-firewatch-flame/15`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-firewatch-flame-deep">
              {today.weekday} · {today.monthDay}
            </p>
            <h3
              id="firewatch-today"
              className={`mt-1 text-2xl font-bold tracking-tight ${todayAccent.text}`}
            >
              {todayAccent.label} platoon on duty
            </h3>
          </div>
          <span
            className={`inline-flex h-12 min-w-[3.5rem] items-center justify-center rounded-xl px-3 text-2xl font-black tracking-tight ring-2 ring-offset-2 ring-offset-firewatch-cream ${todayAccent.badge} ${todayAccent.ring}`}
          >
            {today.platoon}
          </span>
        </div>
        <div className="mt-4">
          {todayCrew.length === 0 ? (
            <p className="text-sm text-firewatch-smoke/80">
              No crew names saved yet for {todayAccent.label}. Open the menu and add the
              firefighters that ride with this platoon to see their names here automatically.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {todayCrew.map((f) => (
                <li
                  key={f.id}
                  className={`inline-flex items-center gap-2 rounded-full border ${todayAccent.borderSoft} ${todayAccent.bgSoft} px-3 py-1.5 text-sm font-semibold text-firewatch-ink`}
                >
                  <Users className={`h-3.5 w-3.5 ${todayAccent.text}`} aria-hidden />
                  {f.name}
                  {f.role && (
                    <span className="text-xs font-medium text-firewatch-smoke/75">· {f.role}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Roster snapshot */}
      <section aria-labelledby="firewatch-roster" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3
              id="firewatch-roster"
              className="text-lg font-bold text-firewatch-ink tracking-tight"
            >
              Crew roster
            </h3>
            <p className="text-sm text-firewatch-smoke">
              {totalFirefighters > 0
                ? `${totalFirefighters} firefighter${totalFirefighters === 1 ? '' : 's'} tracked across the four platoons.`
                : 'Track who rides with each platoon to see crew names beside every upcoming shift.'}
            </p>
          </div>
          <Link
            to="/fire-watch/settings"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border-2 border-firewatch-flame-deep/40 bg-firewatch-cream px-3 py-2 text-sm font-bold text-firewatch-flame-deep hover:bg-firewatch-flame-deep/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-firewatch-flame-deep"
          >
            <SettingsIcon className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            Manage crews
          </Link>
        </div>

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PLATOONS.map((p) => {
            const accent = platoonAccent(p);
            const list = roster[p];
            return (
              <li
                key={p}
                className={`rounded-2xl border-2 ${accent.borderSoft} bg-white p-4 shadow-sm`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base font-black ${accent.badge}`}
                    >
                      {p}
                    </span>
                    <div className="min-w-0">
                      <p className={`text-sm font-bold ${accent.text}`}>{accent.label} platoon</p>
                      <p className="text-xs text-firewatch-smoke/80">
                        {list.length} member{list.length === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                </div>
                {list.length > 0 ? (
                  <ul className="mt-3 space-y-1">
                    {list.map((f) => (
                      <li
                        key={f.id}
                        className="flex items-baseline justify-between gap-2 text-sm"
                      >
                        <span className="font-medium text-firewatch-ink truncate">{f.name}</span>
                        {f.role && (
                          <span className="text-xs text-firewatch-smoke/80 shrink-0">{f.role}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-xs text-firewatch-smoke/70 italic">
                    No crew added yet.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <p className="text-[11px] text-firewatch-smoke/65 flex items-center gap-1.5">
        <Calendar className="h-3 w-3" aria-hidden />
        Schedule sourced from the IAFF Local 255 published shift rotation.
        <Link to="/fire-watch/settings" className="ml-auto inline-flex items-center gap-1 font-semibold text-firewatch-flame-deep hover:underline">
          Edit roster <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </p>
    </div>
  );
}
