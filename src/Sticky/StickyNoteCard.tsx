import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { GripHorizontal, Image as ImageIcon, Layers, Trash2, X } from 'lucide-react';
import {
  CATEGORY_COLOR_TOKENS,
  type StickyCategory,
  type StickyCategoryColor,
  type StickyNote,
} from './types';
import { useSticky } from './StickyContext';
import { compressImageFile } from './media';

const NOTE_MIN_W = 180;
const NOTE_MIN_H = 160;
const NOTE_MAX_W = 480;
const NOTE_MAX_H = 600;

type Props = {
  note: StickyNote;
  categories: StickyCategory[];
  glow: boolean;
  boardEl: HTMLElement | null;
  trashEl: HTMLElement | null;
  onChange: (patch: Partial<StickyNote>) => void;
  onDelete: () => void;
  onFocusBringToFront: () => void;
  onTrashHover: (over: boolean) => void;
};

function getCategoryColor(
  categoryId: string | null,
  categories: StickyCategory[],
): StickyCategoryColor {
  if (!categoryId) return 'pink';
  const found = categories.find((c) => c.id === categoryId);
  return found?.color ?? 'pink';
}

function rectsOverlap(a: DOMRect, b: DOMRect): boolean {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

export function StickyNoteCard({
  note,
  categories,
  glow,
  boardEl,
  trashEl,
  onChange,
  onDelete,
  onFocusBringToFront,
  onTrashHover,
}: Props) {
  const { attachMedia, detachMedia } = useSticky();
  const elRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewMediaId, setPreviewMediaId] = useState<string | null>(null);
  const [text, setText] = useState(note.text);
  const dragState = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
  } | null>(null);
  const resizeState = useRef<{
    pointerId: number;
    startW: number;
    startH: number;
    startX: number;
    startY: number;
  } | null>(null);

  useEffect(() => {
    setText(note.text);
  }, [note.text]);

  const flushTextIfChanged = useCallback(
    (value: string) => {
      if (value !== note.text) onChange({ text: value });
    },
    [note.text, onChange],
  );

  const colorKey = getCategoryColor(note.categoryId, categories);
  const tokens = CATEGORY_COLOR_TOKENS[colorKey];
  const category = categories.find((c) => c.id === note.categoryId) ?? null;

  const checkTrash = useCallback(
    (clientX: number, clientY: number) => {
      if (!trashEl) {
        onTrashHover(false);
        return false;
      }
      const trashRect = trashEl.getBoundingClientRect();
      const point = { x: clientX, y: clientY };
      const inside =
        point.x >= trashRect.left &&
        point.x <= trashRect.right &&
        point.y >= trashRect.top &&
        point.y <= trashRect.bottom;
      onTrashHover(inside);
      return inside;
    },
    [trashEl, onTrashHover],
  );

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    if (!elRef.current) return;
    onFocusBringToFront();
    const targetRect = elRef.current.getBoundingClientRect();
    dragState.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - targetRect.left,
      offsetY: event.clientY - targetRect.top,
      startX: note.x,
      startY: note.y,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // ignore capture failures (e.g. pointer already released)
    }
    setDragging(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragState.current || dragState.current.pointerId !== event.pointerId) return;
    if (!boardEl) return;
    event.preventDefault();
    const boardRect = boardEl.getBoundingClientRect();
    const innerEl = boardEl.firstElementChild as HTMLElement | null;
    const innerWidth = innerEl?.offsetWidth ?? boardRect.width;
    const innerHeight = innerEl?.offsetHeight ?? boardRect.height;
    const newX =
      event.clientX - boardRect.left + boardEl.scrollLeft - dragState.current.offsetX;
    const newY =
      event.clientY - boardRect.top + boardEl.scrollTop - dragState.current.offsetY;
    const clampedX = Math.max(0, Math.min(Math.max(0, innerWidth - note.width), newX));
    const clampedY = Math.max(0, Math.min(Math.max(0, innerHeight - note.height), newY));
    onChange({ x: clampedX, y: clampedY });
    checkTrash(event.clientX, event.clientY);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragState.current || dragState.current.pointerId !== event.pointerId) return;
    const overTrash = checkTrash(event.clientX, event.clientY);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore release failures
    }
    dragState.current = null;
    setDragging(false);
    onTrashHover(false);
    if (overTrash) onDelete();
  };

  const handleResizePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    event.stopPropagation();
    resizeState.current = {
      pointerId: event.pointerId,
      startW: note.width,
      startH: note.height,
      startX: event.clientX,
      startY: event.clientY,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // ignore capture failures
    }
    setResizing(true);
  };

  const handleResizePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!resizeState.current || resizeState.current.pointerId !== event.pointerId) return;
    event.preventDefault();
    const dx = event.clientX - resizeState.current.startX;
    const dy = event.clientY - resizeState.current.startY;
    const w = Math.max(NOTE_MIN_W, Math.min(NOTE_MAX_W, resizeState.current.startW + dx));
    const h = Math.max(NOTE_MIN_H, Math.min(NOTE_MAX_H, resizeState.current.startH + dy));
    onChange({ width: w, height: h });
  };

  const handleResizePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!resizeState.current || resizeState.current.pointerId !== event.pointerId) return;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore release failures
    }
    resizeState.current = null;
    setResizing(false);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    for (const file of Array.from(files)) {
      try {
        const media = await compressImageFile(file);
        attachMedia(note.id, media);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed');
      }
    }
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    void handleFiles(event.target.files);
    event.target.value = '';
  };

  const handleNoteDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      await handleFiles(event.dataTransfer.files);
    }
  };

  // Manual position; ensure pointer rect overlap for trash detection on touch with stale boundingRect.
  useEffect(() => {
    if (!dragging || !elRef.current || !trashEl) return;
    const noteRect = elRef.current.getBoundingClientRect();
    const trashRect = trashEl.getBoundingClientRect();
    onTrashHover(rectsOverlap(noteRect, trashRect));
  }, [dragging, note.x, note.y, trashEl, onTrashHover]);

  const previewMedia = previewMediaId
    ? note.media.find((m) => m.id === previewMediaId) ?? null
    : null;

  return (
    <>
      <div
        ref={elRef}
        className={`absolute select-none rounded-xl shadow-2xl shadow-black/40 backdrop-blur-sm transition-shadow duration-150 ${
          glow ? `ring-2 ring-offset-0 ${tokens.ring}/60` : ''
        } ${dragging ? 'cursor-grabbing scale-[1.02] z-[60]' : ''}`}
        style={{
          left: note.x,
          top: note.y,
          width: note.width,
          height: note.height,
          zIndex: dragging ? 999 : note.zIndex,
          transform: dragging ? `rotate(${note.rotation}deg) scale(1.02)` : `rotate(${note.rotation}deg)`,
        }}
        onPointerDownCapture={onFocusBringToFront}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={handleNoteDrop}
      >
        <div
          className={`flex h-full flex-col rounded-xl overflow-hidden bg-gradient-to-br ${tokens.body} text-white shadow-[0_18px_45px_-22px_rgba(0,0,0,0.9)] border border-white/15`}
        >
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 cursor-grab touch-none ${tokens.header}`}
            style={{ touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            role="button"
            aria-label="Drag note"
          >
            <GripHorizontal className="h-4 w-4 opacity-90" strokeWidth={2.25} aria-hidden />
            <span className="text-[11px] font-bold uppercase tracking-widest truncate">
              {category?.name ?? 'Unfiled'}
            </span>
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="rounded-md p-1 hover:bg-black/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Attach image"
                title="Attach image"
              >
                <ImageIcon className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete();
                }}
                className="rounded-md p-1 hover:bg-black/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Delete note"
                title="Throw away"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
              </button>
            </div>
          </div>

          <div className="px-2.5 pt-1.5 pb-1.5">
            <label className="block">
              <span className="sr-only">Note category</span>
              <select
                value={note.categoryId ?? ''}
                onChange={(event) =>
                  onChange({ categoryId: event.target.value || null })
                }
                onPointerDown={(event) => event.stopPropagation()}
                className="w-full rounded-md border border-white/30 bg-black/25 px-2 py-1 text-[11px] font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <option value="" className="text-miami-night-deep">
                  No category
                </option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id} className="text-miami-night-deep">
                    {cat.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onBlur={(event) => flushTextIfChanged(event.target.value)}
            onPointerDown={(event) => event.stopPropagation()}
            placeholder="Type your reminder…"
            className="flex-1 w-full resize-none bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/70 focus:outline-none"
          />

          {note.media.length > 0 && (
            <div className="px-2 pb-2">
              <div className="grid grid-cols-3 gap-1.5">
                {note.media.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setPreviewMediaId(m.id);
                    }}
                    onPointerDown={(event) => event.stopPropagation()}
                    className="group relative aspect-square overflow-hidden rounded-md border border-white/30 bg-black/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    aria-label={`Open ${m.name}`}
                  >
                    <img
                      src={m.dataUrl}
                      alt={m.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      draggable={false}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {uploadError && (
            <p
              className="mx-2 mb-2 rounded-md bg-black/40 px-2 py-1 text-[11px] text-amber-200"
              role="alert"
            >
              {uploadError}
            </p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
            aria-hidden
          />

          <button
            type="button"
            onPointerDown={handleResizePointerDown}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            onPointerCancel={handleResizePointerUp}
            style={{ touchAction: 'none' }}
            className={`absolute bottom-1 right-1 h-4 w-4 rounded-bl-md cursor-nwse-resize touch-none text-white/70 ${
              resizing ? 'text-white' : ''
            }`}
            aria-label="Resize note"
            title="Drag to resize"
          >
            <Layers className="h-4 w-4 rotate-45" strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      </div>

      {previewMedia && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-miami-night-deep/85 p-4"
          onClick={() => setPreviewMediaId(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden border-2 border-miami-pink-bright shadow-[0_0_40px_rgba(255,46,147,0.5)]"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={previewMedia.dataUrl}
              alt={previewMedia.name}
              className="max-w-full max-h-[85vh] object-contain bg-black"
            />
            <div className="absolute top-2 right-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  detachMedia(note.id, previewMedia.id);
                  setPreviewMediaId(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-miami-pink-bright/95 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-miami-pink"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                Remove
              </button>
              <button
                type="button"
                onClick={() => setPreviewMediaId(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-miami-night-deep/85 text-white border border-miami-pink/45"
                aria-label="Close preview"
              >
                <X className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
