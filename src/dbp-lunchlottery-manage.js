import {createInstance} from './i18n.js';
import {css, html} from 'lit';
import {classMap} from 'lit/directives/class-map.js';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import {send} from '@dbp-toolkit/common/notification';
import * as commonUtils from '@dbp-toolkit/common/utils';
import {Icon, MiniSpinner} from '@dbp-toolkit/common';
import * as commonStyles from '@dbp-toolkit/common/styles';
import DBPLitElement from '@dbp-toolkit/common/dbp-lit-element';
import metadata from './dbp-lunchlottery-manage.metadata.json';
import {Activity} from './activity.js';
import {FORM_IDENTIFIER} from './constants';
import {LoginStatus} from '@dbp-toolkit/auth/src/util';

const VIEW_INIT = 'init';
const VIEW_SETTINGS = 'settings';

class LunchLotteryManage extends ScopedElementsMixin(DBPLitElement) {
    constructor() {
        super();
        this._i18n = createInstance();
        this.lang = this._i18n.language;
        this.activity = new Activity(metadata);
        this.auth = null;
        this.name = null;
        this.entryPointUrl = null;

        // activity
        this.view = VIEW_INIT;
        this.loading = false;
        this.initialized = false;

        // formalize data
        this.formData = {};
        this.dates = [];
        this.availabilityStarts = new Date();
        this.availabilityEnds = new Date();
    }

    static get scopedElements() {
        return {
            'dbp-icon': Icon,
            'dbp-mini-spinner': MiniSpinner
        };
    }

    static get properties() {
        return {
            lang: {type: String},
            auth: {type: Object},
            name: {type: String},
            entryPointUrl: {type: String, attribute: 'entry-point-url'},
            loading: {type: Boolean, attribute: false}
        };
    }

    _updateAuth() {
        this._loginStatus = this.auth['login-status'];

        if (this._loginStatus === LoginStatus.LOGGED_OUT) {
            this.sendSetPropertyEvent('requested-login-status', LoginStatus.LOGGED_IN);
        } else if (this.auth && this.auth['login-status'] === LoginStatus.LOGGED_IN) {
            if (!this.initialized) {
                this.loadData();
                this.view = VIEW_SETTINGS;
                this.initialized = true;
            }
        }
    }

    connectedCallback() {
        super.connectedCallback();

        this._loginStatus = '';
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            switch (propName) {
                case 'lang':
                    this._i18n.changeLanguage(this.lang);
                    break;
                case 'auth':
                    this._updateAuth();
                    break;
            }
        });

        super.update(changedProperties);
    }

    async loadData() {
        this.loading = true;
        await this.getFormData();
        this.loading = false;
    }

    async fetchForm() {
        let response = await fetch(this.entryPointUrl + '/formalize/forms/' + FORM_IDENTIFIER, {
            headers: {
                'Content-Type': 'application/ld+json',
                Authorization: 'Bearer ' + this.auth.token,
            }
        });

        if (!response.ok) {
            switch (response.status) {
                case 401:
                    send({
                        summary: this._i18n.t('errors.unauthorized-title'),
                        body: this._i18n.t('errors.unauthorized-body'),
                        type: 'danger',
                        timeout: 5
                    });
                    break;
                case 404:
                    send({
                        summary: this._i18n.t('errors.notfound-title'),
                        body: this._i18n.t('errors.notfound-body'),
                        type: 'danger',
                        timeout: 5
                    });
                    break;
                default:
                    send({
                        summary: this._i18n.t('errors.other-title'),
                        body: this._i18n.t('errors.other-body'),
                        type: 'danger',
                        timeout: 5
                    });
            }
            throw new Error(response);
        }

        return response;
    }

    async getFormData() {
        let response = await this.fetchForm();
        const responseBody = await response.json();
        this.formData = responseBody;
        this.availabilityStarts = new Date(responseBody['availabilityStarts']);
        this.availabilityEnds = new Date(responseBody['availabilityEnds']);
        const formSchema = JSON.parse(responseBody['dataFeedSchema']);
        for (let i = 0; i < formSchema['properties']['possibleDates']['items']['enum'].length; ++i) {
            const date = new Date(formSchema['properties']['possibleDates']['items']['enum'][i]);
            this.dates.push(date);
        }
    }

    async updateFormData() {
        let response = await fetch(this.entryPointUrl + '/formalize/forms/' + FORM_IDENTIFIER, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/ld+json',
                Authorization: 'Bearer ' + this.auth.token,
            },
            body: JSON.stringify(this.formData)
        });

        if (response.ok) {
            send({
                summary: this._i18n.t('oks.updated-title'),
                body: this._i18n.t('oks.updated-body'),
                type: 'success',
                timeout: 5
            });
        } else {
            switch (response.status) {
                case 401:
                    send({
                        summary: this._i18n.t('errors.unauthorized-title'),
                        body: this._i18n.t('errors.unauthorized-body'),
                        type: 'danger',
                        timeout: 5
                    });
                    break;
                case 404:
                    send({
                        summary: this._i18n.t('errors.notfound-title'),
                        body: this._i18n.t('errors.notfound-body'),
                        type: 'danger',
                        timeout: 5
                    });
                    break;
                default:
                    send({
                        summary: this._i18n.t('errors.other-title'),
                        body: this._i18n.t('errors.other-body'),
                        type: 'danger',
                        timeout: 5
                    });
            }
            throw new Error(response);
        }
    }

    async clearFormSubmissions() {
        let response = await fetch(this.entryPointUrl + '/formalize/submissions?formIdentifier=' + FORM_IDENTIFIER, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/ld+json',
                Authorization: 'Bearer ' + this.auth.token,
            }
        });

        if (response.ok) {
            send({
                summary: this._i18n.t('oks.cleared-title'),
                body: this._i18n.t('oks.cleared-body'),
                type: 'success',
                timeout: 5
            });
        } else {
            switch (response.status) {
                case 401:
                    send({
                        summary: this._i18n.t('errors.unauthorized-title'),
                        body: this._i18n.t('errors.unauthorized-body'),
                        type: 'danger',
                        timeout: 5
                    });
                    break;
                case 404:
                    send({
                        summary: this._i18n.t('errors.notfound-title'),
                        body: this._i18n.t('errors.notfound-body'),
                        type: 'danger',
                        timeout: 5
                    });
                    break;
                default:
                    send({
                        summary: this._i18n.t('errors.other-title'),
                        body: this._i18n.t('errors.other-body'),
                        type: 'danger',
                        timeout: 5
                    });
            }
            throw new Error(response);
        }

        return response;
    }

    updateAvailabilityStarts(value) {
        this.availabilityStarts = this.dateTimeLocalToDate(value);
    }

    updateAvailabilityEnds(value) {
        this.availabilityEnds = this.dateTimeLocalToDate(value);
    }

    addDate() {
        let date = new Date();
        if (this.dates.length) {
            date = new Date(this.dates[this.dates.length - 1].getTime());
            date.setDate(date.getDate() + 1);
        } else {
            date = new Date(this.availabilityEnds.getTime());
            date.setDate(date.getDate() + 7);
        }
        this.dates.push(date);
        this.requestUpdate();
    }

    updateDate(dateIndex, value) {
        this.dates[dateIndex] = this.dateTimeLocalToDate(value);
    }

    removeDate(dateIndex) {
        this.dates.splice(dateIndex, 1);
        this.requestUpdate();
    }

    async save() {
        this.loading = true;
        this.formData['availabilityStarts'] = this.availabilityStarts.toISOString();
        this.formData['availabilityEnds'] = this.availabilityEnds.toISOString();
        let formSchema = JSON.parse(this.formData['dataFeedSchema']);
        formSchema['properties']['possibleDates']['items']['enum'] = [];
        for (let i = 0; i < this.dates.length; ++i) {
            const date = this.dates[i].toISOString();
            formSchema['properties']['possibleDates']['items']['enum'].push(date);
        }
        this.formData['dataFeedSchema'] = JSON.stringify(formSchema);
        await this.updateFormData();
        this.loading = false;
    }

    async clearSubmissions() {
        this.loading = true;
        await this.clearFormSubmissions();
        this.loading = false;
    }

    dateToDatetimeLocal(date) {
        let dateTimeLocal = '';
        dateTimeLocal += date.getFullYear() + '-';
        dateTimeLocal += ('0' + (date.getMonth() + 1)).slice(-2) + '-';
        dateTimeLocal += ('0' + date.getDate()).slice(-2) + 'T';
        dateTimeLocal += ('0' + date.getHours()).slice(-2) + ':';
        dateTimeLocal += ('0' + date.getMinutes()).slice(-2);
        return dateTimeLocal;
    }

    dateTimeLocalToDate(datetimeLocal) {
        return new Date(datetimeLocal);
    }

    static get styles() {
        return [
            commonStyles.getThemeCSS(),
            commonStyles.getGeneralCSS(),
            commonStyles.getActivityCSS(),
            commonStyles.getButtonCSS(),
            css`
                .hidden {
                    display: none;
                }

                h3 {
                    margin-bottom: .5rem;
                }

                .section {
                    margin-bottom: 2rem;
                }
                
                .option {
                    margin-bottom: .75rem;
                }
                
                .date {
                    margin-bottom: .25rem;
                }

                input[type="datetime-local"] {
                    padding: calc(0.375em - 1px) 0.75em;
                    font-family: inherit;
                    font-size: inherit;
                    font-weight: bolder;
                    border-color: var(--dbp-secondary-surface-border-color);
                    border-width: 1px;
                }

                th,
                td {
                    padding: 0.375em;
                }

                th:first-child,
                td:first-child {
                    padding-left: 0;
                }
            `
        ];
    }

    render() {
        let i18n = this._i18n;

        return html`
            <h2>${this.activity.getName(this.lang)}</h2>
            <p class="subheadline">
                <slot name="description">
                    ${this.activity.getDescription(this.lang)}
                </slot>
            </p>

            <div class="control full-size-spinner ${classMap({hidden: !this.loading})}">
                <span class="loading">
                    <dbp-mini-spinner text=${i18n.t('loading')}></dbp-mini-spinner>
                </span>
            </div>

            <div class="${classMap({hidden: this.loading || this.view !== VIEW_SETTINGS})}">
                <div class="section">
                    <h3>${i18n.t('manage.settings')}</h3>
                    <div class="option">
                        <h4>${i18n.t('manage.availabilityStarts')}</h4>
                        <input
                            type="datetime-local"
                            class="textField"
                            .value=${this.dateToDatetimeLocal(this.availabilityStarts)}
                            @change=${(e) => this.updateAvailabilityStarts(e.target.value)}
                        />
                    </div>
                    <div class="option">
                        <h4>${i18n.t('manage.availabilityEnds')}</h4>
                        <input
                            type="datetime-local"
                            class="textField"
                            .value=${this.dateToDatetimeLocal(this.availabilityEnds)}
                            @change=${(e) => this.updateAvailabilityEnds(e.target.value)}
                        />
                    </div>
                    <div class="option">
                        <h4>${i18n.t('manage.dates')}</h4>
                        ${this.dates.map((date, dateIndex) => html`
                            <div class="date">
                                <input
                                    type="datetime-local"
                                    class="textField"
                                    value="${this.dateToDatetimeLocal(date)}"
                                    @change=${(e) => this.updateDate(dateIndex, e.target.value)}
                                />
                                <button
                                    type="button"
                                    class="button"
                                    title="${i18n.t('manage.remove')}"
                                    @click="${() => this.removeDate(dateIndex)}">
                                    <dbp-icon
                                        title="${i18n.t('manage.remove')}"
                                        name="remove-file"></dbp-icon>
                                    <span>${i18n.t('manage.remove')}</span>
                                </button>
                            </div>
                        `)}
                        <button
                            type="button"
                            class="button"
                            title="${i18n.t('manage.add')}"
                            @click="${() => this.addDate()}">
                            <dbp-icon
                                title="${i18n.t('manage.add')}"
                                name="add-file"></dbp-icon>
                            <span>${i18n.t('manage.add')}</span>
                        </button>
                    </div>
                    <button
                        type="button"
                        class="button"
                        title="${i18n.t('manage.save')}"
                        @click="${() => this.save()}">
                        <dbp-icon
                            title="${i18n.t('manage.save')}"
                            name="save"></dbp-icon>
                        <span>${i18n.t('manage.save')}</span>
                    </button>
                </div>
                <div class="section">
                    <h3>${i18n.t('manage.delete')}</h3>
                    <button
                        type="button"
                        class="button"
                        title="${i18n.t('manage.delete')}"
                        @click="${() => this.clearSubmissions()}">
                        <dbp-icon
                            title="${i18n.t('manage.delete')}"
                            name="trash"></dbp-icon>
                        <span>${i18n.t('manage.delete')}</span>
                    </button>
                </div>
            </div>
        `;
    }
}

commonUtils.defineCustomElement('dbp-lunchlottery-manage', LunchLotteryManage);