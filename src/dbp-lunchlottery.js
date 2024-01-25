import {createInstance} from './i18n.js';
import {css, html} from 'lit';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import * as commonUtils from '@dbp-toolkit/common/utils';
import {Icon, Button} from '@dbp-toolkit/common';
import {ResourceSelect} from '@dbp-toolkit/resource-select';
import * as commonStyles from '@dbp-toolkit/common/styles';
import DBPLitElement from '@dbp-toolkit/common/dbp-lit-element';
import metadata from './dbp-lunchlottery.metadata.json';
import {Activity} from './activity.js';

class StarterActivity extends ScopedElementsMixin(DBPLitElement) {
    constructor() {
        super();
        this._i18n = createInstance();
        this.lang = this._i18n.language;
        this.activity = new Activity(metadata);
        this.auth = null;
        this.firstName = null;
        this.lastName = null;
        this.email = null;
        this.organizationIds = null;
        this.organization = null;
        this.entryPointUrl = null;
    }

    static get scopedElements() {
        return {
            'dbp-icon': Icon,
            'dbp-button': Button,
            'dbp-resource-select': ResourceSelect,
        };
    }

    static get properties() {
        return {
            lang: {type: String},
            auth: {type: Object},
            firstName: {type: String},
            lastName: {type: String},
            email: {type: String},
            organizationIds: {type: Array},
            organization: {type: String},
            entryPointUrl: {type: String, attribute: 'entry-point-url'},
        };
    }
    async autoFill() {
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

        this.firstName = data['givenName'];
        this.lastName = data['familyName'];
        this.email = data['localData']['email'];
        //this.organizationIds = data['localData']['staffAt'];

        console.log(data);
    }

    connectedCallback() {
        super.connectedCallback();
    }

    async getOrganizations() {
        let response = await fetch(this.entryPointUrl + '/base/organizations/' + this.organizationIds[0], {
            headers: {
                'Content-Type': 'application/ld+json',
                Authorization: 'Bearer ' + this.auth.token,
            },
        });
        if (!response.ok) {
            throw new Error(response);
        }

        let data = await response.json();
        console.log(data);

        const organization = this._('#organization');

        this.organization = `${data['name']}`;

        organization.value = this.organization;

            //this.organizations.push(data['name']);

        //console.log(this.organizations);
        //console.log(data);
    }


    update(changedProperties) {

        changedProperties.forEach((oldValue, propName) => {
            switch (propName) {
                case 'lang':
                    this._i18n.changeLanguage(this.lang);
                    break;
                case 'auth':
                    if (this.auth && this.auth['login-status'] === 'logged-in') {
                        this.autoFill();
                    }
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



    render() {
        let loggedIn = this.auth && this.auth.token;
        let i18n = this._i18n;

        //this.getOrganizations();

        return html`
            <p>${this.activity.getDescription(this.lang)} <a href="https://tu4u.tugraz.at/go/lunch-lottery">${this.activity.getHere(this.lang)}</a></p>
            <!--<div id="person-info"></div>-->
            <div class="${loggedIn ? '' : 'hidden'}">
                
                <div class="field">
                    <label class="label">${i18n.t('name.first')}</label>
                    <div class="control">
                        <input type="text" class="textField" id="first-name" value="${this.firstName}" readonly/>
                    </div>
                </div>
                

                <div class="field">
                    <label class="label">${i18n.t('name.last')}</label>
                    <div class="control">
                        <input type="text" class="textField" id="last-name" value="${this.lastName}" readonly/>
                    </div>
                </div>
                
                <div class="field">
                    <label class="label">${i18n.t('organization')}</label>
                    <div class="control">
                        <input type="text" class="textField" id="organization" readonly/>
                    </div>    
                </div>

                
                <div class="field">
                    <label class="label">${i18n.t('email')}</label>
                    <div class="control">
                        <input type="email" class="textField" id="email" value="${this.email}" readonly/>
                    </div>
                    
                </div>
                
                <div class="field">
                    <label class="label">${i18n.t('languages.label')}</label>
                    <div class="control">
                        <input type="radio" id="german" name="language" value="german">
                        <label for="german">${i18n.t('languages.german')}</label><br>
                        <input type="radio" id="english" name="language" value="english">
                        <label for="english">${i18n.t('languages.english')}</label><br>
                        <input type="radio" id="both" name="language" value="both">
                        <label for="both">${i18n.t('languages.both')}</label>
                    </div>
                    
                </div>
                <!-- Should I add the provided dates, or make a webcomponent that lets the customers choose the dates themselves? -->
                <div class="field">
                    <label class="label">${i18n.t('day.label')}</label>
                    <div class="control">
                        <input type="checkbox" id="wednesday" name="wednesday" value="wednesday">
                        <label for="wednesday">${i18n.t('day.wednesday')}</label><br>
                        <input type="checkbox" id="thursday" name="thursday" value="thursday">
                        <label for="thursday">${i18n.t('day.thursday')}</label><br>
                        <input type="checkbox" id="friday" name="friday" value="friday">
                        <label for="friday">${i18n.t('day.friday')}</label><br>
                        <input type="checkbox" id="monday" name="monday" value="monday">
                        <label for="monday">${i18n.t('day.monday')}</label><br>
                        <input type="checkbox" id="tuesday" name="tuesday" value="tuesday">
                        <label for="tuesday">${i18n.t('day.tuesday')}</label>
                    </div>
                </div>
                
                <div class="field">
                    <label class="label">${i18n.t('agreement.label')}</label>
                    <div class="control">
                        <input type="radio" id="yes" name="yes" value="yes">
                        <label for="yes">${i18n.t('agreement.yes')}</label>
                        <input type="radio" id="no" name="no" value="no">
                        <label for="no">${i18n.t('agreement.no')}</label>
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

commonUtils.defineCustomElement('dbp-lunchlottery', StarterActivity);
