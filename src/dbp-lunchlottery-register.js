import {createInstance} from './i18n.js';
import {css, html} from 'lit';
import {ScopedElementsMixin} from '@dbp-toolkit/common';
import * as commonUtils from '@dbp-toolkit/common/utils';
import {Icon, Button} from '@dbp-toolkit/common';
import * as commonStyles from '@dbp-toolkit/common/styles';
import metadata from './dbp-lunchlottery-register.metadata.json';
import {Activity} from './activity.js';
import {FORM_IDENTIFIER} from './constants.js';
import DBPLunchlotteryLitElement from "./dbp-lunchlottery-lit-element";
import {classMap} from "lit/directives/class-map.js";

const FORM_AVAILABILITY_INIT = 'i';
const FORM_AVAILABILITY_AVAILABLE = 'a';
const FORM_AVAILABILITY_UNAVAILABLE = 'u';

class LunchLotteryRegister extends ScopedElementsMixin(DBPLunchlotteryLitElement) {
    constructor() {
        super();
        this._i18n = createInstance();
        this.lang = this._i18n.language;
        this.entryPointUrl = null;
        this.activity = new Activity(metadata);
        this.identifier = null;
        this.firstName = null;
        this.lastName = null;
        this.dates = null;
        this.email = null;
        this.organizationIds = [];
        this.organizationNames = [];
        this.organizationsString = null;
        this.preferredLanguage = null;
        this.formAvailability = FORM_AVAILABILITY_INIT;
        this.possibleDates = [];
        this.possibleDatesContainer = null;
        this.loadingPerson = false;
        this.loadingOrganizations = false;
        this.loadingForm = false;
        this.isPostingSubmission = false;
        this.wasSubmissionSuccessful = false;
        this.disbleForm = false;
    }

    static get scopedElements() {
        return {
            'dbp-icon': Icon,
            'dbp-button': Button,
        };
    }

    static get properties() {
        return {
            ...super.properties,
            lang: {type: String},
            entryPointUrl: {type: String, attribute: 'entry-point-url'},
            identifier: {type: String, attribute: false},
            firstName: {type: String, attribute: false},
            lastName: {type: String, attribute: false},
            dates: {type: Array, attribute: false},
            email: {type: String, attribute: false},
            organizationIds: {type: Array, attribute: false},
            organizationNames: {type: Array, attribute: false},
            organizationsString: {type: String, attribute: false},
            formAvailability: {type: String, attribute: false},
            language: {type: String, attribute: false},
            container: {type: Object},
            possibleDates: {type: Array, attribute: false},
            possibleDatesContainer: {type: Object},
            loadingPerson: {type: Boolean, attribute: false},
            loadingOrganizations: {type: Boolean, attribute: false},
            loadingForm: {type: Boolean, attribute: false},
            isPostingSubmission: {type: Boolean, attribute: false},
            wasSubmissionSuccessful: {type: Boolean, attribute: false},
            disableForm:  {type: Boolean, attribute: false}
        };
    }

    initialize() {
        super.initialize();
        this.fetchPerson();
        this.fetchForm();
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            switch (propName) {
                case 'lang':
                    this._i18n.changeLanguage(this.lang);
                    this.fetchOrganizations();
                    break;
            }
        });
        super.update(changedProperties);
    }

    isLoadingData() {
        return this.loadingPerson || this.loadingOrganizations || this.loadingForm;
    }

    async fetchPerson() {
        try {
            this.loadingPerson = true;

            const response = await fetch(this.entryPointUrl + '/base/people/' + this.auth['user-id'] + '?includeLocal=email,staffAt', {
                headers: {
                    'Content-Type': 'application/ld+json',
                    Authorization: 'Bearer ' + this.auth.token,
                },
            });

            if (!response.ok) {
                this.disbleForm = true;
                this.handleErrorResponse(response);
            } else {
                const data = await response.json();
                this.identifier = data.identifier;
                this.firstName = data.givenName;
                this.lastName = data.familyName;
                this.email = data.localData.email ?? '';
                this.organizationIds = data.localData.staffAt ?? [];

                await this.fetchOrganizations();
            }
        } finally {
            this.loadingPerson = false;
        }
    }

    /**
     * Get the names for the organization IDs
     */
    async fetchOrganizations() {
        try {
            this.loadingOrganizations = true;
            this.organizationNames = [];
            this.organizationsString = '';

            let organizations = [];
            for (let index = 0; index < this.organizationIds.length; index++) {
                let response = await fetch(this.entryPointUrl + '/base/organizations/' + this.organizationIds[index], {
                    headers: {
                        'Content-Type': 'application/ld+json',
                        Authorization: 'Bearer ' + this.auth.token,
                        'Accept-Language': this.lang,
                    },
                });
                if (!response.ok) {
                    this.disbleForm = true;
                    this.handleErrorResponse(response);
                } else {
                    const data = await response.json();
                    const organizationName = data.name;
                    organizations.push(organizationName);
                    this.organizationsString += organizationName;
                    if (index !== (this.organizationIds.length - 1))
                        this.organizationsString += ', ';
                }
            }
            this.organizationNames = organizations;
        } finally {
            this.loadingOrganizations = false;
        }
    }

    async fetchForm() {
        try {
            this.loadingForm = true;
            this.possibleDates = [];
            this.formAvailability = FORM_AVAILABILITY_INIT;

            const response = await fetch(this.entryPointUrl + '/formalize/forms/' + FORM_IDENTIFIER, {
                headers: {
                    'Content-Type': 'application/ld+json',
                    Authorization: 'Bearer ' + this.auth.token,
                },
            });

            if (!response.ok) {
                this.disbleForm = true;
                this.handleErrorResponse(response);
            } else {
                const formData = await response.json();
                const decodedDataFeedSchema = JSON.parse(formData['dataFeedSchema']);
                this.possibleDates = decodedDataFeedSchema['properties']['possibleDates']['items']['enum'];
                console.log('poss dates ', decodedDataFeedSchema['properties']['possibleDates']);
                const start = new Date(formData['availabilityStarts']);
                const end = new Date(formData['availabilityEnds']);
                const current = new Date();
                this.formAvailability = (start.getTime() < current.getTime()) && (end.getTime() > current.getTime()) ?
                    FORM_AVAILABILITY_AVAILABLE : FORM_AVAILABILITY_UNAVAILABLE;
                if(this.possibleDates && this.possibleDates.length != 0)
                    this.createPossibleDatesContainer();
            }
        } finally {
            this.loadingForm = false;
        }
    }

    createPossibleDatesContainer() {
        const i18n = this._i18n;
        let possibleDatesContainer = document.createElement('div');
        console.log('poss dates ', this.possibleDates);
        if(!this.possibleDates )
            return;
        this.possibleDates.forEach((date_string) => {
            console.log('date string', date_string);
            const date = new Date(date_string);
            let box = document.createElement('input');

            //create checkbox
            box.type = "checkbox";
            box.value = date_string;

            //create checkbox label
            let label = document.createElement('label');

            //get month
            let month = date.getMonth();
            console.log('month', month);
            let month_convert = i18n.t('date.month.' + String(month));

            //get week day
            let week_day = date.getDay();
            let week_day_convert = i18n.t('date.week.' + String(week_day));

            //get month day
            let day = date.getDate();

            //get hour
            let hour = String(date.getHours()) + ':' + String(date.getMinutes());

            //get complete date
            let complete_date = week_day_convert + i18n.t('date.punctuationWeekDay') + day + i18n.t('date.punctuationMonthDay') + month_convert + ' - '+ hour + ' ' + i18n.t('date.day-part');
            //let complete_date = week_day;

            //append data to DOM
            label.appendChild(document.createTextNode(complete_date));

            let option = document.createElement('div');

            box.classList.add("date");

            option.appendChild(label);
            label.prepend(box);

            possibleDatesContainer.appendChild(option);

        });

        this.possibleDatesContainer = possibleDatesContainer;
        return this.possibleDatesContainer;
    }

    async submitRegistration()
    {
        try {
            this.isPostingSubmission = true;

            if (this.wasSubmissionSuccessful) {
                return;
            }

            let language = null;
            this.shadowRoot.querySelectorAll('.language').forEach((element) => {
                if (element.checked) {
                    language = element.value;
                }
            });

            const dates = [];
            this.shadowRoot.querySelectorAll('.date').forEach((element) => {
                if (element.checked) {
                    dates.push(element.value);
                }
            });
            this.dates = dates;
            let agreement = null;
            this.shadowRoot.querySelectorAll('.agreement').forEach((element) => {
                if (element.checked) {
                    agreement = (element.value === "true");
                }
            });
            //Check language field
            if (!language) {
                this._('#lang-error').hidden = false;
                return;
            } else {
                this._('#lang-error').hidden = true;
            }
            //Check dates field
            if (dates.length === 0) {
                this._('#dates-error').hidden = false;
                return;
            } else {
                this._('#dates-error').hidden = true;

            }
            //Check agreement field
            if (agreement === null) {
                this._('#agreement-error').hidden = false;
                return;
            } else {
                this._('#agreement-error').hidden = true;
            }

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

            const response = await this.httpGetAsync(
                this.entryPointUrl + '/formalize/submissions',
                options
            );

            if (!response.ok) {
                this.handleErrorResponse(response);
            } else {
                this.wasSubmissionSuccessful = true;
            }

            return response;
        } finally {
            this.isPostingSubmission = false;
        }
    }

    async buttonClickHandler()
    {
        setTimeout(() => {
            this.shadowRoot.querySelectorAll('dbp-button').forEach(element => {
                element.stop();
            });
        }, 1000);

        await this.submitRegistration();

        this.shadowRoot.querySelectorAll('.date').forEach((element) => {
            if(this.dates.includes(element.value))
                element.checked = true;
        });
    }

    static get styles() {
        return [
            commonStyles.getThemeCSS(),
            commonStyles.getGeneralCSS(),
            commonStyles.getActivityCSS(),
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

                .input-error{
                    background-color: var(--dbp-warning-surface);
                    padding-bottom: calc(0.375em - 1px);
                    padding-left: 0.75em;
                    padding-right: 0.75em;
                    padding-top: calc(0.375em - 1px);
                    color: var(--dbp-on-warning-surface);
                }

                .error-container{
                    margin-top: 3px;
                }

                .submit-button {
                    display: flex;
                    justify-content: flex-end;
                }
            `,
        ];
    }

    languageClick(e) {
        this.preferredLanguage = e.target.value;
    }

    render() {
        const isFormUnavailable = this.formAvailability === FORM_AVAILABILITY_UNAVAILABLE;
        const i18n = this._i18n;
        const isPostingSubmission = this.isPostingSubmission;

        const showSpinner = (this.isLoading() || this.isLoadingData()) && !isFormUnavailable && !this.wasSubmissionSuccessful;
        const showForm = this.isLoggedIn() && !this.isLoadingData() && !isFormUnavailable && !this.wasSubmissionSuccessful && !this.disbleForm;
        const showFormUnavailable = this.isLoggedIn() && isFormUnavailable;
        const showSuccessText = this.isLoggedIn() && this.wasSubmissionSuccessful;

        return html`
            <h2>${this.activity.getName(this.lang)}</h2>
            <p class="subheadline">
                <slot name="description">
                    ${this.activity.getDescription(this.lang)}
                </slot>
            </p>

            <div class="control full-size-spinner ${classMap({hidden: !showSpinner})}">
                <span class="loading">
                    <dbp-mini-spinner text=${i18n.t('loading')}></dbp-mini-spinner>
                </span>
            </div>

            <div class="${classMap({hidden: !showForm})}">
                <slot name="activity-description">
                    <p>${i18n.t('register.description-text')} <a target="_blank" rel="noopener"  href=${i18n.t('further-information')}>${this.activity.getHere(this.lang)}</a>.</p>
                    <br />
                </slot>

                <form id="registration-form">
                    <div class="field field--firstname">
                        <label class="label" for="reg-firstname">${i18n.t('name.first')}</label>
                        <div class="control">
                            <input id="reg-firstname" type="text" class="textField" value="${this.firstName}" disabled/>
                        </div>
                    </div>

                    <div class="field field--lastname">
                        <label class="label" for="reg-lastname">${i18n.t('name.last')}</label>
                        <div class="control">
                            <input id="reg-lastname" type="text" class="textField" value="${this.lastName}" disabled/>
                        </div>
                    </div>

                    <div class="field field--organization">
                        <label class="label" for="reg-organization">${i18n.t('organization')}</label>
                        <div class="control">
                            <input id="reg-organization" type="text" class="textField" value="${this.organizationsString}" disabled/>
                        </div>
                    </div>

                    <div class="field field--email">
                        <label class="label" for="reg-email">${i18n.t('email')}</label>
                        <div class="control">
                            <input id="reg-email" type="email" class="textField" value="${this.email}" disabled/>
                        </div>
                    </div>

                    <div class="field field--language">
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
                        <div class="error-container">
                            <span class="input-error" id="lang-error" hidden>${i18n.t('errors.language')}</span>
                        </div>

                    </div>

                    <div class="field field--dates">
                        <label class="label">${i18n.t('date.label')}</label>
                        <div class="control">${this.createPossibleDatesContainer()}</div>
                        <div class="error-container">
                            <span class="input-error" id="dates-error" hidden>${i18n.t('errors.date')}</span>
                        </div>
                    </div>

                    <div class="field field--agreement">
                        <label class="label">${i18n.t('agreement.label')} <a target="_blank" rel="noopener"  href=${i18n.t('agreement.privacy-policy')}>${this.activity.getHere(this.lang)}</a>.</label>
                        <div class="control">
                            <div>
                                <input type="radio" class="agreement" id="yes" name="agree" value="true">
                                <label for="yes">${i18n.t('agreement.yes')}</label>
                            </div>
                            <div>
                                <input type="radio" class="agreement" id="no" name="agree" value="false">
                                <label for="no">${i18n.t('agreement.no')}</label>
                            </div>
                            <div class="error-container">
                                <span class="input-error" id="agreement-error" hidden>${i18n.t('errors.agreement')}</span>
                            </div>
                        </div>
                    </div>
                    <div class="submit-button">
                        <dbp-button
                            value="Primary"
                            @click="${this.buttonClickHandler}"
                            type="is-primary"
                            class="${classMap({disabled: isPostingSubmission})}">${i18n.t('submit')}</dbp-button>
                    </div>
                </form>
            </div>

            <div class="availibility ${classMap({hidden: !showFormUnavailable})}">
                <p>${i18n.t('availibility')}</p>
            </div>

            <div class="registration-success ${classMap({hidden: !showSuccessText})}">
                <h2><b>${i18n.t('register.registration-success-text')}</b></h2>
            </div>
        `;
    }
}

commonUtils.defineCustomElement('dbp-lunchlottery-register', LunchLotteryRegister);
