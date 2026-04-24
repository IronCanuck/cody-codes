import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Timer } from 'lucide-react';

export function ShellHome() {
  useEffect(() => {
    document.title = 'Cody Codes';
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-jd-green-50 to-white flex flex-col">
      <header className="border-b border-jd-green-200/80 bg-white/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-jd-green-600 rounded-xl p-2.5 shadow-md">
              <Leaf className="text-jd-yellow-400" size={24} strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-jd-green-700">
                Cody Codes
              </p>
              <p className="text-sm text-gray-600">Tools &amp; products</p>
            </div>
          </div>
          <a
            href="https://www.codycodes.ca"
            className="text-sm text-jd-green-700 hover:text-jd-green-800 font-medium hidden sm:inline"
          >
            www.codycodes.ca
          </a>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-12 w-full">
        <h1 className="text-3xl sm:text-4xl font-bold text-jd-green-900 tracking-tight mb-3">
          Welcome
        </h1>
        <p className="text-gray-600 text-lg mb-10 max-w-xl">
          This site hosts the SaaS products I build. Pick an app below to get started.
        </p>

        <ul className="space-y-4">
          <li>
            <Link
              to="/consaltyapp"
              className="group flex gap-4 rounded-2xl border-2 border-jd-green-600 bg-white p-5 shadow-sm hover:shadow-md hover:border-jd-green-700 transition-shadow"
            >
              <div className="shrink-0 bg-jd-yellow-400 rounded-xl p-3 border-2 border-jd-green-600 group-hover:bg-jd-yellow-300 transition-colors">
                <Timer className="text-jd-green-800" size={28} strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <h2 className="font-bold text-jd-green-900 text-lg">Consalty</h2>
                <p className="text-gray-600 text-sm mt-1">
                  Job and hour tracker (Landscape Log) — log shifts, earnings, and reports.
                </p>
                <p className="text-jd-green-700 text-sm font-medium mt-2">Open app →</p>
              </div>
            </Link>
          </li>
        </ul>
      </main>

      <footer className="py-8 text-center text-sm text-gray-500 border-t border-gray-200 bg-white/60">
        <p>Cody Codes · <a href="https://www.codycodes.ca" className="text-jd-green-600 hover:underline">www.codycodes.ca</a></p>
      </footer>
    </div>
  );
}
