# Brief for the HubSpot workflow agent: strategy call emails

You build HubSpot workflows that send seven prepared emails, based on one custom event. Read this whole file first. Work in HubSpot only. Do not touch Segment.

## Rules
- **Do not turn on any workflow, send any email, or enrol any real contact.** Leave every workflow OFF. The user turns them on.
- **Do not edit the email designs or copy.** The seven emails are finished drafts. You may only read them.
- Test with one internal test contact the user gives you, never with a real prospect.
- Report what worked, what did not, and what you could not verify. Mark anything unverified as unverified.
- Name workflows with the prefix `Strategy call: `.

## What already exists

**The event.** One custom behavioral event, `pe518207_meetings_cal_com`. All `meeting_*` steps arrive as occurrences of it. The property `event_name` (single-line text) says which step it was. It has 49 properties. The full list with types is in HUBSPOT_EVENT.md: https://github.com/TomiBrumen/strategy-call-booking/blob/main/HUBSPOT_EVENT.md . The event definition itself could not be read by the person who prepared it, so its existence and property names are unverified. Check them first.

**Events that are implemented and flowing into HubSpot** (the others do not exist yet):

| `event_name` | Carries what the emails need |
|---|---|
| `meeting_form_submitted` | `email`, `first_name`, `last_name`, `phone`, `rebook_url`, `booking_session_id` |
| `meeting_booking_confirmed` | everything about the booking: `booking_id`, `call_at`, `call_end_at`, `duration_min`, `lead_time_h`, `time_zone`, `call_weekday`, `call_date_text`, `call_time_text`, `join_url`, `host_name`, `host_first_name`, `host_email`, `host_role`, `host_photo_url`, `calendar_google_url`, `calendar_outlook_url`, `calendar_ics_url`, `rebook_url`, `reschedule_url`, `cancel_url`, `booking_session_id` |
| `meeting_cta_clicked`, `meeting_booking_page_viewed`, `meeting_video_played`, `meeting_form_started`, `meeting_calendar_page_viewed`, `meeting_slot_selected`, `meeting_confirmation_page_viewed`, `meeting_add_to_calendar_clicked` | analytics only. Do not build workflows on them. |

**Not implemented yet:** `meeting_booking_rescheduled`, `meeting_booking_canceled`, `meeting_call_no_show`, `meeting_call_held`, `meeting_email_sent`, `meeting_email_clicked`. Build nothing that depends on them now. Phase 2 below describes what to build when they exist.

**The contact.** Email, first name, last name and phone are on the standard contact fields. Twenty contact properties in the group "Meetings" hold attribution: `meeting_first_touch_*` and `meeting_last_touch_*` (source, medium, campaign, content, term, location, team, landing_page, referrer_domain, at). The contact is created or updated by a separate mapping in Segment. It may not exist yet when the event arrives. Do not build anything that creates contacts.

**Status of the data flow.** The Segment destination is disabled, so nothing arrives yet. Testing with real events needs the user to enable it, or to send a test event.

## The seven emails (marketing emails, automated, all drafts)

| # | Email | Object ID | Edit in HubSpot | Subject |
|---|---|---|---|---|
| 1 | Confirmation | 598651809065 | https://app.hubspot.com/email/518207/edit/225045939005 | Your strategy call is booked for {{custom.call_date_text}} |
| 2 | Reminder 24 h | 598663931676 | https://app.hubspot.com/email/518207/edit/225040932986 | Tomorrow at {{custom.call_time_text}}: your Databox strategy call |
| 3 | Reminder 1 h | 598654734132 | https://app.hubspot.com/email/518207/edit/225045090637 | Starting in an hour: your Databox strategy call |
| 4 | Recovery | 598969267723 | https://app.hubspot.com/email/518207/edit/225153591692 | Finish booking your Databox strategy call |
| 5 | Rescheduled | 598978469971 | https://app.hubspot.com/email/518207/edit/225158059049 | Updated: your Databox strategy call is now {{custom.call_date_text}} |
| 6 | Cancelled | 598979257093 | https://app.hubspot.com/email/518207/edit/225157344329 | Your Databox strategy call is cancelled |
| 7 | No-show | 598978292350 | https://app.hubspot.com/email/518207/edit/225158059053 | Let's find a new time for your Databox strategy call |

Emails 1, 2, 3, 5, 6 and 7 send from the contact owner (the host) and fall back to help@databox.com. Email 4 sends from "Databox" with help@databox.com.

### Custom tokens each email reads
The emails read values as `{{custom.<name>}}`. Every token must be mapped in the workflow's "Send email" action ("Add custom tokens to email"). The key is the name below. The value is the property of the enrolling event with the same name. A token that is not mapped shows as raw text in the sent email.

| Email | Tokens |
|---|---|
| 1 | `call_date_text`, `call_time_text`, `call_weekday`, `host_name`, `host_role`, `host_photo_url`, `calendar_google_url`, `calendar_outlook_url`, `calendar_ics_url`, `booking_id` |
| 2 | `call_date_text`, `call_time_text`, `host_name`, `host_role`, `host_first_name`, `host_photo_url`, `join_url`, `booking_id` |
| 3 | `call_time_text`, `host_name`, `host_role`, `host_first_name`, `host_photo_url`, `join_url`, `booking_id` |
| 4 | `rebook_url` |
| 5 | `call_date_text`, `call_time_text`, `host_name`, `host_role`, `host_first_name`, `host_photo_url`, `calendar_google_url`, `booking_id` |
| 6 | `call_date_text`, `host_name`, `host_role`, `host_first_name`, `host_photo_url`, `rebook_url` |
| 7 | `call_time_text`, `host_name`, `host_role`, `host_first_name`, `host_photo_url`, `rebook_url` |

The emails also use the standard contact first name (`contact.firstname`, default "there") and, in email 1, the last name.

## Phase 0: verify first (stop and report if any step fails)

1. The custom event `pe518207_meetings_cal_com` exists, and it has the properties listed in HUBSPOT_EVENT.md with the same internal names.
2. A workflow can use it as a trigger: "When an event occurs", filtered on the property `event_name`.
3. **Can the custom tokens take their value from a property of the enrolling event?** HubSpot's documentation does not say so. Build one throwaway workflow with email 1 and see which sources the token picker offers.
   - If event properties are offered, use them.
   - If not, copy the values to contact properties first ("Set property value"), then map the tokens to those. This needs new contact properties. List the ones you need and ask the user to approve them. Do not create new properties on your own.
4. Can "Delay until a date" use the event's `call_at`? If not, copy `call_at` to a contact date property first.
5. Can a workflow goal or unenrollment condition use the event `meeting_booking_confirmed`?
6. Report the result of each, then build.

## Phase 1: build now (events that exist)

### Workflow 1: `Strategy call: confirmation and reminders`
- **Trigger:** event `pe518207_meetings_cal_com` where `event_name` = `meeting_booking_confirmed`. Allow re-enrolment.
- **Step 1:** wait 3 minutes. The contact is created and filled in by a separate mapping, and the owner may not be set yet.
- **Step 2:** send email 1 (598651809065) with its tokens.
- **Step 3:** if `lead_time_h` is 24 or more, delay until `call_at` minus 24 hours, then send email 2 (598663931676). If it is below 24, skip email 2.
- **Step 4:** delay until `call_at` minus 1 hour, then send email 3 (598654734132). If the call is already less than 1 hour away, skip it.

### Workflow 2: `Strategy call: recovery`
- **Trigger:** event `pe518207_meetings_cal_com` where `event_name` = `meeting_form_submitted`. Allow re-enrolment.
- **Goal:** the contact completes the event with `event_name` = `meeting_booking_confirmed`. When the goal is met, the contact leaves the workflow.
- **Step 1:** wait 1 hour.
- **Step 2:** if the goal was not met, send email 4 (598969267723) with token `rebook_url`.
- Note: the check is by time, not by `booking_session_id`. HubSpot probably cannot compare a property of two events. Say so in your report.

## Phase 2: when the other events exist (do not build now, document the plan)

- **Workflow 3, rescheduled:** trigger `event_name` = `meeting_booking_rescheduled`. Send email 5 (598978469971) right away, then repeat the 24 h and 1 h reminders for the new `call_at`. The new event has a new `booking_id`.
- **Workflow 4, cancelled:** trigger `event_name` = `meeting_booking_canceled`. Send email 6 (598979257093) right away.
- **Workflow 5, no-show:** trigger `event_name` = `meeting_call_no_show`. Send email 7 (598978292350).
- **Stopping old reminders:** a contact already waiting in Workflow 1 cannot be enrolled again, and its old reminder would still fire after a reschedule or cancel. Plan a guard: before each reminder, check that the enrolling `booking_id` is still the contact's current booking (a contact property set on every confirmed or rescheduled event). That needs one new contact property. Describe it, and ask the user before creating it.

## Every variable in every email must be populated

An email must never go out with a gap, a raw `{{custom.…}}` or a placeholder. This is a requirement, not a nice-to-have.

1. **Test every email before you report.** For each workflow, run the test contact through it (with the user's help to get a real event, see "Status of the data flow") and check the rendered email. Use the email preview with the test contact. Look for: any `{{`, an empty value, "there" where a first name should be, "CONTACT.LASTNAME" (a preview-only sign that there is no last name), a host line like ", " with no role, a broken image, and links that are empty or cut off.
2. **Required values per email** are the tokens in the table above, plus the contact's first name (and last name for email 1). All of them must be known on the enrolling event or the contact. Treat these as the highest risk: `host_role`, `host_photo_url`, `host_first_name`, `join_url`, `calendar_google_url`, `calendar_outlook_url`, `calendar_ics_url`, `call_date_text`, `call_time_text`.
3. **Guard before sending.** In front of each "Send email" step, branch on whether the required properties of that email are known. If one is empty, do not send. End that path and list the contact in your report, and ask the user where they want a notification sent. Do not send a partly empty email.
4. **First name and last name.** The emails use `personalization_token('contact.firstname', 'there')`, so an empty first name reads "Hi there". That is acceptable. A missing last name only matters in email 1 ("Prepared for …"). Check how it looks with a test contact that has a first name only.
5. **Report the result per email**: a table of email, token, value seen in the test, populated yes or no. Anything not populated is a blocker, not a footnote.

## Known problems to mention in your report
- `host_role` was missing in the first test payload. Emails 1, 2, 3, 5, 6 and 7 print it. If it is empty the email shows a gap.
- `calendar_google_url` (257 characters) and `calendar_outlook_url` (331) are over HubSpot's 256-character limit for event property values. They may be cut. Check what arrives.
- The emails say 30 minutes, but the first test booking was 60 minutes.
- The contact owner is not set by anything yet. Email 1 sends from the owner. Without one it falls back to help@databox.com. Do not try to assign owners.
- Events from visitors without an email carry only a cookie and may not attach to a contact. Do not build on them.

## Deliverable
For each workflow: its name, trigger, every step in order, the token mapping you used, the result of the Phase 0 checks, the table of populated tokens per email, and a statement that it is OFF. Then a list of anything you could not verify or need the user to decide.
