# Strategy call booking simulator

Static React app (Vite). No backend, no API key. The screens follow the wireframes in
`Strategy Call Booking Flow.html` (copied to `wireframes/`), and Cal.com does everything else
(availability, bookings, calendar invites, emails).

```
npm install
npm run dev      # http://localhost:5173
npm run build    # static files in dist/
```

## How it talks to Cal.com

`src/cal.js` calls the public Cal.com API v2 straight from the browser:

| Action | Works without a key |
|---|---|
| Availability (`GET /v2/slots`) | yes |
| Create booking (`POST /v2/bookings`) | yes |
| Reschedule / cancel | no, Cal.com only allows it on its own pages, so the confirmation page links to `cal.com/reschedule/{uid}` and `cal.com/booking/{uid}?cancel=true` |

The event is set in `EVENT` in `src/cal.js` (team event "Round robin test", id 7549757).
Bookings made here are real: they land on the host's calendar and Cal.com emails the attendee.

## Tracking

Nothing is sent. The side panel lists the events from the spec as they would fire (browser, server, email),
the context carried forward, and the emails and call that follow a booking.

## Files

- `src/Cta.jsx`, `Booking.jsx`, `Calendar.jsx`, `Confirm.jsx`: the four screens
- `src/wire.css`: wireframe styling. `.ctx` grays out everything around the flow
- `src/events.js`, `Panel.jsx`: event dictionary and side panel
- `.env`: no longer used. Delete it and revoke the API key in Cal.com
