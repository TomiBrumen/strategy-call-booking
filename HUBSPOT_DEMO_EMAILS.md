# Request a Demo emails (HubSpot drafts)

Seven automated emails for the Request a Demo flow, built from the "Request a Demo - email flow" designs in https://claude.ai/artifact/Hasr4esQQ5EcM5ewEFXARE . They use the same structure, tokens and event as the strategy call emails (see HUBSPOT_WORKFLOW_AGENT.md). All are drafts, subscription type "One to One".

The demo flow sends the same events as the assessment flow, with `meeting_flow` = `demo`. Workflows for these emails must filter on `meeting_flow` = `demo`, so a demo booking never sends the strategy call emails and the other way round.

| # | Email | Object ID | Edit in HubSpot | Subject | Trigger and timing |
|---|---|---|---|---|---|
| 1 | Confirmation | 602568070216 | https://app.hubspot.com/email/518207/edit/226211755616 | Your Databox demo is booked for {{custom.call_date_text}} | `meeting_booking_confirmed`, now |
| 2 | Reminder 24 h | 602568376322 | https://app.hubspot.com/email/518207/edit/226212449677 | Tomorrow at {{custom.call_time_text}}: your Databox demo | `call_at` minus 24 h (skip if booked less than 24 h ahead) |
| 3 | Reminder 1 h | 602571013718 | https://app.hubspot.com/email/518207/edit/226209404338 | Starting in an hour: your Databox demo | `call_at` minus 1 h |
| 4 | Recovery | 602539867454 | https://app.hubspot.com/email/518207/edit/226208822902 | Finish booking your Databox demo | form, calendar view or slot selected, 1 h later if not booked |
| 5 | Rescheduled | 602569292300 | https://app.hubspot.com/email/518207/edit/226209175892 | Updated: your Databox demo is now {{custom.call_date_text}} | `meeting_booking_rescheduled` (event not implemented yet) |
| 6 | Cancelled | 602579495743 | https://app.hubspot.com/email/518207/edit/226209404345 | Your Databox demo is cancelled | `meeting_booking_canceled` (event not implemented yet) |
| 7 | No-show | 602568426858 | https://app.hubspot.com/email/518207/edit/226212449689 | Let's find a new time for your Databox demo | `meeting_call_no_show` (event not implemented yet) |

Emails 1, 2, 3, 5, 6 and 7 send from the contact owner (the host) and fall back to help@databox.com. Email 4 sends from "Databox" with help@databox.com.

## Custom tokens each email reads
Map each as a custom token on the Send email step. The value is the property of the enrolling event with the same name.

| Email | Tokens |
|---|---|
| 1 | `call_date_text`, `call_time_text`, `host_name`, `host_role`, `host_photo_url`, `calendar_google_url`, `calendar_outlook_url`, `calendar_ics_url`, `booking_id` |
| 2 | `call_date_text`, `call_time_text`, `host_name`, `host_role`, `host_first_name`, `host_photo_url`, `join_url`, `booking_id` |
| 3 | `call_time_text`, `host_name`, `host_role`, `host_first_name`, `host_photo_url`, `join_url`, `booking_id` |
| 4 | none. The button links to https://databox.com/demo |
| 5 | `call_date_text`, `call_time_text`, `host_name`, `host_role`, `host_first_name`, `host_photo_url`, `calendar_google_url`, `booking_id` |
| 6 | `call_date_text`, `host_name`, `host_role`, `host_first_name`, `host_photo_url`, `rebook_url` |
| 7 | `call_time_text`, `host_name`, `host_role`, `host_first_name`, `host_photo_url`, `rebook_url` |

## Differences from the strategy call emails
- Copy is about a Databox demo with a product expert. Confirmation lists what the demo covers, and has "Best regards" instead of "See you on <weekday>".
- Reminders and the add-to-calendar mail use a "Join the Demo" and an "Add to Calendar" button.
- Recovery has no custom token: the button is the fixed link https://databox.com/demo. It has its own text ("Still comparing analytics or reporting tools?") and no host signature.
- Email 1 says "Your join link is in this email", but, as in the design, it has no join button.
- Logos load from this repo's public files (docs/email-assets/). Move them to HubSpot's file manager before sending.
