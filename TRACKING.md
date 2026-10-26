# Strategy call tracking plan

Draft 3, 22 Oct 2026. Built from the "Strategy Call Booking Flow spec (version 2)". Every event below is in the spec. Property descriptions ending in "Added." are the only things this plan adds to it.

## Rules for every event

1. **Every event includes the UTMs, as separate properties.** Send each UTM as its own property, never nested, never hardcoded values. We need all the UTM parameters we use now for tracking ads, plus two new ones: utm_location and utm_team. No ad click ids. first_touch_* is the first marketing touch ever. last_touch_* is read from the latest visit that carried tracking parameters. Any visit with a parameter replaces it; a visit without leaves it as it was. The page where the CTA was clicked is source_page.
2. **Names** follow this rule: meeting_<thing>_<what happened>, snake_case, past tense. Page loads end in _page_viewed, clicks in _clicked. The meeting_ prefix makes every event of this flow filterable in one go. meeting_call_no_show keeps no_show, the term used across the spec, emails and Q5.
3. **Call type:** The three page-view events are Segment page() calls (type page, category meeting, name = the event name). Send one page call per page load with that name, and do not also send a second generic page() on those pages. Everything else is a `track` call.
4. Every event of this build goes to Segment, each fired from its own source: browser events through Analytics.js, server events (form, booking, reschedule, cancel, call) from our server or n8n into Segment, and email events from the email platform's Segment connection. Same workspace, same naming, one place to filter on meeting_. HubSpot creates or updates the contact from meeting_form_submitted (and from meeting_booking_confirmed when no form ran), matched on email; hutk goes with the event so the visit is tied to that contact. Mixpanel gets only contacts that signed up; the other contacts from this flow stay in HubSpot.
5. **Also on every event:** `hutk` (the HubSpot cookie), `email` and `hashed_email` as soon as the email is known, and `booking_id` once the booking exists. The flow properties are in section 4.

## Where to send

- Segment workspace `databox`, source `leads`. Keys page: https://app.segment.com/databox/sources/leads/settings/keys
- Browser events: Analytics.js with the source write key. Server events: the Segment HTTP Tracking API with the same write key.
- This source is only for contacts without a Databox account. Once someone has an account, their events go to the production source.

## 1. Events in this build

| Event | Segment call | Fired by | Role | Fires when |
|---|---|---|---|---|
| `meeting_cta_clicked` | track | Browser | diagnostic | Click on any element with a data-cta attribute, on any site, blog or product page. |
| `meeting_booking_page_viewed` | page | Browser | counting | Booking page loads. Replaces the old page_view. |
| `meeting_video_played` | track | Browser | diagnostic | Play pressed on the video of an A variant (booking page or confirmation page). |
| `meeting_form_started` | track | Browser | diagnostic | First field of the booking form gets focus. |
| `meeting_form_submitted` | track | Server | diagnostic | Form accepted. The contact is created or updated in HubSpot from this event, matched on email. |
| `meeting_calendar_page_viewed` | page | Browser | diagnostic | Calendar loads, including direct entry from ads and emails. |
| `meeting_slot_selected` | track | Browser | diagnostic | A time slot is picked, before the booking is confirmed. |
| `meeting_booking_confirmed` | track | Server | counting | A booking is created. Fired by our server on the Cal.com BOOKING_CREATED webhook. |
| `meeting_confirmation_page_viewed` | page | Browser | diagnostic | Confirmation (thank-you) page loads. |
| `meeting_add_to_calendar_clicked` | track | Browser | diagnostic | Click on an Add to calendar button on the confirmation page. |

"counting" events feed the success metrics. "diagnostic" events explain drop-off.

### `meeting_cta_clicked`

- **Segment call:** track · **Fired by:** Browser · **Role:** diagnostic · **Step:** 0
- **Fires when:** Click on any element with a data-cta attribute, on any site, blog or product page.
- **Entry paths:** P1, P2, P4, P5
- **Properties:** `cta_id` (string): Value of data-cta.; `source_page` (string): Current page path.; `cta_text` (string): Visible button text.
- Writes source_page, cta_id and a new booking_session_id (if none) to the booking link as ?src=&cta=&bsid=, and to the cookie as backup.
- Fires once per click. Not fired for marketing emails or targeted ads: those start further down the flow.

```json
{
  "type": "track",
  "event": "meeting_cta_clicked",
  "anonymousId": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
  "timestamp": "2026-10-22T09:15:02.771Z",
  "properties": {
    "cta_id": "xyz_inline",
    "source_page": "/page-xyz",
    "cta_text": "Book a strategy call",
    "anonymous_id": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
    "hutk": "2c1f3b8d9e4a47f6a0b5c7d8e9f01234",
    "booking_session_id": "bs_7f3a91c2",
    "flow_entry": "cta",
    "flow_start": "booking_page",
    "first_touch_source": "google",
    "first_touch_medium": "cpc",
    "first_touch_campaign": "strategy-call-q4",
    "first_touch_content": "headline-a",
    "first_touch_term": "ai reporting",
    "first_touch_location": "us",
    "first_touch_team": "growth",
    "first_touch_landing_page": "/ad-landing",
    "first_touch_referrer_domain": "google.com",
    "first_touch_at": "2026-10-19T09:12:00Z",
    "last_touch_source": "linkedin",
    "last_touch_medium": "paid-social",
    "last_touch_campaign": "strategy-call-q4",
    "last_touch_content": "video-b",
    "last_touch_term": null,
    "last_touch_location": "us",
    "last_touch_team": "growth",
    "last_touch_landing_page": "/ad-landing",
    "last_touch_referrer_domain": "linkedin.com",
    "last_touch_at": "2026-10-21T16:40:00Z",
    "variant_booking": "A",
    "variant_confirmation": "A"
  },
  "context": {
    "page": {
      "path": "/strategy-call"
    }
  }
}
```
_Plus all UTMs, each as a separate property (see the UTM rule)._

### `meeting_booking_page_viewed`

- **Segment call:** page · **Fired by:** Browser · **Role:** counting · **Step:** 1
- **Fires when:** Booking page loads. Replaces the old page_view.
- **Entry paths:** P1, P2, P4, P5, P6
- **Properties:** `variant_booking` (A or B): Variant shown.; `flow_entry` (enum): Entry type.
- Denominator of the visit-to-booked rate (same booking_session_id as meeting_booking_confirmed).
- Reads source_page and cta_id from the URL params, then the cookie, then the internal referrer. An ad UTM with no CTA data means flow_entry = ad; an email UTM means email; nothing means direct.
- Fires on load only, not on a variant switch or re-render.

```json
{
  "type": "page",
  "category": "meeting",
  "name": "meeting_booking_page_viewed",
  "anonymousId": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
  "timestamp": "2026-10-22T09:15:02.771Z",
  "properties": {
    "variant_booking": "A",
    "flow_entry": "cta",
    "anonymous_id": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
    "hutk": "2c1f3b8d9e4a47f6a0b5c7d8e9f01234",
    "booking_session_id": "bs_7f3a91c2",
    "flow_start": "booking_page",
    "source_page": "/page-xyz",
    "cta_id": "xyz_inline",
    "first_touch_source": "google",
    "first_touch_medium": "cpc",
    "first_touch_campaign": "strategy-call-q4",
    "first_touch_content": "headline-a",
    "first_touch_term": "ai reporting",
    "first_touch_location": "us",
    "first_touch_team": "growth",
    "first_touch_landing_page": "/ad-landing",
    "first_touch_referrer_domain": "google.com",
    "first_touch_at": "2026-10-19T09:12:00Z",
    "last_touch_source": "linkedin",
    "last_touch_medium": "paid-social",
    "last_touch_campaign": "strategy-call-q4",
    "last_touch_content": "video-b",
    "last_touch_term": null,
    "last_touch_location": "us",
    "last_touch_team": "growth",
    "last_touch_landing_page": "/ad-landing",
    "last_touch_referrer_domain": "linkedin.com",
    "last_touch_at": "2026-10-21T16:40:00Z",
    "variant_confirmation": "A"
  },
  "context": {
    "page": {
      "path": "/strategy-call"
    }
  }
}
```
_Plus all UTMs, each as a separate property (see the UTM rule)._

### `meeting_video_played`

- **Segment call:** track · **Fired by:** Browser · **Role:** diagnostic · **Step:** 1, 3
- **Fires when:** Play pressed on the video of an A variant (booking page or confirmation page).
- **Entry paths:** P1, P2, P4, P5, P6
- **Properties:** `page` (enum): booking or confirmation.; `pct_watched` (number): Percent watched when the event fires.
- Variant B has no video, so it never fires there.
- Fire again at 25, 50, 75 and 100 percent if pct_watched is wanted; otherwise once with 0.

```json
{
  "type": "track",
  "event": "meeting_video_played",
  "anonymousId": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
  "timestamp": "2026-10-22T09:15:02.771Z",
  "properties": {
    "page": "booking",
    "pct_watched": 0,
    "anonymous_id": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
    "hutk": "2c1f3b8d9e4a47f6a0b5c7d8e9f01234",
    "booking_session_id": "bs_7f3a91c2",
    "flow_entry": "cta",
    "flow_start": "booking_page",
    "source_page": "/page-xyz",
    "cta_id": "xyz_inline",
    "first_touch_source": "google",
    "first_touch_medium": "cpc",
    "first_touch_campaign": "strategy-call-q4",
    "first_touch_content": "headline-a",
    "first_touch_term": "ai reporting",
    "first_touch_location": "us",
    "first_touch_team": "growth",
    "first_touch_landing_page": "/ad-landing",
    "first_touch_referrer_domain": "google.com",
    "first_touch_at": "2026-10-19T09:12:00Z",
    "last_touch_source": "linkedin",
    "last_touch_medium": "paid-social",
    "last_touch_campaign": "strategy-call-q4",
    "last_touch_content": "video-b",
    "last_touch_term": null,
    "last_touch_location": "us",
    "last_touch_team": "growth",
    "last_touch_landing_page": "/ad-landing",
    "last_touch_referrer_domain": "linkedin.com",
    "last_touch_at": "2026-10-21T16:40:00Z",
    "variant_booking": "A",
    "variant_confirmation": "A"
  },
  "context": {
    "page": {
      "path": "/strategy-call"
    }
  }
}
```
_Plus all UTMs, each as a separate property (see the UTM rule)._

### `meeting_form_started`

- **Segment call:** track · **Fired by:** Browser · **Role:** diagnostic · **Step:** 1
- **Fires when:** First field of the booking form gets focus.
- **Entry paths:** P1, P2, P4, P5, P6
- Once per booking_session_id.

```json
{
  "type": "track",
  "event": "meeting_form_started",
  "anonymousId": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
  "timestamp": "2026-10-22T09:15:02.771Z",
  "properties": {
    "anonymous_id": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
    "hutk": "2c1f3b8d9e4a47f6a0b5c7d8e9f01234",
    "booking_session_id": "bs_7f3a91c2",
    "flow_entry": "cta",
    "flow_start": "booking_page",
    "source_page": "/page-xyz",
    "cta_id": "xyz_inline",
    "first_touch_source": "google",
    "first_touch_medium": "cpc",
    "first_touch_campaign": "strategy-call-q4",
    "first_touch_content": "headline-a",
    "first_touch_term": "ai reporting",
    "first_touch_location": "us",
    "first_touch_team": "growth",
    "first_touch_landing_page": "/ad-landing",
    "first_touch_referrer_domain": "google.com",
    "first_touch_at": "2026-10-19T09:12:00Z",
    "last_touch_source": "linkedin",
    "last_touch_medium": "paid-social",
    "last_touch_campaign": "strategy-call-q4",
    "last_touch_content": "video-b",
    "last_touch_term": null,
    "last_touch_location": "us",
    "last_touch_team": "growth",
    "last_touch_landing_page": "/ad-landing",
    "last_touch_referrer_domain": "linkedin.com",
    "last_touch_at": "2026-10-21T16:40:00Z",
    "variant_booking": "A",
    "variant_confirmation": "A"
  },
  "context": {
    "page": {
      "path": "/strategy-call"
    }
  }
}
```
_Plus all UTMs, each as a separate property (see the UTM rule)._

### `meeting_form_submitted`

- **Segment call:** track · **Fired by:** Server · **Role:** diagnostic · **Step:** 1
- **Fires when:** Form accepted. The contact is created or updated in HubSpot from this event, matched on email.
- **Entry paths:** P1, P2, P4, P5, P6
- **Properties:** `email_domain` (string): Domain of the work email.; `name` (string): Name and surname as typed.; `first_name` (string): Split from name on the first space.; `last_name` (string or empty): Rest of the name.; `phone` (string or null): Optional.; `contact_id` (string): CRM contact id.; `rebook_url` (string): Link back to the calendar with the details prefilled. The recovery email (1 h later, if no slot was picked) uses it. Added.
- The form has three fields: name and surname (one field), business email, phone (optional). No consent checkbox; the legal line sits under the button.
- Not fired when the visitor goes straight to the calendar (targeted ads, some emails): no form ran, so the contact is created from meeting_booking_confirmed instead.
- Stores the context snapshot under booking_session_id; the visitor is then redirected to the calendar with the prefill (name, email), bsid and ajs_aid.
- Fires from our server so ad blockers and consent choices cannot drop it.

```json
{
  "type": "track",
  "event": "meeting_form_submitted",
  "anonymousId": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
  "timestamp": "2026-10-22T09:15:02.771Z",
  "properties": {
    "email_domain": "acme.com",
    "name": "Ana Novak",
    "first_name": "Ana",
    "last_name": "Novak",
    "phone": "+38640123456",
    "contact_id": "contact_8812",
    "rebook_url": "https://www.databox.com/strategy-call/calendar?bsid=bs_7f3a91c2&token=<opaque contact token>",
    "anonymous_id": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
    "hutk": "2c1f3b8d9e4a47f6a0b5c7d8e9f01234",
    "booking_session_id": "bs_7f3a91c2",
    "flow_entry": "cta",
    "flow_start": "booking_page",
    "source_page": "/page-xyz",
    "cta_id": "xyz_inline",
    "first_touch_source": "google",
    "first_touch_medium": "cpc",
    "first_touch_campaign": "strategy-call-q4",
    "first_touch_content": "headline-a",
    "first_touch_term": "ai reporting",
    "first_touch_location": "us",
    "first_touch_team": "growth",
    "first_touch_landing_page": "/ad-landing",
    "first_touch_referrer_domain": "google.com",
    "first_touch_at": "2026-10-19T09:12:00Z",
    "last_touch_source": "linkedin",
    "last_touch_medium": "paid-social",
    "last_touch_campaign": "strategy-call-q4",
    "last_touch_content": "video-b",
    "last_touch_term": null,
    "last_touch_location": "us",
    "last_touch_team": "growth",
    "last_touch_landing_page": "/ad-landing",
    "last_touch_referrer_domain": "linkedin.com",
    "last_touch_at": "2026-10-21T16:40:00Z",
    "variant_booking": "A",
    "variant_confirmation": "A",
    "email": "ana.novak@acme.com",
    "hashed_email": "ba522d25bce4709b0c0d79cfcaade393e50c9548acc2eb52d6a71a7523e9ee84"
  }
}
```
_Plus all UTMs, each as a separate property (see the UTM rule)._

### `meeting_calendar_page_viewed`

- **Segment call:** page · **Fired by:** Browser · **Role:** diagnostic · **Step:** 2
- **Fires when:** Calendar loads, including direct entry from ads and emails.
- **Entry paths:** P1, P2, P3, P4, P5, P6, P7
- **Properties:** `flow_start` (enum): booking_page or calendar.; `flow_entry` (enum): Entry type.
- On P3 and direct P6 this is the first and only context snapshot, so it must run the same read logic as the booking page.
- On those direct entries the same three fields (name, business email, phone optional) appear after a slot is picked, above the Confirm button.
- On P7 (flow emails) there is no new touch; the booking keeps its original attribution.

```json
{
  "type": "page",
  "category": "meeting",
  "name": "meeting_calendar_page_viewed",
  "anonymousId": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
  "timestamp": "2026-10-22T09:15:02.771Z",
  "properties": {
    "flow_start": "booking_page",
    "flow_entry": "cta",
    "anonymous_id": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
    "hutk": "2c1f3b8d9e4a47f6a0b5c7d8e9f01234",
    "booking_session_id": "bs_7f3a91c2",
    "source_page": "/page-xyz",
    "cta_id": "xyz_inline",
    "first_touch_source": "google",
    "first_touch_medium": "cpc",
    "first_touch_campaign": "strategy-call-q4",
    "first_touch_content": "headline-a",
    "first_touch_term": "ai reporting",
    "first_touch_location": "us",
    "first_touch_team": "growth",
    "first_touch_landing_page": "/ad-landing",
    "first_touch_referrer_domain": "google.com",
    "first_touch_at": "2026-10-19T09:12:00Z",
    "last_touch_source": "linkedin",
    "last_touch_medium": "paid-social",
    "last_touch_campaign": "strategy-call-q4",
    "last_touch_content": "video-b",
    "last_touch_term": null,
    "last_touch_location": "us",
    "last_touch_team": "growth",
    "last_touch_landing_page": "/ad-landing",
    "last_touch_referrer_domain": "linkedin.com",
    "last_touch_at": "2026-10-21T16:40:00Z",
    "variant_booking": "A",
    "variant_confirmation": "A"
  },
  "context": {
    "page": {
      "path": "/strategy-call"
    }
  }
}
```
_Plus all UTMs, each as a separate property (see the UTM rule)._

### `meeting_slot_selected`

- **Segment call:** track · **Fired by:** Browser · **Role:** diagnostic · **Step:** 2
- **Fires when:** A time slot is picked, before the booking is confirmed.
- **Entry paths:** P1, P2, P3, P4, P5, P6, P7
- **Properties:** `days_ahead` (number): Days between today and the slot.
- Can fire several times if the visitor changes slot. On the targeted-ad path the email is only known at confirm, so this event is still anonymous there.

```json
{
  "type": "track",
  "event": "meeting_slot_selected",
  "anonymousId": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
  "timestamp": "2026-10-22T09:15:02.771Z",
  "properties": {
    "days_ahead": 7,
    "anonymous_id": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
    "hutk": "2c1f3b8d9e4a47f6a0b5c7d8e9f01234",
    "booking_session_id": "bs_7f3a91c2",
    "flow_entry": "cta",
    "flow_start": "booking_page",
    "source_page": "/page-xyz",
    "cta_id": "xyz_inline",
    "first_touch_source": "google",
    "first_touch_medium": "cpc",
    "first_touch_campaign": "strategy-call-q4",
    "first_touch_content": "headline-a",
    "first_touch_term": "ai reporting",
    "first_touch_location": "us",
    "first_touch_team": "growth",
    "first_touch_landing_page": "/ad-landing",
    "first_touch_referrer_domain": "google.com",
    "first_touch_at": "2026-10-19T09:12:00Z",
    "last_touch_source": "linkedin",
    "last_touch_medium": "paid-social",
    "last_touch_campaign": "strategy-call-q4",
    "last_touch_content": "video-b",
    "last_touch_term": null,
    "last_touch_location": "us",
    "last_touch_team": "growth",
    "last_touch_landing_page": "/ad-landing",
    "last_touch_referrer_domain": "linkedin.com",
    "last_touch_at": "2026-10-21T16:40:00Z",
    "variant_booking": "A",
    "variant_confirmation": "A",
    "email": "ana.novak@acme.com",
    "hashed_email": "ba522d25bce4709b0c0d79cfcaade393e50c9548acc2eb52d6a71a7523e9ee84"
  },
  "context": {
    "page": {
      "path": "/strategy-call"
    }
  }
}
```
_Plus all UTMs, each as a separate property (see the UTM rule)._

### `meeting_booking_confirmed`

- **Segment call:** track · **Fired by:** Server · **Role:** counting · **Step:** 2, R, N
- **Fires when:** A booking is created. Fired by our server on the Cal.com BOOKING_CREATED webhook.
- **Entry paths:** P1, P2, P3, P4, P5, P6, P7
- **Properties:** all booking and email variables, see section 5.
- The event that counts calls. Never count bookings on the thank-you page: reloads double count and ad blockers drop it.
- It carries name, email and phone, so the contact is created or updated from it when no form ran (P3, direct P6).
- This event, and meeting_booking_rescheduled, carry every variable the emails need (table below). The attribution context comes back in the webhook as the booking metadata.
- Starts the HubSpot workflow: confirmation email now, reminders from call_at.

```json
{
  "type": "track",
  "event": "meeting_booking_confirmed",
  "anonymousId": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
  "timestamp": "2026-10-22T09:15:02.771Z",
  "properties": {
    "booking_id": "k9Zp3QmV7sLw2TnXb8Rc4D",
    "call_at": "2026-10-29T14:30:00Z",
    "call_end_at": "2026-10-29T15:00:00Z",
    "duration_min": 30,
    "lead_time_h": 173,
    "time_zone": "Europe/Ljubljana",
    "call_weekday": "Thursday",
    "call_date_text": "Thursday, 29 October",
    "call_time_text": "15:30 (CET)",
    "join_url": "https://meet.google.com/abc-defg-hij",
    "meeting_location": "Video call",
    "host_id": 1001,
    "host_name": "Alex Rivera",
    "host_first_name": "Alex",
    "host_email": "alex.rivera@databox.com",
    "host_username": "alex-rivera",
    "host_role": "Head of Sales",
    "host_photo_url": "https://cdn.example.com/hosts/alex-rivera-288.jpg",
    "calendar_google_url": "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Strategy+call&dates=20261029T143000Z/20261029T153000Z",
    "calendar_outlook_url": "https://outlook.live.com/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&subject=Strategy+call&startdt=2026-10-29T14%3A30%3A00.000Z&enddt=2026-10-29T15%3A30%3A00.000Z",
    "calendar_ics_url": "https://cdn.example.com/ics/k9Zp3QmV7sLw2TnXb8Rc4D.ics",
    "rebook_url": "https://www.databox.com/strategy-call/calendar?bsid=bs_7f3a91c2&token=<opaque contact token>",
    "reschedule_url": "https://cal.com/reschedule/k9Zp3QmV7sLw2TnXb8Rc4D",
    "cancel_url": "https://cal.com/booking/k9Zp3QmV7sLw2TnXb8Rc4D?cancel=true",
    "name": "Ana Novak",
    "first_name": "Ana",
    "last_name": "Novak",
    "phone": "+38640123456",
    "anonymous_id": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
    "hutk": "2c1f3b8d9e4a47f6a0b5c7d8e9f01234",
    "booking_session_id": "bs_7f3a91c2",
    "flow_entry": "cta",
    "flow_start": "booking_page",
    "source_page": "/page-xyz",
    "cta_id": "xyz_inline",
    "first_touch_source": "google",
    "first_touch_medium": "cpc",
    "first_touch_campaign": "strategy-call-q4",
    "first_touch_content": "headline-a",
    "first_touch_term": "ai reporting",
    "first_touch_location": "us",
    "first_touch_team": "growth",
    "first_touch_landing_page": "/ad-landing",
    "first_touch_referrer_domain": "google.com",
    "first_touch_at": "2026-10-19T09:12:00Z",
    "last_touch_source": "linkedin",
    "last_touch_medium": "paid-social",
    "last_touch_campaign": "strategy-call-q4",
    "last_touch_content": "video-b",
    "last_touch_term": null,
    "last_touch_location": "us",
    "last_touch_team": "growth",
    "last_touch_landing_page": "/ad-landing",
    "last_touch_referrer_domain": "linkedin.com",
    "last_touch_at": "2026-10-21T16:40:00Z",
    "variant_booking": "A",
    "variant_confirmation": "A",
    "email": "ana.novak@acme.com",
    "hashed_email": "ba522d25bce4709b0c0d79cfcaade393e50c9548acc2eb52d6a71a7523e9ee84"
  }
}
```
_Plus all UTMs, each as a separate property (see the UTM rule)._

**Example received from the website** (a test booking, personal details replaced):

```json
{
  "context": {
    "ip": "203.0.113.24",
    "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:158.0) Gecko/20100101 Firefox/158.0",
    "page": {
      "url": "https://www.databox.com/strategy-call/calendar",
      "path": "/strategy-call/calendar",
      "search": "",
      "referrer": "https://www.databox.com/strategy-call",
      "title": "Pick a time | Databox"
    },
    "library": {
      "name": "databox-website",
      "version": "unknown"
    }
  },
  "receivedAt": "2026-10-26T07:06:46.248Z",
  "timestamp": "2026-10-26T07:06:45.000Z",
  "originalTimestamp": "2026-10-26T07:06:45Z",
  "integrations": {},
  "anonymousId": "bs_7f3a91c2",
  "event": "meeting_booking_confirmed",
  "type": "track",
  "messageId": "3c9a1f52-6d0e-4b87-9a15-2f4e8d7b6c10",
  "properties": {
    "booking_id": "k9Zp3QmV7sLw2TnXb8Rc4D",
    "call_at": "2026-10-26T11:00:00Z",
    "call_end_at": "2026-10-26T12:00:00Z",
    "duration_min": 60,
    "lead_time_h": 4,
    "time_zone": "Europe/Ljubljana",
    "call_weekday": "Monday",
    "call_date_text": "Monday, 26 October",
    "call_time_text": "12:00 (CET)",
    "join_url": "https://app.cal.com/video/k9Zp3QmV7sLw2TnXb8Rc4D",
    "meeting_location": "Video call",
    "host_id": 1001,
    "host_name": "Alex Rivera",
    "host_first_name": "Alex",
    "host_email": "alex.rivera@databox.com",
    "host_username": "alex-rivera",
    "host_photo_url": "https://cdn.example.com/hosts/alex-rivera-288.jpg",
    "calendar_google_url": "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Strategy%20Call&dates=20261026T110000Z%2F20261026T120000Z&details=https%3A%2F%2Fapp.cal.com%2Fvideo%2Fk9Zp3QmV7sLw2TnXb8Rc4D&location=https%3A%2F%2Fapp.cal.com%2Fvideo%2Fk9Zp3QmV7sLw2TnXb8Rc4D",
    "calendar_outlook_url": "https://outlook.office.com/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&subject=Strategy%20Call&startdt=2026-10-26T11%3A00%3A00.000Z&enddt=2026-10-26T12%3A00%3A00.000Z&body=https%3A%2F%2Fapp.cal.com%2Fvideo%2Fk9Zp3QmV7sLw2TnXb8Rc4D&location=https%3A%2F%2Fapp.cal.com%2Fvideo%2Fk9Zp3QmV7sLw2TnXb8Rc4D",
    "calendar_ics_url": "https://www.databox.com/wp-json/booking/v1/ics?booking=k9Zp3QmV7sLw2TnXb8Rc4D",
    "rebook_url": "https://www.databox.com/strategy-call/calendar?bsid=bs_7f3a91c2",
    "reschedule_url": "https://app.cal.com/reschedule/k9Zp3QmV7sLw2TnXb8Rc4D",
    "cancel_url": "https://app.cal.com/booking/k9Zp3QmV7sLw2TnXb8Rc4D?cancel=true",
    "name": "Ana Novak",
    "first_name": "Ana",
    "last_name": "Novak",
    "phone": "+38640123456",
    "booking_session_id": "bs_7f3a91c2",
    "flow_entry": "direct",
    "flow_start": "booking_page",
    "variant_booking": "B",
    "variant_confirmation": "B",
    "email": "ana.novak@acme.com",
    "hashed_email": "ba522d25bce4709b0c0d79cfcaade393e50c9548acc2eb52d6a71a7523e9ee84"
  }
}
```

### `meeting_confirmation_page_viewed`

- **Segment call:** page · **Fired by:** Browser · **Role:** diagnostic · **Step:** 3
- **Fires when:** Confirmation (thank-you) page loads.
- **Entry paths:** P1, P2, P3, P4, P5, P6, P7
- **Properties:** `variant_confirmation` (A or B): Variant shown.
- Never use it to count bookings.
- Keeps the anonymous id if the scheduler ran on another domain (ajs_aid).

```json
{
  "type": "page",
  "category": "meeting",
  "name": "meeting_confirmation_page_viewed",
  "anonymousId": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
  "timestamp": "2026-10-22T09:15:02.771Z",
  "properties": {
    "variant_confirmation": "A",
    "anonymous_id": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
    "hutk": "2c1f3b8d9e4a47f6a0b5c7d8e9f01234",
    "booking_session_id": "bs_7f3a91c2",
    "flow_entry": "cta",
    "flow_start": "booking_page",
    "source_page": "/page-xyz",
    "cta_id": "xyz_inline",
    "first_touch_source": "google",
    "first_touch_medium": "cpc",
    "first_touch_campaign": "strategy-call-q4",
    "first_touch_content": "headline-a",
    "first_touch_term": "ai reporting",
    "first_touch_location": "us",
    "first_touch_team": "growth",
    "first_touch_landing_page": "/ad-landing",
    "first_touch_referrer_domain": "google.com",
    "first_touch_at": "2026-10-19T09:12:00Z",
    "last_touch_source": "linkedin",
    "last_touch_medium": "paid-social",
    "last_touch_campaign": "strategy-call-q4",
    "last_touch_content": "video-b",
    "last_touch_term": null,
    "last_touch_location": "us",
    "last_touch_team": "growth",
    "last_touch_landing_page": "/ad-landing",
    "last_touch_referrer_domain": "linkedin.com",
    "last_touch_at": "2026-10-21T16:40:00Z",
    "variant_booking": "A",
    "email": "ana.novak@acme.com",
    "hashed_email": "ba522d25bce4709b0c0d79cfcaade393e50c9548acc2eb52d6a71a7523e9ee84",
    "booking_id": "k9Zp3QmV7sLw2TnXb8Rc4D"
  },
  "context": {
    "page": {
      "path": "/strategy-call"
    }
  }
}
```
_Plus all UTMs, each as a separate property (see the UTM rule)._

### `meeting_add_to_calendar_clicked`

- **Segment call:** track · **Fired by:** Browser · **Role:** diagnostic · **Step:** 3
- **Fires when:** Click on an Add to calendar button on the confirmation page.
- **Entry paths:** P1, P2, P3, P4, P5, P6
- **Properties:** `calendar` (enum): google, apple or outlook.
- Each click fires once.

```json
{
  "type": "track",
  "event": "meeting_add_to_calendar_clicked",
  "anonymousId": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
  "timestamp": "2026-10-22T09:15:02.771Z",
  "properties": {
    "calendar": "google",
    "anonymous_id": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
    "hutk": "2c1f3b8d9e4a47f6a0b5c7d8e9f01234",
    "booking_session_id": "bs_7f3a91c2",
    "flow_entry": "cta",
    "flow_start": "booking_page",
    "source_page": "/page-xyz",
    "cta_id": "xyz_inline",
    "first_touch_source": "google",
    "first_touch_medium": "cpc",
    "first_touch_campaign": "strategy-call-q4",
    "first_touch_content": "headline-a",
    "first_touch_term": "ai reporting",
    "first_touch_location": "us",
    "first_touch_team": "growth",
    "first_touch_landing_page": "/ad-landing",
    "first_touch_referrer_domain": "google.com",
    "first_touch_at": "2026-10-19T09:12:00Z",
    "last_touch_source": "linkedin",
    "last_touch_medium": "paid-social",
    "last_touch_campaign": "strategy-call-q4",
    "last_touch_content": "video-b",
    "last_touch_term": null,
    "last_touch_location": "us",
    "last_touch_team": "growth",
    "last_touch_landing_page": "/ad-landing",
    "last_touch_referrer_domain": "linkedin.com",
    "last_touch_at": "2026-10-21T16:40:00Z",
    "variant_booking": "A",
    "variant_confirmation": "A",
    "email": "ana.novak@acme.com",
    "hashed_email": "ba522d25bce4709b0c0d79cfcaade393e50c9548acc2eb52d6a71a7523e9ee84",
    "booking_id": "k9Zp3QmV7sLw2TnXb8Rc4D"
  },
  "context": {
    "page": {
      "path": "/strategy-call"
    }
  }
}
```
_Plus all UTMs, each as a separate property (see the UTM rule)._

## 2. Implemented separately

The booking lifecycle and call events (reschedule, cancel, call held, no-show) and the email events (sent, clicked) are not part of this build. They are implemented separately, and only if tracking in Mixpanel is needed. Their definitions stay here so the names and data are agreed up front.

- Show rate (call held divided by confirmed minus canceled) cannot be reported from events until meeting_call_held and meeting_booking_canceled exist.
- The HubSpot reminders must stop on a cancel and move on a reschedule. Without these events, use Cal.com's webhook through n8n, or the meeting outcome that Cal.com's HubSpot app sets (RESCHEDULED, CANCELED).
- Emails 4 to 7 are triggered by these events: the recovery email by meeting_form_submitted with no meeting_booking_confirmed after 1 hour, the rescheduled email by meeting_booking_rescheduled, the cancelled email by meeting_booking_canceled, the no-show email by meeting_call_no_show. Until those events exist, those emails cannot be sent.
- Email sends and clicks are already visible inside HubSpot itself.

| Event | Segment call | Fired by | Role | Fires when |
|---|---|---|---|---|
| `meeting_email_sent` | track | Email platform | diagnostic | The email platform accepts a send of any flow email. |
| `meeting_email_clicked` | track | Email platform | diagnostic | Tracked link click in a flow email. |
| `meeting_booking_rescheduled` | track | Server | diagnostic | The time of an existing booking is changed. Cal.com BOOKING_RESCHEDULED webhook. |
| `meeting_booking_canceled` | track | Server | counting | A booking is cancelled by the visitor or the host. Cal.com BOOKING_CANCELLED webhook. |
| `meeting_call_held` | track | Server | counting | The visitor joined the call. |
| `meeting_call_no_show` | track | Server | diagnostic | The visitor has not joined 15 minutes after the start. |

### `meeting_email_sent`

- **Segment call:** track · **Fired by:** Email platform · **Role:** diagnostic · **Step:** R, 4 to 8, N
- **Fires when:** The email platform accepts a send of any flow email.
- **Entry paths:** P6, P7
- **Properties:** `email_id` (enum): confirmation, reminder_24h, reminder_1h, recovery, no_show, post_call.
- Email opens are not tracked: Apple Mail Privacy Protection inflates them.
- Built so far: confirmation, reminder_24h, reminder_1h. Spec also lists recovery, no_show and post_call (not designed yet).

```json
{
  "type": "track",
  "event": "meeting_email_sent",
  "anonymousId": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
  "timestamp": "2026-10-22T09:15:02.771Z",
  "properties": {
    "email_id": "confirmation",
    "anonymous_id": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
    "hutk": "2c1f3b8d9e4a47f6a0b5c7d8e9f01234",
    "booking_session_id": "bs_7f3a91c2",
    "flow_entry": "cta",
    "flow_start": "booking_page",
    "source_page": "/page-xyz",
    "cta_id": "xyz_inline",
    "first_touch_source": "google",
    "first_touch_medium": "cpc",
    "first_touch_campaign": "strategy-call-q4",
    "first_touch_content": "headline-a",
    "first_touch_term": "ai reporting",
    "first_touch_location": "us",
    "first_touch_team": "growth",
    "first_touch_landing_page": "/ad-landing",
    "first_touch_referrer_domain": "google.com",
    "first_touch_at": "2026-10-19T09:12:00Z",
    "last_touch_source": "linkedin",
    "last_touch_medium": "paid-social",
    "last_touch_campaign": "strategy-call-q4",
    "last_touch_content": "video-b",
    "last_touch_term": null,
    "last_touch_location": "us",
    "last_touch_team": "growth",
    "last_touch_landing_page": "/ad-landing",
    "last_touch_referrer_domain": "linkedin.com",
    "last_touch_at": "2026-10-21T16:40:00Z",
    "variant_booking": "A",
    "variant_confirmation": "A",
    "email": "ana.novak@acme.com",
    "hashed_email": "ba522d25bce4709b0c0d79cfcaade393e50c9548acc2eb52d6a71a7523e9ee84",
    "booking_id": "k9Zp3QmV7sLw2TnXb8Rc4D"
  },
  "context": {
    "source": "email platform"
  }
}
```
_Plus all UTMs, each as a separate property (see the UTM rule)._

### `meeting_email_clicked`

- **Segment call:** track · **Fired by:** Email platform · **Role:** diagnostic · **Step:** R, 4 to 8, N
- **Fires when:** Tracked link click in a flow email.
- **Entry paths:** P6, P7
- **Properties:** `email_id` (enum): Which email.; `link_id` (enum): Which link.
- Flow-email links carry the booking id and never write a new touch; the booking keeps its attribution. Marketing-email links are a different case: they carry UTMs, so they replace the last touch like any visit with parameters.
- link_id values: join, reschedule, cancel, rebook, report, add_google, add_outlook, add_apple.

```json
{
  "type": "track",
  "event": "meeting_email_clicked",
  "anonymousId": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
  "timestamp": "2026-10-22T09:15:02.771Z",
  "properties": {
    "email_id": "reminder_24h",
    "link_id": "join",
    "anonymous_id": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
    "hutk": "2c1f3b8d9e4a47f6a0b5c7d8e9f01234",
    "booking_session_id": "bs_7f3a91c2",
    "flow_entry": "cta",
    "flow_start": "booking_page",
    "source_page": "/page-xyz",
    "cta_id": "xyz_inline",
    "first_touch_source": "google",
    "first_touch_medium": "cpc",
    "first_touch_campaign": "strategy-call-q4",
    "first_touch_content": "headline-a",
    "first_touch_term": "ai reporting",
    "first_touch_location": "us",
    "first_touch_team": "growth",
    "first_touch_landing_page": "/ad-landing",
    "first_touch_referrer_domain": "google.com",
    "first_touch_at": "2026-10-19T09:12:00Z",
    "last_touch_source": "linkedin",
    "last_touch_medium": "paid-social",
    "last_touch_campaign": "strategy-call-q4",
    "last_touch_content": "video-b",
    "last_touch_term": null,
    "last_touch_location": "us",
    "last_touch_team": "growth",
    "last_touch_landing_page": "/ad-landing",
    "last_touch_referrer_domain": "linkedin.com",
    "last_touch_at": "2026-10-21T16:40:00Z",
    "variant_booking": "A",
    "variant_confirmation": "A",
    "email": "ana.novak@acme.com",
    "hashed_email": "ba522d25bce4709b0c0d79cfcaade393e50c9548acc2eb52d6a71a7523e9ee84",
    "booking_id": "k9Zp3QmV7sLw2TnXb8Rc4D"
  },
  "context": {
    "source": "email platform"
  }
}
```
_Plus all UTMs, each as a separate property (see the UTM rule)._

### `meeting_booking_rescheduled`

- **Segment call:** track · **Fired by:** Server · **Role:** diagnostic · **Step:** X
- **Fires when:** The time of an existing booking is changed. Cal.com BOOKING_RESCHEDULED webhook.
- **Entry paths:** P7
- **Properties:** `previous_booking_id` (string): Booking id before the reschedule. Added.; `old_call_at` (ISO datetime): Previous start (UTC).; `new_call_at` (ISO datetime): New start (UTC).
- Not counted as a new booking. Keeps the original attribution and variant.
- Cal.com issues a new booking id on a reschedule: send it as booking_id and keep the old one as previous_booking_id so the join to the original stays.
- Carries all the email variables again with the new time, so reminders can be rescheduled and a "your call moved" email can use them.

```json
{
  "type": "track",
  "event": "meeting_booking_rescheduled",
  "anonymousId": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
  "timestamp": "2026-10-22T09:15:02.771Z",
  "properties": {
    "previous_booking_id": "wUqtfgWLCft74eKnRrEYYs",
    "old_call_at": "2026-10-28T10:00:00Z",
    "new_call_at": "2026-10-29T14:30:00Z",
    "booking_id": "k9Zp3QmV7sLw2TnXb8Rc4D",
    "call_at": "2026-10-29T14:30:00Z",
    "call_end_at": "2026-10-29T15:00:00Z",
    "duration_min": 30,
    "lead_time_h": 173,
    "time_zone": "Europe/Ljubljana",
    "call_weekday": "Thursday",
    "call_date_text": "Thursday, 29 October",
    "call_time_text": "15:30 (CET)",
    "join_url": "https://meet.google.com/abc-defg-hij",
    "meeting_location": "Video call",
    "host_id": 1001,
    "host_name": "Alex Rivera",
    "host_first_name": "Alex",
    "host_email": "alex.rivera@databox.com",
    "host_username": "alex-rivera",
    "host_role": "Head of Sales",
    "host_photo_url": "https://cdn.example.com/hosts/alex-rivera-288.jpg",
    "calendar_google_url": "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Strategy+call&dates=20261029T143000Z/20261029T153000Z",
    "calendar_outlook_url": "https://outlook.live.com/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&subject=Strategy+call&startdt=2026-10-29T14%3A30%3A00.000Z&enddt=2026-10-29T15%3A30%3A00.000Z",
    "calendar_ics_url": "https://cdn.example.com/ics/k9Zp3QmV7sLw2TnXb8Rc4D.ics",
    "rebook_url": "https://www.databox.com/strategy-call/calendar?bsid=bs_7f3a91c2&token=<opaque contact token>",
    "reschedule_url": "https://cal.com/reschedule/k9Zp3QmV7sLw2TnXb8Rc4D",
    "cancel_url": "https://cal.com/booking/k9Zp3QmV7sLw2TnXb8Rc4D?cancel=true",
    "name": "Ana Novak",
    "first_name": "Ana",
    "last_name": "Novak",
    "phone": "+38640123456",
    "anonymous_id": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
    "hutk": "2c1f3b8d9e4a47f6a0b5c7d8e9f01234",
    "booking_session_id": "bs_7f3a91c2",
    "flow_entry": "cta",
    "flow_start": "booking_page",
    "source_page": "/page-xyz",
    "cta_id": "xyz_inline",
    "first_touch_source": "google",
    "first_touch_medium": "cpc",
    "first_touch_campaign": "strategy-call-q4",
    "first_touch_content": "headline-a",
    "first_touch_term": "ai reporting",
    "first_touch_location": "us",
    "first_touch_team": "growth",
    "first_touch_landing_page": "/ad-landing",
    "first_touch_referrer_domain": "google.com",
    "first_touch_at": "2026-10-19T09:12:00Z",
    "last_touch_source": "linkedin",
    "last_touch_medium": "paid-social",
    "last_touch_campaign": "strategy-call-q4",
    "last_touch_content": "video-b",
    "last_touch_term": null,
    "last_touch_location": "us",
    "last_touch_team": "growth",
    "last_touch_landing_page": "/ad-landing",
    "last_touch_referrer_domain": "linkedin.com",
    "last_touch_at": "2026-10-21T16:40:00Z",
    "variant_booking": "A",
    "variant_confirmation": "A",
    "email": "ana.novak@acme.com",
    "hashed_email": "ba522d25bce4709b0c0d79cfcaade393e50c9548acc2eb52d6a71a7523e9ee84"
  }
}
```
_Plus all UTMs, each as a separate property (see the UTM rule)._

### `meeting_booking_canceled`

- **Segment call:** track · **Fired by:** Server · **Role:** counting · **Step:** X
- **Fires when:** A booking is cancelled by the visitor or the host. Cal.com BOOKING_CANCELLED webhook.
- **Entry paths:** P7
- **Properties:** `canceled_by` (enum): visitor or host.; `reason` (string or null): Cancellation reason, if given.
- Subtracted from show rate: meeting_call_held / (meeting_booking_confirmed minus meeting_booking_canceled).
- Stops the HubSpot reminders for this booking id.

```json
{
  "type": "track",
  "event": "meeting_booking_canceled",
  "anonymousId": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
  "timestamp": "2026-10-22T09:15:02.771Z",
  "properties": {
    "canceled_by": "visitor",
    "reason": "Need a different time",
    "booking_id": "k9Zp3QmV7sLw2TnXb8Rc4D",
    "call_at": "2026-10-29T14:30:00Z",
    "time_zone": "Europe/Ljubljana",
    "call_date_text": "Thursday, 29 October",
    "call_time_text": "15:30 (CET)",
    "host_id": 1001,
    "host_name": "Alex Rivera",
    "host_first_name": "Alex",
    "host_username": "alex-rivera",
    "host_role": "Head of Sales",
    "host_photo_url": "https://cdn.example.com/hosts/alex-rivera-288.jpg",
    "rebook_url": "https://www.databox.com/strategy-call/calendar?bsid=bs_7f3a91c2&token=<opaque contact token>",
    "first_name": "Ana",
    "last_name": "Novak",
    "anonymous_id": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
    "hutk": "2c1f3b8d9e4a47f6a0b5c7d8e9f01234",
    "booking_session_id": "bs_7f3a91c2",
    "flow_entry": "cta",
    "flow_start": "booking_page",
    "source_page": "/page-xyz",
    "cta_id": "xyz_inline",
    "first_touch_source": "google",
    "first_touch_medium": "cpc",
    "first_touch_campaign": "strategy-call-q4",
    "first_touch_content": "headline-a",
    "first_touch_term": "ai reporting",
    "first_touch_location": "us",
    "first_touch_team": "growth",
    "first_touch_landing_page": "/ad-landing",
    "first_touch_referrer_domain": "google.com",
    "first_touch_at": "2026-10-19T09:12:00Z",
    "last_touch_source": "linkedin",
    "last_touch_medium": "paid-social",
    "last_touch_campaign": "strategy-call-q4",
    "last_touch_content": "video-b",
    "last_touch_term": null,
    "last_touch_location": "us",
    "last_touch_team": "growth",
    "last_touch_landing_page": "/ad-landing",
    "last_touch_referrer_domain": "linkedin.com",
    "last_touch_at": "2026-10-21T16:40:00Z",
    "variant_booking": "A",
    "variant_confirmation": "A",
    "email": "ana.novak@acme.com",
    "hashed_email": "ba522d25bce4709b0c0d79cfcaade393e50c9548acc2eb52d6a71a7523e9ee84"
  }
}
```
_Plus all UTMs, each as a separate property (see the UTM rule)._

### `meeting_call_held`

- **Segment call:** track · **Fired by:** Server · **Role:** counting · **Step:** 7
- **Fires when:** The visitor joined the call.
- **Entry paths:** P1, P2, P3, P4, P5, P6, P7
- **Properties:** `duration_min` (number): Minutes the visitor was in the call.
- Source system is open (Q5): the scheduler, the call recorder or the host in the CRM. Cal.com's HubSpot app does not mark no-shows.
- Primary metric for the confirmation page test: show rate.

```json
{
  "type": "track",
  "event": "meeting_call_held",
  "anonymousId": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
  "timestamp": "2026-10-22T09:15:02.771Z",
  "properties": {
    "duration_min": 52,
    "call_at": "2026-10-29T14:30:00Z",
    "host_id": 1001,
    "host_name": "Alex Rivera",
    "host_username": "alex-rivera",
    "anonymous_id": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
    "hutk": "2c1f3b8d9e4a47f6a0b5c7d8e9f01234",
    "booking_session_id": "bs_7f3a91c2",
    "flow_entry": "cta",
    "flow_start": "booking_page",
    "source_page": "/page-xyz",
    "cta_id": "xyz_inline",
    "first_touch_source": "google",
    "first_touch_medium": "cpc",
    "first_touch_campaign": "strategy-call-q4",
    "first_touch_content": "headline-a",
    "first_touch_term": "ai reporting",
    "first_touch_location": "us",
    "first_touch_team": "growth",
    "first_touch_landing_page": "/ad-landing",
    "first_touch_referrer_domain": "google.com",
    "first_touch_at": "2026-10-19T09:12:00Z",
    "last_touch_source": "linkedin",
    "last_touch_medium": "paid-social",
    "last_touch_campaign": "strategy-call-q4",
    "last_touch_content": "video-b",
    "last_touch_term": null,
    "last_touch_location": "us",
    "last_touch_team": "growth",
    "last_touch_landing_page": "/ad-landing",
    "last_touch_referrer_domain": "linkedin.com",
    "last_touch_at": "2026-10-21T16:40:00Z",
    "variant_booking": "A",
    "variant_confirmation": "A",
    "email": "ana.novak@acme.com",
    "hashed_email": "ba522d25bce4709b0c0d79cfcaade393e50c9548acc2eb52d6a71a7523e9ee84",
    "booking_id": "k9Zp3QmV7sLw2TnXb8Rc4D"
  }
}
```
_Plus all UTMs, each as a separate property (see the UTM rule)._

### `meeting_call_no_show`

- **Segment call:** track · **Fired by:** Server · **Role:** diagnostic · **Step:** 7
- **Fires when:** The visitor has not joined 15 minutes after the start.
- **Entry paths:** P1, P2, P3, P4, P5, P6, P7
- Source system is open (Q5). Triggers the no-show email, which carries one rebook link to the calendar.

```json
{
  "type": "track",
  "event": "meeting_call_no_show",
  "anonymousId": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
  "timestamp": "2026-10-22T09:15:02.771Z",
  "properties": {
    "booking_id": "k9Zp3QmV7sLw2TnXb8Rc4D",
    "call_at": "2026-10-29T14:30:00Z",
    "time_zone": "Europe/Ljubljana",
    "call_date_text": "Thursday, 29 October",
    "call_time_text": "15:30 (CET)",
    "host_id": 1001,
    "host_name": "Alex Rivera",
    "host_first_name": "Alex",
    "host_username": "alex-rivera",
    "host_role": "Head of Sales",
    "host_photo_url": "https://cdn.example.com/hosts/alex-rivera-288.jpg",
    "rebook_url": "https://www.databox.com/strategy-call/calendar?bsid=bs_7f3a91c2&token=<opaque contact token>",
    "first_name": "Ana",
    "last_name": "Novak",
    "anonymous_id": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
    "hutk": "2c1f3b8d9e4a47f6a0b5c7d8e9f01234",
    "booking_session_id": "bs_7f3a91c2",
    "flow_entry": "cta",
    "flow_start": "booking_page",
    "source_page": "/page-xyz",
    "cta_id": "xyz_inline",
    "first_touch_source": "google",
    "first_touch_medium": "cpc",
    "first_touch_campaign": "strategy-call-q4",
    "first_touch_content": "headline-a",
    "first_touch_term": "ai reporting",
    "first_touch_location": "us",
    "first_touch_team": "growth",
    "first_touch_landing_page": "/ad-landing",
    "first_touch_referrer_domain": "google.com",
    "first_touch_at": "2026-10-19T09:12:00Z",
    "last_touch_source": "linkedin",
    "last_touch_medium": "paid-social",
    "last_touch_campaign": "strategy-call-q4",
    "last_touch_content": "video-b",
    "last_touch_term": null,
    "last_touch_location": "us",
    "last_touch_team": "growth",
    "last_touch_landing_page": "/ad-landing",
    "last_touch_referrer_domain": "linkedin.com",
    "last_touch_at": "2026-10-21T16:40:00Z",
    "variant_booking": "A",
    "variant_confirmation": "A",
    "email": "ana.novak@acme.com",
    "hashed_email": "ba522d25bce4709b0c0d79cfcaade393e50c9548acc2eb52d6a71a7523e9ee84"
  }
}
```
_Plus all UTMs, each as a separate property (see the UTM rule)._

## 3. Flow properties on every event

| Property | Type | What it holds | Where it is set |
|---|---|---|---|
| `anonymous_id` | string | Segment anonymous id. Joins every event before the person is known. Passed as ajs_aid across domains. | Segment cookie |
| `hutk` | string or null | The HubSpot tracking cookie (hubspotutk). Ties the visitor's HubSpot activity, such as the ad click, to the contact. Null if the HubSpot script did not run or cookies were declined. Also sent in the Cal.com booking metadata. Added. | Cookie hubspotutk on .databox.com |
| `booking_session_id` | string | Created at the CTA click, or at the first flow page if there was no click. The one id the scheduler must return. | URL param, cookie, hidden field, Cal.com metadata |
| `flow_entry` | enum | What delivered the visitor to the flow: cta, ad, email, direct. | Read at the booking page or calendar |
| `flow_start` | enum | Which page they entered the flow on: booking_page or calendar. | Read at the booking page or calendar |
| `source_page` | string or null | Path of the page where the CTA was clicked. Null on targeted ads, marketing emails and direct visits. Never the booking page itself. | Written at the CTA click |
| `cta_id` | string or null | The data-cta id of the clicked CTA. For marketing emails: email id plus link id. | Written at the CTA click |
| `variant_booking` | enum A or B | Booking page A/B variant. Sticky per visitor, stored on the booking. | Assigned on first view, cookie |
| `variant_confirmation` | enum A or B | Confirmation page A/B variant. Sticky per visitor. | Assigned on first view, cookie |
| `email` | string | The visitor's email, on every event from the moment it is known (form submit, or the calendar details). Anonymous before that: join those earlier events to the later ones on anonymous_id or booking_session_id (hutk also works in HubSpot). Added. | Form or calendar details |
| `hashed_email` | string | The hashed email. On every event from the moment the email is known. Replaces the ad click ids for matching conversions to ads. Added. | Computed from the email |
| `booking_id` | string | The Cal.com booking id, on every event once the booking exists. Added. | Cal.com booking response or webhook |

UTMs: see rule 1. They are also passed to the booking in the URL, hidden fields and the Cal.com booking metadata.

## 4. Booking and email variables

Carried by `meeting_booking_confirmed` (and `meeting_booking_rescheduled`). The seven emails read these as custom tokens.

| Property | Type | What it holds | Example | Where it comes from | Used in email |
|---|---|---|---|---|---|
| `booking_id` | string | Cal.com booking id (uid). Builds the reschedule and cancel links. | `k9Zp3QmV7sLw2TnXb8Rc4D` | Cal.com webhook: payload.uid | 1, 2, 3, 5 (reschedule and cancel links) |
| `call_at` | ISO datetime | Call start, UTC. Drives the 24 h and 1 h reminder timing. | `2026-10-29T14:30:00Z` | Cal.com webhook: payload.startTime | workflow timing |
| `call_end_at` | ISO datetime | Call end, UTC. Added. | `2026-10-29T15:00:00Z` | Cal.com webhook: payload.endTime |  |
| `duration_min` | number | Call length in minutes (30 for the strategy call). Added. | `30` | Cal.com webhook: end minus start | 1 |
| `lead_time_h` | number | Hours between booking and call. Reminder 2 is skipped under 24. | `173` | Computed |  |
| `time_zone` | string | Visitor's time zone (IANA). | `Europe/Ljubljana` | Cal.com webhook: attendees[0].timeZone |  |
| `call_weekday` | string | Weekday of the call in the visitor's time zone. Email: "See you on ...". Added. | `Thursday` | Computed in the visitor's time zone | 1 |
| `call_date_text` | string | Date as shown in emails, visitor's time zone. Added. | `Thursday, 29 October` | Computed | 1, 2, 5, 6 |
| `call_time_text` | string | Time with zone as shown in emails. Added. | `15:30 (CET)` | Computed | 1, 2, 3, 5, 7 |
| `join_url` | string | Meeting link for the Join the Call buttons. Added. | `https://meet.google.com/abc-defg-hij` | Cal.com webhook: payload.videoCallData.url or location | 2, 3 |
| `meeting_location` | string | Where the call happens, for the "Where" field. Added. | `Video call` | Cal.com webhook: payload.location |  |
| `host_id` | number | Cal.com id of the assigned host (round robin pick). | `1001` | Cal.com webhook: organizer.id |  |
| `host_name` | string | Host full name. Email: "Host" field and sign-off. Added. | `Alex Rivera` | Cal.com webhook: organizer.name | 1, 2, 3, 5, 6, 7 |
| `host_first_name` | string | Host first name for the sign-off. Added. | `Alex` | Our host list, or split from host_name | 2, 3, 5, 6, 7 |
| `host_email` | string | Host work email. Used to find the HubSpot owner. Added. | `alex.rivera@databox.com` | Cal.com webhook: organizer.email |  |
| `host_username` | string | Cal.com username. The key into our host list. Added. | `alex-rivera` | Cal.com webhook: organizer.username |  |
| `host_role` | string | Host job title for the email ("Name, Role"). Not available from Cal.com. Added. | `Head of Sales` | Our host list, keyed by host_username | 1, 2, 3, 5, 6, 7 |
| `host_photo_url` | string | Public URL of the host photo for the emails. Cal.com's photo is only 96 px, so use our own. Added. | `https://cdn.example.com/hosts/alex-rivera-288.jpg` | Our host list, keyed by host_username | 1, 2, 3, 5, 6, 7 |
| `calendar_google_url` | string | Add to Google Calendar link. Added. | `https://calendar.google.com/calendar/render?action=TEMPLA...` | Computed from call_at, call_end_at, join_url | 1, 5 |
| `calendar_outlook_url` | string | Add to Outlook Calendar link. Added. | `https://outlook.live.com/calendar/0/deeplink/compose?path...` | Computed | 1 |
| `calendar_ics_url` | string | Add to Apple Calendar: link to an .ics file. Not available yet, see open points. Added. | `https://cdn.example.com/ics/k9Zp3QmV7sLw2TnXb8Rc4D.ics` | Needs a place to host the file | 1 |
| `rebook_url` | string | Link back to the calendar to pick a new time, with the visitor's details prefilled and the booking_session_id. Emails 4, 6 and 7. Added. | `https://www.databox.com/strategy-call/calendar?bsid=bs_7f...` | Computed: calendar URL, booking_session_id and an opaque contact token (spec Q10) | 4, 6, 7 |
| `reschedule_url` | string | Reschedule page. Lets the email use one value instead of building it. Added. | `https://cal.com/reschedule/k9Zp3QmV7sLw2TnXb8Rc4D` | Computed from booking_id | 1, 2, 3, 5 |
| `cancel_url` | string | Cancel page. Added. | `https://cal.com/booking/k9Zp3QmV7sLw2TnXb8Rc4D?cancel=true` | Computed from booking_id | 1, 2, 3, 5 |
| `name` | string | Name and surname exactly as typed. The form has a single field (Q4 decided). Added. | `Ana Novak` | Booking form, or Cal.com attendee name | contact |
| `first_name` | string | First name, split from name on the first space. Used by HubSpot and the emails ("Hi Ana"). Added. | `Ana` | Derived from name | 1 to 7 |
| `last_name` | string or empty | Rest of name after the first space. Empty if only one word was typed. Added. | `Novak` | Derived from name | 1 |
| `phone` | string or null | Visitor phone. Optional (Q4 decided). The phone field is hidden on the test event in Cal.com, so check it on the real one. Added. | `+38640123456` | Booking form |  |

## 5. HubSpot: the meeting event

One HubSpot custom event, `pe518207_meetings_cal_com` (the ID Segment needs), receives every `meeting_*` event from Segment. The property `event_name` says which one it is. The full list with details is in HUBSPOT_EVENT.md.

- `event_name` is not sent by the app: map it in Segment from the event name.
- `email` identifies the contact, and is also kept as a property. `hutk` is sent as the HubSpot user token, not as a property.
- Not on the HubSpot event: the first and last touch UTMs (contact properties instead), `hashed_email`, `anonymous_id`, `email_domain` and `contact_id` (they stay in Segment). This keeps the event under HubSpot's limit of 50 properties (49 used).
- Every property below has the same name in the Segment events above, so the mapping is one to one.

```
event_name - text
cta_id - text
source_page - text
cta_text - text
booking_session_id - text
flow_entry - text
flow_start - text
variant_booking - text
variant_confirmation - text
page - text
pct_watched - number
name - text
first_name - text
last_name - text
phone - text
rebook_url - text
email - text
days_ahead - number
booking_id - text
call_at - datetime
call_end_at - datetime
duration_min - number
lead_time_h - number
time_zone - text
call_weekday - text
call_date_text - text
call_time_text - text
join_url - text
meeting_location - text
host_id - number
host_name - text
host_first_name - text
host_email - text
host_username - text
host_role - text
host_photo_url - text
calendar_google_url - text
calendar_outlook_url - text
calendar_ics_url - text
reschedule_url - text
cancel_url - text
calendar - text
email_id - text
link_id - text
previous_booking_id - text
old_call_at - datetime
new_call_at - datetime
canceled_by - text
reason - text
```


## 6. Entry paths

| Path | Route | Resulting values |
|---|---|---|
| P1 | Ad, then ad landing, then a page with a CTA, then booking page, calendar, thank you | flow_entry = cta, source_page = the page with the CTA. first_touch = last_touch = the ad, unless the page with the CTA carried newer parameters |
| P2 | Ad, then ad landing, then booking page, calendar, thank you | flow_entry = cta, source_page = /ad-landing. last_touch = the ad landing visit (it carried the ad parameters) |
| P3 | Targeted ad straight to the calendar, thank you | flow_entry = ad, flow_start = calendar, source_page = null. No CTA click: last_touch = the ad visit that opened the calendar. No form: the contact is created from meeting_booking_confirmed |
| P4 | Search, social or direct, any page, header CTA, booking page, calendar, thank you | flow_entry = cta, cta_id = header, source_page = the current page. last_touch = the latest visit with parameters, if any |
| P5 | Search, social or partner, landing page, booking page, calendar, thank you | flow_entry = cta, source_page = /landing-page. last_touch = that landing page visit if it carried parameters |
| P6 | Marketing email, booking page (or straight to the calendar), thank you | flow_entry = email. No CTA click: last_touch = the email visit, with the email's UTMs |
| P7 | Flow email (reschedule, rebook), calendar, thank you | No new touch. The booking keeps its original first_touch and last_touch |

## 7. Open points

- Confirm with Engineering that the Segment HubSpot destination can create the contact from a track event (mapping its contact action to meeting_form_submitted) and pass hutk with the event.
- Add to Apple Calendar needs a link to an .ics file, which HubSpot emails cannot attach. Idea: host the files on S3 and delete them after 30 days. A step must create one file per booking. Gregor to give feedback.

## Naming: spec name to plan name

| Spec | Plan |
|---|---|
| `cta_clicked` | `meeting_cta_clicked` |
| `booking_page_viewed` | `meeting_booking_page_viewed` |
| `video_played` | `meeting_video_played` |
| `form_started` | `meeting_form_started` |
| `form_submitted` | `meeting_form_submitted` |
| `calendar_viewed` | `meeting_calendar_page_viewed` |
| `slot_selected` | `meeting_slot_selected` |
| `booking_confirmed` | `meeting_booking_confirmed` |
| `confirmation_viewed` | `meeting_confirmation_page_viewed` |
| `calendar_added` | `meeting_add_to_calendar_clicked` |
| `email_sent` | `meeting_email_sent` |
| `email_clicked` | `meeting_email_clicked` |
| `booking_rescheduled` | `meeting_booking_rescheduled` |
| `booking_canceled` | `meeting_booking_canceled` |
| `call_held` | `meeting_call_held` |
| `call_no_show` | `meeting_call_no_show` |

## Check against the spec

Strategy Call Booking Flow (2), checked 22 Oct 2026.

- **Event dictionary:** 16 of 16 spec events are defined, with the same step, fired-by and counting or diagnostic role, and every property the spec lists for them. 10 are in this build; 6 (booking lifecycle and call, email) are defined but implemented separately.
- **Last touch:** Defined as the spec does: the latest visit with tracking parameters (Gregor, in Slack). The CTA page is source_page, on every event.
- **Context properties:** anonymous_id, first_touch_*, last_touch_*, booking_session_id, source_page, cta_id, flow_entry, flow_start, variant_booking, variant_confirmation and booking_id are all on every event.
- **Segment calls:** page() for the three page-view events and track() for the rest. No identify() calls (the spec lists them; dropped on purpose): the contact is created from the track events.
- **Entry paths:** P1 to P7 are all covered, with the events each one fires.
- **Q4 (decided in this version):** Form is three fields: name and surname (one field), business email, phone (optional); no consent checkbox. Plan now sends name, with first_name and last_name derived from it.
- **New page copy:** The confirmation page needs the host name, role and first name, the date line, 60 minutes and the join link. All are in the booking variables. Role and first name come from our host list, not Cal.com.
- **Added beyond the spec:** email and booking_id on every event once known; the booking and email variables (join_url, host_*, call_*_text, calendar links, reschedule_url, cancel_url and others); call_end_at, duration_min, previous_booking_id; hashed_email.
