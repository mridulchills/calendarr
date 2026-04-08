import React, { memo } from 'react';
import { MONTH_NAMES, DAY_NAMES, NOTE_COLORS, MONTH_ACCENTS } from '../utils/constants';
import { isSameDay, dateToKey } from '../utils/dateHelpers';

/*
 * PageContent is a PURE display component.
 * It renders the image hero + calendar grid as a single portrait page.
 * Used both for normal display and inside flip-animation strips.
 * NO interactivity in this component — events are handled by the parent.
 */
const PageContent = memo(function PageContent({
  month,
  year,
  days,
  imageUrl,
  accent,
  today,
  selectedDate,
  rangeStart,
  rangeEnd,
  noteDots,       // Map<dateKey, color[]>
  isStrip = false, // true when rendered inside a strip (no pointer events)
}) {
  const isRangeEndpoint = (date) => {
    if (!rangeStart || !rangeEnd) return false;
    return isSameDay(date, rangeStart) || isSameDay(date, rangeEnd);
  };
  const isInRange = (date) => {
    if (!rangeStart || !rangeEnd) return false;
    const [s, e] = rangeStart <= rangeEnd ? [rangeStart, rangeEnd] : [rangeEnd, rangeStart];
    return date >= s && date <= e;
  };

  return (
    <div className="page-content" style={{ '--accent': accent, pointerEvents: isStrip ? 'none' : 'auto' }}>
      {/* ── Hero image with gradient bleed ── */}
      <div className="page-hero">
        {imageUrl ? (
          <div
            className="page-hero-bg"
            style={{ backgroundImage: `url(${imageUrl})` }}
          />
        ) : (
          <div className="page-hero-bg" style={{ background: accent }} />
        )}
        <div className="page-hero-fade" />

        {/* Month name overlaid in gradient zone */}
        <div className="month-title" style={{ color: accent }}>
          {MONTH_NAMES[month]}
        </div>

        {/* Nav cluster: year + arrows + today */}
        {!isStrip && (
          <div className="nav-cluster">
            <div className="nav-pill">
              <button className="nav-btn" data-action="prev" aria-label="Previous month">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span className="year-label">{year}</span>
              <button className="nav-btn" data-action="next" aria-label="Next month">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
            <button className="today-pill" data-action="today" aria-label="Go to today">Today</button>
          </div>
        )}
      </div>

      {/* ── Grid area ── */}
      <div className="grid-area">
        {/* Day headers */}
        <div className="day-headers">
          {DAY_NAMES.map((d, i) => (
            <div key={d} className={`day-hdr ${i === 0 || i === 6 ? 'accent' : ''}`}>{d}</div>
          ))}
        </div>

        {/* Date cells */}
        <div className="dates-grid">
          {days.map((day, idx) => {
            const isToday = today && isSameDay(day.date, today);
            const isSel = selectedDate && isSameDay(day.date, selectedDate) && !rangeStart;
            const isEnd = day.isCurrentMonth && isRangeEndpoint(day.date);
            const inR = day.isCurrentMonth && isInRange(day.date) && !isEnd;
            const dots = noteDots?.[day.key] || [];
            const dOW = idx % 7;
            const isWeekend = dOW === 0 || dOW === 6;

            return (
              <div
                key={day.key + idx}
                data-datekey={day.key}
                className={`date-cell${
                  !day.isCurrentMonth ? ' outside' : ''
                }${isToday ? ' today' : ''
                }${isSel ? ' selected' : ''
                }${isEnd ? ' range-end' : ''
                }${inR ? ' in-range' : ''
                }`}
              >
                <span className={`date-num${isWeekend && !isToday && !isEnd ? ' weekend' : ''}`}>
                  {day.date.getDate()}
                </span>
                {dots.length > 0 && (
                  <div className="ndots">
                    {dots.map((c, i) => {
                      const obj = NOTE_COLORS.find(x => x.name === c) || NOTE_COLORS[3];
                      return <div key={i} className="ndot" style={{ background: obj.fg }} />;
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default PageContent;
