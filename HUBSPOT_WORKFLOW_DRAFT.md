# Strategy call emails: HubSpot workflow draft

Draft only. The HubSpot connector can create emails but not workflows, so this is the spec to build the workflow
by hand in HubSpot. Nothing here is live and nothing has been sent.

## Emails (created as automated drafts, not published)

| # | Name | HubSpot content id | Send |
|---|---|---|---|
| 1 | Strategy call · 1 Confirmation (session pass) | 225045939005 | right after booking |
| 2 | Strategy call · 2 Reminder 24h | 225040932986 | 24 h before the call. Skip if booked less than 24 h ahead |
| 3 | Strategy call · 3 Reminder 1h | 225045090637 | 1 h before the call |

Email 1A (ticket design) is in the backlog and not built.
All three: automated type, subscription type "One to One", sender name `{{ owner first name }} at Databox`,
reply-to the contact owner. Each ends with "Reschedule or cancel", built from the booking id.
Edit links: https://app.hubspot.com/email/518207/edit/{content id}

## Values the emails read: custom tokens, filled from the booking event

No contact properties are needed. The emails use HubSpot **custom tokens** (`{{custom.name}}`). In the workflow's
"Send email" action, each token is mapped to a value from the `booking_confirmed` event. HubSpot documents this
mechanism for automated emails (Marketing Hub Enterprise). I could not confirm in HubSpot's docs that a custom
behavioural event property can be the source, so test one send before relying on it.

| Token in the emails | Event property (`booking_confirmed`) | Example | Where it is already sent |
|---|---|---|---|
| `{{custom.booking_id}}` | `booking_id` | `wUqtfgWLCft74eKnRrEYYs` | demo, yes |
| `{{custom.call_date_text}}` | `call_date_text` | `Wednesday, 21 October` | demo, yes |
| `{{custom.call_time_text}}` | `call_time_text` | `16:30 (CEST)` (visitor's time zone) | demo, yes |
| `{{custom.call_weekday}}` | `call_weekday` | `Wednesday` | demo, yes |
| `{{custom.join_url}}` | `join_url` | Cal.com meeting link | demo, yes |
| `{{custom.host_name}}` | `host_name` | `Databox Operations` | demo, yes |
| `{{custom.calendar_google_url}}` | `calendar_google_url` | Google Calendar link | demo, yes |
| `{{custom.calendar_outlook_url}}` | `calendar_outlook_url` | Outlook link | demo, yes |
| `{{custom.host_first_name}}` | `host_first_name` | first name of the host | **not sent yet** |
| `{{custom.host_role}}` | `host_role` | `Head of Sales` | **not sent yet** (host list on our side) |
| `{{custom.host_photo_url}}` | `host_photo_url` | public image URL | **not sent yet** (host list on our side) |
| `{{custom.calendar_ics_url}}` | `calendar_ics_url` | link to an `.ics` file | **not available**, see below |

Also on the event: `call_at` (UTC start, for delays), `time_zone`, `host_username`, `email` (the visitor), and
`booking_id` on every event after booking. The visitor's first and last name come from the HubSpot contact
(standard tokens), matched by email.

The reschedule link is `https://cal.com/reschedule/{booking id}`, the cancel link
`https://cal.com/booking/{booking id}?cancel=true`.

## Workflow (event-triggered, re-enrolment on)

1. **Enrol** when the custom event `booking_confirmed` occurs (enrolment trigger: event completed).
   A reschedule gives a new booking id, so it should re-enrol. Re-enrolment must be switched on.
2. **Send email 1** (Confirmation).
3. **If/then: call is more than 24 h away?** (`strategy_call_start` minus now)
   - **Yes:** delay until the call time minus 24 h (from `call_at`), check the booking is still active, then **send email 2**.
   - **No:** skip email 2.
4. **Delay until the call time minus 1 h**, check the booking is still active, then **send email 3**.
5. **Unenrol / exit** on a `booking_canceled` event, or when the booking id changes (the new enrolment takes over),
   so a cancelled or moved call never gets a reminder.

Open technical point: HubSpot's "delay until a date" step normally reads a date on the contact. If it cannot read
`call_at` from the event, copy it to one contact date property in the workflow, or use a fixed delay from the
booking time. Check this before building.

## To confirm before building

- On a reschedule, should the guest get the full confirmation again, or a short "your call moved" email?
  (Only the three emails above are designed.)
- Email 1 says "Your join link is in this email", but the design has no join button. Add one or reword.
- Images: the designs use the Databox logo and the host photo. The drafts use a text wordmark and no photo, because
  images need public URLs from HubSpot's file manager. Upload the logo and add the host photo module
  (or `strategy_call_host_photo_url`) there.
- Fonts: the designs use Geist and IBM Plex Serif, which email clients don't load. The drafts use Arial and Georgia.
- Event type in Cal.com: "disable cancelling" and "disable rescheduling" are on for the test event, so the
  links in these emails would not work until they are off on the real event.
- Subject lines use `{{custom.call_date_text}}` and `{{custom.call_time_text}}`. HubSpot may not fill custom tokens in
  subjects. Check a test send, and use a fixed subject if it does not.
- Add to Apple Calendar needs a link to an `.ics` file. HubSpot marketing emails can't attach files, and Cal.com's own
  invite carries the `.ics` only while Cal.com's emails are on. Decide: keep Cal.com's confirmation, or host the file.
- Event length: the designs say 60 minutes, but the Cal.com test event is 30. Set the real event to 60.
