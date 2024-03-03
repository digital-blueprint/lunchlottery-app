import {createInstance} from './i18n.js';
import {css, html} from 'lit';
import {classMap} from 'lit/directives/class-map.js';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import * as commonUtils from '@dbp-toolkit/common/utils';
import {Icon, MiniSpinner} from '@dbp-toolkit/common';
import * as commonStyles from '@dbp-toolkit/common/styles';
import metadata from './dbp-lunchlottery-assign-seats.metadata.json';
import {Activity} from './activity.js';
import {FORM_IDENTIFIER} from './constants';
import {LunchLotteryDate, LunchLotteryEvent, LunchLotteryTable} from './lunch-lottery';
import {TabulatorTable} from '@dbp-toolkit/tabulator-table';
import * as XLSX from 'sheetjs_xlsx';
import DBPLunchlotteryLitElement from "./dbp-lunchlottery-lit-element";

const VIEW_INIT = 'init';
const VIEW_SUBMISSIONS = 'submissions';
const VIEW_SETTINGS = 'settings';
const VIEW_RESULTS = 'results';

class LunchLotteryAssignSeats extends ScopedElementsMixin(DBPLunchlotteryLitElement) {
    constructor() {
        super();
        this._i18n = createInstance();
        this.lang = this._i18n.language;
        this.activity = new Activity(metadata);
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

        // submissions
        this.submissionOptions = {
            layout: 'fitDataTable',
            columns: [
            ],
            columnDefaults: {
                vertAlign: 'middle',
                hozAlign: 'left',
                resizable: true
            }
        };
        this.submissionOptionsColumnsPrepend = [
            {title: this._i18n.t('results.givenName'), field: 'givenName'},
            {title: this._i18n.t('results.familyName'), field: 'familyName'},
            {title: this._i18n.t('results.email'), field: 'email', visible: 0},
            {
                title: this._i18n.t('results.organizationNames'),
                field: 'organizationNames',
                formatter: function(cell, formatterParams, onRendered) {
                    return cell.getValue().join(', ');
                }.bind(this)
            },
            {title: this._i18n.t('results.preferredLanguage'), field: 'preferredLanguage'},
            {
                title: this._i18n.t('results.possibleDates'),
                field: 'possibleDates',
                visible: 0,
                xlsx: 0,
                formatter: function(cell, formatterParams, onRendered) {
                    return cell.getValue().join(', ');
                }.bind(this)
            }
        ];
        this.submissionOptionsColumnsAppend = [
            {
                title: this._i18n.t('results.privacyConsent'),
                field: 'privacyConsent',
                formatter: function(cell, formatterParams, onRendered) {
                    if (cell.getValue()) {
                        return this._i18n.t('results.privacyConsent-true');
                    } else {
                        return this._i18n.t('results.privacyConsent-false');
                    }
                }.bind(this),
            },
        ];

        // settings
        this.tables = {};
        this.loadTables();

        // results
        this.variants = [];
        this.currentVariant = 0;
        this.resultOptions = {
            layout: 'fitColumns',
            columns: [
                {title: this._i18n.t('results.givenName'), field: 'givenName'},
                {title: this._i18n.t('results.familyName'), field: 'familyName'},
                {title: this._i18n.t('results.email'), field: 'email'},
                {title: this._i18n.t('results.organizationNames'), field: 'organizationNames'},
                {title: this._i18n.t('results.preferredLanguage'), field: 'preferredLanguage'},
                {title: this._i18n.t('results.date'), field: 'date'},
                {title: this._i18n.t('results.table'), field: 'table'},
                {title: this._i18n.t('results.privacyConsent'), field: 'privacyConsent'}
            ],
            columnDefaults: {
                vertAlign: 'middle',
                hozAlign: 'left',
                resizable: false
            }
        };

        // formalize data
        this.dates = [];
        this.submissions = [];

        // data
        this.expandedDates = [];
        this.expandedSubmissions = [];
        this.dataRows = [];
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
            ...super.properties,
            lang: {type: String},
            name: {type: String},
            entryPointUrl: {type: String, attribute: 'entry-point-url'},
            loading: {type: Boolean, attribute: false}
        };
    }

    initialize() {
        super.initialize();
        this.loadData();
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
        this.expandDates();
        await this.getSubmissions();
        this.expandSubmissions();
        this.loading = false;
        this.displaySubmissions();
    }

    async fetchForm() {
        const response = await this.httpGetAsync(
            this.entryPointUrl + '/formalize/forms/' + FORM_IDENTIFIER,
            {
                headers: {
                    'Content-Type': 'application/ld+json',
                    Authorization: 'Bearer ' + this.auth.token,
                }
            }
        );

        if (!response.ok) {
            this.handleErrorResponse(response);
        }

        return response;
    }

    async getDates() {
        let response = await this.fetchForm();
        const responseBody = await response.json();
        const formSchema = JSON.parse(responseBody['dataFeedSchema']);
        if ('enum' in formSchema['properties']['possibleDates']['items']) {
            for (let i = 0; i < formSchema['properties']['possibleDates']['items']['enum'].length; ++i) {
                const isoStringWithTimezoneOffset = formSchema['properties']['possibleDates']['items']['enum'][i];
                this.dates.push(isoStringWithTimezoneOffset);
            }
        }
    }

    expandDates() {
        this.expandedDates = [];

        this.dates.forEach(identifier => {
            const item = {
                identifier: identifier,
                date: new Date(identifier)
            };
            this.expandedDates.push(item);
        });
    }

    async fetchSubmissionsCollection() {
        const response = await this.httpGetAsync(
            this.entryPointUrl + '/formalize/submissions?formIdentifier=' + FORM_IDENTIFIER + '&perPage=99999',
            {
                headers: {
                    'Content-Type': 'application/ld+json',
                    Authorization: 'Bearer ' + this.auth.token,
                }
            }
        );

        if (!response.ok) {
            this.handleErrorResponse(response);
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

    expandSubmissions() {
        this.expandedSubmissions = [];

        let availableDates = {};
        this.expandedDates.forEach(expandedDate => {
            availableDates[expandedDate['identifier']] = false;
        });

        this.submissions.forEach(submission => {
            let expandedPossibleDates = {...availableDates};
            submission['possibleDates'].forEach(identifier => {
                if (identifier in expandedPossibleDates) {
                    expandedPossibleDates[identifier] = true;
                } else {
                    console.error({
                        'error': 'possibleDates mismatch',
                        'identifier': identifier,
                        'availableDates': availableDates,
                        'submission': submission
                    });
                }
            });

            let item = Object.assign(
                {},
                {
                    givenName: submission.givenName,
                    familyName: submission.familyName,
                    email: submission.email,
                    organizationNames: submission.organizationNames,
                    preferredLanguage: submission.preferredLanguage,
                    possibleDates: submission.possibleDates
                },
                expandedPossibleDates,
                {
                    privacyConsent: submission.privacyConsent
                }
            );

            this.expandedSubmissions.push(item);
        });
    }

    updateSubmissionOptionsColumns() {
        let submissionOptionsColumns = [];

        this.expandedDates.forEach(expandedDate => {
            const title = expandedDate['date'].toISOString();
            const identifier = expandedDate['identifier'];
            submissionOptionsColumns.push({
                'title': title,
                'field': identifier,
                'titleFormatter': function(cell, formatterParams, onRendered) {
                    const date = new Date(cell.getValue());
                    let dateString = '';
                    dateString += ('0' + date.getDate()).slice(-2) + '.';
                    dateString += ('0' + (date.getMonth() + 1)).slice(-2) + '.';
                    dateString += date.getFullYear();
                    return dateString;
                },
                formatter: function(cell, formatterParams, onRendered) {
                    if (cell.getValue()) {
                        return this._i18n.t('results.availableDate-true');
                    } else {
                        return this._i18n.t('results.availableDate-false');
                    }
                }.bind(this)
            });
        });

        this.submissionOptions['columns'] = [
            ...this.submissionOptionsColumnsPrepend,
            ...submissionOptionsColumns,
            ...this.submissionOptionsColumnsAppend
        ];
    }

    displaySubmissions() {
        this.updateSubmissionOptionsColumns();
        this.dataRows = this.expandedSubmissions;

        this.view = VIEW_SUBMISSIONS;

        const tabulatorTable = this._('#tabulator-table-submissions');
        tabulatorTable.options = this.submissionOptions;
        tabulatorTable.buildTable();
        tabulatorTable.setData(this.dataRows);
    }

    downloadSubmissions() {
        const worksheet = XLSX.utils.json_to_sheet([]);

        let header = [];
        this.submissionOptions.columns.forEach(column => {
            if (
                'field' in column
                && (!('xlsx' in column) || ('xlsx' in column && column['xlsx']))
            ) {
                let value = column['title'];
                if ('titleFormatter' in column) {
                    value = column.titleFormatter(
                        {
                            getValue() {
                                return value;
                            }
                        },
                        column['titleFormatterParams'] || {},
                        null
                    );
                }
                header.push(value);
            }
        });
        XLSX.utils.sheet_add_aoa(worksheet, [header]);

        let rows = [];
        this.dataRows.forEach(row => {
            let item = {};
            this.submissionOptions.columns.forEach(column => {
                if (
                    'field' in column
                    && (!('xlsx' in column) || ('xlsx' in column && column['xlsx']))
                ) {
                    const index = column['field'];
                    let value = row[index] || '';
                    if ('formatter' in column) {
                        value = column.formatter(
                            {
                                getValue() {
                                    return value;
                                }
                            },
                            column['formatterParams'] || {},
                            null
                        );
                    }
                    item[index] = value;
                }
            });
            rows.push(item);
        });
        XLSX.utils.sheet_add_json(worksheet, rows, {
            origin: 'A2',
            skipHeader: true,
        });

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet);
        XLSX.writeFile(workbook, 'LunchLotterySubmissions.xlsx', {compression: true});
    }

    showSettings() {
        this.view = VIEW_SETTINGS;
        this.requestUpdate();
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

        this.expandedDates.forEach((date, index) => {
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
                        table: (index + 1) + ': ' + seat + '/' + table.availableSeats,
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

        const tabulatorTable = this._('#tabulator-table-results');
        tabulatorTable.options = this.resultOptions;
        tabulatorTable.buildTable();
        tabulatorTable.setData(this.variants[this.currentVariant]);
    }

    downloadResults() {
        let rows = [];
        this.variants[this.currentVariant].forEach(row => {
            row['date'] = new Date(row['date']);
            rows.push(row);
        });
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet);
        XLSX.writeFile(workbook, 'LunchLotteryResults.xlsx', {compression: true});
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

            <div class="${classMap({hidden: this.loading || this.view !== VIEW_SUBMISSIONS})}">
                <p>
                    ${i18n.t('submissions.total')} ${ this.submissions.length }
                </p>
                <dbp-tabulator-table
                    lang="${this.lang}"
                    class="tabulator-table"
                    id="tabulator-table-submissions"></dbp-tabulator-table>
                <button
                    type="button"
                    class="button"
                    title="${i18n.t('process.settings')}"
                    @click="${() => this.showSettings()}">
                    <dbp-icon
                        title="${i18n.t('process.settings')}"
                        name="dinner"></dbp-icon>
                    <span>${i18n.t('process.settings')}</span>
                </button>
                <button
                    type="button"
                    class="button"
                    title="${i18n.t('process.download')}"
                    @click="${() => this.downloadSubmissions()}">
                    <dbp-icon
                        title="${i18n.t('process.download')}"
                        name="download"></dbp-icon>
                    <span>${i18n.t('process.download')}</span>
                </button>
            </div>

            <div class="${classMap({hidden: this.loading || this.view !== VIEW_SETTINGS})}">
                ${this.expandedDates.map((date, dateIndex) => html`
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
                    id="tabulator-table-results"></dbp-tabulator-table>
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
                    @click="${() => this.downloadResults()}">
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