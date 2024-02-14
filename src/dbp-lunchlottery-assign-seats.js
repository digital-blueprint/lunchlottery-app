import {createInstance} from './i18n.js';
import {css, html} from 'lit';
import {classMap} from 'lit/directives/class-map.js';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import {send} from '@dbp-toolkit/common/notification';
import * as commonUtils from '@dbp-toolkit/common/utils';
import {Icon, MiniSpinner} from '@dbp-toolkit/common';
import * as commonStyles from '@dbp-toolkit/common/styles';
import DBPLitElement from '@dbp-toolkit/common/dbp-lit-element';
import metadata from './dbp-lunchlottery-assign-seats.metadata.json';
import {Activity} from './activity.js';
import {FORM_IDENTIFIER} from './constants';
import {LunchLotteryDate, LunchLotteryEvent, LunchLotteryTable} from './lunch-lottery';
import {TabulatorTable} from '@dbp-toolkit/tabulator-table';
import * as XLSX from 'sheetjs_xlsx';
import {LoginStatus} from '@dbp-toolkit/auth/src/util';

const VIEW_INIT = 'init';
const VIEW_SETTINGS = 'settings';
const VIEW_RESULTS = 'results';

class LunchLotteryAssignSeats extends ScopedElementsMixin(DBPLitElement) {
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
        this.dateOptions = {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        };
        this.tables = {};
        this.loadTables();
        this.variants = [];
        this.currentVariant = 0;

        // formalize data
        this.dates = [];
        this.submissions = [];
    }

    static get scopedElements() {
        return {
            'dbp-icon': Icon,
            'dbp-mini-spinner': MiniSpinner,
            'dbp-tabulator-table': TabulatorTable
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
            this.loadData();
            this.view = VIEW_SETTINGS;
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
        await this.getDates();
        await this.getSubmissions();
        this.loading = false;
    }

    async fetchForm() {
        let response = await fetch(this.entryPointUrl + '/formalize/forms/' + FORM_IDENTIFIER, {
            headers: {
                'Content-Type': 'application/ld+json'
                //Authorization: 'Bearer ' + this.auth.token, todo
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

    async getDates() {
        let response = await this.fetchForm();
        const responseBody = await response.json();
        const formSchema = JSON.parse(responseBody['dataFeedSchema']);
        for (let i = 0; i < formSchema['properties']['possibleDates']['items']['enum'].length; ++i) {
            const identifier = formSchema['properties']['possibleDates']['items']['enum'][i];
            const item = {
                identifier: identifier,
                date: new Date(formSchema['properties']['possibleDates']['items']['enum'][i])
            };
            this.dates.push(item);
        }
    }

    async fetchSubmissionsCollection() {
        let response = await fetch(this.entryPointUrl + '/formalize/submissions/?formIdentifier=' + FORM_IDENTIFIER, {
            headers: {
                'Content-Type': 'application/ld+json'
                //Authorization: 'Bearer ' + this.auth.token, todo
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

    async getSubmissions() {
        let response = await this.fetchSubmissionsCollection();
        const responseBody = await response.json();
        for (let i = 0; i < responseBody['hydra:member'].length; ++i) {
            const item = JSON.parse(responseBody['hydra:member'][i]['dataFeedElement']);
            this.submissions.push(item);
        }
    }

    saveTables() {
        localStorage.setItem('tables', JSON.stringify(this.tables));
        this.requestUpdate();
    }

    loadTables() {
        const data = localStorage.getItem('tables');
        if (data) {
            this.tables = JSON.parse(data);
        }
    }

    addTable(dateIndex) {
        this.tables[dateIndex].push({
            number: 0,
            seats: 0
        });
        this.saveTables();
        console.log(this.tables);
    }

    updateTableNumber(dateIndex, tableIndex, value) {
        this.tables[dateIndex][tableIndex]['number'] = value;
        this.saveTables();
    }

    updateTableSeats(dateIndex, tableIndex, value) {
        this.tables[dateIndex][tableIndex]['seats'] = value;
        this.saveTables();
    }

    removeTable(dateIndex, tableIndex) {
        this.tables[dateIndex].splice(tableIndex, 1);
        this.saveTables();
    }

    getTables(dateIndex) {
        if (!(dateIndex in this.tables)) {
            this.tables[dateIndex] = [];
            this.addTable(dateIndex);
        }

        return this.tables[dateIndex];
    }

    createLunchLotteryEvent() {
        let lunchLotteryEvent = new LunchLotteryEvent();

        this.dates.forEach((date, index) => {
            let lunchLotteryDate = new LunchLotteryDate(date['identifier']);
            lunchLotteryEvent.addDate(lunchLotteryDate);
            this.tables[index].forEach(table => {
                for (let i = parseInt(table['number']); i > 0; --i) {
                    let lunchLotteryTable = new LunchLotteryTable(parseInt(table['seats']));
                    lunchLotteryDate.addTable(lunchLotteryTable);
                }
            });
        });

        return lunchLotteryEvent;
    }

    calculateDistances() {
        let lunchLotteryEvent = this.createLunchLotteryEvent();
        let submissions = this.submissions;

        while (submissions.length) {
            let distances = {};
            submissions.forEach(submission => {
                const [distance, table, date] = lunchLotteryEvent.getShortestDistance(submission);

                if (!(distance in distances)) {
                    distances[distance] = [];
                }

                distances[distance].push({
                    'submission': submission,
                    'table': table,
                    'date': date
                });
            });

            const shortestDistance = Object.keys(distances)[0];
            if (shortestDistance >= 9999) {
                break;
            }

            const randomKey = Math.floor(Math.random() * distances[shortestDistance].length);
            const randomItem = distances[shortestDistance][randomKey];

            lunchLotteryEvent.assign(randomItem['date'], randomItem['table'], randomItem['submission']);
            submissions = submissions.filter(submission => submission !== randomItem['submission']);
        }

        return lunchLotteryEvent;
    }

    flattenResults(lunchLotteryEvent) {
        let rows = [];
        lunchLotteryEvent.dates.forEach(date => {
            date.tables.forEach((table, index) => {
                let seat = 1;
                table.seats.forEach(assignment => {
                    const row = {
                        givenName: assignment.givenName,
                        familyName: assignment.familyName,
                        email: assignment.email,
                        organizationNames: assignment.organizationNames.join(', '),
                        preferredLanguage: assignment.preferredLanguage,
                        date: date.identifier,
                        table: index + ': ' + seat + '/' + table.availableSeats,
                        privacyConsent: assignment.privacyConsent
                    };
                    rows.push(row);
                    ++seat;
                });
            });
        });

        return rows;
    }

    process() {
        const lunchLotteryEvent = this.calculateDistances();
        const rows = this.flattenResults(lunchLotteryEvent);

        this.variants.push(rows);
        this.currentVariant = this.variants.length - 1;

        this.view = VIEW_RESULTS;
        this.requestUpdate();

        const tabulatorTable = this._('#tabulator-table');
        tabulatorTable.buildTable();
        tabulatorTable.setData(this.variants[this.currentVariant]);
    }

    download() {
        const worksheet = XLSX.utils.json_to_sheet(this.variants[this.currentVariant]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet);
        XLSX.writeFile(workbook, 'LunchLottery.xlsx', {compression: true});
    }

    static get styles() {
        return [
            commonStyles.getThemeCSS(),
            commonStyles.getButtonCSS(),
            css`
                .hidden {
                    display: none;
                }

                .align-right {
                    text-align: right;
                }

                .date,
                .tabulator-table {
                    display: block;
                    margin-bottom: 2rem;
                }

                .date h4 {
                    margin: 0;
                }

                input[type="number"] {
                    padding: calc(0.375em - 1px) 0.75em;
                    font-family: inherit;
                    font-size: inherit;
                    font-weight: bolder;
                    border-color: var(--dbp-secondary-surface-border-color);
                    border-width: 1px;
                }

                td {
                    padding: 0.375em;
                }

                td:first-child {
                    padding-left: 0;
                }
            `
        ];
    }

    render() {
        let i18n = this._i18n;

        let options = {
            layout: 'fitColumns',
            columns: [
                {title: i18n.t('results.givenName'), field: 'givenName'},
                {title: i18n.t('results.familyName'), field: 'familyName'},
                {title: i18n.t('results.email'), field: 'email'},
                {title: i18n.t('results.organizationNames'), field: 'organizationNames'},
                {title: i18n.t('results.preferredLanguage'), field: 'preferredLanguage'},
                {title: i18n.t('results.date'), field: 'date'},
                {title: i18n.t('results.table'), field: 'table'},
                {title: i18n.t('results.privacyConsent'), field: 'privacyConsent'}
            ],
            columnDefaults: {
                vertAlign: 'middle',
                hozAlign: 'left',
                resizable: false
            }
        };

        return html`
            <h3>${this.activity.getName(this.lang)}</h3>
            <p>${this.activity.getDescription(this.lang)}</p>

            <div class="control full-size-spinner ${classMap({hidden: !this.loading})}">
                <span class="loading">
                    <dbp-mini-spinner text=${i18n.t('loading')}></dbp-mini-spinner>
                </span>
            </div>

            <div class="${classMap({hidden: this.loading || this.view !== VIEW_SETTINGS})}">
                ${this.dates.map((date, dateIndex) => html`
                    <div class="date">
                        <h4>${new Intl.DateTimeFormat(undefined, this.dateOptions).format(date.date)}</h4>
                        <table>
                            <tr>
                                <th>
                                    ${i18n.t('table.number')}
                                </th>
                                <th aria-hidden="true"></th>
                                <th>
                                    ${i18n.t('table.seats')}
                                </th>
                                <th></th>
                            </tr>
                            ${this.getTables(dateIndex).map((table, tableIndex) => html`
                                <tr>
                                    <td>
                                        <input
                                            type="number"
                                            class="textField"
                                            size="4"
                                            maxlength="2"
                                            .value=${table.number}
                                            @change=${(e) => this.updateTableNumber(dateIndex, tableIndex, e.target.value)}
                                        />
                                    </td>
                                    <td aria-hidden="true">x</td>
                                    <td>
                                        <input
                                            type="number"
                                            class="textField"
                                            size="2"
                                            maxlength="1"
                                            .value=${table.seats}
                                            @change=${(e) => this.updateTableSeats(dateIndex, tableIndex, e.target.value)}
                                        />
                                    </td>
                                    <td>
                                        <button
                                            type="button"
                                            class="button"
                                            title="${i18n.t('table.remove')}"
                                            @click="${() => this.removeTable(dateIndex, tableIndex)}">
                                            <dbp-icon
                                                title="${i18n.t('table.remove')}"
                                                name="remove-file"></dbp-icon>
                                            <span>${i18n.t('table.remove')}</span>
                                        </button>
                                    </td>
                                </tr>
                            `)}
                        </table>
                        <button
                            type="button"
                            class="button"
                            title="${i18n.t('table.add')}"
                            @click="${() => this.addTable(dateIndex)}">
                            <dbp-icon
                                title="${i18n.t('table.add')}"
                                name="add-file"></dbp-icon>
                            <span>${i18n.t('table.add')}</span>
                        </button>
                    </div>
                `)}
                <div>
                    <button
                        type="button"
                        class="button"
                        title="${i18n.t('process.run')}"
                        @click="${() => this.process()}">
                        <dbp-icon
                            title="${i18n.t('process.run')}"
                            name="dinner"></dbp-icon>
                        <span>${i18n.t('process.run')}</span>
                    </button>
                </div>
            </div>

            <div class="${classMap({hidden: this.loading || this.view !== VIEW_RESULTS})}">
                <dbp-tabulator-table
                    lang="${this.lang}"
                    class="tabulator-table"
                    id="tabulator-table"
                    options=${JSON.stringify(options)}></dbp-tabulator-table>
                <button
                    type="button"
                    class="button"
                    title="${i18n.t('process.run')}"
                    @click="${() => this.process()}">
                    <dbp-icon
                        title="${i18n.t('process.run')}"
                        name="dinner"></dbp-icon>
                    <span>${i18n.t('process.run')}</span>
                </button>
                <button
                    type="button"
                    class="button"
                    title="${i18n.t('process.download')}"
                    @click="${() => this.download()}">
                    <dbp-icon
                        title="${i18n.t('process.download')}"
                        name="download"></dbp-icon>
                    <span>${i18n.t('process.download')}</span>
                </button>
            </div>
        `;
    }
}

commonUtils.defineCustomElement('dbp-lunchlottery-assign-seats', LunchLotteryAssignSeats);