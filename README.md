# Lunch Lottery App

[GitHub Repository](https://github.com/digital-blueprint/lunchlottery-app) |
[npmjs package](https://www.npmjs.com/package/@digital-blueprint/lunchlottery-app) |
[Unpkg CDN](https://unpkg.com/browse/@digital-blueprint/lunchlottery-app/)

[![Build and Test](https://github.com/digital-blueprint/lunchlottery-app/actions/workflows/build-test-publish.yml/badge.svg)](https://github.com/digital-blueprint/lunchlottery-app/actions/workflows/build-test-publish.yml)

This is an application for users to apply to the lunch-lottery.

## Prerequisites

- You need the [API server](https://github.com/digital-blueprint/relay-server-template) running
- You need the [DbpRelayFormalizeBundle](https://github.com/digital-blueprint/relay-formalize-bundle) to store the submissions
    - You need a form created with the identifier `7432af11-6f1c-45ee-8aa3-e90b3395e29c` (see below)
- For more information please visit the [Formalize project documentation](https://handbook.digital-blueprint.org/components/api/formalize/)

### Form creation

You may use this SQL command to create the form:

```sql
INSERT INTO formalize_forms (
  identifier, name, date_created, data_feed_schema,
  availability_starts, availability_ends
)
VALUES
  (
    "7432af11-6f1c-45ee-8aa3-e90b3395e29c",
    "LunchLotteryParticipants", CURRENT_TIMESTAMP,
    "{\"type\": \"object\",\"properties\": {\"identifier\": {\"type\": \"string\"},\"givenName\": {\"type\": \"string\"},\"familyName\": {\"type\": \"string\"},\"email\": {\"type\": \"string\"},\"organizationIds\": {\"type\": \"array\",\"items\": {\"type\": \"string\"}},\"organizationNames\": {\"type\": \"array\",\"items\": {\"type\": \"string\"}},\"preferredLanguage\": {\"type\": \"string\",\"enum\": [\"de\", \"en\", \"both\"]},\"possibleDates\": {\"type\": \"array\",\"items\": {\"type\": \"string\"}},\"privacyConsent\": {\"type\": \"boolean\"}},\"required\": [\"identifier\", \"givenName\", \"familyName\", \"email\", \"organizationIds\", \"organizationNames\", \"preferredLanguage\", \"possibleDates\", \"privacyConsent\"]}",
    "2024-01-01 00:00:00", "2024-02-01 00:00:00"
  )
```

If you are not allowed to register for the lunch lottery, because the registration period is not active,
set `availability_ends` of the entry to a date in the future, e.g. `2028-01-01 00:00:00`.

## Overview

```bash
# get the source
git clone https://github.com/digital-blueprint/lunchlottery-app.git
cd lunchlottery-app
git submodule update --init

# install dependencies
npm install

# constantly build dist/bundle.js and run a local web-server on port 8001
npm run watch

# same as watch, but with babel, terser, etc active -> very slow
npm run watch-full

# constantly build dist/bundle.js and run a local web-server on port 8001 using a custom assets directory assets_local/
npm run watch-local

# run tests
npm test

# build for deployment
npm build
```

Jump to <https://localhost:8001>, and you should get a Single Sign On login page.
