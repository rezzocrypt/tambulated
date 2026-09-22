import { parseIcalendar, serializeEvent } from '../src/composables/caldavData.js';

export function base64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function createCalDavMock({
  account = { login: 'user@yandex.ru', password: 'app-password' },
  calendars = [{ href: '/cal/dflt/', displayName: 'Основной календарь' }],
  events = [],
  fetchCalls = null,
} = {}) {
  const principalPath = '/v1/principals/me/';
  const homePath = '/v1/home/';
  const expectedAuth = `Basic ${base64(`${account.login}:${account.password}`)}`;

  function multistatus(responsesXml) {
    return new Response(
      `<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">${responsesXml}</D:multistatus>`,
      { status: 207, headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
    );
  }

  function propResponse(href, propXml) {
    return `<D:response><D:href>${href}</D:href><D:propstat><D:prop>${propXml}</D:prop><D:status>HTTP/1.1 200 OK</D:status></D:propstat></D:response>`;
  }

  function calendarProps(cal) {
    const comp = cal.component === 'VTODO' ? 'VTODO' : 'VEVENT';
    return (
      `<D:resourcetype><D:collection/><C:calendar/></D:resourcetype>` +
      `<D:displayname>${xmlEscape(cal.displayName)}</D:displayname>` +
      `<C:supported-calendar-component-set><C:comp name="${comp}"/></C:supported-calendar-component-set>`
    );
  }

  async function handler(url, opts = {}) {
    const method = opts.method || 'GET';
    const reqUrl = new URL(String(url));
    const path = reqUrl.pathname;
    if (fetchCalls) fetchCalls.push({ url: reqUrl.toString(), method, body: opts.body });

    if (opts.headers?.Authorization !== expectedAuth) {
      return new Response('authorization failed', { status: 401 });
    }

    if (method === 'PROPFIND') {
      const depth = opts.headers?.Depth || '0';
      if (path === '/') {
        return multistatus(propResponse('/', `<D:current-user-principal><D:href>${principalPath}</D:href></D:current-user-principal>`));
      }
      if (path === principalPath) {
        return multistatus(propResponse(principalPath, `<C:calendar-home-set><D:href>${homePath}</D:href></C:calendar-home-set>`));
      }
      if (path === homePath) {
        const xmls = calendars.map((cal) => propResponse(cal.href, calendarProps(cal)));
        return multistatus(xmls.join(''));
      }
      const cal = calendars.find((c) => c.href === path);
      if (cal && depth === '1') {
        const resources = events
          .filter((ev) => ev.href && ev.href.startsWith(cal.href))
          .map((ev) => propResponse(ev.href, `<D:getetag>${xmlEscape(ev.etag || '')}</D:getetag>`));
        return multistatus(propResponse(cal.href, calendarProps(cal)) + resources.join(''));
      }
      return multistatus('');
    }

    if (method === 'GET') {
      const ev = events.find((e) => e.href === path);
      if (!ev) return new Response('not found', { status: 404 });
      const ics = serializeEvent({
        uid: ev.uid,
        summary: ev.summary,
        start: ev.start,
        end: ev.end,
        recurrence: ev.recurrence,
        kind: ev.kind || 'VEVENT',
        status: ev.status,
        due: ev.due,
        completed: ev.completed,
      });
      return new Response(ics, {
        status: 200,
        headers: { 'Content-Type': 'text/calendar; charset=utf-8', ETag: `"${ev.etag || ''}"` },
      });
    }

    if (method === 'PUT') {
      const parsed = parseIcalendar(opts.body);
      let record = events.find((e) => e.href === path) || events.find((e) => e.uid === parsed.uid);
      if (!record) {
        record = { uid: parsed.uid, href: path, etag: '' };
        events.push(record);
      }
      record.summary = parsed.summary;
      record.start = parsed.start;
      record.end = parsed.end;
      record.recurrence = parsed.recurrence;
      record.kind = parsed.kind || 'VEVENT';
      record.due = parsed.due;
      record.status = parsed.status || record.status;
      record.completed = parsed.completed;
      record.uid = parsed.uid;
      record.etag = `e-${record.href.length}-${String(record.summary || '').length}`;
      return new Response('', { status: 201, headers: { ETag: `"${record.etag}"` } });
    }

    if (method === 'DELETE') {
      const idx = events.findIndex((e) => e.href === path);
      if (idx >= 0) events.splice(idx, 1);
      return new Response(null, { status: 204 });
    }

    return new Response('', { status: 404 });
  }

  return { handler, events, account, calendars };
}