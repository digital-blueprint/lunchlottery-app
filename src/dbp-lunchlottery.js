import {createInstance} from './i18n.js';
import {css, html} from 'lit';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import * as commonUtils from '@dbp-toolkit/common/utils';
import {Icon} from '@dbp-toolkit/common';
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
        this.name = null;
        this.entryPointUrl = null;
    }

    static get scopedElements() {
        return {
            'dbp-icon': Icon,
            'dbp-resource-select': ResourceSelect,
        };
    }

    static get properties() {
        return {
            lang: {type: String},
            auth: {type: Object},
            name: {type: String},
            entryPointUrl: {type: String, attribute: 'entry-point-url'},
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

    static get styles() {
        return [
            commonStyles.getThemeCSS(),
            css`
                .hidden {
                    display: none;
                }
            `,
        ];
    }

    async onClick(event) {
        let response = await fetch(this.entryPointUrl + '/base/people/' + this.auth['user-id'], {
            headers: {
                'Content-Type': 'application/ld+json',
                Authorization: 'Bearer ' + this.auth.token,
            },
        });
        if (!response.ok) {
            throw new Error(response);
        }

        let data = await response.json();
        this.name = `${data['givenName']} ${data['familyName']}`;
    }

    render() {
        let loggedIn = this.auth && this.auth.token;
        let i18n = this._i18n;

        return html`
            <h3>${this.activity.getName(this.lang)}</h3>
            <p>${this.activity.getDescription(this.lang)}</p>

            <div class="${loggedIn ? '' : 'hidden'}">
                <!--<input type="button" value="${i18n.t('click-me')}" @click="${this.onClick}"></input>
                <p>${
                    this.name
                        ? html`
                              <dbp-icon name="world"></dbp-icon>
                              ${i18n.t('hello', {name: this.name})}
                          `
                        : ``
                }</p>-->
                <div>
                    <label class="label">${i18n.t('name.first')}</label><br>
                    <input type="text"/>
                </div>

                <div>
                    <label class="label">${i18n.t('name.last')}</label><br>
                    <input type="text"/>
                </div>
                    
                <div>
                    <label class="label">${i18n.t('organization')}</label>
                    <dbp-resource-select />
                </div>
                
                <div>
                    <label class="label">${i18n.t('email')}</label><br>
                    <input type="email"/>
                </div>
                
                <div>
                    <label>${i18n.t('languages.label')}</label><br>
                    <input type="radio" id="german" name="language" value="german">
                    <label for="german">${i18n.t('languages.german')}</label><br>
                    <input type="radio" id="english" name="language" value="english">
                    <label for="english">${i18n.t('languages.english')}</label><br>
                    <input type="radio" id="both" name="language" value="both">
                    <label for="both">${i18n.t('languages.both')}</label>
                </div>
                <!-- Should I add the provided dates, or make a webcomponent that lets the customers choose the dates themselves? -->
                <div>
                    <label>${i18n.t('day')}</label><br>
                    <input type="checkbox" id="wednesday" name="wednesday" value="wednesday">
                    <label for="wednesday"> wednesday</label><br>
                    <input type="checkbox" id="thursday" name="thursday" value="thursday">
                    <label for="thursday"> thursday</label><br>
                    <input type="checkbox" id="friday" name="friday" value="friday">
                    <label for="friday"> friday</label><br>
                    <input type="checkbox" id="monday" name="monday" value="monday">
                    <label for="monday"> monday</label><br>
                    <input type="checkbox" id="tuesday" name="tuesday" value="tuesday">
                    <label for="tuesday"> tuesday</label>
                </div>
                
                <div>
                    <label>${i18n.t('agreement.label')}</label><br>
                    <input type="radio" id="yes" name="yes" value="yes">
                    <label for="yes">${i18n.t('agreement.yes')}</label>
                    <input type="radio" id="no" name="no" value="no">
                    <label for="no">${i18n.t('agreement.no')}</label>
                </div>
                
            </div>

            <div class="${!loggedIn ? '' : 'hidden'}">
                <p>${i18n.t('please-log-in')}</p>
            </div>
        `;
    }
}

commonUtils.defineCustomElement('dbp-lunchlottery', StarterActivity);
