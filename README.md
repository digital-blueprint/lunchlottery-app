# Lunch Lottery App

[GitHub Repository](https://github.com/digital-blueprint/lunchlottery-app) |
[npmjs package](https://www.npmjs.com/package/@digital-blueprint/lunchlottery-app) |
[Unpkg CDN](https://unpkg.com/browse/@digital-blueprint/lunchlottery-app/)

[![Build and Test](https://github.com/digital-blueprint/lunchlottery-app/actions/workflows/build-test-publish.yml/badge.svg)](https://github.com/digital-blueprint/lunchlottery-app/actions/workflows/build-test-publish.yml)

This is an application for users to apply to the lunch-lottery.

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
