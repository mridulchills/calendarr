import React, { useState, useRef, useEffect } from 'react';
import { formatDate, formatShortDate, daysBetween, dateToKey } from '../utils/dateHelpers';
import NoteItem from './NoteItem';
import NoteForm from './NoteForm';

export default function NotesPanel({
  selectedDate, rangeStart, rangeEnd,
  notes, onAddNote, onUpdateNote, onDeleteNote, isMobile,
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [undoNote, setUndoNote] = useState(null);
  const [undoTimer, setUndoTimer] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const dragY = useRef(null);

  useEffect(() => { setIsAdding(false); }, [selectedDate, rangeStart, rangeEnd]);
  useEffect(() => { if (isMobile && (selectedDate || rangeStart)) setSheetOpen(true); }, [selectedDate, rangeStart, isMobile]);

  const handleDelete = (id) => {
    const d = onDeleteNote(id);
    if (d) { setUndoNote(d); if (undoTimer) clearTimeout(undoTimer); setUndoTimer(setTimeout(() => setUndoNote(null), 4000)); }
  };
  const handleUndo = () => {
    if (undoNote) { onAddNote({ ...undoNote }); setUndoNote(null); if (undoTimer) clearTimeout(undoTimer); }
  };
  const handleSave = (data) => {
    if (rangeStart && rangeEnd) onAddNote({ ...data, rangeStart: dateToKey(rangeStart), rangeEnd: dateToKey(rangeEnd) });
    else if (selectedDate) onAddNote({ ...data, dateKey: dateToKey(selectedDate) });
    setIsAdding(false);
  };

  const isRange = rangeStart && rangeEnd;
  const has = selectedDate || isRange;
  let header = '', sub = '';
  if (isRange) { header = `${formatShortDate(rangeStart)} – ${formatShortDate(rangeEnd)}`; sub = `${daysBetween(rangeStart, rangeEnd)} days`; }
  else if (selectedDate) header = formatDate(selectedDate);

  const inner = (
    <div className="relative">
      {has && (
        <>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-sm font-bold text-stone-800">{header}</h4>
              {sub && <p className="text-[11px] text-stone-400">{sub}</p>}
            </div>
            {!isAdding && (
              <button onClick={() => setIsAdding(true)}
                className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
                style={{ color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 8%, transparent)' }}>
                + Add note
              </button>
            )}
          </div>
          {notes.length === 0 && !isAdding && (
            <p className="text-center py-6 text-xs text-stone-400">No notes yet</p>
          )}
          {notes.map(n => <NoteItem key={n.id} note={n} onUpdate={onUpdateNote} onDelete={handleDelete} />)}
          {isAdding && <NoteForm onSave={handleSave} onCancel={() => setIsAdding(false)} />}
        </>
      )}
      {undoNote && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-xs rounded-full px-4 py-2.5 flex items-center gap-3 undo-toast shadow-lg z-[100]">
          <span>Note deleted</span>
          <button onClick={handleUndo} className="font-semibold" style={{ color: 'var(--accent)' }}>Undo</button>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div className={`bottom-sheet ${sheetOpen ? 'h-[50vh]' : 'h-[70px]'}`}
        onTouchStart={e => { dragY.current = e.touches[0].clientY; }}
        onTouchMove={e => {
          if (dragY.current === null) return;
          const d = dragY.current - e.touches[0].clientY;
          if (d > 40) { setSheetOpen(true); dragY.current = null; }
          else if (d < -40) { setSheetOpen(false); dragY.current = null; }
        }}
        onTouchEnd={() => { dragY.current = null; }}>
        <div className="cursor-grab py-2" onClick={() => setSheetOpen(!sheetOpen)}><div className="sheet-bar" /></div>
        {!sheetOpen && has && <div className="px-4 pb-2"><p className="text-sm font-semibold text-stone-700 truncate">{header}</p></div>}
        {sheetOpen && <div className="px-4 pb-4 overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(50vh - 48px)' }}>{inner}</div>}
      </div>
    );
  }

  return inner;
}
