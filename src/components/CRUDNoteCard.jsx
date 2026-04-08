import React, { useState, useEffect, useRef } from 'react';
import { formatDate } from '../utils/dateHelpers';
import NoteItem from './NoteItem';
import NoteForm from './NoteForm';

export default function CRUDNoteCard({
  date, dateKey, notes,
  onAddNote, onUpdateNote, onDeleteNote,
  onClose, cellRect, containerRect,
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [undoNote, setUndoNote] = useState(null);
  const [undoTimer, setUndoTimer] = useState(null);
  const ref = useRef(null);

  const getPos = () => {
    if (!cellRect || !containerRect) return { top: 80, left: 80, arrow: 'left' };
    const cw = 310, gap = 14;
    const cy = cellRect.top - containerRect.top + cellRect.height / 2;
    const cr = cellRect.right - containerRect.left;
    const cl = cellRect.left - containerRect.left;
    const sr = containerRect.width - cr;
    let left, arrow;
    if (sr >= cw + gap) { left = cr + gap; arrow = 'left'; }
    else if (cl >= cw + gap) { left = cl - cw - gap; arrow = 'right'; }
    else { left = Math.max(6, (containerRect.width - cw) / 2); arrow = 'none'; }
    let top = cy - 28;
    if (top + 340 > containerRect.height) top = Math.max(8, containerRect.height - 348);
    if (top < 8) top = 8;
    return { top, left: Math.max(4, left), arrow };
  };
  const pos = getPos();

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const t = setTimeout(() => document.addEventListener('mousedown', fn), 150);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', fn); };
  }, [onClose]);

  useEffect(() => () => { if (undoTimer) clearTimeout(undoTimer); }, [undoTimer]);

  const handleDel = (id) => {
    const d = onDeleteNote(id);
    if (d) { setUndoNote(d); if (undoTimer) clearTimeout(undoTimer); setUndoTimer(setTimeout(() => setUndoNote(null), 4000)); }
  };
  const handleUndo = () => { if (undoNote) { onAddNote({ ...undoNote }); setUndoNote(null); if (undoTimer) clearTimeout(undoTimer); } };
  const handleSave = (data) => { onAddNote({ ...data, dateKey }); setIsAdding(false); };

  return (
    <div ref={ref} role="dialog" aria-label={`Notes for ${formatDate(date)}`}
      className={`crud-card ${pos.arrow === 'left' ? 'crud-arrow-l' : pos.arrow === 'right' ? 'crud-arrow-r' : ''}`}
      style={{ top: pos.top, left: pos.left }}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-100" style={{ background: 'var(--card-bg)' }}>
        <h3 className="text-sm font-bold text-stone-800">{formatDate(date)}</h3>
        <button onClick={onClose} className="w-6 h-6 rounded-md hover:bg-stone-200/60 flex items-center justify-center text-stone-400 hover:text-stone-600 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-2">
        {notes.length === 0 && !isAdding && (
          <div className="text-center py-5 text-stone-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" className="mx-auto mb-1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <p className="text-[11px]">No notes yet</p>
          </div>
        )}
        {notes.map(n => <NoteItem key={n.id} note={n} onUpdate={onUpdateNote} onDelete={handleDel} />)}
        {isAdding && <NoteForm onSave={handleSave} onCancel={() => setIsAdding(false)} />}
      </div>
      {!isAdding && (
        <div className="px-3 py-2 border-t border-stone-100">
          <button onClick={() => setIsAdding(true)}
            className="w-full text-left text-sm font-medium flex items-center gap-1.5 py-1 transition-colors"
            style={{ color: 'var(--accent)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>Add note
          </button>
        </div>
      )}
      {undoNote && (
        <div className="absolute bottom-2 left-2 right-2 bg-stone-800 text-white text-xs rounded-lg px-3 py-2 flex items-center justify-between undo-toast shadow-lg z-50">
          <span>Deleted</span>
          <button onClick={handleUndo} className="font-semibold ml-3" style={{ color: 'var(--accent)' }}>Undo</button>
        </div>
      )}
    </div>
  );
}
