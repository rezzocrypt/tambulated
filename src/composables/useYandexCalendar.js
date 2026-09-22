import { addDays, dateKey } from '@/utils/week.js';
import {
  defaultEnd,
  expandOccurrences,
  expandTasks,
  parseIcalendar,
  serializeEvent,
} from '@/composables/caldavData.js';

const CALDAV_ROOT = 'https://caldav.yandex.ru';
const ACCOUNT_KEY = 'ycal-account';
const CALENDAR_KEY = 'ycal-calendar';
const CALENDARS_KEY = 'ycal-calendars';
const TASKS_CALENDAR_KEY = 'ycal-tasks-calendar';

let principalHrefValue = null;
let homeHrefValue = null;
const uidMeta = new Map();

function readAccount() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ACCOUNT_KEY) || 'null');
    if (parsed && parsed.login && parsed.password) return parsed;
  } catch {
    /* malformed storage — treat as absent */
  }
  return null;
}

export function getAccount() {
  const acc = readAccount();
  return acc ? { login: acc.login } : null;
}

export function getStoredAccount() {
  return readAccount();
}

export function setAccount(login, password) {
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify({ login: String(login), password: String(password) }));
  principalHrefValue = null;
  homeHrefValue = null;
  uidMeta.clear();
}

export function clearAccount() {
  localStorage.removeItem(ACCOUNT_KEY);
  principalHrefValue = null;
  homeHrefValue = null;
  uidMeta.clear();
}

export function logout() {
  clearAccount();
  localStorage.removeItem(CALENDAR_KEY);
  localStorage.removeItem(TASKS_CALENDAR_KEY);
  localStorage.removeItem(CALENDARS_KEY);
}

export function hasAccount() {
  return !!readAccount();
}

function readLegacyCalendar(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

export function getCalendars() {
  try {
    const list = JSON.parse(localStorage.getItem(CALENDARS_KEY) || 'null');
    if (Array.isArray(list) && list.length) {
      return list
        .filter((c) => c && c.href)
        .map((c) => ({ href: c.href, displayName: c.displayName || '', component: c.component === 'VTODO' ? 'VTODO' : 'VEVENT' }));
    }
  } catch {
    /* fall through to legacy keys */
  }
  const evCal = readLegacyCalendar(CALENDAR_KEY);
  const taskCal = readLegacyCalendar(TASKS_CALENDAR_KEY);
  const legacy = [];
  if (evCal?.href) legacy.push({ href: evCal.href, displayName: evCal.displayName || '', component: 'VEVENT' });
  if (taskCal?.href && taskCal.href !== evCal?.href) legacy.push({ href: taskCal.href, displayName: taskCal.displayName || '', component: 'VTODO' });
  if (legacy.length) {
    localStorage.setItem(CALENDARS_KEY, JSON.stringify(legacy));
  }
  return legacy;
}

export function setCalendars(list) {
  const clean = Array.isArray(list)
    ? list
        .filter((c) => c && c.href)
        .map((c) => ({ href: c.href, displayName: c.displayName || '', component: c.component === 'VTODO' ? 'VTODO' : 'VEVENT' }))
    : [];
  if (clean.length) {
    localStorage.setItem(CALENDARS_KEY, JSON.stringify(clean));
  } else {
    localStorage.removeItem(CALENDARS_KEY);
  }
  uidMeta.clear();
}

export function getCalendar() {
  return getCalendars().find((c) => c.component !== 'VTODO') || null;
}

export function setCalendar(calendar) {
  const rest = getCalendars().filter((c) => c.component === 'VTODO');
  const list = calendar && calendar.href ? [...rest, { href: calendar.href, displayName: calendar.displayName || '', component: 'VEVENT' }] : rest;
  setCalendars(list);
}

export function hasCalendar() {
  return !!getCalendar()?.href;
}

export function hasEventsCalendar() {
  return !!getCalendar()?.href;
}

export function getTasksCalendar() {
  return getCalendars().find((c) => c.component === 'VTODO') || null;
}

export function setTasksCalendar(calendar) {
  const rest = getCalendars().filter((c) => c.component !== 'VTODO');
  const list = calendar && calendar.href ? [...rest, { href: calendar.href, displayName: calendar.displayName || '', component: 'VTODO' }] : rest;
  setCalendars(list);
}

export function hasTasksCalendar() {
  return !!getTasksCalendar()?.href;
}

function base64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function basicAuthHeader() {
  const acc = readAccount();
  if (!acc) throw new Error('KCAL_NO_ACCOUNT');
  return `Basic ${base64(`${acc.login}:${acc.password}`)}`;
}

async function dav(method, path, { body, etag, ifNoneMatch, contentType, depth } = {}) {
  const headers = { Authorization: basicAuthHeader() };
  if (etag) headers['If-Match'] = etag;
  if (ifNoneMatch) headers['If-None-Match'] = ifNoneMatch;
  if (depth != null) headers.Depth = String(depth);
  if (body) headers['Content-Type'] = contentType || 'text/calendar; charset=utf-8';
  const res = await fetch(new URL(path, CALDAV_ROOT).href, { method, headers, body: body || undefined });
  const text = await res.text();
  if (res.status === 401 || res.status === 403) throw new Error('KCAL_AUTH_FAILED');
  if (res.status >= 400) throw new Error(`Yandex CalDAV ${res.status}`);
  return { status: res.status, text, headers: res.headers };
}

function parseXml(text) {
  return new DOMParser().parseFromString(text, 'text/xml');
}

function ls(root, localName) {
  const out = [];
  const all = root.getElementsByTagName('*');
  for (let i = 0; i < all.length; i += 1) {
    const el = all[i];
    if ((el.localName || el.tagName) === localName) out.push(el);
  }
  return out;
}

function childHref(node) {
  const hrefEl = node ? ls(node, 'href')[0] : null;
  return hrefEl ? hrefEl.textContent : '';
}

function principalHref(doc) {
  return childHref(ls(doc, 'current-user-principal')[0]);
}

function calendarHomeHref(doc) {
  return childHref(ls(doc, 'calendar-home-set')[0]);
}

function calendarsFrom(doc) {
  const out = [];
  for (const resp of ls(doc, 'response')) {
    const typeEl = ls(resp, 'resourcetype')[0];
    if (!typeEl || ls(typeEl, 'calendar').length === 0) continue;
    const href = childHref(resp);
    if (!href) continue;
    const compEl = ls(resp, 'supported-calendar-component-set')[0];
    const comps = compEl ? ls(compEl, 'comp').map((el) => el.getAttribute('name')).filter(Boolean) : [];
    const component = comps.includes('VTODO') && !comps.includes('VEVENT') ? 'VTODO' : 'VEVENT';
    const displayName = ls(resp, 'displayname')[0]?.textContent || 'Calendar';
    out.push({ href, displayName, component });
  }
  return out;
}

async function propfind(path, depth = 0) {
  const res = await dav('PROPFIND', path, { depth });
  return parseXml(res.text);
}

export async function discoverCalendars() {
  try {
    const principalDoc = await propfind('/', 1);
    principalHrefValue = principalHref(principalDoc) || principalHrefValue;
    if (principalHrefValue) {
      try {
        const principalDoc = await propfind(principalHrefValue, 0);
        homeHrefValue = calendarHomeHref(principalDoc) || homeHrefValue;
      } catch (err) {
        if (err.message === 'KCAL_AUTH_FAILED') throw err;
      }
    }
    if (homeHrefValue) {
      const listDoc = await propfind(homeHrefValue, 1);
      const found = calendarsFrom(listDoc);
      if (found.length) return found;
    }
  } catch (err) {
    if (err.message === 'KCAL_AUTH_FAILED') throw err;
  }
  const rootDoc = await propfind('/', 1);
  return calendarsFrom(rootDoc);
}

function toApiItem(ev) {
  const item = { id: ev.uid, summary: ev.summary, start: ev.start, end: ev.end };
  if (ev.recurrence) item.recurrence = [ev.recurrence];
  if (ev.kind === 'VTODO') {
    item.kind = 'VTODO';
    if (ev.status) item.status = ev.status;
    if (ev.due) item.due = ev.due;
  }
  return item;
}

async function listFromCalendar(cal, kind, expander, minKey, maxKey) {
  if (!cal?.href) throw new Error('KCAL_NO_CALENDAR');
  const doc = await propfind(cal.href, 1);
  const hrefs = [];
  for (const resp of ls(doc, 'response')) {
    const href = childHref(resp);
    if (!href || href === cal.href || href.endsWith('/')) continue;
    hrefs.push(href);
  }
  const occurrences = [];
  for (const href of hrefs) {
    const res = await dav('GET', href);
    const parsed = parseIcalendar(res.text);
    if (!parsed || parsed.kind !== kind || parsed.recurrenceId || !parsed.uid) continue;
    const etag = (res.headers.get('etag') || '').replace(/^"|"$/g, '');
    const ev = {
      kind,
      uid: parsed.uid,
      href,
      etag,
      summary: parsed.summary,
      start: parsed.start,
      end: parsed.end,
      due: parsed.due,
      status: parsed.status,
      recurrence: parsed.recurrence,
    };
    uidMeta.set(parsed.uid, { href, etag, kind, ev });
    occurrences.push(...expander(ev, minKey, maxKey));
  }
  return occurrences;
}

export async function listEvents(monday) {
  basicAuthHeader();
  const minKey = dateKey(monday);
  const maxKey = dateKey(addDays(monday, 7));
  const cals = getCalendars().filter((c) => c.component !== 'VTODO');
  const out = [];
  for (const cal of cals) {
    out.push(...(await listFromCalendar(cal, 'VEVENT', expandOccurrences, minKey, maxKey)));
  }
  return out;
}

export function resetUidMeta() {
  uidMeta.clear();
}

export async function listTasks(monday) {
  basicAuthHeader();
  const minKey = dateKey(monday);
  const maxKey = dateKey(addDays(monday, 7));
  const cals = getCalendars().filter((c) => c.component === 'VTODO');
  const out = [];
  for (const cal of cals) {
    out.push(...(await listFromCalendar(cal, 'VTODO', expandTasks, minKey, maxKey)));
  }
  return out;
}

export async function getEvent(_calendarId, uid) {
  const meta = uidMeta.get(uid);
  if (!meta) throw new Error('KCAL_NOT_FOUND');
  return toApiItem(meta.ev);
}

export async function getTask(uid) {
  const meta = uidMeta.get(uid);
  if (!meta) throw new Error('KCAL_NOT_FOUND');
  return toApiItem(meta.ev);
}

function generateUid() {
  return `tambulated-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function insertEvent(_calendarId, body) {
  const chosen = body.calendarHref
    ? getCalendars().find((c) => c.href === body.calendarHref && c.component !== 'VTODO') || null
    : null;
  const cal = chosen || getCalendar();
  if (!cal?.href) throw new Error('KCAL_NO_CALENDAR');
  const uid = generateUid();
  const start = body.start || { date: dateKey(new Date()) };
  const ev = {
    kind: 'VEVENT',
    uid,
    href: `${cal.href}${uid}.ics`,
    etag: '',
    summary: body.summary || '',
    start,
    end: body.end || defaultEnd(start),
    due: null,
    status: '',
    recurrence: Array.isArray(body.recurrence) ? body.recurrence[0] || '' : (body.recurrence || ''),
  };
  const res = await dav('PUT', ev.href, {
    body: serializeEvent(ev),
    ifNoneMatch: '*',
    contentType: 'text/calendar; charset=utf-8',
  });
  const etag = (res.headers.get('etag') || '').replace(/^"|"$/g, '');
  uidMeta.set(uid, { href: ev.href, etag, kind: 'VEVENT', ev });
  return toApiItem(ev);
}

export async function insertTask(_calendarId, body) {
  const chosen = body.calendarHref
    ? getCalendars().find((c) => c.href === body.calendarHref && c.component === 'VTODO') || null
    : null;
  const cal = chosen || getTasksCalendar();
  if (!cal?.href) throw new Error('KCAL_NO_CALENDAR');
  const uid = generateUid();
  const start = body.start || null;
  const due = body.due || body.end || (start?.dateTime ? defaultEnd(start) : start?.date ? { date: start.date } : null);
  const ev = {
    kind: 'VTODO',
    uid,
    href: `${cal.href}${uid}.ics`,
    etag: '',
    summary: body.summary || '',
    start,
    end: null,
    due,
    status: body.status || 'NEEDS-ACTION',
    recurrence: Array.isArray(body.recurrence) ? body.recurrence[0] || '' : (body.recurrence || ''),
  };
  const res = await dav('PUT', ev.href, {
    body: serializeEvent(ev),
    ifNoneMatch: '*',
    contentType: 'text/calendar; charset=utf-8',
  });
  const etag = (res.headers.get('etag') || '').replace(/^"|"$/g, '');
  uidMeta.set(uid, { href: ev.href, etag, kind: 'VTODO', ev });
  return toApiItem(ev);
}

function applyBody(ev, body) {
  const next = {};
  if (body.summary != null) next.summary = body.summary;
  if (body.start) {
    next.start = body.start;
    next.end = body.end || defaultEnd(body.start);
  } else if (body.end) {
    next.start = ev.start;
    next.end = body.end;
  }
  if (Array.isArray(body.recurrence)) {
    next.recurrence = body.recurrence[0] || '';
  }
  return next;
}

export async function patchEvent(_calendarId, uid, body) {
  const meta = uidMeta.get(uid);
  if (!meta) throw new Error('KCAL_NOT_FOUND');
  const next = { ...meta.ev, ...applyBody(meta.ev, body) };
  const res = await dav('PUT', meta.href, {
    body: serializeEvent(next),
    etag: meta.etag,
    contentType: 'text/calendar; charset=utf-8',
  });
  meta.ev = next;
  meta.etag = (res.headers.get('etag') || '').replace(/^"|"$/g, '') || meta.etag;
  return toApiItem(next);
}

export async function patchTask(uid, body) {
  const meta = uidMeta.get(uid);
  if (!meta) throw new Error('KCAL_NOT_FOUND');
  const next = { ...meta.ev, ...applyBody(meta.ev, body) };
  if (meta.kind === 'VTODO') {
    if (body.due) {
      next.due = body.due;
    } else if (body.end) {
      if (body.end.dateTime) {
        next.due = body.end;
      } else if (next.start?.dateTime) {
        next.due = defaultEnd({ dateTime: next.start.dateTime });
      } else if (next.start?.date) {
        next.due = { date: next.start.date };
      } else {
        next.due = null;
      }
    }
    if (body.status != null) next.status = body.status;
    if (body.completed != null) next.completed = body.completed;
  }
  const res = await dav('PUT', meta.href, {
    body: serializeEvent(next),
    etag: meta.etag,
    contentType: 'text/calendar; charset=utf-8',
  });
  meta.ev = next;
  meta.etag = (res.headers.get('etag') || '').replace(/^"|"$/g, '') || meta.etag;
  return toApiItem(next);
}

export async function deleteEvent(_calendarId, uid) {
  const meta = uidMeta.get(uid);
  if (!meta) throw new Error('KCAL_NOT_FOUND');
  await dav('DELETE', meta.href, { etag: meta.etag });
  uidMeta.delete(uid);
}

export async function deleteTask(uid) {
  const meta = uidMeta.get(uid);
  if (!meta) throw new Error('KCAL_NOT_FOUND');
  await dav('DELETE', meta.href, { etag: meta.etag });
  uidMeta.delete(uid);
}

export function resetEventsMock() {
  clearAccount();
  localStorage.removeItem(CALENDAR_KEY);
  localStorage.removeItem(TASKS_CALENDAR_KEY);
  localStorage.removeItem(CALENDARS_KEY);
  uidMeta.clear();
}