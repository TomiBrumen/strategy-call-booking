# Brief: check Segment against the strategy call tracking plan

Paste this into the project where Segment is connected. It is read-only research first. Do not create or change anything in Segment without showing the exact change and getting a yes.

## Goal
We track the strategy call booking flow in Segment and send it to HubSpot. Compare what Segment actually has with the plan below, and prepare the HubSpot mappings.

## Where the plan lives (public, read it first)
- Tracking plan (readable): https://github.com/TomiBrumen/strategy-call-booking/blob/main/TRACKING.md
- Same data as JSON: https://github.com/TomiBrumen/strategy-call-booking/blob/main/docs/tracking/tracking-plan.json
- Email and workflow notes: https://github.com/TomiBrumen/strategy-call-booking/blob/main/HUBSPOT_WORKFLOW_DRAFT.md

## Facts from the plan
- Segment workspace: `databox`. Source: `leads` (only contacts without a Databox account). The production source `2.0` is not used for this flow.
- HubSpot custom event for all of them: `pe518207_meetings_cal_com`. The property `event_name` holds the Segment event name.
- No identify() calls. Contacts are created in HubSpot from track events, matched on email. `hutk` (the HubSpot cookie) travels on every event.
- Every name starts with `meeting_`. Three events are page() calls, the rest are track().

## Events
| Event | Call | Fired by | Status | Extra properties |
|---|---|---|---|---|
| `meeting_cta_clicked` | track | browser | in build | cta_id, source_page, cta_text |
| `meeting_booking_page_viewed` | page | browser | in build | variant_booking, flow_entry |
| `meeting_video_played` | track | browser | in build | page, pct_watched |
| `meeting_form_started` | track | browser | in build |  |
| `meeting_form_submitted` | track | Server | in build | email_domain, name, first_name, last_name, phone, contact_id, rebook_url |
| `meeting_calendar_page_viewed` | page | browser | in build | flow_start, flow_entry |
| `meeting_slot_selected` | track | browser | in build | days_ahead |
| `meeting_booking_confirmed` | track | server | in build |  |
| `meeting_confirmation_page_viewed` | page | browser | in build | variant_confirmation |
| `meeting_add_to_calendar_clicked` | track | browser | in build | calendar |
| `meeting_email_sent` | track | email | later | email_id |
| `meeting_email_clicked` | track | email | later | email_id, link_id |
| `meeting_booking_rescheduled` | track | server | later | previous_booking_id, old_call_at, new_call_at |
| `meeting_booking_canceled` | track | server | later | canceled_by, reason |
| `meeting_call_held` | track | server | later | duration_min |
| `meeting_call_no_show` | track | server | later |  |

## Properties on every event
`anonymous_id` (string), `hutk` (string or null), `booking_session_id` (string), `flow_entry` (enum), `flow_start` (enum), `source_page` (string or null), `cta_id` (string or null), `variant_booking` (enum A or B), `variant_confirmation` (enum A or B), `email` (string), `hashed_email` (string), `booking_id` (string)

Touch properties: `first_touch_source` / `last_touch_source`, `first_touch_medium` / `last_touch_medium`, `first_touch_campaign` / `last_touch_campaign`, `first_touch_content` / `last_touch_content`, `first_touch_term` / `last_touch_term`, `first_touch_location` / `last_touch_location`, `first_touch_team` / `last_touch_team`, `first_touch_landing_page` / `last_touch_landing_page`, `first_touch_referrer_domain` / `last_touch_referrer_domain`, `first_touch_at` / `last_touch_at`.

## Booking and email variables (on the booking and reschedule events)
`booking_id`, `call_at`, `call_end_at`, `duration_min`, `lead_time_h`, `time_zone`, `call_weekday`, `call_date_text`, `call_time_text`, `join_url`, `meeting_location`, `host_id`, `host_name`, `host_first_name`, `host_email`, `host_username`, `host_role`, `host_photo_url`, `calendar_google_url`, `calendar_outlook_url`, `calendar_ics_url`, `rebook_url`, `reschedule_url`, `cancel_url`, `name`, `first_name`, `last_name`, `phone`

## What I need back
1. Does the `leads` source exist, and which destinations are connected to it? List each destination, its actions and each action's mapping fields.
2. Is the HubSpot destination connected to `leads`? Which HubSpot actions exist (contact upsert, custom behavioral event) and what fields does each take (email, utk, properties)?
3. If the source already receives events, list which `meeting_*` events and properties it has seen, and what is missing against the table above.
4. Propose, as a table, one mapping per event: trigger (event name), HubSpot action, and field mapping. Suggested: contact upsert from `meeting_form_submitted` and `meeting_booking_confirmed` (email, first_name to firstname, last_name to lastname, phone, UTMs to contact properties); custom behavioral events for `meeting_form_submitted`, `meeting_booking_confirmed`, `meeting_booking_rescheduled`, `meeting_booking_canceled`, `meeting_call_no_show`, with `hutk` mapped to the utk field and every booking variable as an event property.
5. List what is not possible or unclear (for example a track event cannot create a contact in this destination, or the field limits).
Do not create the mappings yet. Show them first.
