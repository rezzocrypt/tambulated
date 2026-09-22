import { describe, it, expect } from 'vitest';
import {
  serializeEvent,
  parseIcalendar,
  expandOccurrences,
  defaultEnd,
  escapeIcalText,
  unescapeIcalText,
} from '../src/composables/caldavData.js';

function ev({ uid = 'u1', summary = 'Task', start, end, recurrence = '' } = {}) {
  return { uid, href: `/cal/${uid}.ics`, etag: '"e"', summary, start, end, recurrence };
}

describe('iCalendar serialization', () => {
  it('round-trips a timed event', () => {
    const start = { dateTime: '2026-01-05T09:00:00' };
    const end = { dateTime: '2026-01-05T09:30:00' };
    const ics = serializeEvent({ uid: 'u1', summary: 'Brush teeth', start, end });
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('UID:u1');
    expect(ics).toContain('DTSTART:20260105T090000');
    expect(ics).toContain('DTEND:20260105T093000');
    expect(parseIcalendar(ics)).toMatchObject({ uid: 'u1', summary: 'Brush teeth', start, end, recurrence: '' });
  });

  it('round-trips an all-day event with a recurrence rule', () => {
    const start = { date: '2026-01-05' };
    const end = { date: '2026-01-06' };
    const ics = serializeEvent({ uid: 'u2', summary: 'Yoga', start, end, recurrence: 'FREQ=WEEKLY;BYDAY=MO,WE,FR' });
    expect(ics).toContain('DTSTART;VALUE=DATE:20260105');
    expect(ics).toContain('DTEND;VALUE=DATE:20260106');
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR');
    expect(parseIcalendar(ics)).toMatchObject({ uid: 'u2', summary: 'Yoga', start, end, recurrence: 'FREQ=WEEKLY;BYDAY=MO,WE,FR' });
  });

  it('turns a timed start with all-day end into a one-hour duration', () => {
    const ics = serializeEvent({
      uid: 'u3',
      summary: 'Meet',
      start: { dateTime: '2026-01-05T09:00:00' },
      end: { date: '2026-01-06' },
    });
    expect(parseIcalendar(ics).end).toEqual({ dateTime: '2026-01-05T10:00:00' });
  });

  it('escapes and unfolds summary text', () => {
    const parsed = parseIcalendar(serializeEvent({ uid: 'u4', summary: 'a,b;c\\d', start: { date: '2026-01-05' } }));
    expect(parsed.summary).toBe('a,b;c\\d');
  });

  it('computes a default one-hour end for timed starts', () => {
    expect(defaultEnd({ dateTime: '2026-01-05T09:00:00' })).toEqual({ dateTime: '2026-01-05T10:00:00' });
    expect(defaultEnd({ date: '2026-01-05' })).toEqual({ date: '2026-01-06' });
  });

  it('unescapes newlines and escaped separators', () => {
    expect(unescapeIcalText('line1\\nline2')).toBe('line1\nline2');
    expect(escapeIcalText('a,b;c')).toBe('a\\,b\\;c');
  });
});

describe('occurrence expansion', () => {
  it('expands a daily master over the week window', () => {
    const out = expandOccurrences(
      ev({ summary: 'Daily', start: { dateTime: '2026-01-05T09:00:00' }, recurrence: 'FREQ=DAILY' }),
      '2026-01-05',
      '2026-01-12',
    );
    expect(out).toHaveLength(7);
    expect(out[0]).toMatchObject({ recurringEventId: 'u1', id: 'u1-2026-01-05' });
    expect(out[0].start).toEqual({ dateTime: '2026-01-05T09:00:00' });
    expect(out[0].recurrence).toEqual(['FREQ=DAILY']);
    expect(out[6].start).toEqual({ dateTime: '2026-01-11T09:00:00' });
    expect(out[6].id).toBe('u1-2026-01-11');
  });

  it('expands a weekly BYDAY series onto matching weekdays', () => {
    const out = expandOccurrences(
      ev({ summary: 'Yoga', start: { date: '2026-01-05' }, recurrence: 'FREQ=WEEKLY;BYDAY=MO,WE,FR' }),
      '2026-01-05',
      '2026-01-12',
    );
    expect(out.map((o) => o.start.date)).toEqual(['2026-01-05', '2026-01-07', '2026-01-09']);
  });

  it('includes occurrences only inside the window', () => {
    const out = expandOccurrences(
      ev({ summary: 'Walk', start: { dateTime: '2026-01-07T08:00:00' }, recurrence: 'FREQ=DAILY' }),
      '2026-01-09',
      '2026-01-11',
    );
    expect(out.map((o) => o.start.dateTime)).toEqual(['2026-01-09T08:00:00', '2026-01-10T08:00:00']);
  });

  it('returns nothing for a once event outside the window', () => {
    const out = expandOccurrences(ev({ summary: 'Trip', start: { date: '2026-03-15' } }), '2026-01-05', '2026-01-12');
    expect(out).toEqual([]);
  });

  it('returns a single occurrence for a once event inside the window', () => {
    const out = expandOccurrences(ev({ summary: 'Trip', start: { date: '2026-01-09' } }), '2026-01-05', '2026-01-12');
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('u1-2026-01-09');
  });

  it('does not include occurrences before the series start date', () => {
    const out = expandOccurrences(
      ev({ summary: 'Late', start: { dateTime: '2026-01-09T10:00:00' }, recurrence: 'FREQ=DAILY' }),
      '2026-01-05',
      '2026-01-12',
    );
    expect(out.map((o) => o.start.dateTime)).toEqual(['2026-01-09T10:00:00', '2026-01-10T10:00:00', '2026-01-11T10:00:00']);
  });
});