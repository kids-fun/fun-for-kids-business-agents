# Provider Tool Catalog

Generated from the shared MCP catalog. Run `bun apps/web/scripts/sync-provider-tool-catalog.ts` after changing provider tools.

Use the live tool schemas for exact fields and metadata. Read `provider-workflows.md` for coupled workflows and approval rules. A portal handoff returns the remaining human step; it does not execute that workflow.

## Activities

- `provider.activities.create`
- `provider.activities.delete`
- `provider.activities.get`
- `provider.activities.list`
- `provider.activities.publish`
- `provider.activities.update`

## Analytics

- `provider.analytics.public_booking.get`

## Attendance

- `provider.attendance.bulk_upsert`
- `provider.attendance.exceptions.list`
- `provider.attendance.targets.resolve`
- `provider.attendance.upsert`

## Audit

- `provider.audit.events.list`

## Billing

- `provider.billing.automatic_payments.cancel`
- `provider.billing.automatic_payments.create`
- `provider.billing.automatic_payments.list`
- `provider.billing.documents.delete`
- `provider.billing.documents.issue`
- `provider.billing.documents.list`
- `provider.billing.documents.mark_paid`
- `provider.billing.documents.save`
- `provider.billing.documents.send`
- `provider.billing.documents.void`
- `provider.billing.overview.get`

## Bookings

- `provider.bookings.cancel`
- `provider.bookings.convert_between_experiences`
- `provider.bookings.create_from_contact`
- `provider.bookings.delete`
- `provider.bookings.flags.add`
- `provider.bookings.flags.archive`
- `provider.bookings.flags.assignments.list`
- `provider.bookings.flags.create`
- `provider.bookings.flags.list`
- `provider.bookings.flags.replace`
- `provider.bookings.flags.update`
- `provider.bookings.list`
- `provider.bookings.makeup.create`
- `provider.bookings.makeup.options.list`
- `provider.bookings.makeup.reschedule`
- `provider.bookings.note.update`
- `provider.bookings.preflight_check`
- `provider.bookings.redeem_makeup_credit`
- `provider.bookings.split_class.link`
- `provider.bookings.split_class.unlink`
- `provider.bookings.status.update`
- `provider.bookings.transfer_assignment`
- `provider.bookings.unbook_assignments`
- `provider.bookings.update_payment_status`

## Checkout links

- `provider.checkout_links.list`
- `provider.checkout_links.set_active`
- `provider.checkout_links.upsert`

## Classes

- `provider.classes.list`

## Comms

- `provider.comms.drafts.save`
- `provider.comms.overview.get`
- `provider.comms.sends.delete`
- `provider.comms.sends.send`
- `provider.comms.templates.create`
- `provider.comms.templates.delete`
- `provider.comms.templates.update`

## Contacts

- `provider.contacts.create`
- `provider.contacts.update`

## Context

- `provider.context.get`

## Customers

- `provider.customers.create_with_contact`
- `provider.customers.delete`
- `provider.customers.journey.get`
- `provider.customers.list`
- `provider.customers.update`

## Family portal

- `provider.family_portal.invite`

## Feedback

- `provider.feedback.create`
- `provider.feedback.delete`
- `provider.feedback.queue.list`
- `provider.feedback.review`

## Files

- `provider.files.delete`
- `provider.files.get`
- `provider.files.list`
- `provider.files.update`
- `provider.files.upload.finalize`
- `provider.files.upload.prepare`

## Forms

- `provider.forms.archive`
- `provider.forms.links.list`
- `provider.forms.links.save`
- `provider.forms.links.set_active`
- `provider.forms.list`
- `provider.forms.publish`
- `provider.forms.recipients.archive`
- `provider.forms.recipients.create`
- `provider.forms.recipients.list`
- `provider.forms.recipients.mark_sent`
- `provider.forms.save`
- `provider.forms.submissions.get`
- `provider.forms.submissions.list`
- `provider.forms.submissions.retry_crm`

## Imports

- `provider.imports.jobs.cancel`
- `provider.imports.jobs.commit`
- `provider.imports.jobs.get`
- `provider.imports.jobs.list`
- `provider.imports.jobs.update`
- `provider.imports.rows.approve`
- `provider.imports.rows.list`
- `provider.imports.rows.set_match_decision`
- `provider.imports.rows.unapprove`
- `provider.imports.rows.update`

## Instructors

- `provider.instructors.assign_to_schedule`
- `provider.instructors.create`
- `provider.instructors.delete`
- `provider.instructors.list`
- `provider.instructors.set_session_instructors`
- `provider.instructors.unassign_from_schedule`
- `provider.instructors.update`

## Leads

- `provider.leads.convert_to_booking`
- `provider.leads.create`
- `provider.leads.delete`
- `provider.leads.list`
- `provider.leads.timeline.add`
- `provider.leads.timeline.delete`
- `provider.leads.timeline.list`
- `provider.leads.timeline.update`
- `provider.leads.update`

## Makeup mappings

- `provider.makeup_mappings.list`
- `provider.makeup_mappings.replace`

## Media

- `provider.media.listing_images.list`
- `provider.media.listing_images.replace`
- `provider.media.uploads.finalize`
- `provider.media.uploads.prepare`
- `provider.media.uploads.status`

## Notifications

- `provider.notifications.list`
- `provider.notifications.mark_seen`

## Offerings

- `provider.offerings.delete`
- `provider.offerings.list`
- `provider.offerings.upsert`

## Ops

- `provider.ops.today_briefing.get`

## Payments

- `provider.payments.outstanding.list`

## Places

- `provider.places.create`
- `provider.places.delete`
- `provider.places.get`
- `provider.places.list`
- `provider.places.publish`
- `provider.places.update`

## Portal

- `provider.portal.handoff.get`

## Pricing catalog

- `provider.pricing_catalog.discounts.save`
- `provider.pricing_catalog.discounts.set_active`
- `provider.pricing_catalog.get`
- `provider.pricing_catalog.prices.save`
- `provider.pricing_catalog.prices.set_active`

## Pricing

- `provider.pricing.list`
- `provider.pricing.upsert`

## Program runs

- `provider.program_runs.clone`
- `provider.program_runs.delete`
- `provider.program_runs.list`
- `provider.program_runs.renewals.candidates.list`
- `provider.program_runs.renewals.confirm`
- `provider.program_runs.upsert`

## Programs

- `provider.programs.create`
- `provider.programs.delete`
- `provider.programs.get`
- `provider.programs.list`
- `provider.programs.publish`
- `provider.programs.update`

## Promo codes

- `provider.promo_codes.list`
- `provider.promo_codes.set_active`
- `provider.promo_codes.upsert`

## Provider

- `provider.provider.location_links.clear`
- `provider.provider.primary_location.upsert`
- `provider.provider.update`

## Reports

- `provider.reports.absence_makeup.get`
- `provider.reports.absence_makeup.note.update`
- `provider.reports.catalog.get`
- `provider.reports.enrolments.get`
- `provider.reports.trials.get`

## Requests

- `provider.requests.list`
- `provider.requests.makeup_help.review`
- `provider.requests.transfer.review`

## Resources

- `provider.resources.delete`
- `provider.resources.list`
- `provider.resources.save`

## Schedules

- `provider.schedules.delete`
- `provider.schedules.list`
- `provider.schedules.update`

## Session photos

- `provider.session_photos.delete`
- `provider.session_photos.get`
- `provider.session_photos.list`
- `provider.session_photos.publish`
- `provider.session_photos.reject`
- `provider.session_photos.reorder`
- `provider.session_photos.unpublish`
- `provider.session_photos.update_details`
- `provider.session_photos.upload.finalize`
- `provider.session_photos.upload.prepare`
- `provider.session_photos.upload.status`

## Sessions

- `provider.sessions.list`
- `provider.sessions.list_occupancy`
- `provider.sessions.manager_overview.get`
- `provider.sessions.occurrences.cancel`
- `provider.sessions.occurrences.list`
- `provider.sessions.occurrences.reschedule`
- `provider.sessions.occurrences.restore`
- `provider.sessions.occurrences.update`
- `provider.sessions.roster.get`
- `provider.sessions.schedule_roster_grid.get`
- `provider.sessions.sync`

## Tasks

- `provider.tasks.create`
- `provider.tasks.delete`
- `provider.tasks.list`
- `provider.tasks.reorder`
- `provider.tasks.update`

## Team

- `provider.team.add_or_update`
- `provider.team.invite`
- `provider.team.list`

## Transfers

- `provider.transfers.options.list`
