import React, { useEffect, useMemo, useRef, useState } from 'react';
import '../styles/calendar.css';

function startOfWeek(d) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Monday=0
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function formatRangeLabel(date, view) {
  if (view === 'day') {
    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  }
  const start = startOfWeek(date);
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const monthPart = sameMonth
    ? start.toLocaleString(undefined, { month: 'long' })
    : `${start.toLocaleString(undefined, { month: 'short' })} – ${end.toLocaleString(undefined, { month: 'short' })}`;
  return `${monthPart} ${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`;
}

function packOverlaps(events) {
  // Simple greedy packing by time to produce columns for overlapping events (like Google Calendar)
  const sorted = [...events].sort((a, b) => (a.top - b.top) || (b.height - a.height));
  const lanes = [];
  sorted.forEach(e => {
    let placed = false;
    for (const lane of lanes) {
      if (!lane.some(o => !(e.bottom <= o.top || e.top >= o.bottom))) {
        lane.push(e);
        placed = true;
        break;
      }
    }
    if (!placed) lanes.push([e]);
  });
  // Assign width and left based on lane index
  const laneCount = lanes.length || 1;
  lanes.forEach((lane, idx) => lane.forEach(ev => {
    ev.laneIndex = idx;
    ev.laneCount = laneCount;
  }));
  return sorted;
}

function useCalendarLayout({ date, view, dayStart = 0, dayEnd = 24, slotMinutes = 30, blocks }) {
  const days = useMemo(() => {
    if (view === 'day') return [new Date(date)];
    const start = startOfWeek(date);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [date, view]);

  const allDay = useMemo(() => {
    return blocks.filter(b => b.allDay);
  }, [blocks]);

  const timeEvents = useMemo(() => {
    const startMin = dayStart * 60;
    const endMin = dayEnd * 60;
    const perDay = new Map(days.map(d => [d.toDateString(), []]));
    blocks.forEach(b => {
      if (b.allDay) return;
      if (!b.start || !b.end) return;
      const s = new Date(b.start);
      const e = new Date(b.end);
      days.forEach((day) => {
        if (!isSameDay(day, s)) return;
        // compute top/height as percentage of the vertical axis
        const startMinutes = clamp(minutesSinceMidnight(s), startMin, endMin);
        const endMinutes = clamp(minutesSinceMidnight(e), startMin, endMin);
        const top = ((startMinutes - startMin) / (endMin - startMin)) * 100;
        const bottom = ((endMinutes - startMin) / (endMin - startMin)) * 100;
        perDay.get(day.toDateString()).push({
          id: b.id,
          title: b.text || b.title || 'Untitled',
          color: b.color,
          top,
          bottom,
          height: Math.max(2, bottom - top),
          raw: b,
        });
      });
    });
    // pack overlaps per day
    const packed = new Map();
    perDay.forEach((list, key) => {
      const withBottom = list.map(e => ({ ...e, bottom: e.bottom }));
      const out = packOverlaps(withBottom);
      packed.set(key, out);
    });
    return packed;
  }, [blocks, days, dayStart, dayEnd]);

  return { days, allDay, timeEvents };
}

function TimeAxis({ dayStart, dayEnd, slotMinutes }) {
  const labels = [];
  for (let h = dayStart; h <= dayEnd; h++) {
    const h12 = ((h + 11) % 12) + 1;
    const ampm = h >= 12 ? 'PM' : 'AM';
    labels.push({ key: `${h}:00`, label: `${h12} ${ampm}`, isHalf: false });
    if (h !== dayEnd && slotMinutes === 30) {
      labels.push({ key: `${h}:30`, label: '', isHalf: true });
    }
  }
  return (
    <div className="gc-time-axis">
      {labels.map(l => (
        <div key={l.key} className={`gc-time-axis-row ${l.isHalf ? 'half' : ''}`}>
          <span>{l.label}</span>
        </div>
      ))}
    </div>
  );
}

function CalendarHeader({ date, setDate, view, setView, focusMode, onToggleFocus }) {
  const label = useMemo(() => formatRangeLabel(date, view), [date, view]);
  const gotoToday = () => setDate(new Date());
  const prev = () => {
    setDate(d => {
      const x = new Date(d);
      x.setDate(x.getDate() + (view === 'day' ? -1 : -7));
      return x;
    });
  };
  const next = () => {
    setDate(d => {
      const x = new Date(d);
      x.setDate(x.getDate() + (view === 'day' ? 1 : 7));
      return x;
    });
  };
  return (
    <div className="gc-header">
      <div className="gc-left">
        <button className="btn secondary" onClick={gotoToday} aria-label="Go to today">Today</button>
        <div className="gc-nav">
          <button className="icon-btn" onClick={prev} aria-label="Previous period">◀</button>
          <div className="gc-period">{label}</div>
          <button className="icon-btn" onClick={next} aria-label="Next period">▶</button>
        </div>
      </div>
      <div className="gc-right">
        <div className="gc-toggle" role="tablist" aria-label="View toggle">
          <button role="tab" aria-selected={view==='day'} className={`gc-toggle-btn ${view==='day'?'active':''}`} onClick={() => setView('day')}>Day</button>
          <button role="tab" aria-selected={view==='week'} className={`gc-toggle-btn ${view==='week'?'active':''}`} onClick={() => setView('week')}>Week</button>
        </div>
        <button
          className="gc-icon-btn"
          onClick={onToggleFocus}
          aria-pressed={!!focusMode}
          title={focusMode ? 'Minimize calendar' : 'Expand calendar'}
          aria-label={focusMode ? 'Minimize calendar' : 'Expand calendar'}
        >
          {focusMode ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 9l6-6M9 15l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              <path d="M10 4h10v10M4 14v6h6" stroke="currentColor" strokeWidth="1.6" fill="none"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 9H4V4h5M15 15h5v5h-5" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M14 4h6v6M4 14v6h6" stroke="currentColor" strokeWidth="1.6" fill="none"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

function whenToSlotIndex(d, dayStart) {
  const minutes = d.getHours() * 60 + d.getMinutes();
  const fromStart = Math.max(0, minutes - dayStart * 60);
  return Math.floor(fromStart / 30);
}

function AllDayRow({ days, allDay }) {
  return (
    <div className="gc-all-day">
      <div className="gc-all-day-label">All-day</div>
      <div className="gc-all-day-grid" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
        {days.map(day => (
          <div key={day.toDateString()} className="gc-all-day-cell">
            {allDay.filter(e => e.date ? isSameDay(new Date(e.date), day) : true).map(ev => (
              <div key={ev.id} className="gc-chip" style={{ background: ev.color || 'var(--indigo-500)' }} title={ev.text || ev.title}>
                <span className="gc-chip-dot" />
                <span>{ev.text || ev.title}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function DayColumn({ day, events, onOpen }) {
  return (
    <div className="gc-day-col">
      <div className="gc-day-col-inner">
        {events.map(ev => {
          const width = 100 / (ev.laneCount || 1);
          const left = width * (ev.laneIndex || 0);
          const start = ev.raw?.start ? new Date(ev.raw.start) : null;
          const end = ev.raw?.end ? new Date(ev.raw.end) : null;
          const fmt = (d) => d?.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
          return (
            <div
              key={ev.id}
              className="gc-event"
              style={{
                top: `${ev.top}%`,
                height: `${ev.height}%`,
                left: `${left}%`,
                width: `calc(${width}% - 4px)`,
                background: ev.color || 'var(--indigo-500)'
              }}
              role="button"
              tabIndex={0}
              aria-label={`${ev.title}, ${fmt(start)} – ${fmt(end)}`}
              title={`${ev.title} – ${fmt(start)} – ${fmt(end)} (click to add/view attachments)`}
              onClick={(e)=>{ e.stopPropagation(); onOpen?.(ev.id); }}
            >
              <div className="gc-event-title">{ev.title}</div>
              {start && end ? (
                <div className="gc-event-time">{fmt(start)} – {fmt(end)}</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CalendarView({ date, setDate, blocks, onBlocksChange, focusMode=false, onToggleFocus }) {
  const [view, setView] = useState('week');
  const [modal, setModal] = useState({ open: false, blockId: null });
  const fileRef = useRef(null);
  const dayStart = 5;   // 5AM to match current app defaults
  const dayEnd = 23;    // 11PM
  const slotMinutes = 30;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Ensure the app advances to today's date automatically at midnight
  useEffect(() => {
    let timer;
    const scheduleNextMidnight = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(24, 0, 0, 0); // next local midnight
      const ms = next.getTime() - now.getTime();
      timer = setTimeout(() => {
        // Jump the selected date to today to keep calendars fresh daily
        setDate(new Date());
        scheduleNextMidnight();
      }, ms);
    };
    scheduleNextMidnight();
    return () => { if (timer) clearTimeout(timer); };
  }, [setDate]);

  // restore persisted calendar view (day/week)
  useEffect(() => {
    try {
      const v = localStorage.getItem('planner:calendar:view');
      if (v === 'day' || v === 'week') setView(v);
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem('planner:calendar:view', view); } catch {}
  }, [view]);

  const { days, allDay, timeEvents } = useCalendarLayout({ date, view, dayStart, dayEnd, slotMinutes, blocks });

  const openFor = (id) => setModal({ open: true, blockId: id });

  return (
    <section className={`gc-wrapper panel ${focusMode ? 'gc-focus' : ''}`}>
      <CalendarHeader date={date} setDate={setDate} view={view} setView={setView} focusMode={focusMode} onToggleFocus={onToggleFocus} />

      <div className="gc-grid">
        <div className="gc-grid-head" style={{ gridTemplateColumns: `80px repeat(${days.length}, 1fr)` }}>
          <div />
          {days.map((d) => {
            const isToday = isSameDay(d, now);
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            return (
              <div key={d.toDateString()} className={`gc-day-head ${isToday?'today':''} ${isWeekend?'weekend':''}`}>
                <div className="gc-day-head-weekday">{d.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                <div className="gc-day-head-date">{d.getDate()}</div>
              </div>
            );
          })}
        </div>

        <AllDayRow days={days} allDay={allDay} />

        <div className="gc-time-row">
          <TimeAxis dayStart={dayStart} dayEnd={dayEnd} slotMinutes={slotMinutes} />

          <div
            className="gc-time-cols"
            style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}
          >
            {days.map((d) => {
              const isToday = isSameDay(d, now);
              const minNow = now.getHours() * 60 + now.getMinutes();
              const clamped = Math.max(dayStart * 60, Math.min(dayEnd * 60, minNow));
              const nowTop = ((clamped - dayStart * 60) / ((dayEnd - dayStart) * 60)) * 100;
              return (
                <div
                  key={d.toDateString()}
                  className={`gc-day-interactive`}
                  onDoubleClick={(e) => {
                  if (!onBlocksChange) return;
                  // Create a 60-minute block at clicked position for that day
                  const colRect = e.currentTarget.getBoundingClientRect();
                  const y = e.clientY - colRect.top;
                  const pct = Math.max(0, Math.min(1, y / colRect.height));
                  const rawMinutes = dayStart * 60 + Math.round(pct * ((dayEnd - dayStart) * 60));
                  const startMinutes = Math.round(rawMinutes / slotMinutes) * slotMinutes; // snap to slot
                  const start = new Date(d);
                  start.setHours(0, 0, 0, 0);
                  start.setMinutes(startMinutes);
                  const end = new Date(start);
                  end.setMinutes(end.getMinutes() + 60);
                  const title = prompt('New task title (optional):') || 'New task';
                  const id = `cal-${Date.now()}`;
                  onBlocksChange([
                    ...blocks,
                    { id, title, text: title, start, end, allDay: false, attachments: [] }
                  ]);
                  // open attachments modal for newly created item
                  setModal({ open: true, blockId: id });
                }}
                >
                  <DayColumn
                    day={d}
                    events={(timeEvents.get(d.toDateString()) || [])}
                    onOpen={(id)=>openFor(id)}
                  />
                  {isToday ? (
                    <div className="gc-now" style={{ top: `${nowTop}%` }}>
                      <span className="gc-now-dot" />
                      <span className="gc-now-line" />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lightweight attachment modal (duplicated minimally from App) */}
      {modal.open ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Attachments">
          <div className="modal elegant">
            <div className="modal-header">
              <div className="modal-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M21 12.5V17a5 5 0 0 1-5 5H9a7 7 0 1 1 0-14h8a5 5 0 0 1 5 5Z" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M7 12v6a3 3 0 0 0 3 3h5a3 3 0 0 0 3-3v-4" stroke="currentColor" strokeWidth="1.6"/>
                </svg>
                <h3>Attachments</h3>
              </div>
              <div style={{display:'inline-flex', gap:6}}>
                {modal.blockId ? (
                  <button
                    className="icon-btn"
                    title="Delete"
                    aria-label="Delete block"
                    onClick={()=>{
                      onBlocksChange(blocks.filter(b => b.id !== modal.blockId));
                      setModal({open:false, blockId:null});
                    }}
                  >
                    🗑️
                  </button>
                ) : null}
                <button className="icon-btn primary" aria-label="Close" onClick={()=>setModal({open:false, blockId:null})}>✕</button>
              </div>
            </div>
            <div className="modal-body">
              <div className="attach-row">
                <button className="btn mini secondary" onClick={() => fileRef.current?.click()}>Upload files</button>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  className="hidden-input"
                  onChange={(e)=>{
                    const files = e.target.files;
                    if (!files?.length || !modal.blockId) return;
                    const list = Array.from(files).map(f => ({
                      id: crypto.randomUUID(),
                      kind: 'file',
                      name: f.name,
                      mime: f.type || 'application/octet-stream',
                      url: URL.createObjectURL(f)
                    }));
                    onBlocksChange(
                      blocks.map(b => b.id === modal.blockId ? { ...b, attachments: [...(b.attachments||[]), ...list] } : b)
                    );
                  }}
                />
                <button
                  className="btn mini"
                  onClick={()=>{
                    const link = prompt('Paste a link (URL):');
                    if (!link || !modal.blockId) return;
                    const name = prompt('Optional display name:') || link;
                    const item = { id: crypto.randomUUID(), kind: 'link', name, url: link };
                    onBlocksChange(
                      blocks.map(b => b.id === modal.blockId ? { ...b, attachments: [...(b.attachments||[]), item] } : b)
                    );
                  }}
                >
                  Add link
                </button>
              </div>
              <div className="divider"></div>
              <ul className="attach-list">
                {(blocks.find(b=>b.id===modal.blockId)?.attachments || []).map(it => (
                  <li key={it.id} className="attach-item">
                    <a href={it.url} target="_blank" rel="noreferrer" className="attach-link" title={it.name}>
                      <span className="attach-icon">{it.kind === 'link' ? '🔗' : ((it.mime||'').startsWith('image/') ? '🖼️' : '📎')}</span>
                      <span className="attach-name">{it.name || it.url}</span>
                    </a>
                    <button
                      className="block-delete small"
                      onClick={()=>{
                        onBlocksChange(
                          blocks.map(b => b.id === modal.blockId
                            ? { ...b, attachments: (b.attachments||[]).filter(a => a.id !== it.id) }
                            : b
                          )
                        );
                      }}
                      aria-label="Remove"
                    >
                      ×
                    </button>
                    {it.kind === 'file' && (it.mime || '').startsWith('image/') ? (
                      <img src={it.url} alt={it.name} className="attach-thumb" />
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
            <div className="modal-footer">
              <span className="muted-help">You can attach images, PDFs, docs, spreadsheets or links.</span>
              <button className="btn" onClick={()=>setModal({open:false, blockId:null})}>Done</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
