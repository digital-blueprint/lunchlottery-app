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
        this.first_name = null;
        this.last_name = null;
        this.email = null;
        this.organizations_ids = null;
        this.organizations;
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
            first_name: {type: String},
            last_name: {type: String},
            email: {type: String},
            organizations_ids: {type: Array},
            organizations: {type: Array},
            entryPointUrl: {type: String, attribute: 'entry-point-url'},
        };
    }
    // hier autFill
    connectedCallback() {
        super.connectedCallback();
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

        const first_name = this._('#first-name');
        const last_name = this._('#last-name');
        const email = this._('#email');

        let data = await response.json();
        this.first_name = `${data['givenName']}`;
        this.last_name = `${data['familyName']}`;
        this.email = `${data['localData']['email']}`;
        this.organizations_ids = data['localData']['staffAt'];

        first_name.value = this.first_name;
        last_name.value = this.last_name;
        email.value = this.email;

        //console.log(this.organizations_ids[0]);

        //console.log(data);
    }

    async getOrganizations() {

        for (let i = 0; i < this.organizations_ids.length; i++)
        {
            let response = await fetch(this.entryPointUrl + '/base/organizations/' + this.organizations_ids[i], {
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

            //this.organizations.push(data['name']);
        }
        //console.log(this.organizations);
        //console.log(data);
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
        this.autoFill();
        this.getOrganizations();

        return html`
            <p>${this.activity.getDescription(this.lang)} <a href="https://tu4u.tugraz.at/go/lunch-lottery">${this.activity.getHere(this.lang)}</a></p>
            <!--<div id="person-info"></div>-->
            <div class="${loggedIn ? '' : 'hidden'}">

                
                
                <div class="field">
                    <label class="label">${i18n.t('name.first')}</label>
                    <div class="control">
                        <input type="text" class="textField" id="first-name"  readonly/>
                    </div>
                </div>
                

                <div class="field">
                    <label class="label">${i18n.t('name.last')}</label>
                    <div class="control">
                        <input type="text" class="textField" id="last-name"  readonly/>
                    </div>
                </div>
                
                <div class="field">
                    <label class="label">${i18n.t('organization')}</label>
                    <div class="control">
                        <input type="text" class="textField" readonly/>
                    </div>    
                </div>

                
                <div class="field">
                    <label class="label">${i18n.t('email')}</label>
                    <div class="control">
                        <input type="email"  class="textField" id = "email" readonly/>
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
