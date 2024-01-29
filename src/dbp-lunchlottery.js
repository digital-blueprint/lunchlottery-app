import {createInstance} from './i18n.js';
import {css, html} from 'lit';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import * as commonUtils from '@dbp-toolkit/common/utils';
import {Icon, Button} from '@dbp-toolkit/common';
import * as commonStyles from '@dbp-toolkit/common/styles';
import DBPLitElement from '@dbp-toolkit/common/dbp-lit-element';
import metadata from './dbp-lunchlottery.metadata.json';
import {Activity} from './activity.js';

class LunchLottery extends ScopedElementsMixin(DBPLitElement) {
    constructor() {
        super();
        this._i18n = createInstance();
        this.lang = this._i18n.language;
        this.auth = null;
        this.entryPointUrl = null;
        this.activity = new Activity(metadata);
        this.firstName = null;
        this.lastName = null;
        this.email = null;
        this.organizationId = null;
        this.organizationName = null;
        this.preferredLanguage = null;
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
            firstName: {type: String, attribute: false},
            lastName: {type: String, attribute: false},
            email: {type: String, attribute: false},
            organizationId: {type: Number, attribute: false},
            organizationName: {type: String, attribute: false},
        };
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

        this.firstName = data.givenName;
        this.lastName = data.familyName;
        this.email = data.localData.email ?? '';
        this.organizationId = data.localData.staffAt[0] ?? null;
    }

    connectedCallback() {
        super.connectedCallback();
    }

    async fetchOrganization() {
        if (!this.organizationId) {
            this.organizationName = '';
            return;
        }

        let response = await fetch(this.entryPointUrl + '/base/organizations/' + this.organizationId, {
            headers: {
                'Content-Type': 'application/ld+json',
                Authorization: 'Bearer ' + this.auth.token,
            },
        });

        if (!response.ok) {
            throw new Error(response);
        }

        let data = await response.json();
        this.organizationName = data.name ?? '';
    }

    async fetchDates() {
        let response = await fetch(this.entryPointUrl + '/formalize/forms', {
            headers: {
                'Content-Type': 'application/ld+json',
                Authorization: 'Bearer ' + this.auth.token,
            },
        });
        const data = await response.json();
        console.log(data);
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
                case 'organizationId':
                    // If the organizationId changes, fetch the organization data
                    this.fetchOrganization();
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
        let i18n = this._i18n;

        return html`
            <p>${this.activity.getDescription(this.lang)} <a href="https://tu4u.tugraz.at/go/lunch-lottery">${this.activity.getHere(this.lang)}</a></p>
            <!--<div id="person-info"></div>-->
            <div class="${loggedIn ? '' : 'hidden'}">
                <div class="field">
                    <label class="label">${i18n.t('name.first')}</label>
                    <div class="control">
                        <input type="text" class="textField" value="${this.firstName}" readonly/>
                    </div>
                </div>

                <div class="field">
                    <label class="label">${i18n.t('name.last')}</label>
                    <div class="control">
                        <input type="text" class="textField" value="${this.lastName}" readonly/>
                    </div>
                </div>

                <div class="field">
                    <label class="label">${i18n.t('organization')}</label>
                    <div class="control">
                        <input type="text" class="textField" value="${this.organizationName}" readonly/>
                    </div>
                </div>

                <div class="field">
                    <label class="label">${i18n.t('email')}</label>
                    <div class="control">
                        <input type="email" class="textField" value="${this.email}" readonly/>
                    </div>
                </div>

                <div class="field">
                    <label class="label">${i18n.t('languages.label')}</label>
                    <div class="control">
                        <div>
                            <input type="radio" id="language-german" name="language" value="german" @click="${this.languageClick}">
                            <label for="language-german">${i18n.t('languages.german')}</label>
                        </div>
                        <div>
                            <input type="radio" id="language-english" name="language" value="english" @click="${this.languageClick}">
                            <label for="language-english">${i18n.t('languages.english')}</label>
                        </div>
                        <div>
                            <input type="radio" id="language-both" name="language" value="both" @click="${this.languageClick}">
                            <label for="language-both">${i18n.t('languages.both')}</label>
                        </div>
                    </div>

                </div>
                <!-- Should I add the provided dates, or make a webcomponent that lets the customers choose the dates themselves? -->
                <div class="field">
                    <label class="label">${i18n.t('day.label')}</label>
                    <div class="control">
                        <div>
                            <input type="checkbox" id="wednesday" name="wednesday" value="wednesday">
                            <label for="wednesday">${i18n.t('day.wednesday')}</label>
                        </div>
                        <div>
                            <input type="checkbox" id="thursday" name="thursday" value="thursday">
                            <label for="thursday">${i18n.t('day.thursday')}</label>
                        </div>
                        <div>
                            <input type="checkbox" id="friday" name="friday" value="friday">
                            <label for="friday">${i18n.t('day.friday')}</label>
                        </div>
                        <div>
                            <input type="checkbox" id="monday" name="monday" value="monday">
                            <label for="monday">${i18n.t('day.monday')}</label>
                        </div>
                        <div>
                            <input type="checkbox" id="tuesday" name="tuesday" value="tuesday">
                            <label for="tuesday">${i18n.t('day.tuesday')}</label>
                        </div>
                    </div>
                </div>

                <div class="field">
                    <label class="label">${i18n.t('agreement.label')}</label>
                    <div class="control">
                        <div>
                            <input type="radio" id="yes" name="yes" value="yes">
                            <label for="yes">${i18n.t('agreement.yes')}</label>
                        </div>
                        <div>
                        <input type="radio" id="no" name="no" value="no">
                            <label for="no">${i18n.t('agreement.no')}</label>
                        </div>
                    </div>
                </div>

                <div id="rightSide">
                    <dbp-button 
                       value="Primary"
                       @click="${this.buttonClickHandler}"
                       type="is-primary">${i18n.t('submit')}</dbp-button>
                </div>

            </div>

            <div class="${!loggedIn ? '' : 'hidden'}">
                <p>${i18n.t('please-log-in')}</p>
            </div>
        `;
    }
}

commonUtils.defineCustomElement('dbp-lunchlottery', LunchLottery);
