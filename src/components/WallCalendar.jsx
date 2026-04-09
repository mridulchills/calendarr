import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useMotionValue, animate } from 'framer-motion';
import PageContent from './PageContent';
import NotesPanel from './NotesPanel';
import CRUDNoteCard from './CRUDNoteCard';
import HoverTooltip from './HoverTooltip';
import { useNotes } from '../hooks/useNotes';
import { MONTH_ACCENTS, NOTE_COLORS } from '../utils/constants';
import { getCalendarDays, dateToKey, isSameDay, isDateInRange, orderDates } from '../utils/dateHelpers';
import { fetchMonthImages } from '../utils/pexelsApi';
import { captureTexture, setupThreeScene } from '../utils/threeFlip';

// Fallback custom tween to bypass framer-motion quirks
const runTween = (duration, updateFn, easeFn) => {
  return new Promise(resolve => {
    const start = performance.now();
    const tick = (now) => {
      let t = (now - start) / (duration * 1000);
      if (t >= 1) {
        updateFn(easeFn(1));
        resolve();
        return;
      }
      updateFn(easeFn(t));
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
};

// Cubic bezier approximation
const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export default function WallCalendar() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [todayPulse, setTodayPulse] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 520);

  // ─── Flip state ───
  const [isFlipping, setIsFlipping] = useState(false);
  const [hiddenFlipPage, setHiddenFlipPage] = useState(null); 
  const [settling, setSettling] = useState(false);
  const isAnimatingRef = useRef(false);
  
  const hiddenPageRef = useRef(null);

  // ─── Interaction state ───
  const [crudDate, setCrudDate] = useState(null);
  const [crudCellRect, setCrudCellRect] = useState(null);
  const [hoveredDate, setHoveredDate] = useState(null);
  const [hoveredCellRect, setHoveredCellRect] = useState(null);

  // Drag state (held in refs for DOM perf during mousemove)
  const dragStartRef = useRef(null);
  const dragEndRef = useRef(null);
  const hasDraggedRef = useRef(false);
  const mouseDownDayRef = useRef(null);

  // For final range-commit into React state
  const [rangeCommit, setRangeCommit] = useState(null); // triggers panel update

  const gridAreaRef = useRef(null);
  const scrollAccum = useRef(0);
  const cellRefs = useRef({});

  // ─── Pexels images ───
  const [imageCache, setImageCache] = useState({});
  const [carouselIdx, setCarouselIdx] = useState(0);

  const {
    addNote, updateNote, deleteNote,
    getNotesForDate, getNotesForRange, getNoteDots,
  } = useNotes();

  // ─── Responsive ───
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 520);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  // ─── Fetch images for current & adjacent months ───
  useEffect(() => {
    [month, (month + 1) % 12, (month + 11) % 12].forEach(m => {
      if (!imageCache[m]) {
        fetchMonthImages(m).then(imgs => {
          if (imgs) setImageCache(prev => ({ ...prev, [m]: imgs }));
        });
      }
    });
  }, [month]);

  const currentImages = imageCache[month];
  useEffect(() => {
    if (!currentImages || currentImages.length <= 1) return;
    const t = setInterval(() => setCarouselIdx(p => (p + 1) % currentImages.length), 5000);
    return () => clearInterval(t);
  }, [currentImages]);
  useEffect(() => { setCarouselIdx(0); }, [month]);

  const currentImageUrl = currentImages?.[carouselIdx]?.url || null;

  // ─── Calendar data ───
  const today = useMemo(() => new Date(), []);
  const days = useMemo(() => getCalendarDays(year, month), [year, month]);
  const accent = MONTH_ACCENTS[month];

  const noteDots = useMemo(() => {
    const m = {};
    days.forEach(d => {
      if (d.isCurrentMonth) {
        const dots = getNoteDots(d.key);
        if (dots.length > 0) m[d.key] = dots;
      }
    });
    return m;
  }, [days, getNoteDots]);

  // ═══════════════════════════════════════
  // FLIP LOGIC — Three.js Integration
  // ═══════════════════════════════════════
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  const doFlipForward = useCallback(async () => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setCrudDate(null);
    setHoveredDate(null);
    setSelectedDate(null);
    setRangeStart(null);
    setRangeEnd(null);

    try {
      const nextM = (month + 1) % 12;
      const nextY = month === 11 ? year + 1 : year;

      if (prefersReduced || !gridAreaRef.current) {
        setIsFlipping(true);
        await new Promise(r => setTimeout(r, 200));
        setMonth(nextM);
        setYear(nextY);
        setIsFlipping(false);
        return;
      }

      console.log('doFlipForward: Starting texture capture for current month...');
      // Capture the current month (facing user)
      const currentTexture = await captureTexture(gridAreaRef.current);
      console.log('doFlipForward: Texture captured successfully.');
      const rect = gridAreaRef.current.getBoundingClientRect();
      const threeContainer = gridAreaRef.current.parentElement; // .flip-perspective div

      setIsFlipping(true);

      console.log('doFlipForward: Setting up Three.js scene...');
      // Mount Three.js cover instantly (progress 0) BEFORE updating React state
      const sceneHandle = setupThreeScene(threeContainer, currentTexture, null, rect.width, rect.height);
      sceneHandle.render(0, 'forward');

      console.log('doFlipForward: Scene setup complete. Running animation...');

      // Now safe to update underlying React DOM to next month
      setMonth(nextM);
      setYear(nextY);

      await runTween(0.55, (v) => {
        sceneHandle.render(v, 'forward');
      }, easeInOutCubic);

      sceneHandle.teardown();
      setIsFlipping(false);

      setSettling(true);
      setTimeout(() => { setSettling(false); }, 220);

    } catch (err) {
      console.warn('Flip animation failed (forward), falling back:', err);
      const nextM = (month + 1) % 12;
      const nextY = month === 11 ? year + 1 : year;
      setMonth(nextM);
      setYear(nextY);
      setIsFlipping(false);
    } finally {
      isAnimatingRef.current = false;
    }
  }, [month, year, prefersReduced]);

  const doFlipBackward = useCallback(async () => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setCrudDate(null);
    setHoveredDate(null);
    setSelectedDate(null);
    setRangeStart(null);
    setRangeEnd(null);

    try {
      const prevM = (month + 11) % 12;
      const prevY = month === 0 ? year - 1 : year;

      if (prefersReduced || !gridAreaRef.current) {
        setIsFlipping(true);
        await new Promise(r => setTimeout(r, 200));
        setMonth(prevM);
        setYear(prevY);
        setIsFlipping(false);
        return;
      }

      // Render the previous month in our hidden DOM div and wait for React to mount it
      setHiddenFlipPage({
        month: prevM, year: prevY,
        days: getCalendarDays(prevY, prevM),
        imageUrl: imageCache[prevM]?.[0]?.url || null,
        accent: MONTH_ACCENTS[prevM],
      });
      
      await new Promise(r => setTimeout(r, 50)); // let React render the hidden div and images load loosely

      if (!hiddenPageRef.current) return;

      console.log('doFlipBackward: Starting texture capture for INCOMING month...');
      // Capture incoming month texture
      const incomingTexture = await captureTexture(hiddenPageRef.current);
      console.log('doFlipBackward: Texture captured successfully.');
      const rect = gridAreaRef.current.getBoundingClientRect();
      const threeContainer = gridAreaRef.current.parentElement;

      setIsFlipping(true); // locks interactions

      console.log('doFlipBackward: Setting up Three.js scene...');
      // Mount ThreeJS matching exact backward start state (face down at Math.PI, showing white back)
      const sceneHandle = setupThreeScene(threeContainer, incomingTexture, null, rect.width, rect.height);
      sceneHandle.render(0, 'backward');

      console.log('doFlipBackward: Scene setup complete. Running animation...');

      await runTween(0.55, (v) => {
        sceneHandle.render(v, 'backward');
      }, easeInOutCubic);

      sceneHandle.teardown();
      
      setHiddenFlipPage(null);
      setMonth(prevM);
      setYear(prevY);
      setIsFlipping(false);

      setSettling(true);
      setTimeout(() => { setSettling(false); }, 220);

    } catch (err) {
      console.warn('Flip animation failed (backward), falling back:', err);
      const prevM = (month + 11) % 12;
      const prevY = month === 0 ? year - 1 : year;
      setHiddenFlipPage(null);
      setMonth(prevM);
      setYear(prevY);
      setIsFlipping(false);
    } finally {
      isAnimatingRef.current = false;
    }
  }, [month, year, imageCache, prefersReduced]);

  const navigateMonth = useCallback((dir) => {
    if (dir > 0) doFlipForward();
    else doFlipBackward();
  }, [doFlipForward, doFlipBackward]);

  const goToday = useCallback(() => {
    const tm = now.getMonth(), ty = now.getFullYear();
    if (tm !== month || ty !== year) {
      if (ty > year || (ty === year && tm > month)) doFlipForward();
      else doFlipBackward();
      setTimeout(() => { setTodayPulse(true); setTimeout(() => setTodayPulse(false), 1800); }, 600);
    } else {
      setTodayPulse(true);
      setTimeout(() => setTodayPulse(false), 1800);
    }
  }, [month, year, doFlipForward, doFlipBackward]);

  // ═══════════════════════════════════════
  // EVENT HANDLERS — click, drag, hover
  // ═══════════════════════════════════════
  const handleMainClick = useCallback((e) => {
    if (isAnimatingRef.current) return;
    const btn = e.target.closest('[data-action]');
    if (btn) {
      e.stopPropagation();
      const a = btn.dataset.action;
      if (a === 'prev') navigateMonth(-1);
      else if (a === 'next') navigateMonth(1);
      else if (a === 'today') goToday();
    }
  }, [navigateMonth, goToday]);

  // ─── Drag highlighting via direct DOM ───
  const clearDragHighlights = useCallback(() => {
    if (!gridAreaRef.current) return;
    gridAreaRef.current.querySelectorAll('.drag-active, .drag-endpoint').forEach(el => {
      el.classList.remove('drag-active', 'drag-endpoint');
    });
  }, []);

  const applyDragHighlights = useCallback((start, end) => {
    if (!gridAreaRef.current || !start || !end) return;
    clearDragHighlights();
    const [s, e] = orderDates(start, end);
    days.forEach(d => {
      if (!d.isCurrentMonth) return;
      const cell = cellRefs.current[d.key];
      if (!cell) return;
      if (isDateInRange(d.date, s, e)) {
        cell.classList.add('drag-active');
        if (isSameDay(d.date, s) || isSameDay(d.date, e)) {
          cell.classList.add('drag-endpoint');
        }
      }
    });
  }, [days, clearDragHighlights]);

  // Mouse down
  const handleMouseDown = useCallback((e) => {
    if (isAnimatingRef.current || isFlipping) return;
    const cell = e.target.closest('[data-datekey]');
    if (!cell || cell.closest('.outside')) return;
    const key = cell.dataset.datekey;
    const day = days.find(d => d.key === key);
    if (!day || !day.isCurrentMonth) return;

    mouseDownDayRef.current = day;
    dragStartRef.current = day.date;
    dragEndRef.current = day.date;
    hasDraggedRef.current = false;
  }, [days, isFlipping]);

  // Mouse move
  const handleMouseMove = useCallback((e) => {
    if (!mouseDownDayRef.current) return;
    const cell = e.target.closest('[data-datekey]');
    if (!cell) return;
    const key = cell.dataset.datekey;
    const day = days.find(d => d.key === key);
    if (!day || !day.isCurrentMonth) return;

    if (!isSameDay(day.date, mouseDownDayRef.current.date)) {
      hasDraggedRef.current = true;
      setCrudDate(null);
    }
    dragEndRef.current = day.date;

    // Live DOM highlighting
    if (hasDraggedRef.current) {
      applyDragHighlights(dragStartRef.current, dragEndRef.current);
    }
  }, [days, applyDragHighlights]);

  // Mouse up
  const handleMouseUp = useCallback((e) => {
    if (!mouseDownDayRef.current) return;

    clearDragHighlights();

    if (hasDraggedRef.current && dragStartRef.current && dragEndRef.current &&
        !isSameDay(dragStartRef.current, dragEndRef.current)) {
      // Range selection
      const [s, eDate] = orderDates(dragStartRef.current, dragEndRef.current);
      setRangeStart(s); setRangeEnd(eDate); setSelectedDate(null);
    } else {
      // Single click
      const cell = e.target.closest('[data-datekey]');
      if (cell) {
        const key = cell.dataset.datekey;
        const day = days.find(d => d.key === key);
        if (day && day.isCurrentMonth) {
          setSelectedDate(day.date);
          setRangeStart(null); setRangeEnd(null);
          setCrudDate(day.date);
          const el = cellRefs.current[key];
          if (el) setCrudCellRect(el.getBoundingClientRect());
        }
      }
    }
    mouseDownDayRef.current = null;
    dragStartRef.current = null;
    dragEndRef.current = null;
    hasDraggedRef.current = false;
  }, [days, clearDragHighlights]);

  // Global mouseup (cancel drag if mouse leaves grid)
  useEffect(() => {
    const fn = () => {
      if (mouseDownDayRef.current) {
        clearDragHighlights();
        if (hasDraggedRef.current && dragStartRef.current && dragEndRef.current) {
          const [s, e] = orderDates(dragStartRef.current, dragEndRef.current);
          setRangeStart(s); setRangeEnd(e); setSelectedDate(null);
        }
        mouseDownDayRef.current = null;
        dragStartRef.current = null;
        dragEndRef.current = null;
        hasDraggedRef.current = false;
      }
    };
    document.addEventListener('mouseup', fn);
    return () => document.removeEventListener('mouseup', fn);
  }, [clearDragHighlights]);

  // Hover tooltip
  const handleCellEnter = useCallback((e) => {
    if (mouseDownDayRef.current || crudDate || isAnimatingRef.current) return;
    const cell = e.target.closest('[data-datekey]');
    if (!cell || cell.closest('.outside')) { setHoveredDate(null); return; }
    const key = cell.dataset.datekey;
    const dots = getNoteDots(key);
    if (dots.length > 0) {
      setHoveredDate(key);
      setHoveredCellRect(cell.getBoundingClientRect());
    } else setHoveredDate(null);
  }, [crudDate, getNoteDots]);

  const handleCellLeave = useCallback(() => setHoveredDate(null), []);

  // Scroll to navigate
  useEffect(() => {
    const el = gridAreaRef.current;
    if (!el || isMobile) return;
    const fn = (e) => {
      e.preventDefault();
      scrollAccum.current += e.deltaY;
      if (Math.abs(scrollAccum.current) > 100) {
        navigateMonth(scrollAccum.current > 0 ? 1 : -1);
        scrollAccum.current = 0;
      }
    };
    el.addEventListener('wheel', fn, { passive: false });
    return () => el.removeEventListener('wheel', fn);
  }, [navigateMonth, isMobile]);

  // Escape key
  useEffect(() => {
    const fn = (e) => {
      if (e.key === 'Escape') {
        if (crudDate) setCrudDate(null);
        else { setSelectedDate(null); setRangeStart(null); setRangeEnd(null); }
      }
    };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [crudDate]);

  // Clear all interaction state on month change
  useEffect(() => {
    setCrudDate(null);
    setHoveredDate(null);
  }, [month, year]);

  // Attach refs after render
  useEffect(() => {
    const el = gridAreaRef.current;
    if (!el) return;
    el.querySelectorAll('[data-datekey]').forEach(n => {
      cellRefs.current[n.dataset.datekey] = n;
    });
  });

  // ─── Panel notes ───
  const panelNotes = useMemo(() => {
    if (rangeStart && rangeEnd) return getNotesForRange(dateToKey(rangeStart), dateToKey(rangeEnd));
    if (selectedDate) return getNotesForDate(dateToKey(selectedDate));
    return [];
  }, [selectedDate, rangeStart, rangeEnd, getNotesForDate, getNotesForRange]);

  const getContainerRect = () => gridAreaRef.current?.getBoundingClientRect();

  const ringCount = isMobile ? 20 : 28;

  // ═══════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════
  return (
    <div className="calendar-shell" style={{ '--accent': accent }}>
      {/* Hook */}
      <div className="hook-container" aria-hidden="true">
        <div className="hook-dot" /><div className="hook-wire" />
      </div>

      {/* Stack layers */}
      <div className={`stack-layer stack-layer-2 ${settling ? 'stack-settle-2' : ''}`} />
      <div className={`stack-layer stack-layer-1 ${settling ? 'stack-settle-1' : ''}`} />

      {/* Main card */}
      <div className="main-card" onClick={handleMainClick}>
        {/* Spiral rings */}
        <div className="rings-bar" aria-hidden="true">
          {Array.from({ length: ringCount }, (_, i) => <div key={i} className="ring" />)}
        </div>

        {/* ── Perspective flip container ── */}
        <div className="flip-perspective">

          {/* Underlying page — always at rest, shows current month */}
          <div
            ref={gridAreaRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseOver={handleCellEnter}
            onMouseLeave={handleCellLeave}
          >
            <PageContent
              month={month}
              year={year}
              days={days}
              imageUrl={currentImageUrl}
              accent={accent}
              today={today}
              selectedDate={selectedDate}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              noteDots={noteDots}
            />
          </div>

          {/* Hidden block for capturing previous month via html2canvas */}
          {hiddenFlipPage && (
            <div style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', zIndex: -100 }}>
              <div ref={hiddenPageRef} style={{ width: gridAreaRef.current?.offsetWidth || 480, background: 'var(--card-bg)', borderRadius: '0 0 6px 6px' }}>
                <PageContent
                  month={hiddenFlipPage.month}
                  year={hiddenFlipPage.year}
                  days={hiddenFlipPage.days}
                  imageUrl={hiddenFlipPage.imageUrl}
                  accent={hiddenFlipPage.accent}
                  today={today}
                  selectedDate={null}
                  rangeStart={null}
                  rangeEnd={null}
                  noteDots={{}}
                  isStrip
                />
              </div>
            </div>
          )}

          {/* Hover tooltip */}
          {hoveredDate && !crudDate && !isFlipping && (
            <HoverTooltip
              notes={getNotesForDate(hoveredDate)}
              cellRect={hoveredCellRect}
              containerRect={getContainerRect()}
            />
          )}

          {/* CRUD note card */}
          {crudDate && !isMobile && !isFlipping && (
            <CRUDNoteCard
              date={crudDate}
              dateKey={dateToKey(crudDate)}
              notes={getNotesForDate(dateToKey(crudDate))}
              onAddNote={addNote}
              onUpdateNote={updateNote}
              onDeleteNote={deleteNote}
              onClose={() => setCrudDate(null)}
              cellRect={crudCellRect}
              containerRect={getContainerRect()}
            />
          )}
        </div>

        {/* Notes area below grid */}
        {(selectedDate || rangeStart) && !isFlipping && (
          <div className="notes-area custom-scrollbar">
            <NotesPanel
              selectedDate={selectedDate}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              notes={panelNotes}
              onAddNote={addNote}
              onUpdateNote={updateNote}
              onDeleteNote={deleteNote}
              isMobile={false}
            />
          </div>
        )}
      </div>

      {/* Mobile bottom sheet */}
      {isMobile && (selectedDate || rangeStart) && !isFlipping && (
        <NotesPanel
          selectedDate={selectedDate}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          notes={panelNotes}
          onAddNote={addNote}
          onUpdateNote={updateNote}
          onDeleteNote={deleteNote}
          isMobile
        />
      )}
    </div>
  );
}
