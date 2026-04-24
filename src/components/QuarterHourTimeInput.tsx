import { useEffect, useRef, useState } from 'react';
import {
  formatTimeInputDisplay,
  QUARTER_HOUR_MINUTES,
  timeInputToTwelveHour,
  twelveHourToTimeInput,
  toLocalTimeInputValue,
  type TwelveHourParts,
} from '../lib/time';

const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

function defaultPartsFromNow(): TwelveHourParts {
  const t = timeInputToTwelveHour(toLocalTimeInputValue(new Date()));
  return t ?? { hour12: 12, minute: 0, period: 'AM' };
}

type Props = {
  id?: string;
  value: string;
  onChange: (hhmm: string) => void;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  /**
   * When true, `onChange` runs only after the picker closes (hour/minute/AM-PM
   * adjustments stay local until then). Default false for existing forms.
   */
  deferCommit?: boolean;
};

export function QuarterHourTimeInput({
  id,
  value,
  onChange,
  className = '',
  required: _required,
  disabled = false,
  deferCommit = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TwelveHourParts>(defaultPartsFromNow);
  const wrapRef = useRef<HTMLDivElement>(null);
  const prevOpen = useRef(false);
  const draftRef = useRef(draft);
  const openedSnapshotRef = useRef('');

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    const wasOpen = prevOpen.current;
    if (open && !wasOpen) {
      const p = timeInputToTwelveHour(value) ?? defaultPartsFromNow();
      openedSnapshotRef.current = value;
      setDraft(p);
      draftRef.current = p;
    }
    if (!open && wasOpen && deferCommit) {
      const nextHhmm = twelveHourToTimeInput(draftRef.current);
      if (nextHhmm !== openedSnapshotRef.current) {
        onChange(nextHhmm);
      }
    }
    prevOpen.current = open;
  }, [open, value, deferCommit, onChange]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const apply = (next: TwelveHourParts) => {
    setDraft(next);
    draftRef.current = next;
    if (!deferCommit) {
      onChange(twelveHourToTimeInput(next));
    }
  };

  const display = value ? formatTimeInputDisplay(value) : '';

  return (
    <div ref={wrapRef} className="relative">
      <input
        id={id}
        type="text"
        readOnly
        disabled={disabled}
        value={display}
        placeholder="--:--"
        required={_required}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((o) => !o)}
        onFocus={() => !disabled && setOpen(true)}
        className={`cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      />
      {open && !disabled && (
        <div
          role="dialog"
          aria-label="Choose time"
          className="absolute left-0 right-0 z-[100] mt-1 rounded-lg border border-gray-200 bg-white py-2 shadow-lg"
        >
          <div className="flex max-h-52 divide-x divide-gray-100">
            <div className="min-w-0 flex-1 overflow-y-auto overscroll-contain">
              {HOURS_12.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => apply({ ...draftRef.current, hour12: h })}
                  className={`flex w-full items-center justify-center px-2 py-2 text-sm font-semibold transition-colors ${
                    draft.hour12 === h
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-800 hover:bg-blue-50'
                  }`}
                >
                  {String(h).padStart(2, '0')}
                </button>
              ))}
            </div>
            <div className="min-w-0 flex-1 overflow-y-auto overscroll-contain">
              {QUARTER_HOUR_MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => apply({ ...draftRef.current, minute: m })}
                  className={`flex w-full items-center justify-center px-2 py-2 text-sm font-semibold transition-colors ${
                    draft.minute === m
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-800 hover:bg-blue-50'
                  }`}
                >
                  {String(m).padStart(2, '0')}
                </button>
              ))}
            </div>
            <div className="min-w-0 flex-1 overflow-y-auto overscroll-contain">
              {(['AM', 'PM'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => apply({ ...draftRef.current, period: p })}
                  className={`flex w-full items-center justify-center px-2 py-2 text-sm font-semibold transition-colors ${
                    draft.period === p
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-800 hover:bg-blue-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
