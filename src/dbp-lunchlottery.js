import {createInstance} from './i18n.js';
import {css, html} from 'lit';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import * as commonUtils from '@dbp-toolkit/common/utils';
import {Icon, Button} from '@dbp-toolkit/common';
import * as commonStyles from '@dbp-toolkit/common/styles';
import DBPLitElement from '@dbp-toolkit/common/dbp-lit-element';
import metadata from './dbp-lunchlottery.metadata.json';
import {Activity} from './activity.js';
import {FORM_IDENTIFIER} from './constants.js';

class LunchLottery extends ScopedElementsMixin(DBPLitElement) {
    constructor() {
        super();
        this._i18n = createInstance();
        this.lang = this._i18n.language;
        this.auth = null;
        this.entryPointUrl = null;
        this.activity = new Activity(metadata);
        this.identifier = null;
        this.firstName = null;
        this.lastName = null;
        this.email = null;
        this.organizationIds = null;
        this.organizationNames = null;
        this.organizationsString = null;
        this.preferredLanguage = null;
        this.available = false;
        this.dates = null;
        this.language = null;
    }

    static get scopedElements() {
        return {
            'dbp-icon': Icon,
            'dbp-button': Button,
        };
    }

    static get properties() {
        return {
            auth: {type: Object},
            lang: {type: String},
            entryPointUrl: {type: String, attribute: 'entry-point-url'},
            identifier: {type: String, attribute: false},
            firstName: {type: String, attribute: false},
            lastName: {type: String, attribute: false},
            email: {type: String, attribute: false},
            organizationIds: {type: Array, attribute: false},
            organizationNames: {type: Array, attribute: false},
            organizationsString: {type: String, attribute: false},
            available: {type: Boolean, attribute: false},
            dates: {type: Array, attribute: false},
            language: {type: String, attribute: false},
        };
    }

    async httpGetAsync(url, options) {
        let response = await fetch(url, options)
            .then((result) => {
                if (!result.ok) throw result;
                return result;
            })
            .catch((error) => {
                return error;
            });

        return response;
    }

    async fetchPerson() {
        let response = await fetch(this.entryPointUrl + '/base/people/' + this.auth['user-id'] + '?includeLocal=email,staffAt', {
            headers: {
                'Content-Type': 'application/ld+json',
                Authorization: 'Bearer ' + this.auth.token,
            },
        });

        if (!response.ok) {
            throw new Error(response);
        }

        const data = await response.json();

        this.identifier = data.identifier;
        this.firstName = data.givenName;
        this.lastName = data.familyName;
        this.email = data.localData.email ?? '';
        this.organizationIds = data.localData.staffAt ?? null;
    }

    connectedCallback() {
        super.connectedCallback();
    }

    async fetchOrganizations(){

        if (!this.organizationIds) {
            return;
        }
        this.organizationsString = '';

        let organizations = [];
        for (let index = 0; index < this.organizationIds.length; index++){
            let response = await fetch(this.entryPointUrl + '/base/organizations/' + this.organizationIds[index], {
                headers: {
                    'Content-Type': 'application/ld+json',
                    Authorization: 'Bearer ' + this.auth.token,
                    'Accept-Language': this.lang,
                },
            });
            if (!response.ok) {
                throw new Error(response);
            }

            let data = await response.json();
            let organizationName = data.name;
            organizations.push(organizationName);
            this.organizationsString += organizationName;
            if(index != (this.organizationIds.length - 1))
                this.organizationsString += ', ';
        }
        this.organizationNames = organizations;
    }

    async fetchDates() {

        let response = await fetch(this.entryPointUrl + '/formalize/forms/' + FORM_IDENTIFIER, {
            headers: {
                'Content-Type': 'application/ld+json',
                Authorization: 'Bearer ' + this.auth.token,
            },
        });

        if (!response.ok) {
            throw new Error(response);
        }

        const forms_data = await response.json();
        const decodedDataFeedSchema = JSON.parse(forms_data['dataFeedSchema']);
        this.dates = decodedDataFeedSchema['properties']['possibleDates']['items']['enum'];
        const start = new Date(forms_data['availabilityStarts']);
        const end = new Date(forms_data['availabilityEnds']);
        const current = new Date();
        this.available = (start.getTime() < current.getTime()) && (end.getTime() > current.getTime());
    }
    async register()
    {

        let language = this._("input[class='language']:checked").value;
        let agreement_radio = this._("input[class='agreement']:checked").value;
        let agreement;

        if(agreement_radio == 't')
        {
            agreement = Boolean(true);
        }
        else
        {
            agreement = Boolean(false);
        }

        let checked = false;
        const dates = [];
        this.shadowRoot.querySelectorAll('.date').forEach((element) => {
            if(element.checked)
            {
                dates.push(element.value);
                checked = true;
            }
        });

        if(!checked)
            return;

        let response;

        let data = {
                "identifier": this.identifier,
                "givenName": this.firstName,
                "familyName": this.lastName,
                "email": this.email,
                "organizationIds": this.organizationIds,
                "organizationNames": this.organizationNames,
                "preferredLanguage": language,
                "possibleDates": dates,
                "privacyConsent": agreement,
            };
        let body = {
            form: '/formalize/forms/' + FORM_IDENTIFIER,
            dataFeedElement: JSON.stringify(data),
        };

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/ld+json',
                Authorization: 'Bearer ' + this.auth.token,
            },
            body: JSON.stringify(body),
        };

        response = await this.httpGetAsync(
            this.entryPointUrl + '/formalize/submissions',
            options
        );
        return response;
    }

    showDates() {
        if (!this.dates) {
            return;
        }
        let i18n = this._i18n;
        let container = document.createElement('div');
        this.dates.forEach((date_string) => {
            const date = new Date(date_string);
            let box = document.createElement('input');

            //create checkbox
            box.type = "checkbox";
            box.value = date_string;

            //create checkbox label
            let label = document.createElement('label');

            //get month
            let month = date.getMonth();
            let month_convert = i18n.t('date.month.' + String(month));

            //get week day
            let week_day = date.getDay();
            let week_day_convert = i18n.t('date.week.' + String(week_day));

            //get month day
            let day = date.getDate();

            //get hour
            let hour = String(date.getHours()) + ':' + String(date.getMinutes());

            //get complete date
            let complete_date = week_day_convert + ', ' + day + ' ' + month_convert + ' - '+ hour + ' ' + i18n.t('date.day-part');
            //let complete_date = week_day;

            //append data to DOM
            label.appendChild(document.createTextNode(complete_date));

            let option = document.createElement('div');

            box.classList.add("date");

            option.appendChild(box);
            option.appendChild(label);

            container.appendChild(option);

        });
        return container;
    }

    async send()
    {
        await this.register();
    }


    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            switch (propName) {
                case 'lang':
                    this._i18n.changeLanguage(this.lang);
                    break;
                case 'auth':
                    // If we are logged in, but don't have the person data yet, fetch it
                    if (this.auth && this.auth['login-status'] === 'logged-in' && !this.firstName) {
                        this.fetchPerson();
                        this.fetchDates();
                    }
                    break;
                case 'organizationIds':
                    // If the organizationId changes, fetch the organization data
                    this.fetchOrganizations();
                    break;
            }
        });
        super.update(changedProperties);
    }

    static get styles() {
        return [
            commonStyles.getThemeCSS(),
            commonStyles.getGeneralCSS(),
            css`
                .hidden {
                    display: none;
                }

                a {
                    color: blue;
                }

                textarea {
                    width: 100%;
                    resize: none;
                }

                .textField{
                    width: 100%;
                }

                #rightSide {
                float:right;
            `,
        ];
    }

    languageClick(e) {
        this.preferredLanguage = e.target.value;
    }

    render() {
        let loggedIn = this.auth && this.auth.token;
        let available = this.available;
        let i18n = this._i18n;

        return html`
            <p>${this.activity.getDescription(this.lang)} <a href="https://tu4u.tugraz.at/go/lunch-lottery">${this.activity.getHere(this.lang)}</a></p>
            <div class="${loggedIn ? '' : 'hidden'}">
                <div class="${available ? '' : 'hidden'}">
                    <form>
                        <div class="field">
                        <label class="label">${i18n.t('name.first')}</label>
                        <div class="control">
                            <input type="text" class="textField" value="${this.firstName}" disabled/>
                        </div>
                        </div>
        
                        <div class="field">
                            <label class="label">${i18n.t('name.last')}</label>
                            <div class="control">
                                <input type="text" class="textField" value="${this.lastName}" disabled/>
                            </div>
                        </div>
        
                        <div class="field">
                            <label class="label">${i18n.t('organization')}</label>
                            <div class="control">
                                <input type="text" class="textField" value="${this.organizationsString}" disabled/>
                            </div>
                        </div>
        
                        <div class="field">
                            <label class="label">${i18n.t('email')}</label>
                            <div class="control">
                                <input type="email" class="textField" value="${this.email}" disabled/>
                            </div>
                        </div>
        
                        <div class="field">
                            <label class="label">${i18n.t('languages.label')}</label>
                            <div class="control">
                                <div>
                                    <input type="radio" class="language" id="language-german" name="language" value="de">
                                    <label for="language-german">${i18n.t('languages.german')}</label>
                                </div>
                                <div>
                                    <input type="radio" class="language" id="language-english" name="language" value="en">
                                    <label for="language-english">${i18n.t('languages.english')}</label>
                                </div>
                                <div>
                                    <input type="radio" class="language" id="language-both" name="language" value="both">
                                    <label for="language-both">${i18n.t('languages.both')}</label>
                                </div>
                            </div>
                            
                        </div>
    
                        <div class="field">
                            <label class="label">${i18n.t('date.label')}</label>
                            <div class="control">${this.showDates()}</div>
                        </div>
        
                        <div class="field">
                            <label class="label">${i18n.t('agreement.label')}</label>
                            <div class="control">
                                <div>
                                    <input type="radio" class="agreement" id="yes" name="agree" value="t">
                                    <label for="yes">${i18n.t('agreement.yes')}</label>
                                </div>
                                <div>
                                <input type="radio" class="agreement" id="no" name="agree" value="f">
                                    <label for="no">${i18n.t('agreement.no')}</label>
                                </div>
                            </div>
                        </div>
        
                        <div id="rightSide">
                            <dbp-button
                                    value="Primary"
                                    
                                    >${i18n.t('submit')}</dbp-button>
                            <!--<dbp-button 
                               value="Primary"
                               @click="${this.send}"
                               type="is-primary">${i18n.t('submit')}</dbp-button>-->
                            <!--<button @click="${this.send}">${i18n.t('submit')}</button>-->
                        </div>
                    </div>
                    </form>
                        

            </div>

            <div class="${!loggedIn ? '' : 'hidden'}">
                <p>${i18n.t('please-log-in')}</p>
            </div>
            
            <div class="${!available ? '' : 'hidden'}">
                <p>${i18n.t('availibility')}</p>
            </div>
        `;
    }
}

commonUtils.defineCustomElement('dbp-lunchlottery', LunchLottery);
