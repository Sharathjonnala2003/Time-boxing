import React, { useEffect, useMemo, useRef, useState } from 'react';
import './index.css';
import './styles/components.css';
import './styles/attachments.css';
import CalendarView from './components/CalendarView.jsx';

const START_HOUR = 5;   // 5 AM
const END_HOUR = 23;    // 11 PM
const SLOT_MINUTES = 30;

function timeKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function range(n) { return Array.from({ length: n }, (_, i) => i); }
function hoursRange(start, end) { return range(end - start + 1).map(i => start + i); }

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function Header({ date, setDate, onClear, viewMode, setViewMode }) {
  const inputRef = useRef(null);
  const iso = useMemo(() => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [date]);

  return (
    <header className="header">
      <div className="title">
        <h1>Daily Timeboxing Planner</h1>
        <p className="subtitle">Plan your day in focused blocks</p>
      </div>
      <div className="header-actions">
        <div className="field date-field">
          <label className="field-label" htmlFor="planner-date">Date</label>
          <div className="date-wrapper">
            <input
              id="planner-date"
              aria-label="Choose date"
              className="date-input"
              type="date"
              ref={inputRef}
              value={iso}
              onChange={e => setDate(new Date(e.target.value))}
            />
            <button
              type="button"
              className="date-button"
              aria-label="Open date picker"
              onClick={() => {
                if (inputRef.current?.showPicker) inputRef.current.showPicker();
                else inputRef.current?.focus();
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.6"/>
                <path d="M3 10h18M9 5v4" stroke="currentColor" strokeWidth="1.6"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="field header-toggle" aria-label="Toggle view" role="tablist">
          <div className="segmented header-segmented">
            <button
              role="tab"
              aria-selected={viewMode==='list'}
              className={`segmented-btn ${viewMode==='list' ? 'active' : ''}`}
              onClick={()=>setViewMode('list')}
              title="List view"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              <span style={{marginLeft:6}}>List</span>
            </button>
            <button
              role="tab"
              aria-selected={viewMode==='calendar'}
              className={`segmented-btn ${viewMode==='calendar' ? 'active' : ''}`}
              onClick={()=>setViewMode('calendar')}
              title="Calendar view"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.6"/>
                <path d="M3 10h18M9 5v4" stroke="currentColor" strokeWidth="1.6"/>
              </svg>
              <span style={{marginLeft:6}}>Calendar</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function PriorityList({ priorities, setPriorities }) {
  const update = (i, val) => {
    const next = [...priorities];
    next[i] = val;
    setPriorities(next);
  };
  return (
    <section className="panel">
      <h2>Top Priorities</h2>
      {range(3).map(i => (
        <input
          key={i}
          className="input priority-input"
          placeholder={`Priority ${i + 1}`}
          value={priorities[i] || ''}
          onChange={e => update(i, e.target.value)}
        />
      ))}
    </section>
  );
}

function BrainDump({ notes, setNotes }) {
  const [local, setLocal] = useState(notes || '');
  const [charCount, setCharCount] = useState((notes || '').length);

  useEffect(() => {
    setLocal(notes || '');
    setCharCount((notes || '').length);
  }, [notes]);

  const onChange = (e) => {
    const v = e.target.value;
    setLocal(v);
    setCharCount(v.length);
    setNotes(v);
  };

  const onClear = () => {
    setLocal('');
    setCharCount(0);
    setNotes('');
  };

  const onExport = () => {
    const blob = new Blob([local], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0,10);
    a.download = `brain-dump-${dateStr}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="panel">
      <h2>
        <span aria-hidden="true">🧠</span>
        Brain Dump
      </h2>
      <textarea
        className="textarea lined"
        placeholder="Jot ideas, tasks, and reminders..."
        value={local}
        onChange={onChange}
        aria-label="Brain dump notes"
      />
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12}}>
        <span className="muted-help">{charCount} chars</span>
        <div style={{display:'flex', gap:8}}>
          <button className="btn secondary" onClick={onExport} aria-label="Export brain dump as text">Export</button>
          <button className="btn" onClick={onClear} aria-label="Clear brain dump">Clear</button>
        </div>
      </div>
    </section>
  );
}

/* Removed ColorLegend to reduce cognitive load per request */

function BlockActions({ onAdd, onOpen }) {
  return (
    <div className="block-actions" role="toolbar" aria-label="Block actions">
      <button className="icon-btn" title="Attach" aria-label="Attach resources" onClick={onOpen}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M21 12.5V17a5 5 0 0 1-5 5H9a7 7 0 1 1 0-14h8a5 5 0 0 1 5 5Z" stroke="currentColor" strokeWidth="1.6" />
          <path d="M7 12v6a3 3 0 0 0 3 3h5a3 3 0 0 0 3-3v-4" stroke="currentColor" strokeWidth="1.6"/>
        </svg>
      </button>
      <button className="icon-btn" title="Open attachments" aria-label="Open attachments" onClick={onOpen}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
}

function AttachmentModal({ open, onClose, onAdd, items, onRemove }) {
  const fileRef = useRef(null);
  if (!open) return null;

  const handleFiles = (files) => {
    if (!files?.length) return;
    const list = Array.from(files).map(f => ({
      id: crypto.randomUUID(),
      kind: 'file',
      name: f.name,
      mime: f.type || 'application/octet-stream',
      url: URL.createObjectURL(f)
    }));
    onAdd(list);
  };

  const addLink = () => {
    const link = prompt('Paste a link (URL):');
    if (!link) return;
    const name = prompt('Optional display name:') || link;
    onAdd([{ id: crypto.randomUUID(), kind: 'link', name, url: link }]);
  };

  return (
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
          <button className="icon-btn primary" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="attach-row">
            <button className="btn mini secondary" onClick={() => fileRef.current?.click()}>Upload files</button>
            <input ref={fileRef} type="file" multiple className="hidden-input" onChange={(e)=>handleFiles(e.target.files)} />
            <button className="btn mini" onClick={addLink}>Add link</button>
          </div>
          <div className="divider"></div>
          <AttachmentList items={items} onRemove={onRemove} />
        </div>
        <div className="modal-footer">
          <span className="muted-help">You can attach images, PDFs, docs, spreadsheets or links.</span>
          <button className="btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

function AttachmentList({ items, onRemove }) {
  if (!items?.length) return null;
  const iconFor = (it) => {
    if (it.kind === 'link') return '🔗';
    const t = (it.mime || '').toLowerCase();
    if (t.startsWith('image/')) return '🖼️';
    if (t.includes('pdf')) return '📄';
    if (t.includes('word') || it.name?.match(/\.(docx?|rtf)$/i)) return '📝';
    if (t.includes('powerpoint') || it.name?.match(/\.(pptx?)$/i)) return '📽️';
    if (t.includes('excel') || it.name?.match(/\.(xlsx?|csv)$/i)) return '📊';
    return '📎';
  };

  return (
    <ul className="attach-list">
      {items.map(it => (
        <li key={it.id} className="attach-item">
          <a href={it.url} target="_blank" rel="noreferrer" className="attach-link" title={it.name}>
            <span className="attach-icon">{iconFor(it)}</span>
            <span className="attach-name">{it.name || it.url}</span>
          </a>
          <button className="block-delete small" onClick={() => onRemove(it.id)} aria-label="Remove">×</button>
          {it.kind === 'file' && (it.mime || '').startsWith('image/') ? (
            <img src={it.url} alt={it.name} className="attach-thumb" />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function slotIndexToDate(date, slotIdx) {
  // Map current app's START_HOUR/SLOT_MINUTES to a concrete Date on the selected day
  const base = new Date(date);
  base.setHours(0,0,0,0);
  const minutes = (START_HOUR * 60) + (slotIdx * SLOT_MINUTES);
  const d = new Date(base);
  d.setMinutes(minutes);
  return d;
}
function ensureTimedFieldsFromSlot(date, block) {
  // If this is a slot-* block, infer start/end Date from its slot indexes for calendar sync
  if (!String(block.id).startsWith('slot-')) return block;
  const startIdx = typeof block.start === 'number' ? block.start : Number(String(block.id).split('-')[1] || 0);
  const endIdx = typeof block.end === 'number' ? block.end : startIdx;
  const start = slotIndexToDate(date, startIdx);
  const end = slotIndexToDate(date, endIdx + 1); // exclusive end by next slot
  return { ...block, start, end, allDay: false };
}
function ScheduleGrid({ blocks, setBlocks, date }) {
  const [dragging, setDragging] = useState(null); // {start, end}
  const [modal, setModal] = useState({ open: false, blockId: null });
  const totalSlots = useMemo(() => {
    const hours = END_HOUR - START_HOUR + 1;
    return hours * (60 / SLOT_MINUTES);
  }, []);

  const timeToSlot = (hour, min) => {
    const minutesFromStart = (hour - START_HOUR) * 60 + min;
    return Math.max(0, Math.min(totalSlots - 1, Math.floor(minutesFromStart / SLOT_MINUTES)));
  };

  const onMouseDown = (slotIdx) => setDragging({ start: slotIdx, end: slotIdx });
  const onMouseEnter = (slotIdx) => { if (dragging) setDragging(d => ({ ...d, end: slotIdx })); };
  const onMouseUp = () => {
    if (!dragging) return;
    // End selection without creating a separate random-id block,
    // to keep attachment/text state unified with per-slot blocks (slot-${slotIdx})
    setDragging(null);
  };

  const removeBlock = (id) => setBlocks(prev => prev.filter(b => b.id !== id));
  const updateText = (id, text) => setBlocks(prev => prev.map(b => (b.id === id ? { ...b, text } : b)));
  const addAttachments = (id, items) =>
    setBlocks(prev => prev.map(b => (b.id === id ? { ...b, attachments: [...(b.attachments || []), ...items] } : b)));
  const removeAttachment = (id, attId) =>
    setBlocks(prev => prev.map(b => (b.id === id ? { ...b, attachments: b.attachments.filter(a => a.id !== attId) } : b)));

  const slotStartDate = (slotIdx) => slotIndexToDate(date, slotIdx);
  const slotEndDate = (slotIdx) => slotIndexToDate(date, slotIdx + 1);
  // Build a fast lookup map for current render to avoid repeated finds
  const slotMap = useMemo(() => {
    const m = new Map();
    for (const b of blocks) {
      if (String(b.id).startsWith('slot-')) {
        const idx = Number(String(b.id).split('-')[1] || 0);
        if (!m.has(idx)) m.set(idx, b);
        continue;
      }
      if (!b.allDay && b.start && isSameDay(new Date(b.start), date)) {
        const s = new Date(b.start);
        const minutesFromStart = (s.getHours() - START_HOUR) * 60 + s.getMinutes();
        const idx = Math.max(0, Math.floor(minutesFromStart / SLOT_MINUTES));
        if (!m.has(idx)) m.set(idx, b);
      }
    }
    return m;
  }, [blocks, date]);

  const findBlockForSlot = (slotIdx) => {
    const byMap = slotMap.get(slotIdx);
    if (byMap) return byMap;
    const start = slotStartDate(slotIdx);
    const end = slotEndDate(slotIdx);
    // fallback: find first timed block that starts in this slot on the same day
    return blocks.find(b => !b.allDay && b.start && isSameDay(new Date(b.start), date) && new Date(b.start) >= start && new Date(b.start) < end);
  };
  const upsertBlockForSlot = (slotIdx, updater) => {
    setBlocks(prev => {
      const start = slotStartDate(slotIdx);
      const end = slotEndDate(slotIdx);
      const existingDirectIdx = prev.findIndex(b => b.id === `slot-${slotIdx}`);
      if (existingDirectIdx !== -1) {
        const updated = updater(prev[existingDirectIdx]);
        const withTimes = ensureTimedFieldsFromSlot(date, { ...updated, start: slotIdx, end: slotIdx });
        return prev.map((b, i) => (i === existingDirectIdx ? withTimes : b));
      }
      const existingTimedIdx = prev.findIndex(b => !b.allDay && b.start && isSameDay(new Date(b.start), date) && new Date(b.start) >= start && new Date(b.start) < end);
      if (existingTimedIdx !== -1) {
        const updated = updater(prev[existingTimedIdx]);
        return prev.map((b, i) => (i === existingTimedIdx ? updated : b));
      }
      // create new block aligned to this slot
      const created = ensureTimedFieldsFromSlot(date, { id: `slot-${slotIdx}`, start: slotIdx, end: slotIdx, text: '', attachments: [] });
      const updatedCreated = updater(created);
      return [...prev, updatedCreated];
    });
  };

  return (
    <section className="grid-wrapper" onMouseLeave={() => setDragging(null)}>
      <div className="grid-header">
        <div />
        <div className="col-label">:00</div>
        <div className="col-label">:30</div>
      </div>

      <div className="grid" onMouseUp={onMouseUp}>
        {hoursRange(START_HOUR, END_HOUR).map((h) => {
          const h12 = ((h + 11) % 12) + 1;
          const ampm = h >= 12 ? 'PM' : 'AM';
          return (
            <React.Fragment key={h}>
              <div className="hour-label">{h12} {ampm}</div>
              {[0, 30].map((min, idx) => {
                const slotIdx = timeToSlot(h, min);
                const isSelecting = dragging && slotIdx >= Math.min(dragging.start, dragging.end) && slotIdx <= Math.max(dragging.start, dragging.end);
                return (
                  <div
                    key={idx}
                    className={`slot ${isSelecting ? 'slot-selecting' : ''}`}
                    onMouseDown={() => onMouseDown(slotIdx)}
                    onMouseEnter={() => onMouseEnter(slotIdx)}
                  >
                    <div className="slot-inner">
                      <textarea
                        className="slot-textarea"
                        value={(findBlockForSlot(slotIdx)?.text) || ''}
                        onChange={(e) => {
                          upsertBlockForSlot(slotIdx, (blk) => ({ ...blk, text: e.target.value }));
                        }}
                        onBlur={(e) => {
                          const value = e.target.value.trim();
                          if (value) return;
                          // remove empty block for this slot for real-time cleanup
                          setBlocks(prev => {
                            const start = slotStartDate(slotIdx);
                            const end = slotEndDate(slotIdx);
                            return prev.filter(b => {
                              if (b.id === `slot-${slotIdx}`) return false;
                              if (!b.allDay && b.start) {
                                const s = new Date(b.start);
                                if (isSameDay(s, date) && s >= start && s < end && (!b.text || !String(b.text).trim())) return false;
                              }
                              return true;
                            });
                          });
                        }}
                      />
                      <div className="slot-rail">
                        <button
                          className="icon-btn"
                          title="Attach"
                          aria-label="Attach resources"
                          onClick={(e) => {
                            e.stopPropagation();
                            const existing = findBlockForSlot(slotIdx);
                            if (existing) {
                              setModal({ open: true, blockId: existing.id });
                            } else {
                              const id = `slot-${slotIdx}`;
                              setBlocks(prev => {
                                const exists = prev.find(b => b.id === id);
                                if (exists) return prev;
                                return [...prev, ensureTimedFieldsFromSlot(date, { id, start: slotIdx, end: slotIdx, text: '', attachments: [] })];
                              });
                              setModal({ open: true, blockId: id });
                            }
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M21 12.5V17a5 5 0 0 1-5 5H9a7 7 0 1 1 0-14h8a5 5 0 0 1 5 5Z" stroke="currentColor" strokeWidth="1.6" />
                            <path d="M7 12v6a3 3 0 0 0 3 3h5a3 3 0 0 0 3-3v-4" stroke="currentColor" strokeWidth="1.6"/>
                          </svg>
                        </button>
                        {/* Removed plus view icon to simplify UI per feedback */}
                      </div>
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}

        <AttachmentModal
          open={modal.open}
          onClose={()=> setModal({ open:false, blockId:null })}
          onAdd={(items)=>{
            if(!modal.blockId) return;
            setBlocks(prev => {
              const idx = prev.findIndex(b => b.id === modal.blockId);
              if (idx === -1) {
                // Create the block if it doesn't exist and add the items
                const slotIdxFromId = Number(String(modal.blockId).split('-')[1] ?? 0);
                return [
                  ...prev,
                  { id: modal.blockId, start: slotIdxFromId, end: slotIdxFromId, text: '', attachments: [...items] }
                ];
              }
              return prev.map(b => b.id === modal.blockId ? { ...b, attachments: [...(b.attachments||[]), ...items] } : b);
            });
          }}
          items={blocks.find(b=>b.id===modal.blockId)?.attachments || []}
          onRemove={(attId)=>{
            if(!modal.blockId) return;
            setBlocks(prev => prev.map(b => b.id === modal.blockId ? { ...b, attachments: b.attachments.filter(a => a.id !== attId) } : b));
          }}
        />
      </div>
    </section>
  );
}

export default function App() {
  // derive today's date value once for initial render (restore last viewed date)
  const [date, setDate] = useState(() => {
    try {
      const raw = localStorage.getItem('planner:lastDate');
      if (raw) {
        const d = new Date(raw);
        if (!isNaN(d.getTime())) return d;
      }
    } catch {}
    return new Date();
  });

  // Hydration gate to prevent save until after load for current date
  const [isHydrated, setIsHydrated] = useState(false);

  // Initialize state from localStorage synchronously for first render of current date
  const readDayFromStorage = (d) => {
    try {
      const key = `planner:${timeKey(d)}`;
      const raw = localStorage.getItem(key);
      if (!raw) return { priorities: ['', '', ''], notes: '', blocks: [] };
      const parsed = JSON.parse(raw);
      return {
        priorities: parsed.priorities ?? ['', '', ''],
        notes: parsed.notes ?? '',
        blocks: parsed.blocks ?? [],
      };
    } catch {
      return { priorities: ['', '', ''], notes: '', blocks: [] };
    }
  };

  const initial = readDayFromStorage(new Date());
  const [priorities, setPriorities] = useState(initial.priorities);
  const [notes, setNotes] = useState(initial.notes);
  const [blocks, setBlocks] = useState(initial.blocks);

  // After first mount, mark as hydrated so subsequent changes can be saved
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Advance selected date to today's date automatically at local midnight
  useEffect(() => {
    let timer;
    const scheduleNextMidnight = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(24, 0, 0, 0);
      const ms = next.getTime() - now.getTime();
      timer = setTimeout(() => {
        setDate(new Date());
        scheduleNextMidnight();
      }, Math.max(1000, ms));
    };
    scheduleNextMidnight();
    return () => { if (timer) clearTimeout(timer); };
  }, []);

  // When date changes, re-hydrate from storage AND suspend saving until loaded
  useEffect(() => {
    // suspend saving while we load another date
    setIsHydrated(false);
    const next = readDayFromStorage(date);
    setPriorities(next.priorities);
    setNotes(next.notes);
    setBlocks(next.blocks);
    // allow saves after we loaded this date
    setIsHydrated(true);
    // remember last viewed date for persistence across refreshes
    try { localStorage.setItem('planner:lastDate', date.toISOString()); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  // Persist only when hydrated to avoid overwriting loaded values with blanks
  useEffect(() => {
    if (!isHydrated) return;
    try {
      const key = `planner:${timeKey(date)}`;
      const data = { priorities, notes, blocks };
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // ignore storage errors
    }
  }, [isHydrated, date, priorities, notes, blocks]);

  const handleClear = () => {
    setPriorities(['', '', '']);
    setNotes('');
    setBlocks([]);
    try {
      const key = `planner:${timeKey(date)}`;
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  };

  const [viewMode, setViewMode] = useState(() => {
    try { return localStorage.getItem('planner:viewMode') || 'list'; } catch { return 'list'; }
  }); // 'list' | 'calendar'
  useEffect(() => {
    try { localStorage.setItem('planner:viewMode', viewMode); } catch {}
  }, [viewMode]);

  // Focus mode for calendar (expand/minimize)
  const [focusMode, setFocusMode] = useState(() => {
    try { return localStorage.getItem('planner:focusCalendar') === '1'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('planner:focusCalendar', focusMode ? '1' : '0'); } catch {}
  }, [focusMode]);
  const hasAnyContent = (priorities.some(Boolean) || notes || (blocks && blocks.length));

  return (
    <div className="app">
      <Header date={date} setDate={setDate} onClear={handleClear} viewMode={viewMode} setViewMode={setViewMode} />

      <main className={`layout ${viewMode==='calendar' && focusMode ? 'focus-cal' : ''}`}>
        <aside className="left">
          <PriorityList priorities={priorities} setPriorities={setPriorities} />
          <BrainDump notes={notes} setNotes={setNotes} />
        </aside>

        <section className="right">
          {viewMode === 'calendar' ? (
            <CalendarView
              date={date}
              setDate={setDate}
              blocks={blocks}
              onBlocksChange={setBlocks}
              focusMode={focusMode}
              onToggleFocus={()=>setFocusMode(f => !f)}
            />
          ) : (
            <ScheduleGrid date={date} blocks={blocks} setBlocks={setBlocks} />
          )}
        </section>
      </main>
    </div>
  );
}
