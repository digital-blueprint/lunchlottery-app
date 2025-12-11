# Changelog

## Unreleased

- Get organization code during registration (where we already fetch the organization) and replace the organization ids in
  the submission data by the organization codes for better performance during table assignment
- Limit the width of organization names column in the seat assignment table to avoid layout issues with long names

## v1.2.0

- Avoid matching users that are part of the same toplevel organization when assigning seats.
- Fix excel export missing columns at the end in case they were collapsed in the UI.

## v1.1.2

- update welcome message
