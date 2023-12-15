# Frontend Template App

[GitHub Repository](https://github.com/digital-blueprint/template-app)

[![Build and Test](https://github.com/digital-blueprint/template-app/actions/workflows/build-test-publish.yml/badge.svg)](https://github.com/digital-blueprint/template-app/actions/workflows/build-test-publish.yml)

## Local development

```bash
# get the source
git clone https://github.com/digital-blueprint/template-app.git
cd template-app
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

Jump to <https://localhost:8001> and you should get a Single Sign On login page.

## Framework Documentation

You can find more information about our framework, technologies used and the
development workflow in our [Frontend Developer
Guide](hhttps://handbook.digital-blueprint.org/frontend)

## Starting the API server

If you want to add backend implenetations, you need to start the api server. For this you will need the Middleware API that you cloned according to the onboarding developer guide.

```bash
# start api server
cd api/docker
sudo docker-compose up
```

# Get started

To create your own app copy this Repository.

## The construct

### /assets/*

The main html construct is based in the asset folder: `dbp-frontend-template-app.html.ejs`
You can change here favicons, the color variables, fonts and the outer html construct.

- To get started rename this file to `dbp-frontend-first-app.html.ejs`

For favicon support in multiple browsers there exist one folder and twi other files. The icons - in different size - are based in the folder `icon`.

### /src/*

The main logic is based in the `src` folder.

There are at least two files. One for a topic, one or more for an activity and some other files with e.g.: helper functions. (In our case ``i18n.js`` for the translation).

``dbp-frontend-template-app.js`` is the entry point of the App. If you want to use it with the [app shell](https://github.com/digital-blueprint/toolkit/tree/main/packages/app-shell):

- Rename the file ``dbp-frontend-template-app.js`` to ``dbp-frontend-first-app.js``
- Change the ``dbp-frontend-template-app`` string to ``dbp-frontend-first-app``

``dbp-template-activity.js`` is one activity of the topic. The main code of the activity is based there.

- Copy or rename the file ``dbp-template-activity.js`` to ``dbp-first-activity.js`` (the name given in ``dbp-template-activity.metadata.json``: ``module_src``)

The class in this file is based on [lit-elements](https://lit-element.polymer-project.org/)

- Change in the last line ``commonUtils.defineCustomElement('dbp-template-activity', StarterActivity);`` 
    - The first string ``dbp-template-activity`` is the given ``element`` name in ``dbp-template-activity.metadata.json``
    - The second string ``StarterActivity`` is your given class name in the point above.

There is another folder `i18n`. 
In this folder there is the whole translation based. You have subfolder for your different languages. In these subfolder you have a ``translation.json`` file where you can bin strings to your translation keys. For further information look at: https://www.i18next.com/

The main structure - the topic - from the application is based in `dbp-frontend-template-app.topic.metadata.json.ejs`
For more information about the structure look at: [Components](https://handbook.digital-blueprint.org/frontend/components)

- Change the ``name`` in german and english (or add another language if you support one)
- Change the ```short_name```
- Add a ``description`` of your App 
- Change the ``routong_name``
- Add the path of your your activities.metadata.json

The activity metadata should be also based in the assets folder. The file ``dbp-template-activity.metadata.json`` is an example for an activity. It is contains basic description of an activity.

- Copy or rename the file ``dbp-template-app.metadata.json`` to ``dbp-first-app.metadata.json``
- Change ```element``` to your element name.
- Change the ``module_src`` - this is the file where the code of your activity is based.
- Change the ``routing_name``(has to be unique and url safe), ``name``, ``short_name`` and add a ``description`` 
- Copy or rename the file ``dbp-template-activity.topic.metadata.json`` to `` dbp-frontend-first-app.topic.metadata.json``
- In rollup.config.js change all ``template`` substrings to ``first``.

## Design

This source is delivered with a clean brandable design. If you want your own design fork the repo [toolkit](https://github.com/digital-blueprint/toolkit/tree/main), make your own appshell and change vars in [common/styles.js](https://github.com/digital-blueprint/toolkit/tree/main/packages/common/styles.js)

The style for the activities itself, can be changed in ````src/<your-activity-name>.js``` in the function ```static get styles()```.

For TU Graz purposes go to `<your-app-name>.html.ejs` and simple delete the attributes `shell-name`, `shell-subname` and `no-brand` in line 111-113.

### Note
To ensure a uniform and responsive design the activity should occupy 100% of the window width when the activity width is less than 768 px.
