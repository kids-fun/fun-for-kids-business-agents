# Provider Tool Catalog

Use this catalog when choosing exact MCP tool names or checking workflow coverage. The user should still experience one business-facing skill and one MCP server.

## Provider Context

- `provider.context.get`

## Leads, Customers, and CRM

- `provider.leads.list`
- `provider.leads.create`
- `provider.leads.update`
- `provider.leads.delete`
- `provider.leads.timeline.list`
- `provider.leads.timeline.add`
- `provider.leads.timeline.update`
- `provider.leads.timeline.delete`
- `provider.leads.convert_to_booking`
- `provider.customers.list`
- `provider.customers.create_with_contact`
- `provider.customers.update`
- `provider.customers.delete`
- `provider.customers.journey.get`
- `provider.contacts.create`
- `provider.contacts.update`

## Bookings, Transfers, and Payments

- `provider.bookings.create_from_contact`
- `provider.bookings.cancel`
- `provider.bookings.delete`
- `provider.bookings.update_payment_status`
- `provider.bookings.unbook_assignments`
- `provider.bookings.transfer_assignment`
- `provider.bookings.convert_between_experiences`
- `provider.bookings.redeem_makeup_credit`
- `provider.bookings.makeup.options.list`
- `provider.bookings.makeup.create`
- `provider.bookings.makeup.reschedule`
- `provider.bookings.split_class.link`
- `provider.bookings.split_class.unlink`
- `provider.bookings.list`
- `provider.bookings.note.update`
- `provider.bookings.status.update`
- `provider.bookings.preflight_check`
- `provider.bookings.flags.list`
- `provider.bookings.flags.assignments.list`
- `provider.bookings.flags.create`
- `provider.bookings.flags.add`
- `provider.transfers.options.list`
- `provider.payments.outstanding.list`
- `provider.reports.catalog.get`
- `provider.reports.absence_makeup.get`
- `provider.reports.absence_makeup.note.update`
- `provider.reports.enrolments.get`
- `provider.reports.trials.get`
- `provider.audit.events.list`

## Sessions and Attendance

- `provider.ops.today_briefing.get`
- `provider.classes.list`
- `provider.sessions.list`
- `provider.sessions.list_occupancy`
- `provider.sessions.manager_overview.get`
- `provider.sessions.roster.get`
- `provider.sessions.schedule_roster_grid.get`
- `provider.sessions.sync`
- `provider.sessions.occurrences.list`
- `provider.sessions.occurrences.update`
- `provider.sessions.occurrences.cancel`
- `provider.sessions.occurrences.restore`
- `provider.sessions.occurrences.reschedule`
- `provider.attendance.exceptions.list`
- `provider.attendance.targets.resolve`
- `provider.attendance.upsert`
- `provider.attendance.bulk_upsert`

## Offerings, Schedules, Pricing, and Program Runs

- `provider.offerings.list`
- `provider.offerings.upsert`
- `provider.offerings.delete`
- `provider.schedules.list`
- `provider.schedules.update`
- `provider.schedules.delete`
- `provider.pricing.list`
- `provider.pricing.upsert`
- `provider.program_runs.list`
- `provider.program_runs.upsert`
- `provider.program_runs.clone`
- `provider.program_runs.delete`
- `provider.program_runs.renewals.candidates.list`
- `provider.program_runs.renewals.confirm`

## Instructors and Team

- `provider.instructors.list`
- `provider.instructors.create`
- `provider.instructors.update`
- `provider.instructors.delete`
- `provider.instructors.assign_to_schedule`
- `provider.instructors.unassign_from_schedule`
- `provider.instructors.set_session_instructors`
- `provider.team.list`
- `provider.team.add_or_update`
- `provider.team.invite`

## Comms and Tasks

- `provider.tasks.list`
- `provider.tasks.create`
- `provider.tasks.update`
- `provider.tasks.reorder`
- `provider.tasks.delete`
- `provider.comms.overview.get`
- `provider.comms.drafts.save`
- `provider.comms.templates.create`
- `provider.comms.templates.update`
- `provider.comms.templates.delete`
- `provider.comms.sends.delete`
- `provider.comms.sends.send`
- `provider.notifications.list`
- `provider.notifications.mark_seen`

## Growth, Promo Codes, and Checkout Links

- `provider.promo_codes.list`
- `provider.promo_codes.upsert`
- `provider.promo_codes.set_active`
- `provider.checkout_links.list`
- `provider.checkout_links.upsert`
- `provider.checkout_links.set_active`

## Family Portal and Feedback Review

- `provider.family_portal.invite`
- `provider.feedback.queue.list`
- `provider.feedback.review`

## Listings and Business Setup

- `provider.activities.list`
- `provider.activities.get`
- `provider.activities.create`
- `provider.activities.update`
- `provider.activities.publish`
- `provider.activities.delete`
- `provider.programs.list`
- `provider.programs.get`
- `provider.programs.create`
- `provider.programs.update`
- `provider.programs.publish`
- `provider.programs.delete`
- `provider.places.list`
- `provider.places.get`
- `provider.places.create`
- `provider.places.update`
- `provider.places.publish`
- `provider.places.delete`
- `provider.provider.update`
- `provider.provider.primary_location.upsert`
- `provider.provider.location_links.clear`
