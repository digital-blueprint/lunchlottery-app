# Activities README Template

<!--
This should act as a template README.md for a new frontend application.
Just remove the parts that are not relevant to your bundle and
replace placeholders like "{{Name}}" with your app name and so on.

List of placeholders:
- {{name}}: Name of the app in lowercase, like "formalize"
- {{Name}}: Name of the app in camel case, like "Formalize"
- {{NAME}}: Name of the app in uppercase, like "FORMALIZE"
- {{bundle-path}}: GitLab bundle repository path, like "formalize/dbp-relay-formalize-bundle"
- {{bundle-name}}: Name of the bundle for packagist, like "relay-formalize-bundle"
- {{app-path}}: GitLab repository path of the frontend application, like "digital-blueprint/formalize-app"
- {{app-description}}: A brief description of the app in 2-5 sentences
- {{list-of-activities}}: A list of activities in the app
- {{app-based-attributes}}: Add app based attributes to the table(name | type | [activity-name](link-to-activity))
- {{list-of-shared-attributes}}: a list of shared attributes within the activities (attribute-name: type: description. Default)
- {{list-activity-attributes}}: a list of activity specific attributes (- `name` (optional): description <br> - example `example`)
-->

# {{Name}} activities

Here you can find the individual activities of the `{{name}}` App. If you want to use the whole app look at [{{name}}](https://github.com/{{app-path}}).

## Usage of an activity

You can use every activity alone. Take a look at our examples [here](https://github.com/{{app-path}}/-/tree/main/examples).

## Activities

### Shared Attributes

These attributes are available for all activities listed here:

{{list-of-shared-attributes}}

### dbp-{{activity-name}}

Note that you will need a Keycloak server along with a client id for the domain you are running this html on.

#### Attributes

- `lang` (optional, default: `de`): set to `de` or `en` for German or English
    - example `lang="de"`
- `entry-point-url` (optional, default is the TU Graz entry point url): entry point url to access the api
    - example `entry-point-url="https://api-dev.tugraz.at"`
- `auth` object: you need to set that object property for the auth token - example auth property: `{token: "THE_BEARER_TOKEN"}` - note: most often this should be an attribute that is not set directly, but subscribed at a provider
  {{list-activity-attributes}}

#### Slots

You use templates tags to inject slots into the activity.
These templates will be converted to div containers when the page is loaded and will not show up before that.

<!--
##### Slot1

Where is the slot shown

Example:

```html
<dbp-{{activity-name}} lang="de">
  <template slot="slot1">
    <dbp-translated subscribe="lang">
      <div slot="de">
          deutscher Text
      </div>
      <div slot="en">
          Englischer Text
      </div>
    </dbp-translated>
  </template>
</dbp-{{activity-name}}>
```
-->

## Design Note

To ensure a uniform and responsive design these activities should occupy 100% width of the window when the activities' width are under 768 px.

## Mandatory attributes

If you are not using the `provider-root` attribute to "terminate" all provider attributes
you need to manually add these attributes so that the topic will work properly:

```html
<dbp-{{name}} auth requested-login-status analytics-event></dbp-{{name}}>
```
