# Strategy call emails: HubSpot workflow draft

Draft only. The HubSpot connector creates emails but not workflows, so this is the spec to build the workflows by
hand in HubSpot. Nothing here is published and nothing has been sent.

## The seven emails (automated drafts)

| # | Email | Triggered by | When | Open in HubSpot |
|---|---|---|---|---|
| 1 | Confirmation (session pass) | `meeting_booking_confirmed` | right away | [edit](https://app.hubspot.com/email/518207/edit/225045939005) |
| 2 | Reminder 24 h | `meeting_booking_confirmed` | call time minus 24 h. Skip if booked less than 24 h ahead | [edit](https://app.hubspot.com/email/518207/edit/225040932986) |
| 3 | Reminder 1 h | `meeting_booking_confirmed` | call time minus 1 h | [edit](https://app.hubspot.com/email/518207/edit/225045090637) |
| 4 | Recovery | `meeting_form_submitted` | 1 h later, only if no `meeting_booking_confirmed` with the same `booking_session_id` in that hour | [edit](https://app.hubspot.com/email/518207/edit/225153591692) |
| 5 | Rescheduled | `meeting_booking_rescheduled` | right away | [edit](https://app.hubspot.com/email/518207/edit/225158059049) |
| 6 | Cancelled | `meeting_booking_canceled` | right away | [edit](https://app.hubspot.com/email/518207/edit/225157344329) |
| 7 | No-show | `meeting_call_no_show` | 15 min after the call start (the event fires then) | [edit](https://app.hubspot.com/email/518207/edit/225158059053) |

Email 1A (ticket design) is in the backlog and not built. All seven are automated emails, subscription type "One to One".
Emails 1, 2, 3, 5, 6 and 7 send from the contact owner (the host): sender name is the owner's first name at Databox, reply-to is the
owner's email, falling back to `help@databox.com`. Email 4 sends from "Databox" with `help@databox.com`.

## Which event values each email reads

Each email reads its values as `{{custom.<name>}}` tokens. The token name equals the event property name.

| Token | Emails | Carried by the event |
|---|---|---|
| `booking_id` | 1, 2, 3, 5 (reschedule and cancel links) | `meeting_booking_confirmed`, `meeting_booking_rescheduled` |
| `call_date_text` | 1, 2, 5, 6 | confirmed, rescheduled, canceled |
| `call_time_text` | 1, 2, 3, 5, 7 | confirmed, rescheduled, call no-show |
| `call_weekday` | 1 | confirmed, rescheduled |
| `join_url` | 2, 3 | confirmed, rescheduled |
| `host_name`, `host_role` | 1, 2, 3, 5, 6, 7 | confirmed, rescheduled, canceled, no-show |
| `host_first_name` | 2, 3, 5, 6, 7 | confirmed, rescheduled, canceled, no-show |
| `host_photo_url` | 1, 2, 3, 5, 6, 7 | confirmed, rescheduled, canceled, no-show |
| `calendar_google_url` | 1, 5 | confirmed, rescheduled |
| `calendar_outlook_url`, `calendar_ics_url` | 1 | confirmed |
| `rebook_url` | 4, 6, 7 | `meeting_form_submitted`, canceled, no-show |

Standard HubSpot tokens also used: contact first and last name (the contact is created from the `email` on the event), and the
contact owner for the sender. For the owner to be the host, the host's email (`host_email` on the event) must match the HubSpot owner,
and the owner must be set before email 1 is sent.

## How to use the event values in a workflow email

This is the pattern, with what is documented and what to test.

1. **Event into HubSpot.** The events arrive through Segment's HubSpot connection as custom behavioural events on the contact
   (matched by `email`). Each event property you want to use must exist on the event's definition in HubSpot.
2. **Enrol on the event.** New workflow, trigger "When an event occurs", choose the custom event (for example
   `meeting_booking_confirmed`). Turn on re-enrolment, so a reschedule or a second booking starts again. HubSpot notes that
   custom events created in the newer events tool appear under this trigger and not under the older "Behavioral events" filter.
3. **Send email, with custom tokens.** Add a "Send email" action, pick the email, and in "Add custom tokens to email" add one token per
   value (key = the token name from the table, for example `call_time_text`; value = the event property of the same name). The email
   then reads `{{custom.call_time_text}}`. HubSpot documents custom tokens for automated emails (Marketing Hub Enterprise).
4. **Test before publishing.** HubSpot's documentation does not say in so many words that an event property can be picked as the token's
   source. Send one test through the real workflow. A token that is not mapped shows as raw `{{custom.name}}` text in the email.
   If event properties are not offered, use one of these:
   - copy the values to contact properties in the workflow ("Set property value"), then map the tokens to those properties;
   - use a custom code or webhook action that reads the event (HubSpot Events API) and returns the values for the tokens.
5. **Timing.** Reminders: "Delay until a date" using `call_at` (UTC). It normally reads a date on the contact, so copy `call_at` to a
   contact date property first if it cannot read the event. Skip email 2 when `lead_time_h` is under 24. The recovery email: delay 1 h,
   then branch on whether a `meeting_booking_confirmed` event with the same `booking_session_id` happened.
6. **Stop reminders.** Add `meeting_booking_canceled` as an exit condition, and rely on re-enrolment for a reschedule (a reschedule
   brings a new `booking_id`, which also changes the cancel and reschedule links).

## Cal.com and design notes

- Reschedule and cancel links point to Cal.com's pages and work only when cancelling and rescheduling are on for the Cal.com event.
- Email 1 says "Your join link is in this email", but the design has no join button, so `join_url` is not used there.
- The single "Add to Calendar" link in email 5 uses the Google link. Apple Calendar needs a hosted `.ics` file, which does not exist yet.
- Logo: all seven emails carry the full Databox logo (icon and wordmark): the white version on the dark header of email 1, the dark version on the other six. The image is loaded from this repo's public GitHub files (`docs/email-assets/`), which is temporary. Before sending, upload `databox-logo-on-dark.png` and `databox-logo-on-light.png` to HubSpot's file manager and replace the two URLs in the emails. If the repo becomes private, the logo disappears. The host photo comes from `host_photo_url`.
- Fonts: the designs use Geist and IBM Plex Serif, which email clients do not load. The drafts use Arial and Georgia.
- Call length: the emails now say 30 minutes (confirmation, both reminders, rescheduled, recovery), and the "hour" wording is gone from emails 1, 2 and 4. The 1-hour reminder (email 3) still says "in an hour", which is its timing. Use `duration_min` if the length should follow the Cal.com event.
