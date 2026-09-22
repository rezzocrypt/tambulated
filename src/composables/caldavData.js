import { ALL_DAYS, addDays, dateKey, parseDateKey, weekdayNum } from '@/utils/week.js';

export const BYDAY = { 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR', 6: 'SA', 7: 'SU' };
const BYDAY_NUM = Object.fromEntries(Object.entries(BYDAY).map(([n, s]) => [s, Number(n)]));

export function freqDays(task) {
  if (task?.freq === 'daily') return [...ALL_DAYS];
  if (task?.freq === 'weekdays') return [1, 2, 3, 4, 5];
  const days = Array.isArray(task?.days) ? task.days : [];
  return ALL_DAYS.filter((day) => days.includes(day)).sort((a, b) => a - b);
}

export function rruleFor(freq, days) {
  if (freq === 'daily') return 'FREQ=DAILY';
  if (freq === 'weekdays') return 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR';
  const set = (days || []).filter((day) => ALL_DAYS.includes(day)).sort((a, b) => a - b);
  return `FREQ=WEEKLY;BYDAY=${set.map((day) => BYDAY[day]).join(',')}`;
}

export function parseRrule(rrule) {
  if (!rrule) return { freq: 'once', days: [] };
  const params = {};
  for (const part of rrule.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) params[part.slice(0, idx)] = part.slice(idx + 1);
  }
  if (params.FREQ === 'DAILY') return { freq: 'daily', days: [...ALL_DAYS] };
  if (params.FREQ === 'WEEKLY') {
    const days = (params.BYDAY ? params.BYDAY.split(',') : [])
      .map((day) => BYDAY_NUM[day])
      .filter((day) => day);
    if (days.length === 5 && days.every((day) => day >= 1 && day <= 5)) {
      return { freq: 'weekdays', days: [1, 2, 3, 4, 5] };
    }
    return { freq: 'custom', days: days.length ? days : [] };
  }
  return { freq: 'custom', days: [] };
}

export function pad2(n) {
  return String(n).padStart(2, '0');
}

export function escapeIcalText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

export function unescapeIcalText(value) {
  return String(value ?? '')
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

export function icsDateTime(value) {
  const raw = String(value || '').slice(0, 16);
  const [d, t] = raw.split('T');
  const [y, mo, day] = d ? d.split('-') : [];
  const [hh, mi] = t ? t.split(':') : [];
  return `${y || ''}${mo || ''}${day || ''}T${hh ? pad2(hh) : '00'}${mi ? pad2(mi) : '00'}00`;
}

export function icsToDateTime(ics) {
  return `${ics.slice(0, 4)}-${ics.slice(4, 6)}-${ics.slice(6, 8)}T${ics.slice(9, 11)}:${ics.slice(11, 13)}:00`;
}

function icsAddMinutes(ics, minutes) {
  const dt = new Date(
    Number(ics.slice(0, 4)),
    Number(ics.slice(4, 6)) - 1,
    Number(ics.slice(6, 8)),
    Number(ics.slice(9, 11)),
    Number(ics.slice(11, 13)) + minutes,
  );
  return icsDateTime(`${dateKey(dt)}T${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`);
}

export function defaultEnd(start) {
  if (!start) return { date: '' };
  if (start.date) return { date: dateKey(addDays(parseDateKey(start.date), 1)) };
  return { dateTime: icsToDateTime(icsAddMinutes(icsDateTime(start.dateTime), 60)) };
}

function startEndProps(start, end) {
  const safeEnd = end || defaultEnd(start);
  const startTimed = !!(start && start.dateTime);
  const endTimed = !!(safeEnd && safeEnd.dateTime);
  const startLine = startTimed
    ? `DTSTART:${icsDateTime(start.dateTime)}`
    : `DTSTART;VALUE=DATE:${String(start?.date || '').replace(/-/g, '')}`;
  let endLine;
  if (endTimed === startTimed) {
    endLine = endTimed
      ? `DTEND:${icsDateTime(safeEnd.dateTime)}`
      : `DTEND;VALUE=DATE:${String(safeEnd.date || '').replace(/-/g, '')}`;
  } else if (startTimed) {
    endLine = `DTEND:${icsAddMinutes(icsDateTime(start.dateTime), 60)}`;
  } else {
    endLine = `DTEND;VALUE=DATE:${String(dateKey(addDays(parseDateKey(safeEnd.date), 1))).replace(/-/g, '')}`;
  }
  return [startLine, endLine];
}

function todoProps({ uid, summary, start, due, end, recurrence, status, completed }) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//tambulated//CalDAV//EN',
    'BEGIN:VTODO',
    `UID:${String(uid || '')}`,
    `SUMMARY:${escapeIcalText(summary)}`,
  ];
  const statusValue = ['NEEDS-ACTION', 'IN-PROCESS', 'COMPLETED', 'CANCELLED'].includes(status) ? status : 'NEEDS-ACTION';
  lines.push(`STATUS:${statusValue}`);
  if (start && (start.date || start.dateTime)) {
    lines.push(start.dateTime ? `DTSTART:${icsDateTime(start.dateTime)}` : `DTSTART;VALUE=DATE:${String(start.date).replace(/-/g, '')}`);
  }
  const dueValue = due || (end && !due ? end : null);
  if (dueValue && (dueValue.date || dueValue.dateTime)) {
    lines.push(dueValue.dateTime ? `DUE:${icsDateTime(dueValue.dateTime)}` : `DUE;VALUE=DATE:${String(dueValue.date).replace(/-/g, '')}`);
  }
  if (recurrence) lines.push(`RRULE:${recurrence}`);
  if (completed) lines.push(`COMPLETED:${typeof completed === 'string' ? completed : '20260922T000000Z'}`);
  lines.push('END:VTODO', 'END:VCALENDAR');
  return lines.join('\r\n');
}

export function serializeEvent({ uid, summary, start, end, recurrence, kind = 'VEVENT', status, due, completed } = {}) {
  if (kind === 'VTODO') {
    return todoProps({ uid, summary, start, due, end, recurrence, status, completed });
  }
  const [startLine, endLine] = startEndProps(start, end || defaultEnd(start));
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//tambulated//CalDAV//EN',
    'BEGIN:VEVENT',
    `UID:${String(uid || '')}`,
    `SUMMARY:${escapeIcalText(summary)}`,
    startLine,
    endLine,
  ];
  if (recurrence) lines.push(`RRULE:${recurrence}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

function readIcalDate(prop) {
  const v = prop.value;
  const isDate = prop.params.VALUE === 'DATE' || /^\d{8}$/.test(v);
  if (isDate) return { date: `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}` };
  const dt = v.slice(0, 15);
  return { dateTime: `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}T${dt.slice(9, 11)}:${dt.slice(11, 13)}:00` };
}

export function parseIcalendar(text) {
  const unfolded = String(text || '')
    .replace(/\r\n[ \t]/g, '')
    .replace(/\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);
  const props = [];
  let comp = null;
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    const m = t.match(/^BEGIN:(VEVENT|VTODO)/i);
    if (m) {
      comp = m[1].toUpperCase();
      props.length = 0;
      continue;
    }
    if (comp && /^END:/i.test(t)) break;
    if (comp) props.push(t);
  }
  let rrule = '';
  const fields = {};
  for (const raw of props) {
    const idx = raw.indexOf(':');
    if (idx < 0) continue;
    const head = raw.slice(0, idx);
    const value = raw.slice(idx + 1);
    const [name, paramsRaw = ''] = head.split(';');
    const upper = name.toUpperCase();
    const params = {};
    for (const p of paramsRaw.split(';')) {
      const eq = p.indexOf('=');
      if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1);
    }
    if (upper === 'RRULE') {
      rrule = value;
      continue;
    }
    if (upper === 'EXDATE') continue;
    if (upper === 'UID' || upper === 'SUMMARY' || upper === 'DTSTART' || upper === 'DTEND' || upper === 'DUE' || upper === 'STATUS' || upper === 'COMPLETED' || upper === 'RECURRENCE-ID') {
      fields[upper] = { value, params };
    }
  }
  const isTodo = comp === 'VTODO';
  if (!fields.DTSTART && !isTodo) return null;
  const startRaw = fields.DTSTART || (isTodo ? fields.DUE : null);
  if (isTodo && !startRaw) {
    return {
      kind: 'VTODO',
      uid: fields.UID?.value || '',
      summary: fields.SUMMARY ? unescapeIcalText(fields.SUMMARY.value) : '',
      start: null,
      end: null,
      due: null,
      status: (fields.STATUS?.value || 'NEEDS-ACTION').toUpperCase(),
      completed: fields.COMPLETED?.value ? true : (fields.STATUS?.value || '').toUpperCase() === 'COMPLETED',
      recurrence: rrule,
      recurrenceId: null,
    };
  }
  const start = readIcalDate(startRaw);
  const due = isTodo && fields.DUE ? readIcalDate(fields.DUE) : null;
  const end = fields.DTEND ? readIcalDate(fields.DTEND) : (isTodo ? due : defaultEnd(start));
  const status = (fields.STATUS?.value || 'NEEDS-ACTION').toUpperCase();
  return {
    kind: isTodo ? 'VTODO' : 'VEVENT',
    uid: fields.UID?.value || '',
    summary: fields.SUMMARY ? unescapeIcalText(fields.SUMMARY.value) : '',
    start,
    end,
    due,
    status,
    completed: fields.COMPLETED?.value ? true : status === 'COMPLETED',
    recurrence: rrule,
    recurrenceId: fields['RECURRENCE-ID'] ? readIcalDate(fields['RECURRENCE-ID']) : null,
  };
}

function buildOccurrence(ev, key) {
  const allDay = !!(ev.start && ev.start.date);
  const startTime = allDay ? '' : (ev.start.dateTime || '').slice(11, 16);
  const start = allDay ? { date: key } : { dateTime: `${key}T${startTime}:00` };
  let end;
  if (allDay) {
    end = { date: dateKey(addDays(parseDateKey(key), 1)) };
  } else {
    const endTime = ev.end?.dateTime ? ev.end.dateTime.slice(11, 16) : '';
    end = endTime ? { dateTime: `${key}T${endTime}:00` } : { date: dateKey(addDays(parseDateKey(key), 1)) };
  }
  const item = {
    id: `${ev.uid}-${key}`,
    uid: ev.uid,
    summary: ev.summary,
    start,
    end,
    _href: ev.href,
    _etag: ev.etag,
  };
  if (ev.task) {
    item.task = true;
    item.status = ev.status || '';
  }
  if (ev.recurrence) {
    item.recurrence = [ev.recurrence];
    item.recurringEventId = ev.uid;
    item.originalStartTime = allDay ? { date: key } : { dateTime: `${key}T${startTime}:00` };
  }
  return item;
}

export function expandTasks(todo, minKey, maxKey) {
  const open = {
    id: `${todo.uid}-open`,
    uid: todo.uid,
    summary: todo.summary,
    start: {},
    end: {},
    recurrence: [],
    status: todo.status || '',
    task: true,
    undated: true,
    _href: todo.href,
    _etag: todo.etag,
  };
  const start = todo.start || todo.due || null;
  if (!start || (!start.date && !start.dateTime)) return [open];
  const items = expandOccurrences(
    {
      uid: todo.uid,
      href: todo.href,
      etag: todo.etag,
      summary: todo.summary,
      start,
      end: todo.end,
      recurrence: todo.recurrence,
      task: true,
      status: todo.status || '',
    },
    minKey,
    maxKey,
  );
  if (!items.length) return [];
  return items;
}

export function expandOccurrences(ev, minKey, maxKey) {
  const out = [];
  const startKey = ev.start?.date
    ? ev.start.date
    : (ev.start?.dateTime || '').slice(0, 10);
  if (!startKey) return out;
  const parsed = ev.recurrence ? parseRrule(ev.recurrence) : { freq: 'once', days: [] };
  if (parsed.freq === 'once') {
    if (startKey >= minKey && startKey < maxKey) out.push(buildOccurrence(ev, startKey));
    return out;
  }
  let cur = parseDateKey(startKey > minKey ? startKey : minKey);
  while (dateKey(cur) < maxKey) {
    const key = dateKey(cur);
    if (key >= startKey && (parsed.freq === 'daily' || parsed.days.includes(weekdayNum(cur)))) {
      out.push(buildOccurrence(ev, key));
    }
    cur = addDays(cur, 1);
  }
  return out;
}