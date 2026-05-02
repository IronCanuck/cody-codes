import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import { Job } from '../lib/supabase';
import { formatDateShort, formatTime } from '../lib/time';

type Props = {
  jobs: Job[];
  loading?: boolean;
  limit?: number;
};

export function RecentActivity({ jobs, loading = false, limit = 10 }: Props) {
  const rows = useMemo(() => {
    return [...jobs]
      .sort((a, b) => {
        if (a.job_date !== b.job_date) return b.job_date.localeCompare(a.job_date);
        return b.start_time.localeCompare(a.start_time);
      })
      .slice(0, limit);
  }, [jobs, limit]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-4 sm:px-6 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
            Recent activity
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Latest {Math.min(rows.length, limit)} shift{rows.length === 1 ? '' : 's'} logged
          </p>
        </div>
        <Link
          to="/consaltyapp/history"
          className="text-sm font-semibold text-jd-green-700 hover:text-jd-green-800"
        >
          View all →
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border-collapse">
          <thead className="bg-gray-100 text-gray-700">
            <tr className="text-left">
              <th className="px-3 py-2 font-semibold border-b border-gray-200 w-24">Date</th>
              <th className="px-3 py-2 font-semibold border-b border-gray-200 w-20">Start</th>
              <th className="px-3 py-2 font-semibold border-b border-gray-200 w-20">End</th>
              <th className="px-3 py-2 font-semibold border-b border-gray-200 w-20 text-right">
                Hours
              </th>
              <th className="px-3 py-2 font-semibold border-b border-gray-200">Activity</th>
              <th className="px-3 py-2 font-semibold border-b border-gray-200 w-40 hidden sm:table-cell">
                Site
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray-400">
                  Loading recent activity...
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center">
                  <Inbox className="mx-auto text-gray-300 mb-2" size={36} />
                  <p className="text-gray-500 font-medium">No activity yet</p>
                  <p className="text-gray-400 text-xs mt-1">
                    Logged jobs will appear here as a quick reference.
                  </p>
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((j, idx) => (
                <tr
                  key={j.id}
                  className={`border-b border-gray-100 ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'
                  } hover:bg-jd-green-50/60`}
                >
                  <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-900">
                    {formatDateShort(j.job_date)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-700 tabular-nums">
                    {formatTime(j.start_time)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-700 tabular-nums">
                    {formatTime(j.end_time)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right font-semibold text-jd-green-700 tabular-nums">
                    {Number(j.hours_worked).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-gray-800 max-w-[18rem] truncate" title={j.activity}>
                    {j.activity || <span className="text-gray-400 italic">—</span>}
                  </td>
                  <td
                    className="px-3 py-2 text-gray-600 hidden sm:table-cell max-w-[12rem] truncate"
                    title={j.site}
                  >
                    {j.site || <span className="text-gray-400 italic">—</span>}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
