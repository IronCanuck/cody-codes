import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Pilcrow,
  Strikethrough,
  Underline as UnderlineIcon,
} from 'lucide-react';
import type { NotepadNote, NotepadSettings } from './types';

const FONT_SIZE_OPTIONS = [
  { label: 'XS', value: '1' },
  { label: 'S', value: '2' },
  { label: 'M', value: '3' },
  { label: 'L', value: '4' },
  { label: 'XL', value: '5' },
  { label: '2XL', value: '6' },
  { label: '3XL', value: '7' },
];

type Props = {
  note: NotepadNote;
  settings: NotepadSettings;
  onChangeTitle: (title: string) => void;
  onChangeBody: (html: string) => void;
};

function execCommand(command: string, value?: string) {
  // contentEditable execCommand is deprecated, but it remains the simplest
  // way to apply inline formatting that integrates naturally with the
  // browser's selection handling — perfectly fine for a personal notepad.
  document.execCommand(command, false, value);
}

export function NoteEditor({ note, settings, onChangeTitle, onChangeBody }: Props) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const lastNoteIdRef = useRef<string | null>(null);
  const [fontSize, setFontSize] = useState('3');

  useEffect(() => {
    if (!bodyRef.current) return;
    if (lastNoteIdRef.current === note.id) return;
    bodyRef.current.innerHTML = note.bodyHtml;
    lastNoteIdRef.current = note.id;
  }, [note.id, note.bodyHtml]);

  const handleInput = useCallback(() => {
    if (!bodyRef.current) return;
    onChangeBody(bodyRef.current.innerHTML);
  }, [onChangeBody]);

  const apply = useCallback(
    (command: string, value?: string) => {
      bodyRef.current?.focus();
      execCommand(command, value);
      handleInput();
    },
    [handleInput],
  );

  const fontFamilyClass =
    settings.fontFamily === 'serif'
      ? 'font-serif'
      : settings.fontFamily === 'mono'
        ? 'font-mono'
        : settings.fontFamily === 'handwriting'
          ? 'font-serif italic'
          : 'font-sans';

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-legalpad-folder-deep/60 bg-legalpad-surface/85 px-3 py-2 sm:px-5 sm:py-3 backdrop-blur sticky top-0 z-20">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <ToolbarButton onClick={() => apply('formatBlock', 'h1')} label="Heading 1" icon={<Heading1 className="h-4 w-4" strokeWidth={2.25} aria-hidden />} />
          <ToolbarButton onClick={() => apply('formatBlock', 'h2')} label="Heading 2" icon={<Heading2 className="h-4 w-4" strokeWidth={2.25} aria-hidden />} />
          <ToolbarButton onClick={() => apply('formatBlock', 'h3')} label="Heading 3" icon={<Heading3 className="h-4 w-4" strokeWidth={2.25} aria-hidden />} />
          <ToolbarButton onClick={() => apply('formatBlock', 'p')} label="Paragraph" icon={<Pilcrow className="h-4 w-4" strokeWidth={2.25} aria-hidden />} />
          <Divider />
          <ToolbarButton onClick={() => apply('bold')} label="Bold" icon={<Bold className="h-4 w-4" strokeWidth={2.5} aria-hidden />} />
          <ToolbarButton onClick={() => apply('italic')} label="Italic" icon={<Italic className="h-4 w-4" strokeWidth={2.25} aria-hidden />} />
          <ToolbarButton onClick={() => apply('underline')} label="Underline" icon={<UnderlineIcon className="h-4 w-4" strokeWidth={2.25} aria-hidden />} />
          <ToolbarButton onClick={() => apply('strikeThrough')} label="Strikethrough" icon={<Strikethrough className="h-4 w-4" strokeWidth={2.25} aria-hidden />} />
          <Divider />
          <ToolbarButton onClick={() => apply('insertUnorderedList')} label="Bulleted list" icon={<List className="h-4 w-4" strokeWidth={2.25} aria-hidden />} />
          <ToolbarButton onClick={() => apply('insertOrderedList')} label="Numbered list" icon={<ListOrdered className="h-4 w-4" strokeWidth={2.25} aria-hidden />} />
          <Divider />
          <label className="inline-flex items-center gap-1.5 rounded-lg border border-legalpad-folder-deep/45 bg-legalpad-page-soft px-2 py-1 text-xs font-semibold text-legalpad-ink-soft">
            Size
            <select
              value={fontSize}
              onChange={(event) => {
                const value = event.target.value;
                setFontSize(value);
                apply('fontSize', value);
              }}
              className="bg-transparent text-legalpad-ink focus:outline-none"
              aria-label="Font size"
            >
              {FONT_SIZE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <input
        type="text"
        value={note.title}
        onChange={(event) => onChangeTitle(event.target.value)}
        placeholder="Untitled note"
        className={`w-full bg-transparent border-0 border-b border-legalpad-rule/50 px-4 sm:px-10 pt-5 pb-2 text-2xl sm:text-3xl font-bold text-legalpad-ink placeholder:text-legalpad-mute focus:outline-none focus:border-legalpad-accent ${fontFamilyClass}`}
        aria-label="Note title"
      />

      <div
        ref={bodyRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        spellCheck
        data-placeholder="Start writing…"
        className={`notepad-editor relative flex-1 min-h-0 overflow-y-auto px-4 sm:px-10 py-6 text-[15px] sm:text-base leading-7 text-legalpad-ink focus:outline-none ${fontFamilyClass}`}
      />
    </div>
  );
}

function ToolbarButton({
  onClick,
  label,
  icon,
}: {
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-legalpad-folder-deep/40 bg-legalpad-page-soft text-legalpad-ink-soft hover:bg-legalpad-folder/60 hover:text-legalpad-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-legalpad-accent transition-colors"
      title={label}
      aria-label={label}
    >
      {icon}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px bg-legalpad-folder-deep/45" aria-hidden />;
}
