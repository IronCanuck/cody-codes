import { useMemo, useState } from 'react';
import { CreditCard as Edit2, Trash2, MapPin, Clock, Search, Inbox } from 'lucide-react';
import { Job } from '../lib/supabase';
import { formatDate, formatTime } from '../lib/time';

type Filter = 'all' | 'today' | 'week' | 'month';

type Props = {
  jobs: Job[];
  onEdit: (j: Job) => void;
  onDelete: (id: string) => void;
  loading: boolean;
};

export function JobList({ jobs, onEdit, onDelete, loading }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return jobs.filter((j) => {
      const d = new Date(j.job_date + 'T00:00:00');

      if (filter === 'today' && d.getTime() !== today.getTime()) return false;
      if (filter === 'week') {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(now);
        monday.setDate(diff);
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);
        if (d < monday || d > sunday) return false;
      }
      if (filter === 'month') {
        if (
          d.getMonth() !== now.getMonth() ||
          d.getFullYear() !== now.getFullYear()
        )
          return false;
      }
      if (query.trim()) {
        const q = query.toLowerCase();
        if (
          !j.activity.toLowerCase().includes(q) &&
          !j.site.toLowerCase().includes(q) &&
          !j.notes.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [jobs, filter, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, Job[]>();
    for (const j of filtered) {
      if (!map.has(j.job_date)) map.set(j.job_date, []);
      map.get(j.job_date)!.push(j);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex gap-1 flex-wrap">
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  filter === f.id
                    ? 'bg-jd-green-600 text-white shadow-sm'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search activities..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg w-full sm:w-64 focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {loading && (
          <div className="p-12 text-center text-gray-400">Loading jobs...</div>
        )}
        {!loading && grouped.length === 0 && (
          <div className="p-12 text-center">
            <Inbox className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-500 font-medium">No jobs to display</p>
            <p className="text-gray-400 text-sm mt-1">
              Log your first job to see it here
            </p>
          </div>
        )}

        {grouped.map(([date, dayJobs]) => {
          const dayHours = dayJobs.reduce(
            (s, j) => s + Number(j.hours_worked || 0),
            0,
          );
          return (
            <div key={date} className="animate-fade-in">
              <div className="px-6 py-2 bg-jd-green-50 border-y border-jd-green-100 flex items-center justify-between">
                <span className="font-semibold text-jd-green-800 text-sm">
                  {formatDate(date)}
                </span>
                <span className="text-xs font-semibold text-jd-green-700 bg-jd-yellow-400 px-2 py-0.5 rounded-full">
                  {dayHours.toFixed(2)} hrs
                </span>
              </div>
              {dayJobs.map((j) => (
                <div
                  key={j.id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap text-sm text-gray-600 mb-1.5">
                        <span className="flex items-center gap-1 font-medium text-gray-900">
                          <Clock size={14} className="text-jd-green-600" />
                          {formatTime(j.start_time)} – {formatTime(j.end_time)}
                        </span>
                        <span className="font-bold text-jd-green-700">
                          {Number(j.hours_worked).toFixed(2)} hrs
                        </span>
                        {j.site && (
                          <span className="flex items-center gap-1 text-gray-600">
                            <MapPin size={14} />
                            {j.site}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                        {j.activity}
                      </p>
                      {j.notes && (
                        <p className="text-gray-500 text-xs mt-1.5 italic whitespace-pre-wrap">
                          {j.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEdit(j)}
                        className="p-2 hover:bg-jd-green-100 text-jd-green-700 rounded-lg"
                        title="Edit"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => onDelete(j.id)}
                        className="p-2 hover:bg-red-100 text-red-600 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
