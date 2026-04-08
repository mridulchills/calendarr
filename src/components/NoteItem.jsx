import React, { useState } from 'react';
import { NOTE_COLORS } from '../utils/constants';
import { extractDomain } from '../utils/dateHelpers';
import NoteForm from './NoteForm';

function LinkChip({ url, clickable = true }) {
  const domain = extractDomain(url);
  if (!domain) return null;

  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;

  if (clickable) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-stone-100 rounded-full text-xs text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition-all max-w-[140px]"
        onClick={(e) => e.stopPropagation()}
      >
        <img src={faviconUrl} alt="" className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">{domain}</span>
      </a>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-stone-100 rounded-full text-xs text-stone-500 max-w-[120px]">
      <span className="text-[10px]">🔗</span>
      <span className="truncate">{domain}</span>
    </span>
  );
}

export default function NoteItem({ note, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSliding, setIsSliding] = useState(false);
  const colorObj = NOTE_COLORS.find(c => c.name === note.color) || NOTE_COLORS[3];

  const handleDelete = (e) => {
    e.stopPropagation();
    setIsSliding(true);
    setTimeout(() => {
      onDelete(note.id);
    }, 300);
  };

  const handleSave = (updatedNote) => {
    onUpdate({ ...updatedNote, id: note.id });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <NoteForm
        note={note}
        onSave={handleSave}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div
      className={`group relative flex items-start gap-3 p-3 rounded-lg hover:bg-stone-50 transition-all cursor-default ${
        isSliding ? 'animate-slide-out' : ''
      }`}
      style={{ borderLeft: `3px solid ${colorObj.fg}` }}
    >
      {/* Color dot */}
      <div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5"
        style={{ backgroundColor: colorObj.fg }}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-stone-800 truncate">{note.title || 'Untitled'}</p>
        {note.body && (
          <p className="text-xs text-stone-500 truncate mt-0.5">{note.body}</p>
        )}
        {note.url && (
          <div className="mt-1">
            <LinkChip url={note.url} />
          </div>
        )}
      </div>

      {/* Actions (on hover) */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
          className="w-7 h-7 rounded-md hover:bg-stone-200 flex items-center justify-center text-stone-400 hover:text-stone-600 transition-all"
          aria-label="Edit note"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          onClick={handleDelete}
          className="w-7 h-7 rounded-md hover:bg-red-50 flex items-center justify-center text-stone-400 hover:text-red-500 transition-all"
          aria-label="Delete note"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export { LinkChip };
