const GCAL_BASE = 'https://www.googleapis.com/calendar/v3';
const GCAL_TOKEN_KEY = 'gcal-token';

export const GCAL_SCOPE = 'https://www.googleapis.com/auth/calendar';

function getChromeIdentityToken(interactive) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      const err = chrome.runtime?.lastError;
      if (err) reject(new Error(err.message));
      else if (!token) reject(new Error('No token'));
      else resolve(token);
    });
  });
}

export async function getCalendarToken({ interactive = false } = {}) {
  const hasChromeIdentity = typeof chrome !== 'undefined' && chrome.identity?.getAuthToken;
  if (hasChromeIdentity) {
    return getChromeIdentityToken(interactive);
  }
  const devToken = localStorage.getItem(GCAL_TOKEN_KEY);
  if (devToken) return devToken;
  throw new Error('KCAL_NO_TOKEN');
}

export function setCalendarToken(token) {
  localStorage.setItem(GCAL_TOKEN_KEY, token);
}

export function clearCalendarToken() {
  localStorage.removeItem(GCAL_TOKEN_KEY);
}

async function authCall(path, { method = 'GET', body } = {}) {
  const token = await getCalendarToken();
  const res = await fetch(`${GCAL_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Google Calendar API ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}

function localIso(date) {
  const pad = (n) => String(n).padStart(2, '0');
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const abs = Math.abs(offset);
  const zone = `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T00:00:00${zone}`;
}

function isoWindow(monday) {
  const start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return {
    timeMin: localIso(start),
    timeMax: localIso(end),
  };
}

export function listEvents(monday, calendarId = 'primary') {
  const { timeMin, timeMax } = isoWindow(monday);
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    maxResults: '2500',
    orderBy: 'startTime',
  });
  return authCall(`/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`);
}

export function getEvent(calendarId, eventId) {
  return authCall(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`);
}

export function insertEvent(calendarId, body) {
  return authCall(`/calendars/${encodeURIComponent(calendarId)}/events`, { method: 'POST', body });
}

export function patchEvent(calendarId, eventId, body) {
  return authCall(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, { method: 'PATCH', body });
}

export function deleteEvent(calendarId, eventId) {
  return authCall(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, { method: 'DELETE' });
}

export function resetEventsMock() {
  clearCalendarToken();
  localStorage.removeItem('kanban-done');
}