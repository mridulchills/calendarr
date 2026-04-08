import React from 'react';
import { NOTE_COLORS } from '../utils/constants';
import { extractDomain } from '../utils/dateHelpers';

export default function HoverTooltip({ notes, cellRect, containerRect }) {
  if (!notes || notes.length === 0 || !cellRect || !containerRect) return null;

  const cellCenterX = cellRect.left - containerRect.left + cellRect.width / 2;
  const cellTopY = cellRect.top - containerRect.top;
  const cellBottomY = cellRect.bottom - containerRect.top;
  const spaceAbove = cellTopY;
  const showAbove = spaceAbove > 80;

  const style = {
    position: 'absolute',
    left: `${Math.max(10, Math.min(cellCenterX, containerRect.width - 130))}px`,
    transform: 'translateX(-50%)',
    zIndex: 50,
  };

  if (showAbove) {
    style.bottom = `${containerRect.height - cellTopY + 8}px`;
  } else {
    style.top = `${cellBottomY + 8}px`;
  }

  return (
    <div style={style} className={`hover-tooltip ${showAbove ? 'tooltip-arrow-bottom' : 'tooltip-arrow-top'}`}>
      <div className="tooltip-card">
        {notes.slice(0, 3).map((note, i) => {
          const colorObj = NOTE_COLORS.find(c => c.name === note.color) || NOTE_COLORS[3];
          const domain = note.url ? extractDomain(note.url) : null;
          return (
            <div key={note.id} className={`flex items-center gap-2 ${i > 0 ? 'mt-1.5 pt-1.5 border-t border-stone-100' : ''}`}>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colorObj.fg }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-stone-700 truncate">{note.title || 'Untitled'}</p>
                {note.body && <p className="text-[10px] text-stone-400 truncate">{note.body}</p>}
              </div>
              {domain && <span className="text-[10px] text-stone-400 flex-shrink-0">🔗 {domain}</span>}
            </div>
          );
        })}
        {notes.length > 3 && (
          <p className="text-[10px] text-stone-400 mt-1.5 pt-1 border-t border-stone-100">+{notes.length - 3} more</p>
        )}
      </div>
    </div>
  );
}
