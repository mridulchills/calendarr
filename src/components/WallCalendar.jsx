import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import PageContent from './PageContent';
import NotesPanel from './NotesPanel';
import CRUDNoteCard from './CRUDNoteCard';
import HoverTooltip from './HoverTooltip';
import { useNotes } from '../hooks/useNotes';
import { MONTH_ACCENTS, NOTE_COLORS } from '../utils/constants';
import { getCalendarDays, dateToKey, isSameDay, isDateInRange, orderDates } from '../utils/dateHelpers';
import { fetchMonthImages } from '../utils/pexelsApi';

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
  const [flipDir, setFlipDir] = useState(null);
  const [flipPage, setFlipPage] = useState(null); // { month, year, days, imageUrl, accent }
  const [settling, setSettling] = useState(false);
  const isAnimatingRef = useRef(false);

  // Framer Motion values for the flip
  const flipRotateX = useMotionValue(0);
  
  // ── Page bending effects ──
  // Simulates paper flexibility by twisting dynamically at the midpoint
  const flipRotateZ = useTransform(flipRotateX, [0, 90, 180], [0, -3.5, 0]); 
  const flipRotateY = useTransform(flipRotateX, [0, 90, 180], [0, 4, 0]);  
  const flipSkewX = useTransform(flipRotateX, [0, 90, 180], [0, 1.5, 0]);  
  
  // Shadow driven from rotation: peaks at 90 deg (page perpendicular)
  const shadowOpacity = useTransform(flipRotateX, [0, 90, 180], [0, 0.35, 0]);
  const shadowScaleX = useTransform(flipRotateX, [0, 90, 180], [1, 1.4, 1]);

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
  // FLIP LOGIC — Framer Motion single-page
  // ═══════════════════════════════════════
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  const doFlipForward = useCallback(async () => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setCrudDate(null);
    setHoveredDate(null);
    // Clear selection — stale notes panel must not persist across months
    setSelectedDate(null);
    setRangeStart(null);
    setRangeEnd(null);

    const nextM = (month + 1) % 12;
    const nextY = month === 11 ? year + 1 : year;

    // Capture current month for the flipping page
    setFlipPage({
      month, year,
      days: getCalendarDays(year, month),
      imageUrl: currentImageUrl,
      accent: MONTH_ACCENTS[month],
    });

    // Update underlying page to next month immediately (will be revealed)
    setMonth(nextM);
    setYear(nextY);

    // Set up flip: page starts flat (0) and lifts TOWARD viewer, over the binding (+180)
    flipRotateX.set(0);
    setFlipDir('forward');
    setIsFlipping(true);

    // Wait one frame for React to render
    await new Promise(r => requestAnimationFrame(r));

    if (prefersReduced) {
      await new Promise(r => setTimeout(r, 200));
    } else {
      // Forward: 0 → +180 — bottom lifts toward viewer, arcs over the top binding
      await animate(flipRotateX, 180, {
        duration: 0.55,
        ease: [0.4, 0.0, 0.15, 1.0], // slow lift, fast arc, clean land
      });
    }

    // Clean up
    setIsFlipping(false);
    setFlipPage(null);
    setFlipDir(null);
    flipRotateX.set(0);

    // Settle
    setSettling(true);
    setTimeout(() => { setSettling(false); isAnimatingRef.current = false; }, 220);
  }, [month, year, currentImageUrl, flipRotateX, prefersReduced]);

  const doFlipBackward = useCallback(async () => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setCrudDate(null);
    setHoveredDate(null);
    // Clear selection
    setSelectedDate(null);
    setRangeStart(null);
    setRangeEnd(null);

    const prevM = (month + 11) % 12;
    const prevY = month === 0 ? year - 1 : year;

    // Compute incoming (previous) month for the flipping page
    setFlipPage({
      month: prevM, year: prevY,
      days: getCalendarDays(prevY, prevM),
      imageUrl: imageCache[prevM]?.[0]?.url || null,
      accent: MONTH_ACCENTS[prevM],
    });

    // Incoming page starts at +180 (face-down behind the stack)
    flipRotateX.set(180);
    setFlipDir('backward');
    setIsFlipping(true);

    await new Promise(r => requestAnimationFrame(r));

    if (prefersReduced) {
      await new Promise(r => setTimeout(r, 200));
    } else {
      // Backward: +180 → 0 — page springs off the back pile, over the binding, lands face-up
      await animate(flipRotateX, 0, {
        duration: 0.55,
        ease: [0.6, 0.0, 0.2, 1.0], // slight spring-off energy, smooth landing
      });
    }

    // Now swap underlying to previous month
    setMonth(prevM);
    setYear(prevY);

    setIsFlipping(false);
    setFlipPage(null);
    setFlipDir(null);
    flipRotateX.set(0);

    setSettling(true);
    setTimeout(() => { setSettling(false); isAnimatingRef.current = false; }, 220);
  }, [month, year, imageCache, flipRotateX, prefersReduced]);

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

          {/* ── Flipping page — Framer Motion ── */}
          {isFlipping && flipPage && (
            <motion.div
              style={{
                rotateX: flipRotateX,
                rotateZ: flipRotateZ,
                rotateY: flipRotateY,
                skewX: flipSkewX,
                transformOrigin: 'top center',
                transformStyle: 'preserve-3d',
                position: 'absolute',
                inset: 0,
                zIndex: 10,
              }}
            >
              {/* Front face */}
              <div style={{ backfaceVisibility: 'hidden', position: 'relative' }}>
                <PageContent
                  month={flipPage.month}
                  year={flipPage.year}
                  days={flipPage.days}
                  imageUrl={flipPage.imageUrl}
                  accent={flipPage.accent}
                  today={today}
                  selectedDate={null}
                  rangeStart={null}
                  rangeEnd={null}
                  noteDots={{}}
                  isStrip
                />
              </div>
              {/* Back face — warm off-white, like real paper back */}
              <div className="page-back-face" />
            </motion.div>
          )}

          {/* ── Flip shadow — driven by rotateX motion value ── */}
          <motion.div
            style={{
              position: 'absolute',
              bottom: 0,
              left: '10%',
              right: '10%',
              height: '20px',
              background: 'radial-gradient(ellipse, rgba(0,0,0,0.3) 0%, transparent 70%)',
              filter: 'blur(8px)',
              opacity: shadowOpacity,
              scaleX: shadowScaleX,
              pointerEvents: 'none',
              zIndex: 5,
            }}
          />

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
