# Provider Workflow Rules

Use these rules for multi-tool workflows and high-risk writes.

## Safety Rules

- Do not skip read-before-write validation.
- Do not live-run medium/high risk writes without a matching dry-run approval.
- Treat comms sends and business policy changes as high-scrutiny operations.
- Do not use admin-scoped tools in the business-facing plugin workflow.
- Keep raw IDs internal where possible; show users names, classes, dates, times, statuses, and amounts.

## Booking Transfer

- Resolve the active booking first with `provider.bookings.list`.
- Use `provider.transfers.options.list` before any transfer write. It returns movable source assignments, dated target sessions, capacity facts, duplicate-booking warnings, and suggested pairs.
- Treat transfer timing as a cutover decision. Confirm the last current-schedule session that stays and the first destination session that starts before approval.
- Do not infer the first destination date from weekday names alone. A Saturday-to-Sunday move can mean same-week Sunday or following-week Sunday; offer concrete dated session choices.
- For same-experience permanent transfers, call `provider.bookings.transfer_assignment` with explicit `sourceAssignmentIds` and `targetBookingSessionIds` from the options result.
- Keep source and target counts matched for remaining-session permanent transfers unless the operator explicitly asks for a one-off temporary or make-up move.
- Use `provider.bookings.convert_between_experiences` only when the target program or activity differs from the source booking.

## Make-Up Sessions

- Use `provider.bookings.makeup.options.list` before any make-up booking or reschedule.
- Show capacity and already-booked facts when presenting target session choices.
- Use `provider.bookings.redeem_makeup_credit` when consuming an existing credit.
- Use `provider.bookings.makeup.create` when creating a make-up assignment from an absence/source assignment.
- Use `provider.bookings.makeup.reschedule` only when moving an existing make-up assignment.

## Attendance

- Use `provider.attendance.targets.resolve` when the user gives names, dates, or class labels instead of stable IDs.
- Use `provider.attendance.upsert` for one resolved attendance row.
- Use `provider.attendance.bulk_upsert` for a resolved set of rows.
- Preserve the operator-provided reason in notes when one is given.

## Class Disruptions

- Class-wide cancellations and reschedules operate on occurrences, not individual bookings.
- Resolve the exact occurrence first with class/session reads.
- Use `provider.sessions.occurrences.cancel` when there is no replacement.
- Use `provider.sessions.occurrences.reschedule` when creating a replacement date/time and moving the class roster.

## Split Classes

- Use `provider.bookings.list` to find the existing paid booking.
- Resolve the additional schedule before writing.
- Use `provider.bookings.split_class.link` to add the second class under the existing booking.
- Do not create a second paid booking for split-class attendance.
