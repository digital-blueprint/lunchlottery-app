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
import {AuthKeycloak} from '@dbp-toolkit/auth';

class StarterActivity extends ScopedElementsMixin(DBPLitElement) {
    constructor() {
        super();
        this._i18n = createInstance();
        this.lang = this._i18n.language;
        this.activity = new Activity(metadata);
        this.auth = null;
        this.name = null;
        this.entryPointUrl = null;
        this.guestEmail = '';
        this.isEmailSet = false;
        this._resources = [];
    }

    static get scopedElements() {
        return {
            'dbp-icon': Icon,
            'dbp-button': Button,
            'dbp-resource-select': ResourceSelect,
            'dbp-auth-keycloak': AuthKeycloak,
        };
    }

    static get properties() {
        return {
            lang: {type: String},
            auth: {type: Object},
            name: {type: String},
            entryPointUrl: {type: String, attribute: 'entry-point-url'},
            guestEmail: {type: String, attribute: false},
            isEmailSet: {type: Boolean, attribute: false},
        };
    }

    connectedCallback() {
        super.connectedCallback();
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            switch (propName) {
                case 'lang':
                    this._i18n.changeLanguage(this.lang);
                    break;
            }
        });

        super.update(changedProperties);
    }

    async _onUserInfoClick() {
        const first_name = this._('#first-name');
        const family_name = this._('#family-name');
        const email = this._('#email');
        if (!this.auth.token) {
            console.error('not logged in');
            first_name.innerHTML = 'You are not logged in!';
            return;
        }

        let userInfoURL =
            'https://auth-dev.tugraz.at/auth/realms/tugraz-vpu/protocol/openid-connect/userinfo';

        // NOTE: the URL and realm need to match the keycloak config above
        const response = await fetch(userInfoURL, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + this.auth.token,
            },
        });
        const person = await response.json();
        console.log(JSON.stringify(person));
        //div.innerHTML = JSON.stringify(person);
        //input.value = JSON.stringify(person);
        first_name.value = person['given_name'];
        family_name.value = person['family_name'];
        email.value = person['email'];
    }

    getAuthComponentHtml() {
        return this.noAuth
            ? html`
                  <dbp-login-button subscribe="auth" lang="${this.lang}"></dbp-login-button>
              `
            : html`
                  <div class="container">
                      <dbp-auth-keycloak
                          subscribe="requested-login-status,silent-check-sso-redirect-uri,url,realm,client-id"
                          lang="${this.lang}"
                          entry-point-url="${this.entryPointUrl}"
                          try-login></dbp-auth-keycloak>
                      <dbp-login-button subscribe="auth" lang="${this.lang}"></dbp-login-button>
                  </div>
              `;
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

        return html`
            <p>${this.activity.getDescription(this.lang)} <a href="https://tu4u.tugraz.at/go/lunch-lottery">${this.activity.getHere(this.lang)}</a></p>
            ${this.getAuthComponentHtml()}
            <!--<div id="person-info"></div>-->
            <div class="${loggedIn ? '' : 'hidden'}">
                <div class="field">
                    <label class="label">${i18n.t('name.first')}</label>
                    <div class="control">
                        <input type="text" class="textField" id="first-name"/>
                    </div>
                </div>
                

                <div class="field">
                    <label class="label">${i18n.t('name.last')}</label>
                    <div class="control">
                        <input type="text" class="textField" id="family-name"/>
                    </div>
                </div>
                    
                <div class="field">
                    <label class="label">${i18n.t('organization')}</label>
                    <div class="control">
                        <dbp-resource-select />
                    </div>
                    
                </div>
                
                <div class="field">
                    <label class="label">${i18n.t('email')}</label>
                    <div class="control">
                        <input type="email"  class="textField" id = "email"/>
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

                
                <div class="container">
                    <input type="button" value="Fetch userinfo" @click="${this._onUserInfoClick}" />
                    <!--<h4>Person info:</h4>
                    <div id="person-info"></div>-->
                </div>
                
            </div>

            <div class="${!loggedIn ? '' : 'hidden'}">
                <p>${i18n.t('please-log-in')}</p>
            </div>
            
            
        `;
    }
}

commonUtils.defineCustomElement('dbp-lunchlottery', StarterActivity);
