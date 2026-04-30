import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Plus, Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import { useSticky } from './StickyContext';
import { StickyNoteCard } from './StickyNoteCard';
import { CATEGORY_COLOR_TOKENS } from './types';

const BOARD_PADDING = 24;
const MIN_BOARD_W = 1200;
const MIN_BOARD_H = 800;
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.1;

const clampZoom = (value: number) =>
  Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(value * 100) / 100));

export function StickyBoard() {
  const { data, addNote, updateNote, removeNote, bringToFront } = useSticky();
  const boardRef = useRef<HTMLDivElement>(null);
  const trashZoneRef = useRef<HTMLDivElement>(null);
  const [trashHover, setTrashHover] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

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

  // Keep a ref of the latest zoom so native event listeners can read it
  // without re-binding every change (avoids dropped frames during pinch).
  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const setZoomAt = useCallback(
    (target: number, focal?: { clientX: number; clientY: number }) => {
      const board = boardRef.current;
      setZoom((prev) => {
        const next = clampZoom(target);
        if (next === prev) return prev;
        if (board && focal) {
          // Keep the focal point anchored on screen while zooming.
          const rect = board.getBoundingClientRect();
          const px = focal.clientX - rect.left + board.scrollLeft;
          const py = focal.clientY - rect.top + board.scrollTop;
          const scaleRatio = next / prev;
          requestAnimationFrame(() => {
            if (!boardRef.current) return;
            boardRef.current.scrollLeft = px * scaleRatio - (focal.clientX - rect.left);
            boardRef.current.scrollTop = py * scaleRatio - (focal.clientY - rect.top);
          });
        }
        return next;
      });
    },
    [],
  );

  const adjustZoom = useCallback(
    (delta: number, focal?: { clientX: number; clientY: number }) => {
      setZoomAt(zoomRef.current + delta, focal);
    },
    [setZoomAt],
  );

  const resetZoom = useCallback(() => setZoom(1), []);

  // Native wheel listener so we can preventDefault on Ctrl/Cmd+wheel
  // (React's onWheel is passive in modern browsers).
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const handleWheel = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      const delta = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      adjustZoom(delta, { clientX: event.clientX, clientY: event.clientY });
    };
    board.addEventListener('wheel', handleWheel, { passive: false });
    return () => board.removeEventListener('wheel', handleWheel);
  }, [adjustZoom]);

  // Pinch-to-zoom for touch devices. We track raw touch events so we can
  // preventDefault and avoid the browser's page-level pinch-zoom.
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    let pinchStart:
      | { dist: number; zoom: number }
      | null = null;

    const distance = (a: Touch, b: Touch) =>
      Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        const [t1, t2] = [event.touches[0], event.touches[1]];
        pinchStart = { dist: distance(t1, t2), zoom: zoomRef.current };
        event.preventDefault();
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!pinchStart || event.touches.length < 2) return;
      event.preventDefault();
      const [t1, t2] = [event.touches[0], event.touches[1]];
      const newDist = distance(t1, t2);
      if (newDist <= 0) return;
      const ratio = newDist / pinchStart.dist;
      const target = pinchStart.zoom * ratio;
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      setZoomAt(target, { clientX: midX, clientY: midY });
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) pinchStart = null;
    };

    board.addEventListener('touchstart', handleTouchStart, { passive: false });
    board.addEventListener('touchmove', handleTouchMove, { passive: false });
    board.addEventListener('touchend', handleTouchEnd);
    board.addEventListener('touchcancel', handleTouchEnd);
    return () => {
      board.removeEventListener('touchstart', handleTouchStart);
      board.removeEventListener('touchmove', handleTouchMove);
      board.removeEventListener('touchend', handleTouchEnd);
      board.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [setZoomAt]);

  const zoomPercent = Math.round(zoom * 100);

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
        <div className="mb-2 flex items-center justify-end gap-1.5">
          <div
            className="inline-flex items-center gap-1 rounded-xl border border-miami-cyan/35 bg-miami-night/70 px-1.5 py-1 backdrop-blur"
            role="group"
            aria-label="Board zoom"
          >
            <button
              type="button"
              onClick={() => adjustZoom(-ZOOM_STEP)}
              disabled={zoom <= ZOOM_MIN + 1e-6}
              className="inline-flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-lg text-miami-pink-light hover:bg-miami-pink/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-miami-cyan disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Zoom out"
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            </button>
            <button
              type="button"
              onClick={resetZoom}
              className="min-w-[3.25rem] rounded-lg px-2 py-1 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-miami-cyan/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-miami-cyan"
              aria-label={`Reset zoom (currently ${zoomPercent}%)`}
              title="Reset to 100%"
            >
              {zoomPercent}%
            </button>
            <button
              type="button"
              onClick={() => adjustZoom(ZOOM_STEP)}
              disabled={zoom >= ZOOM_MAX - 1e-6}
              className="inline-flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-lg text-miami-cyan hover:bg-miami-cyan/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-miami-cyan disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Zoom in"
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            </button>
            <span className="mx-0.5 h-5 w-px bg-miami-pink/25" aria-hidden />
            <button
              type="button"
              onClick={resetZoom}
              className="inline-flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-lg text-miami-mute hover:bg-miami-cyan/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-miami-cyan"
              aria-label="Fit to 100%"
              title="Reset zoom (pinch on touch · Ctrl/Cmd+wheel on desktop)"
            >
              <Maximize2 className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        </div>

        <div
          ref={boardRef}
          className="relative rounded-2xl border border-miami-pink/25 bg-miami-night-deep overflow-auto overscroll-contain"
          style={{
            backgroundImage: data.settings.showGrid
              ? 'radial-gradient(circle at 1px 1px, rgba(255,46,147,0.12) 1px, transparent 0), radial-gradient(circle at 1px 1px, rgba(0,229,255,0.08) 1px, transparent 0)'
              : 'none',
            backgroundSize: data.settings.showGrid
              ? `${32 * zoom}px ${32 * zoom}px, ${64 * zoom}px ${64 * zoom}px`
              : 'auto',
            backgroundPosition: data.settings.showGrid ? '0 0, 16px 16px' : 'auto',
            maxHeight: 'min(70vh, 720px)',
            // Allow single-finger scroll inside the board, but reserve
            // multi-touch (pinch) for our custom zoom handler.
            touchAction: 'pan-x pan-y',
          }}
        >
          <div
            style={{
              width: boardSize.width * zoom,
              height: boardSize.height * zoom,
              position: 'relative',
            }}
          >
            <div
              className="relative"
              style={{
                width: boardSize.width,
                height: boardSize.height,
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
              }}
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
                  zoom={zoom}
                  onChange={(patch) => updateNote(note.id, patch)}
                  onDelete={() => removeNote(note.id)}
                  onFocusBringToFront={() => bringToFront(note.id)}
                  onTrashHover={trashZoneOnHover}
                />
              ))}
            </div>
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
