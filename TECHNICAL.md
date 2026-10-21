# Strategy call booking flow: technical description

## Summary
A static React app that renders our own booking UI (booking page and form, calendar, confirmation page) and
talks directly to the **Cal.com API v2** from the visitor's browser. The calls it makes are public, so the page
holds no API key and we run no backend. Cal.com stores the bookings and calendars, picks the round-robin
host and sends its own emails.

## Stack and hosting
- React 18.3.1, built with Vite 5 into static files (`index.html`, one JS file of about 56 KB gzipped, one CSS file).
- Served as plain static files from regular web hosting. No Node process, no database.
- State exists only in the browser for the length of the visit. Visitor data is not stored by us.

## How the flow uses the API

```
Browser (our React app)
  1. GET  /v2/slots                          free times for the event
  2. POST /v2/bookings                       create the booking (attendee + metadata)
  3. GET  /v2/event-types?username=<host>    host's public profile photo
        |
        v
Cal.com API v2 (https://api.cal.com/v2)  ->  stores the booking, picks the round-robin host,
                                              writes the host's calendar, sends Cal.com's emails
```

Visitor data (name, email, phone, time zone, source fields) goes straight from the browser to Cal.com. It does
not pass through our server.

## How API v2 works
- **Base URL:** `https://api.cal.com/v2`. JSON in and out.
- **Versioning:** every endpoint is versioned with a `cal-api-version` header (a date). If the header is missing or
  wrong, Cal.com falls back to an older version of that endpoint, so we always send it.
- **Response envelope:** success is `{ "status": "success", "data": ... }`. Errors are
  `{ "status": "error", "error": { "code", "message" } }` with an HTTP status such as 400, 401 or 403.
- **Authentication:** optional on some endpoints, required on others (see next section). When used, it is a
  `Authorization: Bearer <token>` header with a Cal.com API key (`cal_...`), an OAuth access token, or a
  platform managed-user token.
- **Rate limits:** Cal.com's docs list 120 requests per minute for unauthenticated requests and for API keys
  (can be raised on request).

## Open (public) vs authenticated endpoints
Cal.com's docs say the Authorization header on create-booking is optional, and they give "creating a booking is
public" as their example of a public endpoint. They do not publish a full list of public endpoints, so we tested
the ones we use, with no credentials, against the live API:

| Endpoint | Without a key | Evidence |
|---|---|---|
| `GET /v2/slots` (free times) | works (200) | tested |
| `POST /v2/bookings` (create) | works, only validates the body (400 on an empty body, not 401) | docs and tested; real bookings made |
| `GET /v2/event-types?username=` (public profile and photo) | works (200) | tested |
| `POST /v2/bookings/{uid}/cancel` and `/reschedule` | works on events that allow it (tested); refused on an event with cancelling and rescheduling disabled | tested on both kinds |
| `GET /v2/bookings` (list bookings) | refused (403) | tested |
| `GET /v2/teams/...` (team event types, members, bio) | refused (401) | tested |

In short: **visitor-facing actions (see times, book, and cancel or reschedule your own booking) are open;
anything that lists or reads other people's data needs a key.** The booking `uid` returned when booking acts as
the secret for that one booking. Browsers can call it because the API allows cross-origin requests from any website
(`access-control-allow-origin: *`).

## Why it is open, and how Atoms relate
This is partly our inference, so treat it as such:
- The open endpoints exist so a public booking UI can run in a visitor's browser with no secret. That is
  what Cal.com's own booker components (Atoms, and the embed that takes just a username and event slug) need.
  The API's allowed request headers include `x-cal-atoms-version` and `x-cal-platform-embed`, which suggests
  Atoms call this same API.
- Cal.com is moving away from Atoms toward the API: its docs and Atoms page say the Atoms package is in
  maintenance mode, the Platform plan no longer takes new customers, and new integrations should start from
  API v2. A copy-and-paste component set built on API v2 is announced as the next step.
- So we did not replace Atoms with something else. We call the same public API that Atoms use, and draw our own
  screens, which is what Cal.com now recommends for new work.
Not stated by Cal.com: any promise that these endpoints stay key-free. The docs do describe creating a
booking as public.

## Calls we make (all in `src/cal.js`)

| Purpose | Request | Version header we send |
|---|---|---|
| Free times | `GET /v2/slots?eventTypeId&start&end&timeZone` | `2024-09-04` |
| Create booking | `POST /v2/bookings` | `2024-08-13` |
| Host photo | `GET /v2/event-types?username=<host>` (reads `users[].avatarUrl`) | `2024-06-14` |

Booking request: `start` (UTC, ISO 8601), `eventTypeId`, `attendee { name, email, timeZone, language, phoneNumber? }`,
`metadata` (string key-values, up to 50 keys, used here for source and variant fields).

Booking response: `uid`, `start`, `end`, `meetingUrl`, and `hosts[]` with `id`, `name`, `username`, `timeZone`
(email appears for authenticated callers). The confirmation page uses it to show the assigned host and to build
the add-to-calendar links. The photo comes from a second call by the host's username.

Reschedule and cancel: the page currently links to Cal.com's own pages (`cal.com/reschedule/{uid}`,
`cal.com/booking/{uid}?cancel=true`), the same links Cal.com puts in its emails. They only work if the event type
allows them. The Databox round-robin event currently has **"disable cancelling" and "disable rescheduling" switched
on** (`disableCancelling.disabled` and `disableRescheduling.disabled` are `true`), so on that event the hosted pages
show no cancel or reschedule option and the API refuses both calls ("This event type does not allow cancellations",
"Rescheduling is disabled for this event type"). On an event with those settings off (tested), the hosted cancel page
shows a reason field and a Cancel button, the reschedule link opens the booking screen, and
`POST /v2/bookings/{uid}/reschedule` and `/cancel` also work without a key. So we could build both inside our own
pages if wanted. A reschedule returns a new booking `uid`.

Versions: Cal.com's current docs name `2026-02-25` as the version for create-booking. We pin older dates that
work today. Before launch, test the newer version and decide whether to move up.

## Where an API key IS needed
Not in the page. Only for server-side use, never in browser code:
- reading bookings, event types, team members or profile bio
- creating or changing event types and webhooks
A key was used during development only for testing and cleanup. It is not in the built files or on the server.

## Compared with an iframe or embed
Similar effect: Cal.com does the work and we run no backend. The difference is who draws the UI. An iframe or
embed shows Cal.com's page in a box that can only be lightly adjusted. Here the page is ours, so the design is
fully ours, and our code receives the booking result directly (host, time, link). What stays Cal.com's: its
reschedule and cancel pages and its default emails.

## Code map
- `src/cal.js`: all Cal.com calls and the event id
- `src/App.jsx`: flow state, entry paths, booking submit
- `src/Booking.jsx`, `Calendar.jsx`, `Confirm.jsx`, `Cta.jsx`: the screens
- `src/wire.css`: page styling
- Demo-only (remove for production): the top control bar and events panel (`Panel.jsx`, `events.js`, `sim.css`)

## Open points
- Cal.com event setting: turn off "disable cancelling" and "disable rescheduling" on the real event, or the cancel and
  reschedule links (in the page and in Cal.com's emails) will not work.
- Spam: with no key required, anyone can call the booking endpoint directly. Add a honeypot or Turnstile and
  keep within the 120 requests per minute unauthenticated limit.
- Real event type and host list (the demo books a hidden test event).
- Move to the current API version after testing.
- Host photo quality, bio and role: Cal.com gives a small photo and no usable bio, so keep a host list on our side.
