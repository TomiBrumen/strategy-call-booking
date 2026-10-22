# Strategy call tracking plan

Draft 2, 22 Oct 2026. Built from the "Strategy Call Booking Flow spec, draft 7". Anything marked *added* is not in the spec yet.

Every event below has: when it fires, who fires it, and a full example JSON (Segment `track` call). All events carry the same context block, including the first and last touch UTMs and click ids, so reports can split on them. From the moment the visitor's email is known, every event carries `email`, and from the moment the booking exists, every event carries `booking_id`.

## Contents

1. Events
2. Page and identify calls
3. Context on every event (UTMs)
4. Booking and email variables
5. Entry paths
6. Open points

## Naming and Segment

**Rule:** meeting_<thing>_<what happened>, snake_case, past tense. Page loads end in _page_viewed, clicks in _clicked. The meeting_ prefix makes every event of this flow filterable in one go. meeting_call_no_show keeps no_show, the term used across the spec, emails and Q5.

Every event goes to Segment, each fired from its own source: browser events through Analytics.js, server events (form, booking, reschedule, cancel, call) from our server or n8n into Segment, and email events from the email platform's Segment connection. Same workspace, same naming, one place to filter on meeting_.

| Name in the spec | Name in this plan |
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

- **Event dictionary:** 16 of 16 spec events are in the plan, with the same step, fired-by and counting or diagnostic role, and every property the spec lists for them.
- **Context properties:** anonymous_id, first_touch_*, last_touch_*, booking_session_id, source_page, cta_id, flow_entry, flow_start, variant_booking, variant_confirmation and booking_id are all on every event.
- **Segment calls:** page(), track() for the events, and identify() at form submit and at booking, as the spec says.
- **Entry paths:** P1 to P7 are all covered, with the events each one fires.
- **Q4 (decided in this version):** Form is three fields: name and surname (one field), business email, phone (optional); no consent checkbox. Plan now sends name, with first_name and last_name derived from it.
- **New page copy:** The confirmation page needs the host name, role and first name, the date line, 60 minutes and the join link. All are in the booking variables. Role and first name come from our host list, not Cal.com.
- **Added beyond the spec:** email and booking_id on every event once known; the booking and email variables (join_url, host_*, call_*_text, calendar links, reschedule_url, cancel_url and others); call_end_at, duration_min, previous_booking_id; first and last touch for any extra utm_* parameter.

## 1. Events

| Event | Step | Fired by | Role | Fires when |
|---|---|---|---|---|
| `meeting_cta_clicked` *added* | 0 | Browser | diagnostic | Click on any element with a data-cta attribute, on any site, blog or product page. |
| `meeting_booking_page_viewed` | 1 | Browser | counting | Booking page loads. Replaces the old page_view. |
| `meeting_video_played` *added* | 1, 3 | Browser | diagnostic | Play pressed on the video of an A variant (booking page or confirmation page). |
| `meeting_form_started` | 1 | Browser | diagnostic | First field of the booking form gets focus. |
| `meeting_form_submitted` | 1 | Server or webhook | diagnostic | Form accepted and the contact is created or matched. Sent together with identify(). |
| `meeting_calendar_page_viewed` *added* | 2 | Browser | diagnostic | Calendar loads, including direct entry from ads and emails. |
| `meeting_slot_selected` *added* | 2 | Browser | diagnostic | A time slot is picked, before the booking is confirmed. |
| `meeting_booking_confirmed` | 2, R, N | Server or webhook | counting | A booking is created. Fired by our server on the Cal.com BOOKING_CREATED webhook. |
| `meeting_confirmation_page_viewed` | 3 | Browser | diagnostic | Confirmation (thank-you) page loads. |
| `meeting_add_to_calendar_clicked` *added* | 3 | Browser | diagnostic | Click on an Add to calendar button on the confirmation page. |
| `meeting_email_sent` | R, 4 to 8, N | Email platform | diagnostic | The email platform accepts a send of any flow email. |
| `meeting_email_clicked` | R, 4 to 8, N | Email platform | diagnostic | Tracked link click in a flow email. |
| `meeting_booking_rescheduled` *added* | X | Server or webhook | diagnostic | The time of an existing booking is changed. Cal.com BOOKING_RESCHEDULED webhook. |
| `meeting_booking_canceled` *added* | X | Server or webhook | counting | A booking is cancelled by the visitor or the host. Cal.com BOOKING_CANCELLED webhook. |
| `meeting_call_held` | 7 | Server or webhook | counting | The visitor joined the call. |
| `meeting_call_no_show` *added* | 7 | Server or webhook | diagnostic | The visitor has not joined 15 minutes after the start. |

"counting" events feed the success metrics and fire server-side. "diagnostic" events explain drop-off and are logged, not reported.

### `meeting_cta_clicked` *(added)*

- **Step:** 0 · **Fired by:** Browser · **Role:** diagnostic
- **Fires when:** Click on any element with a data-cta attribute, on any site, blog or product page.
- **Entry paths:** P1, P2, P4, P5
- **Properties beyond the context:** `cta_id` (string): Value of data-cta.; `source_page` (string): Current page path.; `cta_text` (string): Visible button text.
- Writes source_page, cta_id and a new booking_session_id (if none) to the booking link as ?src=&cta=&bsid=, and to the cookie as backup.
- Fires once per click. Not fired for marketing emails or targeted ads: those start further down the flow.

```json
{
  "type": "track",
  "event": "meeting_cta_clicked",
  "anonymousId": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
  "userId": null,
  "timestamp": "2026-10-22T09:15:02.771Z",
  "properties": {
    "cta_id": "xyz_inline",
    "source_page": "/page-xyz",
    "cta_text": "Book a strategy call",
    "anonymous_id": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
    "booking_session_id": "bs_7f3a91c2",
    "flow_entry": "cta",
    "flow_start": "booking_page",
    "first_touch_source": "<utm_source from the URL>",
    "first_touch_medium": "<utm_medium from the URL>",
    "first_touch_campaign": "<utm_campaign from the URL>",
    "first_touch_content": "<utm_content from the URL>",
    "first_touch_term": "<utm_term from the URL>",
    "first_touch_click_id": "<ad click id from the URL>",
    "first_touch_click_id_type": "<gclid | gbraid | wbraid | li_fat_id | fbclid | msclkid>",
    "first_touch_landing_page": "<path of the first landing page>",
    "first_touch_referrer_domain": "<external referrer domain>",
    "first_touch_at": "2026-10-19T09:12:00Z",
    "last_touch_source": "<utm_source from the URL>",
    "last_touch_medium": "<utm_medium from the URL>",
    "last_touch_campaign": "<utm_campaign from the URL>",
    "last_touch_content": "<utm_content from the URL>",
    "last_touch_term": "<utm_term from the URL>",
    "last_touch_click_id": "<ad click id from the URL>",
    "last_touch_click_id_type": "<gclid | gbraid | wbraid | li_fat_id | fbclid | msclkid>",
    "last_touch_landing_page": "<path of the first landing page>",
    "last_touch_referrer_domain": "<external referrer domain>",
    "last_touch_at": "2026-10-19T09:12:00Z",
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

### `meeting_booking_page_viewed`

- **Step:** 1 · **Fired by:** Browser · **Role:** counting
- **Fires when:** Booking page loads. Replaces the old page_view.
- **Entry paths:** P1, P2, P4, P5, P6
- **Properties beyond the context:** `variant_booking` (A or B): Variant shown.; `flow_entry` (enum): Entry type.
- Denominator of the visit-to-booked rate (same booking_session_id as meeting_booking_confirmed).
- Reads source_page and cta_id from the URL params, then the cookie, then the internal referrer. An ad UTM with no CTA data means flow_entry = ad; an email UTM means email; nothing means direct.
- Fires on load only, not on a variant switch or re-render.

```json
{
  "type": "track",
  "event": "meeting_booking_page_viewed",
  "anonymousId": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
  "userId": null,
  "timestamp": "2026-10-22T09:15:02.771Z",
  "properties": {
    "variant_booking": "A",
    "flow_entry": "cta",
    "anonymous_id": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
    "booking_session_id": "bs_7f3a91c2",
    "flow_start": "booking_page",
    "source_page": "/page-xyz",
    "cta_id": "xyz_inline",
    "first_touch_source": "<utm_source from the URL>",
    "first_touch_medium": "<utm_medium from the URL>",
    "first_touch_campaign": "<utm_campaign from the URL>",
    "first_touch_content": "<utm_content from the URL>",
    "first_touch_term": "<utm_term from the URL>",
    "first_touch_click_id": "<ad click id from the URL>",
    "first_touch_click_id_type": "<gclid | gbraid | wbraid | li_fat_id | fbclid | msclkid>",
    "first_touch_landing_page": "<path of the first landing page>",
    "first_touch_referrer_domain": "<external referrer domain>",
    "first_touch_at": "2026-10-19T09:12:00Z",
    "last_touch_source": "<utm_source from the URL>",
    "last_touch_medium": "<utm_medium from the URL>",
    "last_touch_campaign": "<utm_campaign from the URL>",
    "last_touch_content": "<utm_content from the URL>",
    "last_touch_term": "<utm_term from the URL>",
    "last_touch_click_id": "<ad click id from the URL>",
    "last_touch_click_id_type": "<gclid | gbraid | wbraid | li_fat_id | fbclid | msclkid>",
    "last_touch_landing_page": "<path of the first landing page>",
    "last_touch_referrer_domain": "<external referrer domain>",
    "last_touch_at": "2026-10-19T09:12:00Z",
    "variant_confirmation": "A"
  },
  "context": {
    "page": {
      "path": "/strategy-call"
    }
  }
}
```

### `meeting_video_played` *(added)*

- **Step:** 1, 3 · **Fired by:** Browser · **Role:** diagnostic
- **Fires when:** Play pressed on the video of an A variant (booking page or confirmation page).
- **Entry paths:** P1, P2, P4, P5, P6
- **Properties beyond the context:** `page` (enum): booking or confirmation.; `pct_watched` (number): Percent watched when the event fires.
- Variant B has no video, so it never fires there.
- Fire again at 25, 50, 75 and 100 percent if pct_watched is wanted; otherwise once with 0.

```json
{
  "type": "track",
  "event": "meeting_video_played",
  "anonymousId": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
  "userId": null,
  "timestamp": "2026-10-22T09:15:02.771Z",
  "properties": {
    "page": "booking",
    "pct_watched": 0,
    "anonymous_id": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
    "booking_session_id": "bs_7f3a91c2",
    "flow_entry": "cta",
    "flow_start": "booking_page",
    "source_page": "/page-xyz",
    "cta_id": "xyz_inline",
    "first_touch_source": "<utm_source from the URL>",
    "first_touch_medium": "<utm_medium from the URL>",
    "first_touch_campaign": "<utm_campaign from the URL>",
    "first_touch_content": "<utm_content from the URL>",
    "first_touch_term": "<utm_term from the URL>",
    "first_touch_click_id": "<ad click id from the URL>",
    "first_touch_click_id_type": "<gclid | gbraid | wbraid | li_fat_id | fbclid | msclkid>",
    "first_touch_landing_page": "<path of the first landing page>",
    "first_touch_referrer_domain": "<external referrer domain>",
    "first_touch_at": "2026-10-19T09:12:00Z",
    "last_touch_source": "<utm_source from the URL>",
    "last_touch_medium": "<utm_medium from the URL>",
    "last_touch_campaign": "<utm_campaign from the URL>",
    "last_touch_content": "<utm_content from the URL>",
    "last_touch_term": "<utm_term from the URL>",
    "last_touch_click_id": "<ad click id from the URL>",
    "last_touch_click_id_type": "<gclid | gbraid | wbraid | li_fat_id | fbclid | msclkid>",
    "last_touch_landing_page": "<path of the first landing page>",
    "last_touch_referrer_domain": "<external referrer domain>",
    "last_touch_at": "2026-10-19T09:12:00Z",
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

### `meeting_form_started`

- **Step:** 1 · **Fired by:** Browser · **Role:** diagnostic
- **Fires when:** First field of the booking form gets focus.
- **Entry paths:** P1, P2, P4, P5, P6
- Once per booking_session_id.

```json
{
  "type": "track",
  "event": "meeting_form_started",
  "anonymousId": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
  "userId": null,
  "timestamp": "2026-10-22T09:15:02.771Z",
  "properties": {
    "anonymous_id": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
    "booking_session_id": "bs_7f3a91c2",
    "flow_entry": "cta",
    "flow_start": "booking_page",
    "source_page": "/page-xyz",
    "cta_id": "xyz_inline",
    "first_touch_source": "<utm_source from the URL>",
    "first_touch_medium": "<utm_medium from the URL>",
    "first_touch_campaign": "<utm_campaign from the URL>",
    "first_touch_content": "<utm_content from the URL>",
    "first_touch_term": "<utm_term from the URL>",
    "first_touch_click_id": "<ad click id from the URL>",
    "first_touch_click_id_type": "<gclid | gbraid | wbraid | li_fat_id | fbclid | msclkid>",
    "first_touch_landing_page": "<path of the first landing page>",
    "first_touch_referrer_domain": "<external referrer domain>",
    "first_touch_at": "2026-10-19T09:12:00Z",
    "last_touch_source": "<utm_source from the URL>",
    "last_touch_medium": "<utm_medium from the URL>",
    "last_touch_campaign": "<utm_campaign from the URL>",
    "last_touch_content": "<utm_content from the URL>",
    "last_touch_term": "<utm_term from the URL>",
    "last_touch_click_id": "<ad click id from the URL>",
    "last_touch_click_id_type": "<gclid | gbraid | wbraid | li_fat_id | fbclid | msclkid>",
    "last_touch_landing_page": "<path of the first landing page>",
    "last_touch_referrer_domain": "<external referrer domain>",
    "last_touch_at": "2026-10-19T09:12:00Z",
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

### `meeting_form_submitted`

- **Step:** 1 · **Fired by:** Server or webhook · **Role:** diagnostic
- **Fires when:** Form accepted and the contact is created or matched. Sent together with identify().
- **Entry paths:** P1, P2, P4, P5, P6
- **Properties beyond the context:** `email_domain` (string): Domain of the work email.; `contact_id` (string): CRM contact id, also the Segment userId.
- The form has three fields: name and surname (one field), business email, phone (optional). No consent checkbox; the legal line sits under the button.
- Not fired when the visitor goes straight to the calendar (targeted ads, some emails): no form ran, so identify() goes out with meeting_booking_confirmed instead.
- Stores the context snapshot under booking_session_id; the visitor is then redirected to the calendar with the prefill (name, email), bsid and ajs_aid.
- Fires from our server so ad blockers and consent choices cannot drop it.

```json
{
  "type": "track",
  "event": "meeting_form_submitted",
  "anonymousId": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
  "userId": "contact_8812",
  "timestamp": "2026-10-22T09:15:02.771Z",
  "properties": {
    "email_domain": "acme.com",
    "contact_id": "contact_8812",
    "anonymous_id": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
    "booking_session_id": "bs_7f3a91c2",
    "flow_entry": "cta",
    "flow_start": "booking_page",
    "source_page": "/page-xyz",
    "cta_id": "xyz_inline",
    "first_touch_source": "<utm_source from the URL>",
    "first_touch_medium": "<utm_medium from the URL>",
    "first_touch_campaign": "<utm_campaign from the URL>",
    "first_touch_content": "<utm_content from the URL>",
    "first_touch_term": "<utm_term from the URL>",
    "first_touch_click_id": "<ad click id from the URL>",
    "first_touch_click_id_type": "<gclid | gbraid | wbraid | li_fat_id | fbclid | msclkid>",
    "first_touch_landing_page": "<path of the first landing page>",
    "first_touch_referrer_domain": "<external referrer domain>",
    "first_touch_at": "2026-10-19T09:12:00Z",
    "last_touch_source": "<utm_source from the URL>",
    "last_touch_medium": "<utm_medium from the URL>",
    "last_touch_campaign": "<utm_campaign from the URL>",
    "last_touch_content": "<utm_content from the URL>",
    "last_touch_term": "<utm_term from the URL>",
    "last_touch_click_id": "<ad click id from the URL>",
    "last_touch_click_id_type": "<gclid | gbraid | wbraid | li_fat_id | fbclid | msclkid>",
    "last_touch_landing_page": "<path of the first landing page>",
    "last_touch_referrer_domain": "<external referrer domain>",
    "last_touch_at": "2026-10-19T09:12:00Z",
    "variant_booking": "A",
    "variant_confirmation": "A",
    "email": "ana.novak@acme.com"
  }
}
```

### `meeting_calendar_page_viewed` *(added)*

- **Step:** 2 · **Fired by:** Browser · **Role:** diagnostic
- **Fires when:** Calendar loads, including direct entry from ads and emails.
- **Entry paths:** P1, P2, P3, P4, P5, P6, P7
- **Properties beyond the context:** `flow_start` (enum): booking_page or calendar.; `flow_entry` (enum): Entry type.
- On P3 and direct P6 this is the first and only context snapshot, so it must run the same read logic as the booking page.
- On those direct entries the same three fields (name, business email, phone optional) appear after a slot is picked, above the Confirm button.
- On P7 (flow emails) there is no new touch; the booking keeps its original attribution.

```json
{
  "type": "track",
  "event": "meeting_calendar_page_viewed",
  "anonymousId": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
  "userId": null,
  "timestamp": "2026-10-22T09:15:02.771Z",
  "properties": {
    "flow_start": "booking_page",
    "flow_entry": "cta",
    "anonymous_id": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
    "booking_session_id": "bs_7f3a91c2",
    "source_page": "/page-xyz",
    "cta_id": "xyz_inline",
    "first_touch_source": "<utm_source from the URL>",
    "first_touch_medium": "<utm_medium from the URL>",
    "first_touch_campaign": "<utm_campaign from the URL>",
    "first_touch_content": "<utm_content from the URL>",
    "first_touch_term": "<utm_term from the URL>",
    "first_touch_click_id": "<ad click id from the URL>",
    "first_touch_click_id_type": "<gclid | gbraid | wbraid | li_fat_id | fbclid | msclkid>",
    "first_touch_landing_page": "<path of the first landing page>",
    "first_touch_referrer_domain": "<external referrer domain>",
    "first_touch_at": "2026-10-19T09:12:00Z",
    "last_touch_source": "<utm_source from the URL>",
    "last_touch_medium": "<utm_medium from the URL>",
    "last_touch_campaign": "<utm_campaign from the URL>",
    "last_touch_content": "<utm_content from the URL>",
    "last_touch_term": "<utm_term from the URL>",
    "last_touch_click_id": "<ad click id from the URL>",
    "last_touch_click_id_type": "<gclid | gbraid | wbraid | li_fat_id | fbclid | msclkid>",
    "last_touch_landing_page": "<path of the first landing page>",
    "last_touch_referrer_domain": "<external referrer domain>",
    "last_touch_at": "2026-10-19T09:12:00Z",
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

### `meeting_slot_selected` *(added)*

- **Step:** 2 · **Fired by:** Browser · **Role:** diagnostic
- **Fires when:** A time slot is picked, before the booking is confirmed.
- **Entry paths:** P1, P2, P3, P4, P5, P6, P7
- **Properties beyond the context:** `days_ahead` (number): Days between today and the slot.
- Can fire several times if the visitor changes slot. On the targeted-ad path the email is only known at confirm, so this event is still anonymous there.

```json
{
  "type": "track",
  "event": "meeting_slot_selected",
  "anonymousId": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
  "userId": "contact_8812",
  "timestamp": "2026-10-22T09:15:02.771Z",
  "properties": {
    "days_ahead": 7,
    "anonymous_id": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
    "booking_session_id": "bs_7f3a91c2",
    "flow_entry": "cta",
    "flow_start": "booking_page",
    "source_page": "/page-xyz",
    "cta_id": "xyz_inline",
    "first_touch_source": "<utm_source from the URL>",
    "first_touch_medium": "<utm_medium from the URL>",
    "first_touch_campaign": "<utm_campaign from the URL>",
    "first_touch_content": "<utm_content from the URL>",
    "first_touch_term": "<utm_term from the URL>",
    "first_touch_click_id": "<ad click id from the URL>",
    "first_touch_click_id_type": "<gclid | gbraid | wbraid | li_fat_id | fbclid | msclkid>",
    "first_touch_landing_page": "<path of the first landing page>",
    "first_touch_referrer_domain": "<external referrer domain>",
    "first_touch_at": "2026-10-19T09:12:00Z",
    "last_touch_source": "<utm_source from the URL>",
    "last_touch_medium": "<utm_medium from the URL>",
    "last_touch_campaign": "<utm_campaign from the URL>",
    "last_touch_content": "<utm_content from the URL>",
    "last_touch_term": "<utm_term from the URL>",
    "last_touch_click_id": "<ad click id from the URL>",
    "last_touch_click_id_type": "<gclid | gbraid | wbraid | li_fat_id | fbclid | msclkid>",
    "last_touch_landing_page": "<path of the first landing page>",
    "last_touch_referrer_domain": "<external referrer domain>",
    "last_touch_at": "2026-10-19T09:12:00Z",
    "variant_booking": "A",
    "variant_confirmation": "A",
    "email": "ana.novak@acme.com"
  },
  "context": {
    "page": {
      "path": "/strategy-call"
    }
  }
}
```

### `meeting_booking_confirmed`

- **Step:** 2, R, N · **Fired by:** Server or webhook · **Role:** counting
- **Fires when:** A booking is created. Fired by our server on the Cal.com BOOKING_CREATED webhook.
- **Entry paths:** P1, P2, P3, P4, P5, P6, P7
- **Properties beyond the context:** all booking and email variables, see section 4.
- The event that counts calls. Never count bookings on the thank-you page: reloads double count and ad blockers drop it.
- Sent with identify() when no form ran (P3, direct P6).
- Rebooks from the recovery or no-show email use this same event with rebook_reason, so one event counts bookings.
- This event, and meeting_booking_rescheduled, carry every variable the emails need (table below). The attribution context comes back in the webhook as the booking metadata.
- Starts the HubSpot workflow: confirmation email now, reminders from call_at.

```json
{
  "type": "track",
  "event": "meeting_booking_confirmed",
  "anonymousId": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
  "userId": "contact_8812",
  "timestamp": "2026-10-22T09:15:02.771Z",
  "properties": {
    "booking_id": "k9Zp3QmV7sLw2TnXb8Rc4D",
    "call_at": "2026-10-29T14:30:00Z",
    "call_end_at": "2026-10-29T15:30:00Z",
    "duration_min": 60,
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
    "reschedule_url": "https://cal.com/reschedule/k9Zp3QmV7sLw2TnXb8Rc4D",
    "cancel_url": "https://cal.com/booking/k9Zp3QmV7sLw2TnXb8Rc4D?cancel=true",
    "name": "Ana Novak",
    "first_name": "Ana",
    "last_name": "Novak",
    "phone": "+38640123456",
    "rebook_reason": null,
    "anonymous_id": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
    "booking_session_id": "bs_7f3a91c2",
    "flow_entry": "cta",
    "flow_start": "booking_page",
    "source_page": "/page-xyz",
    "cta_id": "xyz_inline",
    "first_touch_source": "<utm_source from the URL>",
    "first_touch_medium": "<utm_medium from the URL>",
    "first_touch_campaign": "<utm_campaign from the URL>",
    "first_touch_content": "<utm_content from the URL>",
    "first_touch_term": "<utm_term from the URL>",
    "first_touch_click_id": "<ad click id from the URL>",
    "first_touch_click_id_type": "<gclid | gbraid | wbraid | li_fat_id | fbclid | msclkid>",
    "first_touch_landing_page": "<path of the first landing page>",
    "first_touch_referrer_domain": "<external referrer domain>",
    "first_touch_at": "2026-10-19T09:12:00Z",
    "last_touch_source": "<utm_source from the URL>",
    "last_touch_medium": "<utm_medium from the URL>",
    "last_touch_campaign": "<utm_campaign from the URL>",
    "last_touch_content": "<utm_content from the URL>",
    "last_touch_term": "<utm_term from the URL>",
    "last_touch_click_id": "<ad click id from the URL>",
    "last_touch_click_id_type": "<gclid | gbraid | wbraid | li_fat_id | fbclid | msclkid>",
    "last_touch_landing_page": "<path of the first landing page>",
    "last_touch_referrer_domain": "<external referrer domain>",
    "last_touch_at": "2026-10-19T09:12:00Z",
    "variant_booking": "A",
    "variant_confirmation": "A",
    "email": "ana.novak@acme.com"
  }
}
```

### `meeting_confirmation_page_viewed`

- **Step:** 3 · **Fired by:** Browser · **Role:** diagnostic
- **Fires when:** Confirmation (thank-you) page loads.
- **Entry paths:** P1, P2, P3, P4, P5, P6, P7
- **Properties beyond the context:** `variant_confirmation` (A or B): Variant shown.
- Never use it to count bookings.
- Keeps the anonymous id if the scheduler ran on another domain (ajs_aid).

```json
{
  "type": "track",
  "event": "meeting_confirmation_page_viewed",
  "anonymousId": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
  "userId": "contact_8812",
  "timestamp": "2026-10-22T09:15:02.771Z",
  "properties": {
    "variant_confirmation": "A",
    "anonymous_id": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
    "booking_session_id": "bs_7f3a91c2",
    "flow_entry": "cta",
    "flow_start": "booking_page",
    "source_page": "/page-xyz",
    "cta_id": "xyz_inline",
    "first_touch_source": "<utm_source from the URL>",
    "first_touch_medium": "<utm_medium from the URL>",
    "first_touch_campaign": "<utm_campaign from the URL>",
    "first_touch_content": "<utm_content from the URL>",
    "first_touch_term": "<utm_term from the URL>",
    "first_touch_click_id": "<ad click id from the URL>",
    "first_touch_click_id_type": "<gclid | gbraid | wbraid | li_fat_id | fbclid | msclkid>",
    "first_touch_landing_page": "<path of the first landing page>",
    "first_touch_referrer_domain": "<external referrer domain>",
    "first_touch_at": "2026-10-19T09:12:00Z",
    "last_touch_source": "<utm_source from the URL>",
    "last_touch_medium": "<utm_medium from the URL>",
    "last_touch_campaign": "<utm_campaign from the URL>",
    "last_touch_content": "<utm_content from the URL>",
    "last_touch_term": "<utm_term from the URL>",
    "last_touch_click_id": "<ad click id from the URL>",
    "last_touch_click_id_type": "<gclid | gbraid | wbraid | li_fat_id | fbclid | msclkid>",
    "last_touch_landing_page": "<path of the first landing page>",
    "last_touch_referrer_domain": "<external referrer domain>",
    "last_touch_at": "2026-10-19T09:12:00Z",
    "variant_booking": "A",
    "email": "ana.novak@acme.com",
    "booking_id": "k9Zp3QmV7sLw2TnXb8Rc4D"
  },
  "context": {
    "page": {
      "path": "/strategy-call"
    }
  }
}
```

### `meeting_add_to_calendar_clicked` *(added)*

- **Step:** 3 · **Fired by:** Browser · **Role:** diagnostic
- **Fires when:** Click on an Add to calendar button on the confirmation page.
- **Entry paths:** P1, P2, P3, P4, P5, P6
- **Properties beyond the context:** `calendar` (enum): google, apple or outlook.
- Each click fires once.

```json
{
  "type": "track",
  "event": "meeting_add_to_calendar_clicked",
  "anonymousId": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
  "userId": "contact_8812",
  "timestamp": "2026-10-22T09:15:02.771Z",
  "properties": {
    "calendar": "google",
    "anonymous_id": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
    "booking_session_id": "bs_7f3a91c2",
    "flow_entry": "cta",
    "flow_start": "booking_page",
    "source_page": "/page-xyz",
    "cta_id": "xyz_inline",
    "first_touch_source": "<utm_source from the URL>",
    "first_touch_medium": "<utm_medium from the URL>",
    "first_touch_campaign": "<utm_campaign from the URL>",
    "first_touch_content": "<utm_content from the URL>",
    "first_touch_term": "<utm_term from the URL>",
    "first_touch_click_id": "<ad click id from the URL>",
    "first_touch_click_id_type": "<gclid | gbraid | wbraid | li_fat_id | fbclid | msclkid>",
    "first_touch_landing_page": "<path of the first landing page>",
    "first_touch_referrer_domain": "<external referrer domain>",
    "first_touch_at": "2026-10-19T09:12:00Z",
    "last_touch_source": "<utm_source from the URL>",
    "last_touch_medium": "<utm_medium from the URL>",
    "last_touch_campaign": "<utm_campaign from the URL>",
    "last_touch_content": "<utm_content from the URL>",
    "last_touch_term": "<utm_term from the URL>",
    "last_touch_click_id": "<ad click id from the URL>",
    "last_touch_click_id_type": "<gclid | gbraid | wbraid | li_fat_id | fbclid | msclkid>",
    "last_touch_landing_page": "<path of the first landing page>",
    "last_touch_referrer_domain": "<external referrer domain>",
    "last_touch_at": "2026-10-19T09:12:00Z",
    "variant_booking": "A",
    "variant_confirmation": "A",
    "email": "ana.novak@acme.com",
    "booking_id": "k9Zp3QmV7sLw2TnXb8Rc4D"
  },
  "context": {
    "page": {
      "path": "/strategy-call"
    }
  }
}
```

### `meeting_email_sent`

- **Step:** R, 4 to 8, N · **Fired by:** Email platform · **Role:** diagnostic
- **Fires when:** The email platform accepts a send of any flow email.
- **Entry paths:** P6, P7
- **Properties beyond the context:** `email_id` (enum): confirmation, reminder_24h, reminder_1h, recovery, no_show, post_call.
- Email opens are not tracked: Apple Mail Privacy Protection inflates them.
- Built so far: confirmation, reminder_24h, reminder_1h. Spec also lists recovery, no_show and post_call (not designed yet).

```json
{
  "type": "track",
  "event": "meeting_email_sent",
  "anonymousId": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
  "userId": "contact_8812",
  "timestamp": "2026-10-22T09:15:02.771Z",
  "properties": {
    "email_id": "confirmation",
    "anonymous_id": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
    "booking_session_id": "bs_7f3a91c2",
    "flow_entry": "cta",
    "flow_start": "booking_page",
    "source_page": "/page-xyz",
    "cta_id": "xyz_inline",
    "first_touch_source": "<utm_source from the URL>",
    "first_touch_medium": "<utm_medium from the URL>",
    "first_touch_campaign": "<utm_campaign from the URL>",
    "first_touch_content": "<utm_content from the URL>",
    "first_touch_term": "<utm_term from the URL>",
    "first_touch_click_id": "<ad click id from the URL>",
    "first_touch_click_id_type": "<gclid | gbraid | wbraid | li_fat_id | fbclid | msclkid>",
    "first_touch_landing_page": "<path of the first landing page>",
    "first_touch_referrer_domain": "<external referrer domain>",
    "first_touch_at": "2026-10-19T09:12:00Z",
    "last_touch_source": "<utm_source from the URL>",
    "last_touch_medium": "<utm_medium from the URL>",
    "last_touch_campaign": "<utm_campaign from the URL>",
    "last_touch_content": "<utm_content from the URL>",
    "last_touch_term": "<utm_term from the URL>",
    "last_touch_click_id": "<ad click id from the URL>",
    "last_touch_click_id_type": "<gclid | gbraid | wbraid | li_fat_id | fbclid | msclkid>",
    "last_touch_landing_page": "<path of the first landing page>",
    "last_touch_referrer_domain": "<external referrer domain>",
    "last_touch_at": "2026-10-19T09:12:00Z",
    "variant_booking": "A",
    "variant_confirmation": "A",
    "email": "ana.novak@acme.com",
    "booking_id": "k9Zp3QmV7sLw2TnXb8Rc4D"
  },
  "context": {
    "source": "email platform"
  }
}
```

### `meeting_email_clicked`

- **Step:** R, 4 to 8, N · **Fired by:** Email platform · **Role:** diagnostic
- **Fires when:** Tracked link click in a flow email.
- **Entry paths:** P6, P7
- **Properties beyond the context:** `email_id` (enum): Which email.; `link_id` (enum): Which link.
- Flow-email links carry the booking id and never write a new touch; the booking keeps its attribution. Marketing-email links are a different case: they are a new last touch (open question Q10).
- link_id values: join, reschedule, cancel, rebook, report, add_google, add_outlook, add_apple.

```json
{
  "type": "track",
  "event": "meeting_email_clicked",
  "anonymousId": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
  "userId": "contact_8812",
  "timestamp": "2026-10-22T09:15:02.771Z",
  "properties": {
    "email_id": "reminder_24h",
    "link_id": "join",
    "anonymous_id": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
    "booking_session_id": "bs_7f3a91c2",
    "flow_entry": "cta",
    "flow_start": "booking_page",
    "source_page": "/page-xyz",
    "cta_id": "xyz_inline",
    "first_touch_source": "<utm_source from the URL>",
    "first_touch_medium": "<utm_medium from the URL>",
    "first_touch_campaign": "<utm_campaign from the URL>",
    "first_touch_content": "<utm_content from the URL>",
    "first_touch_term": "<utm_term from the URL>",
    "first_touch_click_id": "<ad click id from the URL>",
    "first_touch_click_id_type": "<gclid | gbraid | wbraid | li_fat_id | fbclid | msclkid>",
    "first_touch_landing_page": "<path of the first landing page>",
    "first_touch_referrer_domain": "<external referrer domain>",
    "first_touch_at": "2026-10-19T09:12:00Z",
    "last_touch_source": "<utm_source from the URL>",
    "last_touch_medium": "<utm_medium from the URL>",
    "last_touch_campaign": "<utm_campaign from the URL>",
    "last_touch_content": "<utm_content from the URL>",
    "last_touch_term": "<utm_term from the URL>",
    "last_touch_click_id": "<ad click id from the URL>",
    "last_touch_click_id_type": "<gclid | gbraid | wbraid | li_fat_id | fbclid | msclkid>",
    "last_touch_landing_page": "<path of the first landing page>",
    "last_touch_referrer_domain": "<external referrer domain>",
    "last_touch_at": "2026-10-19T09:12:00Z",
    "variant_booking": "A",
    "variant_confirmation": "A",
    "email": "ana.novak@acme.com",
    "booking_id": "k9Zp3QmV7sLw2TnXb8Rc4D"
  },
  "context": {
    "source": "email platform"
  }
}
```

### `meeting_booking_rescheduled` *(added)*

- **Step:** X · **Fired by:** Server or webhook · **Role:** diagnostic
- **Fires when:** The time of an existing booking is changed. Cal.com BOOKING_RESCHEDULED webhook.
- **Entry paths:** P7
- **Properties beyond the context:** `previous_booking_id` (string): Booking id before the reschedule. Added.; `old_call_at` (ISO datetime): Previous start (UTC).; `new_call_at` (ISO datetime): New start (UTC).
- Not counted as a new booking. Keeps the original attribution and variant.
- Cal.com issues a new booking id on a reschedule: send it as booking_id and keep the old one as previous_booking_id so the join to the original stays.
- Carries all the email variables again with the new time, so reminders can be rescheduled and a "your call moved" email can use them.

```json
{
  "type": "track",
  "event": "meeting_booking_rescheduled",
  "anonymousId": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
  "userId": "contact_8812",
  "timestamp": "2026-10-22T09:15:02.771Z",
  "properties": {
    "previous_booking_id": "wUqtfgWLCft74eKnRrEYYs",
    "old_call_at": "2026-10-28T10:00:00Z",
    "new_call_at": "2026-10-29T14:30:00Z",
    "booking_id": "k9Zp3QmV7sLw2TnXb8Rc4D",
    "call_at": "2026-10-29T14:30:00Z",
    "call_end_at": "2026-10-29T15:30:00Z",
    "duration_min": 60,
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
    "reschedule_url": "https://cal.com/reschedule/k9Zp3QmV7sLw2TnXb8Rc4D",
    "cancel_url": "https://cal.com/booking/k9Zp3QmV7sLw2TnXb8Rc4D?cancel=true",
    "name": "Ana Novak",
    "first_name": "Ana",
    "last_name": "Novak",
    "phone": "+38640123456",
    "rebook_reason": null,
    "anonymous_id": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
    "booking_session_id": "bs_7f3a91c2",
    "flow_entry": "cta",
    "flow_start": "booking_page",
    "source_page": "/page-xyz",
    "cta_id": "xyz_inline",
    "first_touch_source": "<utm_source from the URL>",
    "first_touch_medium": "<utm_medium from the URL>",
    "first_touch_campaign": "<utm_campaign from the URL>",
    "first_touch_content": "<utm_content from the URL>",
    "first_touch_term": "<utm_term from the URL>",
    "first_touch_click_id": "<ad click id from the URL>",
    "first_touch_click_id_type": "<gclid | gbraid | wbraid | li_fat_id | fbclid | msclkid>",
    "first_touch_landing_page": "<path of the first landing page>",
    "first_touch_referrer_domain": "<external referrer domain>",
    "first_touch_at": "2026-10-19T09:12:00Z",
    "last_touch_source": "<utm_source from the URL>",
    "last_touch_medium": "<utm_medium from the URL>",
    "last_touch_campaign": "<utm_campaign from the URL>",
    "last_touch_content": "<utm_content from the URL>",
    "last_touch_term": "<utm_term from the URL>",
    "last_touch_click_id": "<ad click id from the URL>",
    "last_touch_click_id_type": "<gclid | gbraid | wbraid | li_fat_id | fbclid | msclkid>",
    "last_touch_landing_page": "<path of the first landing page>",
    "last_touch_referrer_domain": "<external referrer domain>",
    "last_touch_at": "2026-10-19T09:12:00Z",
    "variant_booking": "A",
    "variant_confirmation": "A",
    "email": "ana.novak@acme.com"
  }
}
```

### `meeting_booking_canceled` *(added)*

- **Step:** X · **Fired by:** Server or webhook · **Role:** counting
- **Fires when:** A booking is cancelled by the visitor or the host. Cal.com BOOKING_CANCELLED webhook.
- **Entry paths:** P7
- **Properties beyond the context:** `canceled_by` (enum): visitor or host.; `reason` (string or null): Cancellation reason, if given.
- Subtracted from show rate: meeting_call_held / (meeting_booking_confirmed minus meeting_booking_canceled).
- Stops the HubSpot reminders for this booking id.

```json
{
  "type": "track",
  "event": "meeting_booking_canceled",
  "anonymousId": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
  "userId": "contact_8812",
  "timestamp": "2026-10-22T09:15:02.771Z",
  "properties": {
    "canceled_by": "visitor",
    "reason": "Need a different time",
    "call_at": "2026-10-29T14:30:00Z",
    "host_id": 1001,
    "host_name": "Alex Rivera",
    "host_username": "alex-rivera",
    "anonymous_id": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
    "booking_session_id": "bs_7f3a91c2",
    "flow_entry": "cta",
    "flow_start": "booking_page",
    "source_page": "/page-xyz",
    "cta_id": "xyz_inline",
    "first_touch_source": "<utm_source from the URL>",
    "first_touch_medium": "<utm_medium from the URL>",
    "first_touch_campaign": "<utm_campaign from the URL>",
    "first_touch_content": "<utm_content from the URL>",
    "first_touch_term": "<utm_term from the URL>",
    "first_touch_click_id": "<ad click id from the URL>",
    "first_touch_click_id_type": "<gclid | gbraid | wbraid | li_fat_id | fbclid | msclkid>",
    "first_touch_landing_page": "<path of the first landing page>",
    "first_touch_referrer_domain": "<external referrer domain>",
    "first_touch_at": "2026-10-19T09:12:00Z",
    "last_touch_source": "<utm_source from the URL>",
    "last_touch_medium": "<utm_medium from the URL>",
    "last_touch_campaign": "<utm_campaign from the URL>",
    "last_touch_content": "<utm_content from the URL>",
    "last_touch_term": "<utm_term from the URL>",
    "last_touch_click_id": "<ad click id from the URL>",
    "last_touch_click_id_type": "<gclid | gbraid | wbraid | li_fat_id | fbclid | msclkid>",
    "last_touch_landing_page": "<path of the first landing page>",
    "last_touch_referrer_domain": "<external referrer domain>",
    "last_touch_at": "2026-10-19T09:12:00Z",
    "variant_booking": "A",
    "variant_confirmation": "A",
    "email": "ana.novak@acme.com",
    "booking_id": "k9Zp3QmV7sLw2TnXb8Rc4D"
  }
}
```

### `meeting_call_held`

- **Step:** 7 · **Fired by:** Server or webhook · **Role:** counting
- **Fires when:** The visitor joined the call.
- **Entry paths:** P1, P2, P3, P4, P5, P6, P7
- **Properties beyond the context:** `duration_min` (number): Minutes the visitor was in the call.
- Source system is open (Q5): the scheduler, the call recorder or the host in the CRM. Cal.com's HubSpot app does not mark no-shows.
- Primary metric for the confirmation page test: show rate.

```json
{
  "type": "track",
  "event": "meeting_call_held",
  "anonymousId": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
  "userId": "contact_8812",
  "timestamp": "2026-10-22T09:15:02.771Z",
  "properties": {
    "duration_min": 52,
    "call_at": "2026-10-29T14:30:00Z",
    "host_id": 1001,
    "host_name": "Alex Rivera",
    "host_username": "alex-rivera",
    "anonymous_id": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
    "booking_session_id": "bs_7f3a91c2",
    "flow_entry": "cta",
    "flow_start": "booking_page",
    "source_page": "/page-xyz",
    "cta_id": "xyz_inline",
    "first_touch_source": "<utm_source from the URL>",
    "first_touch_medium": "<utm_medium from the URL>",
    "first_touch_campaign": "<utm_campaign from the URL>",
    "first_touch_content": "<utm_content from the URL>",
    "first_touch_term": "<utm_term from the URL>",
    "first_touch_click_id": "<ad click id from the URL>",
    "first_touch_click_id_type": "<gclid | gbraid | wbraid | li_fat_id | fbclid | msclkid>",
    "first_touch_landing_page": "<path of the first landing page>",
    "first_touch_referrer_domain": "<external referrer domain>",
    "first_touch_at": "2026-10-19T09:12:00Z",
    "last_touch_source": "<utm_source from the URL>",
    "last_touch_medium": "<utm_medium from the URL>",
    "last_touch_campaign": "<utm_campaign from the URL>",
    "last_touch_content": "<utm_content from the URL>",
    "last_touch_term": "<utm_term from the URL>",
    "last_touch_click_id": "<ad click id from the URL>",
    "last_touch_click_id_type": "<gclid | gbraid | wbraid | li_fat_id | fbclid | msclkid>",
    "last_touch_landing_page": "<path of the first landing page>",
    "last_touch_referrer_domain": "<external referrer domain>",
    "last_touch_at": "2026-10-19T09:12:00Z",
    "variant_booking": "A",
    "variant_confirmation": "A",
    "email": "ana.novak@acme.com",
    "booking_id": "k9Zp3QmV7sLw2TnXb8Rc4D"
  }
}
```

### `meeting_call_no_show` *(added)*

- **Step:** 7 · **Fired by:** Server or webhook · **Role:** diagnostic
- **Fires when:** The visitor has not joined 15 minutes after the start.
- **Entry paths:** P1, P2, P3, P4, P5, P6, P7
- Source system is open (Q5). Triggers the no-show email, which carries one rebook link to the calendar (rebook_reason = no_show).

```json
{
  "type": "track",
  "event": "meeting_call_no_show",
  "anonymousId": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
  "userId": "contact_8812",
  "timestamp": "2026-10-22T09:15:02.771Z",
  "properties": {
    "call_at": "2026-10-29T14:30:00Z",
    "host_id": 1001,
    "host_name": "Alex Rivera",
    "host_username": "alex-rivera",
    "anonymous_id": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
    "booking_session_id": "bs_7f3a91c2",
    "flow_entry": "cta",
    "flow_start": "booking_page",
    "source_page": "/page-xyz",
    "cta_id": "xyz_inline",
    "first_touch_source": "<utm_source from the URL>",
    "first_touch_medium": "<utm_medium from the URL>",
    "first_touch_campaign": "<utm_campaign from the URL>",
    "first_touch_content": "<utm_content from the URL>",
    "first_touch_term": "<utm_term from the URL>",
    "first_touch_click_id": "<ad click id from the URL>",
    "first_touch_click_id_type": "<gclid | gbraid | wbraid | li_fat_id | fbclid | msclkid>",
    "first_touch_landing_page": "<path of the first landing page>",
    "first_touch_referrer_domain": "<external referrer domain>",
    "first_touch_at": "2026-10-19T09:12:00Z",
    "last_touch_source": "<utm_source from the URL>",
    "last_touch_medium": "<utm_medium from the URL>",
    "last_touch_campaign": "<utm_campaign from the URL>",
    "last_touch_content": "<utm_content from the URL>",
    "last_touch_term": "<utm_term from the URL>",
    "last_touch_click_id": "<ad click id from the URL>",
    "last_touch_click_id_type": "<gclid | gbraid | wbraid | li_fat_id | fbclid | msclkid>",
    "last_touch_landing_page": "<path of the first landing page>",
    "last_touch_referrer_domain": "<external referrer domain>",
    "last_touch_at": "2026-10-19T09:12:00Z",
    "variant_booking": "A",
    "variant_confirmation": "A",
    "email": "ana.novak@acme.com",
    "booking_id": "k9Zp3QmV7sLw2TnXb8Rc4D"
  }
}
```

## 2. Page and identify calls

### `page()`

Every page load, site-wide. This is Segment's standard call and fires automatically from the Segment snippet.

- It is the only call where Segment attaches UTMs, as context.campaign.
- Inside the booking flow every step already has its own event, so page() adds nothing to the step counts. Keeping it is a site-wide decision for Engineering; the flow does not depend on it.

```json
{
  "type": "page",
  "name": "Booking page",
  "anonymousId": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
  "userId": null,
  "timestamp": "2026-10-22T09:12:03.412Z",
  "properties": {
    "path": "/strategy-call",
    "url": "https://www.databox.com/strategy-call?utm_source=<utm_source>&utm_medium=<utm_medium>&utm_campaign=<utm_campaign>&utm_content=<utm_content>&utm_term=<utm_term>&<any other utm_*>",
    "referrer": "<external referrer URL>",
    "title": "Book your strategy call"
  },
  "context": {
    "campaign": {
      "name": "<utm_campaign>",
      "source": "<utm_source>",
      "medium": "<utm_medium>",
      "content": "<utm_content>",
      "term": "<utm_term>",
      "<other utm_*>": "<value from the URL>"
    },
    "page": {
      "path": "/strategy-call"
    }
  }
}
```

### `identify()`

At meeting_form_submitted (server).

```json
{
  "type": "identify",
  "userId": "contact_8812",
  "anonymousId": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
  "timestamp": "2026-10-22T09:14:40.108Z",
  "traits": {
    "email": "ana.novak@acme.com",
    "name": "Ana Novak",
    "first_name": "Ana",
    "last_name": "Novak",
    "phone": "+38640123456",
    "email_domain": "acme.com"
  }
}
```

### `identify()`

At meeting_booking_confirmed, when no form ran (targeted ads, direct emails). Same shape, name and email from the calendar step.

```json
{
  "type": "identify",
  "userId": "contact_8812",
  "anonymousId": "4f1c7e2a-9b3d-4c6e-8a10-5d2f7b9c1e34",
  "timestamp": "2026-10-22T09:17:11.530Z",
  "traits": {
    "email": "ana.novak@acme.com",
    "name": "Ana Novak",
    "first_name": "Ana",
    "last_name": "Novak",
    "phone": null,
    "email_domain": "acme.com"
  }
}
```

## 3. Context on every event (UTMs)

**All UTMs are added, dynamically.** A touch script runs on every page load and reads every `utm_*` parameter on the URL, not a fixed list (the five standard ones are `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`), plus the ad click ids (`gclid`, `gbraid`, `wbraid`, `li_fat_id`, `fbclid`, `msclkid`) and the external referrer. Nothing in the examples below is a real UTM value: they are placeholders for whatever is on the URL. It sets `first_touch_*` once and overwrites `last_touch_*` on every new marketing touch (a direct visit never overwrites it). Both live in a first-party cookie on `.databox.com` for 90 days, and travel to the booking in the URL, the cookie, hidden form fields and the Cal.com booking metadata. Cal.com allows 50 metadata keys; 29 are used, and each extra `utm_*` parameter adds two.

| Property | Type | What it holds | Where it is set |
|---|---|---|---|
| `anonymous_id` | string | Segment anonymous id. Joins every event before the person is known. Passed as ajs_aid across domains. | Segment cookie |
| `booking_session_id` | string | Created at the CTA click, or at the first flow page if there was no click. The one id the scheduler must return. | URL param, cookie, hidden field, Cal.com metadata |
| `flow_entry` | enum | What delivered the visitor to the flow: cta, ad, email, direct. | Read at the booking page or calendar |
| `flow_start` | enum | Which page they entered the flow on: booking_page or calendar. | Read at the booking page or calendar |
| `source_page` | string or null | Path of the page where the CTA was clicked. Null on targeted ads, marketing emails and direct visits. Never the booking page itself. | Written at the CTA click |
| `cta_id` | string or null | The data-cta id of the clicked CTA. For marketing emails: email id plus link id. | Written at the CTA click |
| `first_touch_source` | string or null | utm_source of the first marketing touch, whatever value is on the URL. Set once, kept 90 days. | Touch script, cookie on .databox.com |
| `first_touch_medium` | string or null | utm_medium of the first marketing touch. | Touch script |
| `first_touch_campaign` | string or null | utm_campaign of the first marketing touch. | Touch script |
| `first_touch_content` | string or null | utm_content of the first marketing touch. | Touch script |
| `first_touch_term` | string or null | utm_term of the first marketing touch. | Touch script |
| `first_touch_click_id` | string or null | Ad click id of the first touch. Ad platforms match offline conversions on it. | Touch script |
| `first_touch_click_id_type` | enum or null | gclid, gbraid, wbraid, li_fat_id, fbclid or msclkid. | Touch script |
| `first_touch_landing_page` | string or null | Path of the first page they landed on. One field of the touch, not the touch itself. | Touch script |
| `first_touch_referrer_domain` | string or null | Domain of the external referrer at the first touch. | Touch script |
| `first_touch_at` | ISO datetime | When the first touch happened (UTC). | Touch script |
| `last_touch_source` | string or null | Same shape as first_touch_*. Overwritten by a new UTM, click id or external referrer, never by a direct visit. | Touch script, cookie |
| `last_touch_medium` | string or null | See last_touch_source. | Touch script |
| `last_touch_campaign` | string or null | See last_touch_source. | Touch script |
| `last_touch_content` | string or null | See last_touch_source. | Touch script |
| `last_touch_term` | string or null | See last_touch_source. | Touch script |
| `last_touch_click_id` | string or null | See last_touch_source. | Touch script |
| `last_touch_click_id_type` | enum or null | See last_touch_source. | Touch script |
| `last_touch_landing_page` | string or null | See last_touch_source. | Touch script |
| `last_touch_referrer_domain` | string or null | See last_touch_source. | Touch script |
| `last_touch_at` | ISO datetime | See last_touch_source. | Touch script |
| `first_touch_<other utm_* parameter>` | string or null | Every other utm_* parameter found on the URL (for example utm_id) is captured the same way. Names follow the same pattern; confirm the exact naming with Engineering. | Touch script |
| `last_touch_<other utm_* parameter>` | string or null | Same, for the last touch. | Touch script |
| `variant_booking` | enum A or B | Booking page A/B variant. Sticky per visitor, stored on the booking. | Assigned on first view, cookie |
| `variant_confirmation` | enum A or B | Confirmation page A/B variant. Sticky per visitor. | Assigned on first view, cookie |
| `email` | string | The visitor's email, on every event from the moment it is known (form submit, or the calendar details). Anonymous before that. Added. | Form or calendar details |
| `booking_id` | string | The Cal.com booking id, on every event once the booking exists. Added. | Cal.com booking response or webhook |

## 4. Booking and email variables

Carried by `meeting_booking_confirmed` and again by `meeting_booking_rescheduled`. The emails (1 confirmation, 2 reminder 24 h, 3 reminder 1 h) read these as custom tokens.

| Property | Type | What it holds | Example | Where it comes from | Used in email |
|---|---|---|---|---|---|
| `booking_id` | string | Cal.com booking id (uid). Builds the reschedule and cancel links. | `k9Zp3QmV7sLw2TnXb8Rc4D` | Cal.com webhook: payload.uid | 1, 2, 3 (reschedule and cancel links) |
| `call_at` | ISO datetime | Call start, UTC. Drives the 24 h and 1 h reminder timing. | `2026-10-29T14:30:00Z` | Cal.com webhook: payload.startTime | workflow timing |
| `call_end_at` | ISO datetime | Call end, UTC. Added. | `2026-10-29T15:30:00Z` | Cal.com webhook: payload.endTime |  |
| `duration_min` | number | Call length in minutes. The designs say 60. Added. | `60` | Cal.com webhook: end minus start | 1 |
| `lead_time_h` | number | Hours between booking and call. Reminder 2 is skipped under 24. | `173` | Computed |  |
| `time_zone` | string | Visitor's time zone (IANA). | `Europe/Ljubljana` | Cal.com webhook: attendees[0].timeZone |  |
| `call_weekday` | string | Weekday of the call in the visitor's time zone. Email: "See you on ...". Added. | `Thursday` | Computed in the visitor's time zone | 1 |
| `call_date_text` | string | Date as shown in emails, visitor's time zone. Added. | `Thursday, 29 October` | Computed | 1, 2 |
| `call_time_text` | string | Time with zone as shown in emails. Added. | `15:30 (CET)` | Computed | 1, 2, 3 |
| `join_url` | string | Meeting link for the Join the Call buttons. Added. | `https://meet.google.com/abc-defg-hij` | Cal.com webhook: payload.videoCallData.url or location | 2, 3 |
| `meeting_location` | string | Where the call happens, for the "Where" field. Added. | `Video call` | Cal.com webhook: payload.location |  |
| `host_id` | number | Cal.com id of the assigned host (round robin pick). | `1001` | Cal.com webhook: organizer.id |  |
| `host_name` | string | Host full name. Email: "Host" field and sign-off. Added. | `Alex Rivera` | Cal.com webhook: organizer.name | 1, 2, 3 |
| `host_first_name` | string | Host first name for the sign-off. Added. | `Alex` | Our host list, or split from host_name | 2, 3 |
| `host_email` | string | Host work email. Used to find the HubSpot owner. Added. | `alex.rivera@databox.com` | Cal.com webhook: organizer.email |  |
| `host_username` | string | Cal.com username. The key into our host list. Added. | `alex-rivera` | Cal.com webhook: organizer.username |  |
| `host_role` | string | Host job title for the email ("Name, Role"). Not available from Cal.com. Added. | `Head of Sales` | Our host list, keyed by host_username | 1, 2, 3 |
| `host_photo_url` | string | Public URL of the host photo for the emails. Cal.com's photo is only 96 px, so use our own. Added. | `https://cdn.example.com/hosts/alex-rivera-288.jpg` | Our host list, keyed by host_username | 1, 2, 3 |
| `calendar_google_url` | string | Add to Google Calendar link. Added. | `https://calendar.google.com/calendar/render?action=TEMPLA...` | Computed from call_at, call_end_at, join_url | 1 |
| `calendar_outlook_url` | string | Add to Outlook Calendar link. Added. | `https://outlook.live.com/calendar/0/deeplink/compose?path...` | Computed | 1 |
| `calendar_ics_url` | string | Add to Apple Calendar: link to an .ics file. Not available yet, see open points. Added. | `https://cdn.example.com/ics/k9Zp3QmV7sLw2TnXb8Rc4D.ics` | Needs a place to host the file | 1 |
| `reschedule_url` | string | Reschedule page. Lets the email use one value instead of building it. Added. | `https://cal.com/reschedule/k9Zp3QmV7sLw2TnXb8Rc4D` | Computed from booking_id | 1, 2, 3 |
| `cancel_url` | string | Cancel page. Added. | `https://cal.com/booking/k9Zp3QmV7sLw2TnXb8Rc4D?cancel=true` | Computed from booking_id | 1, 2, 3 |
| `name` | string | Name and surname exactly as typed. The form has a single field (Q4 decided). Added. | `Ana Novak` | Booking form, or Cal.com attendee name |  |
| `first_name` | string | First name, split from name on the first space. Used by HubSpot and the emails ("Hi Ana"). Added. | `Ana` | Derived from name | 1, 2, 3 |
| `last_name` | string or empty | Rest of name after the first space. Empty if only one word was typed. Added. | `Novak` | Derived from name | 1 |
| `phone` | string or null | Visitor phone. Optional (Q4 decided). The phone field is hidden on the test event in Cal.com, so check it on the real one. Added. | `+38640123456` | Booking form |  |
| `rebook_reason` | enum or null | recovery or no_show when the booking came from a rebook email. Null on a first booking. | `null` | Rebook link in the email |  |

## 5. Entry paths

| Path | Route | Resulting values |
|---|---|---|
| P1 | Ad, then ad landing, then a page with a CTA, then booking page, calendar, thank you | flow_entry = cta, source_page = the page with the CTA, first and last touch = the ad |
| P2 | Ad, then ad landing, then booking page, calendar, thank you | flow_entry = cta, source_page = /ad-landing, first and last touch = the ad |
| P3 | Targeted ad straight to the calendar, thank you | flow_entry = ad, flow_start = calendar, source_page = null. No form: identify() goes with meeting_booking_confirmed |
| P4 | Search, social or direct, any page, header CTA, booking page, calendar, thank you | flow_entry = cta, cta_id = header, source_page = the current page |
| P5 | Search, social or partner, landing page, booking page, calendar, thank you | flow_entry = cta, source_page = /landing-page |
| P6 | Marketing email, booking page (or straight to the calendar), thank you | flow_entry = email, last_touch = the email campaign. A new last touch |
| P7 | Flow email (reschedule, rebook), calendar, thank you | No new touch. meeting_booking_rescheduled, or meeting_booking_confirmed with rebook_reason; inherits the original booking |

## 6. Open points

- UTMs are dynamic: capture every utm_* parameter that is on the URL, not a fixed list. The five standard ones have the property names above. Cal.com metadata allows 50 keys; each extra utm_* adds two (first and last touch), and 29 are used today, so a long tail of extra parameters could hit the limit.
- Event naming: the spec uses snake_case (meeting_booking_confirmed). Segment's own convention is Object Action in title case. Match the existing Databox Segment workspace before building (Q11).
- Raw email on every event: the spec sends email_domain on events and the email on identify() only. This plan adds the email to every event once known, because you need to see who to assign it to. It sends personal data to every Segment destination, including ad platforms. The alternative is to rely on identify() and userId.
- Who marks meeting_call_held and meeting_call_no_show (Q5). Cal.com's HubSpot app does not set no-show.
- Host list: host_role, host_first_name and host_photo_url are not in Cal.com. They come from a small list on our side, keyed by host_username.
- Add to Apple Calendar needs a link to an .ics file, and HubSpot marketing emails cannot attach files. Decide who hosts the file, or keep Cal.com's own confirmation email, which carries the .ics.
- Call length: the emails say 60 minutes, the Cal.com test event is 30. Set the real event to 60 so duration_min and call_end_at are right.
- Cancel and reschedule must be switched on in the Cal.com event type, or the reschedule_url and cancel_url in the emails will not work.
- Cal.com webhook payload: the field names in the "Where it comes from" column are the expected ones. Verify them against a real BOOKING_CREATED payload before building.
- Consent: whether the touch cookie counts as functional or analytics under the consent banner is still open (Q3).
