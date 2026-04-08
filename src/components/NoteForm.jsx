import React, { useState } from 'react';
import { NOTE_COLORS } from '../utils/constants';
import { normalizeUrl, extractDomain } from '../utils/dateHelpers';

export default function NoteForm({ note, onSave, onCancel }) {
  const [title, setTitle] = useState(note?.title || '');
  const [body, setBody] = useState(note?.body || '');
  const [color, setColor] = useState(note?.color || 'sky');
  const [url, setUrl] = useState(note?.url || '');

  const handleSave = () => {
    const normalizedUrl = normalizeUrl(url);
    onSave({
      ...(note || {}),
      title: title.trim() || 'Untitled',
      body: body.trim(),
      color,
      url: normalizedUrl,
    });
  };

  return (
    <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 animate-fade-in">
      <input
        type="text"
        placeholder="Note title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all"
        autoFocus
      />

      <textarea
        placeholder="Add details..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        className="w-full mt-2 px-3 py-2 bg-white border border-stone-200 rounded-md text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all resize-none"
      />

      {/* URL field */}
      <div className="mt-2 flex items-center gap-2">
        <div className="flex items-center flex-1 bg-white border border-stone-200 rounded-md px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-300 focus-within:border-indigo-400 transition-all">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mr-2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <input
            type="text"
            placeholder="Add link (optional)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={() => {
              if (url.trim()) {
                const normalized = normalizeUrl(url);
                if (normalized) setUrl(normalized);
              }
            }}
            className="w-full text-sm focus:outline-none"
          />
        </div>
      </div>

      {/* Color picker */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-stone-400 mr-1">Color:</span>
        {NOTE_COLORS.map((c) => (
          <button
            key={c.name}
            onClick={() => setColor(c.name)}
            className={`w-6 h-6 rounded-full transition-all flex-shrink-0 ${
              color === c.name ? 'ring-2 ring-offset-2 scale-110' : 'hover:scale-110'
            }`}
            style={{
              backgroundColor: c.fg,
              ringColor: c.ring,
            }}
            aria-label={`Select ${c.name} color`}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-700 hover:bg-stone-200 rounded-md transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-1.5 text-xs bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-all font-medium shadow-sm"
        >
          Save
        </button>
      </div>
    </div>
  );
}
