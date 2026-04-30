import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useSticky } from './StickyContext';
import { StickyNoteCard } from './StickyNoteCard';
import { CATEGORY_COLOR_TOKENS } from './types';

const BOARD_PADDING = 24;
const MIN_BOARD_W = 1200;
const MIN_BOARD_H = 800;

export function StickyBoard() {
  const { data, addNote, updateNote, removeNote, bringToFront } = useSticky();
  const boardRef = useRef<HTMLDivElement>(null);
  const trashZoneRef = useRef<HTMLDivElement>(null);
  const [trashHover, setTrashHover] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const orderedNotes = useMemo(
    () => [...data.notes].sort((a, b) => a.zIndex - b.zIndex),
    [data.notes],
  );

  const [boardSize, setBoardSize] = useState({ width: MIN_BOARD_W, height: MIN_BOARD_H });

  useEffect(() => {
    let maxX = MIN_BOARD_W;
    let maxY = MIN_BOARD_H;
    for (const note of data.notes) {
      maxX = Math.max(maxX, note.x + note.width + BOARD_PADDING * 2);
      maxY = Math.max(maxY, note.y + note.height + BOARD_PADDING * 2);
    }
    setBoardSize({ width: maxX, height: maxY });
  }, [data.notes]);

  const totalNotes = data.notes.length;

  const trashZoneOnHover = (over: boolean) => setTrashHover(over);

  const handleAddWithCategory = (categoryId: string | null) => {
    addNote(categoryId);
    setPickerOpen(false);
  };

  useEffect(() => {
    if (!pickerOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('[data-sticky-category-picker]')) {
        setPickerOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPickerOpen(false);
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [pickerOpen]);

  return (
    <div className="relative">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6">
        <div className="rounded-2xl border border-miami-pink/30 bg-gradient-to-br from-miami-night via-miami-surface to-miami-night-deep p-4 sm:p-5 shadow-[0_10px_40px_-15px_rgba(0,229,255,0.4)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] bg-gradient-to-r from-miami-pink-light to-miami-cyan bg-clip-text text-transparent">
                Sticky board
              </p>
              <h2 className="mt-1 text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Reminders, ideas & to-dos under neon
              </h2>
              <p className="mt-1.5 text-sm text-miami-mute max-w-xl">
                Drag notes anywhere, type freely, and drop in small images. Throw a note in the
                trash when you&apos;re done with it.
              </p>
            </div>

            <div className="relative" data-sticky-category-picker>
              <button
                type="button"
                onClick={() => setPickerOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={pickerOpen}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-miami-pink-bright to-miami-cyan px-4 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-miami-pink/40 hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Plus className="h-4 w-4" strokeWidth={2.75} aria-hidden />
                New note
              </button>

              {pickerOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-miami-cyan/40 bg-miami-night-deep/95 backdrop-blur p-2 z-[9999] shadow-xl shadow-miami-pink/30"
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest text-miami-mute px-2 pt-1 pb-1.5">
                    Add to category
                  </p>
                  {data.categories.map((cat) => {
                    const tokens = CATEGORY_COLOR_TOKENS[cat.color];
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        role="menuitem"
                        onClick={() => handleAddWithCategory(cat.id)}
                        className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-miami-ink hover:bg-miami-pink/10"
                      >
                        <span className={`h-2.5 w-2.5 rounded-full ${tokens.dot}`} />
                        <span className="truncate">{cat.name}</span>
                      </button>
                    );
                  })}
                  <div className="my-1.5 h-px bg-miami-pink/15" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleAddWithCategory(null)}
                    className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-miami-mute hover:bg-miami-cyan/10"
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-miami-mute" />
                    No category
                  </button>
                </div>
              )}
            </div>
          </div>

          {data.categories.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {data.categories.map((cat) => {
                const tokens = CATEGORY_COLOR_TOKENS[cat.color];
                return (
                  <li
                    key={cat.id}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${tokens.chip}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${tokens.dot}`} />
                    {cat.name}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-5 pb-24">
        <div
          ref={boardRef}
          className="relative rounded-2xl border border-miami-pink/25 bg-miami-night-deep overflow-auto"
          style={{
            backgroundImage: data.settings.showGrid
              ? 'radial-gradient(circle at 1px 1px, rgba(255,46,147,0.12) 1px, transparent 0), radial-gradient(circle at 1px 1px, rgba(0,229,255,0.08) 1px, transparent 0)'
              : 'none',
            backgroundSize: data.settings.showGrid ? '32px 32px, 64px 64px' : 'auto',
            backgroundPosition: data.settings.showGrid ? '0 0, 16px 16px' : 'auto',
            maxHeight: 'min(70vh, 720px)',
          }}
        >
          <div
            className="relative"
            style={{ width: boardSize.width, height: boardSize.height }}
          >
            {totalNotes === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center px-6">
                  <p className="text-sm font-semibold tracking-widest uppercase text-miami-cyan">
                    Empty board
                  </p>
                  <p className="mt-2 text-base font-bold text-white max-w-sm">
                    Hit <span className="text-miami-pink-light">New note</span> to drop your first
                    sticky onto the neon grid.
                  </p>
                </div>
              </div>
            )}

            {orderedNotes.map((note) => (
              <StickyNoteCard
                key={note.id}
                note={note}
                categories={data.categories}
                glow={data.settings.glow}
                boardEl={boardRef.current}
                trashEl={trashZoneRef.current}
                onChange={(patch) => updateNote(note.id, patch)}
                onDelete={() => removeNote(note.id)}
                onFocusBringToFront={() => bringToFront(note.id)}
                onTrashHover={trashZoneOnHover}
              />
            ))}
          </div>
        </div>
      </div>

      <div
        ref={trashZoneRef}
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-all duration-150 select-none pointer-events-auto ${
          trashHover
            ? 'scale-110 bg-miami-pink-bright text-white shadow-[0_0_30px_rgba(255,46,147,0.85)]'
            : 'bg-miami-night/90 text-miami-pink-light shadow-[0_0_20px_rgba(255,46,147,0.35)]'
        } rounded-full border-2 border-miami-pink/60 px-5 py-3 flex items-center gap-2 backdrop-blur`}
        aria-label="Throw note here"
      >
        <Trash2 className="h-5 w-5" strokeWidth={2.25} aria-hidden />
        <span className="text-xs font-bold uppercase tracking-widest">
          {trashHover ? 'Drop to delete' : 'Trash zone'}
        </span>
      </div>
    </div>
  );
}
