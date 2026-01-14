# Changelog

## v1.3.0

- Get organization code during registration (where we already fetch the organization) and replace the organization ids in
  the submission data by the organization codes for better performance during table assignment
- Limit the width of organization names column in the seat assignment table to avoid layout issues with long names
- Various excel export fixes, to match the old export behavior before the library was changed.
- Include a note in the seat assignment that the assignment is not persistent and will be lost on page reload.
- Include a warning in the seat assignment page when assignment is not possible and why.
- New app shell/menu layout
- Change the submission table from collapsing to scrolling when there are many columns.
  To avoid some dates being shown by default, and some some being hidden.
- Limit the width of the organization column in the submission table to avoid
  layout issues with long names.
- Error out when trying to change event dates in case there are already
  submissions for the event.

## v1.2.0

- Avoid matching users that are part of the same toplevel organization when assigning seats.
- Fix excel export missing columns at the end in case they were collapsed in the UI.

## v1.1.2

- update welcome message
