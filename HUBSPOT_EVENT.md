# HubSpot custom event for the strategy call flow

One custom event, `Meeting`, receives every `meeting_*` event from Segment. Which one it is lives in the property `event_name`.

## Event
- Label: Meeting. Internal name: `meeting` (HubSpot adds its own prefix). Associated object: contact.
- The contact is matched on **email**, sent as the event identifier and also kept as the property `email`. `hutk` goes in the HubSpot user token field and is not a property.

## Plain list (49 properties)
```
event_name - dropdown
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

## Details
Recommended types are HubSpot field types. Closed lists are kept as single-line text on purpose: a value that is not on a dropdown list can be rejected, and then the event is lost.

| Internal name | Field type | Expected values | Read by | Sent on events |
|---|---|---|---|---|
| `event_name` | Dropdown select | `meeting_cta_clicked`, `meeting_booking_page_viewed`, `meeting_video_played`, `meeting_form_started`, `meeting_form_submitted`, `meeting_calendar_page_viewed`, `meeting_slot_selected`, `meeting_booking_confirmed`, `meeting_confirmation_page_viewed`, `meeting_add_to_calendar_clicked`, `meeting_email_sent`, `meeting_email_clicked`, `meeting_booking_rescheduled`, `meeting_booking_canceled`, `meeting_call_held`, `meeting_call_no_show` | workflow | all |
| `cta_id` | Single-line text |  |  | cta_clicked, booking_page_viewed, video_played, form_started, form_submitted, calendar_page_viewed, slot_selected, booking_confirmed, confirmation_page_viewed, add_to_calendar_clicked, email_sent, email_clicked, booking_rescheduled, booking_canceled, call_held, call_no_show |
| `source_page` | Single-line text |  |  | cta_clicked, booking_page_viewed, video_played, form_started, form_submitted, calendar_page_viewed, slot_selected, booking_confirmed, confirmation_page_viewed, add_to_calendar_clicked, email_sent, email_clicked, booking_rescheduled, booking_canceled, call_held, call_no_show |
| `cta_text` | Single-line text |  |  | cta_clicked |
| `booking_session_id` | Single-line text |  | workflow | cta_clicked, booking_page_viewed, video_played, form_started, form_submitted, calendar_page_viewed, slot_selected, booking_confirmed, confirmation_page_viewed, add_to_calendar_clicked, email_sent, email_clicked, booking_rescheduled, booking_canceled, call_held, call_no_show |
| `flow_entry` | Single-line text | cta, ad, email, direct |  | cta_clicked, booking_page_viewed, video_played, form_started, form_submitted, calendar_page_viewed, slot_selected, booking_confirmed, confirmation_page_viewed, add_to_calendar_clicked, email_sent, email_clicked, booking_rescheduled, booking_canceled, call_held, call_no_show |
| `flow_start` | Single-line text | booking_page, calendar |  | cta_clicked, booking_page_viewed, video_played, form_started, form_submitted, calendar_page_viewed, slot_selected, booking_confirmed, confirmation_page_viewed, add_to_calendar_clicked, email_sent, email_clicked, booking_rescheduled, booking_canceled, call_held, call_no_show |
| `variant_booking` | Single-line text | A, B |  | cta_clicked, booking_page_viewed, video_played, form_started, form_submitted, calendar_page_viewed, slot_selected, booking_confirmed, confirmation_page_viewed, add_to_calendar_clicked, email_sent, email_clicked, booking_rescheduled, booking_canceled, call_held, call_no_show |
| `variant_confirmation` | Single-line text | A, B |  | cta_clicked, booking_page_viewed, video_played, form_started, form_submitted, calendar_page_viewed, slot_selected, booking_confirmed, confirmation_page_viewed, add_to_calendar_clicked, email_sent, email_clicked, booking_rescheduled, booking_canceled, call_held, call_no_show |
| `page` | Single-line text | booking, confirmation |  | video_played |
| `pct_watched` | Number |  |  | video_played |
| `name` | Single-line text |  |  | form_submitted, booking_confirmed, booking_rescheduled |
| `first_name` | Single-line text |  | emails | form_submitted, booking_confirmed, booking_rescheduled, booking_canceled, call_no_show |
| `last_name` | Single-line text |  | emails | form_submitted, booking_confirmed, booking_rescheduled, booking_canceled, call_no_show |
| `phone` | Single-line text |  |  | form_submitted, booking_confirmed, booking_rescheduled |
| `rebook_url` | Single-line text |  | emails | form_submitted, booking_confirmed, booking_rescheduled, booking_canceled, call_no_show |
| `email` | Single-line text |  | workflow | form_submitted, slot_selected, booking_confirmed, confirmation_page_viewed, add_to_calendar_clicked, email_sent, email_clicked, booking_rescheduled, booking_canceled, call_held, call_no_show |
| `days_ahead` | Number |  |  | slot_selected |
| `booking_id` | Single-line text |  | emails | booking_confirmed, confirmation_page_viewed, add_to_calendar_clicked, email_sent, email_clicked, booking_rescheduled, booking_canceled, call_held, call_no_show |
| `call_at` | Date and time |  | workflow | booking_confirmed, booking_rescheduled, booking_canceled, call_held, call_no_show |
| `call_end_at` | Date and time |  |  | booking_confirmed, booking_rescheduled |
| `duration_min` | Number |  |  | booking_confirmed, booking_rescheduled, call_held |
| `lead_time_h` | Number |  | workflow | booking_confirmed, booking_rescheduled |
| `time_zone` | Single-line text |  |  | booking_confirmed, booking_rescheduled, booking_canceled, call_no_show |
| `call_weekday` | Single-line text |  | emails | booking_confirmed, booking_rescheduled |
| `call_date_text` | Single-line text |  | emails | booking_confirmed, booking_rescheduled, booking_canceled, call_no_show |
| `call_time_text` | Single-line text |  | emails | booking_confirmed, booking_rescheduled, booking_canceled, call_no_show |
| `join_url` | Single-line text |  | emails | booking_confirmed, booking_rescheduled |
| `meeting_location` | Single-line text |  |  | booking_confirmed, booking_rescheduled |
| `host_id` | Number |  |  | booking_confirmed, booking_rescheduled, booking_canceled, call_held, call_no_show |
| `host_name` | Single-line text |  | emails | booking_confirmed, booking_rescheduled, booking_canceled, call_held, call_no_show |
| `host_first_name` | Single-line text |  | emails | booking_confirmed, booking_rescheduled, booking_canceled, call_no_show |
| `host_email` | Single-line text |  | workflow | booking_confirmed, booking_rescheduled |
| `host_username` | Single-line text |  |  | booking_confirmed, booking_rescheduled, booking_canceled, call_held, call_no_show |
| `host_role` | Single-line text |  | emails | booking_confirmed, booking_rescheduled, booking_canceled, call_no_show |
| `host_photo_url` | Single-line text |  | emails | booking_confirmed, booking_rescheduled, booking_canceled, call_no_show |
| `calendar_google_url` | Single-line text |  | emails | booking_confirmed, booking_rescheduled |
| `calendar_outlook_url` | Single-line text |  | emails | booking_confirmed, booking_rescheduled |
| `calendar_ics_url` | Single-line text |  | emails | booking_confirmed, booking_rescheduled |
| `reschedule_url` | Single-line text |  |  | booking_confirmed, booking_rescheduled |
| `cancel_url` | Single-line text |  |  | booking_confirmed, booking_rescheduled |
| `calendar` | Single-line text | google, apple, outlook |  | add_to_calendar_clicked |
| `email_id` | Single-line text | confirmation, reminder_24h, reminder_1h, recovery, no_show, post_call |  | email_sent, email_clicked |
| `link_id` | Single-line text | join, reschedule, cancel, rebook, report, add_google, add_outlook, add_apple |  | email_clicked |
| `previous_booking_id` | Single-line text |  |  | booking_rescheduled |
| `old_call_at` | Date and time |  |  | booking_rescheduled |
| `new_call_at` | Date and time |  |  | booking_rescheduled |
| `canceled_by` | Single-line text | visitor, host |  | booking_canceled |
| `reason` | Single-line text |  |  | booking_canceled |

"Read by": emails = an email token reads it; workflow = a workflow branch or delay reads it. Blank = kept for reporting.

## Not on the event
- **Contact properties instead:** the first and last touch UTMs (`first_touch_*`, `last_touch_*`, 20 properties), written by the contact mapping.
- **Stay in Segment:** `hutk` (sent as the user token), `hashed_email`, `anonymous_id`.
- **Dropped to stay under the limit:** `email_domain` (derivable from `email`) and `contact_id` (HubSpot already attaches the event to the contact).

## Limits to know
- 50 properties per event occurrence (this list has 49); names up to 50 characters, lowercase letters, numbers and underscores, starting with a letter.
- Values up to 256 characters. Keep `calendar_google_url` and `calendar_outlook_url` under 256 characters, or they may be cut.
- Date and time values go in as ISO 8601 or epoch milliseconds.
- Check that HubSpot accepts a Number type for custom event properties in your portal. If not, use single-line text for `duration_min`, `lead_time_h`, `host_id`, `pct_watched` and `days_ahead`.
