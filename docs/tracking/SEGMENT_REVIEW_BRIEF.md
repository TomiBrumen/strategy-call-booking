# Brief: review the events in Segment source `leads` against the new tracking spec

For the session that has Segment connected. Research only. Do not create, change, enable or delete anything in Segment or HubSpot. Do not print write keys or tokens.

## What to review
The strategy call and demo booking flows send events to the Segment source `leads` (workspace `databox`). The spec is the file "Booking tracking — events as sent" (booking-tracking-events.md, pre-release `6.92.1-strategy-call-booking-alpha.5`). It replaces the earlier plan in https://github.com/TomiBrumen/strategy-call-booking/blob/main/TRACKING.md where the two differ. The spec wins.

Every flow (`assessment`, `assessment_sl`, `demo`, `meeting`) sends the same events. The property `meeting_flow` says which one.

## Expected events

| Event | Call | Sent by | Email in the payload? | When |
|---|---|---|---|---|
| `meeting_cta_clicked` | track | browser | no | click on a `data-cta` element or any link into a booking page |
| `meeting_booking_page_viewed` | page (category `meeting`) | browser | no | booking page (step 1) loads |
| `meeting_form_started` | track | browser | no | first form field gets focus, once per booking session |
| `meeting_form_submitted` | track | server | yes | form accepted. Not sent when the visitor goes straight to the calendar |
| `meeting_calendar_page_viewed` | page | browser | only if the form came first | calendar loads |
| `meeting_slot_selected` | track | browser | only if the form came first | a time is picked, before booking. Fires again if changed |
| `meeting_booking_confirmed` | track | server | yes | booking made. Counts calls. Makes the contact when no form ran |
| `meeting_confirmation_page_viewed` | page | browser | yes | confirmation page loads |
| `meeting_add_to_calendar_clicked` | track | browser | yes | click on an add-to-calendar button |

Never expected: `meeting_video_played`, reschedule, cancel, call-held, no-show and email events (none are implemented), a generic `page()` on other pages, ad click IDs (`gclid`, `fbclid`, `li_fat_id`, `_fbp`, `_fbc`).

## Properties to check

**On every event (flow):** `anonymous_id`, `hutk`, `booking_session_id`, `meeting_flow`, `flow_entry`, `flow_start`, `source_page`, `cta_id`, `variant_booking`, `variant_confirmation`. Page events and browser events also carry the signup attribution: `referer`, `referer_source`, `referer_last`, `referer_source_last`, `first_page_url`, `signup_url`, `_fprom_track`, `prom_id`, `prom_platform`, `prom_partner`, `experiments`.

**First and last touch, flattened, on every event:** `ad_provider_ft_utm_source`, `_utm_medium`, `_utm_campaign`, `_utm_content`, `_utm_term`, `_utm_location`, `_utm_team`, `_landing_page`, `_referrer_domain`, `_at`, and the same ten with `ad_provider_lt_`. A missing touch is `null`. These replace the older names `first_touch_*` and `last_touch_*`, and there are no plain `utm_*` properties.

**Once the email is known:** `email`, `hashed_email`.

**`meeting_cta_clicked` only:** `cta_text`. **`meeting_slot_selected` only:** `days_ahead`. **`meeting_add_to_calendar_clicked` only:** `calendar` (google, outlook or apple). **`meeting_confirmation_page_viewed`, `meeting_add_to_calendar_clicked`, `meeting_booking_confirmed`:** `booking_id`.

**`meeting_form_submitted` only:** `email_domain`, `name`, `first_name`, `last_name`, `phone`, `rebook_url`, plus `first_page_website_segment`, `first_page_website_segment_category`, `signup_website_segment`, `signup_website_segment_category`.

**`meeting_booking_confirmed` only:** `booking_id`, `call_at`, `call_end_at`, `duration_min`, `lead_time_h`, `time_zone`, `call_weekday`, `call_date_text`, `call_time_text`, `join_url`, `meeting_location`, `host_id`, `host_name`, `host_first_name`, `host_email`, `host_username`, `host_photo_url`, `calendar_google_url`, `calendar_outlook_url`, `calendar_ics_url`, `rebook_url`, `reschedule_url`, `cancel_url`, `scheduling_type` (`roundRobin` or `personal`), `name`, `first_name`, `last_name`, `phone`, and the same segment properties as the form event.

Known gaps in the spec, so not errors: `host_role` and `contact_id` have no source yet.

## Questions to answer

1. Which of the nine events has the `leads` source received in the last 30 days, and how many each? Separate test traffic (hostnames that are not production, pre-release builds) from real traffic where you can tell.
2. For each event, are the call type (`track` or `page`), the sender (browser or server) and the event name exactly as above? List any `meeting_*` event or property in Segment that is not in this brief.
3. For each event, which expected properties are missing, and which unexpected ones are present? Pay attention to: the old `first_touch_*` and `last_touch_*` names, any plain `utm_*`, any click ID, `meeting_flow` values other than `assessment`, `assessment_sl`, `demo`, `meeting`, and a missing `hutk`.
4. Does `email` appear on exactly the events in the table, and is it absent on the three that should not have it? Does `hashed_email` always come with `email`?
5. On `meeting_booking_confirmed`: how many of the booking variables above are present, which are missing, and is `calendar_google_url` or `calendar_outlook_url` longer than 256 characters (HubSpot cuts values at 256)?
6. Is `anonymousId` a Segment anonymous ID (a UUID) on browser events and the booking session ID (`bs_…`) on server events? List the pattern you see.
7. Are `null` touches sent as `null`, or omitted?
8. Which destinations does `leads` feed, and does the HubSpot destination (instance `6adb240c3887e4d5fbf7edd9`, event `pe518207_meetings_cal_com`) have a mapping for each of the nine events? For each mapping: trigger, enabled or not, and which of the properties above it maps.

## Report format
One table per question where it fits, then a short list headed "Needs fixing" with the exact event, the property and what is wrong, and a list headed "Cannot tell". Write the report to `SEGMENT_REVIEW_REPORT.md` in your project.
