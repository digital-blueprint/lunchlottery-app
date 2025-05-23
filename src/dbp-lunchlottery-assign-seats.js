import {css, html} from 'lit';
import {classMap} from 'lit/directives/class-map.js';
import {ScopedElementsMixin} from '@dbp-toolkit/common';
import * as commonUtils from '@dbp-toolkit/common/utils';
import {Icon, MiniSpinner, LoadingButton} from '@dbp-toolkit/common';
import * as commonStyles from '@dbp-toolkit/common/styles';
import metadata from './dbp-lunchlottery-assign-seats.metadata.json';
import {Activity} from './activity.js';
import {FORM_IDENTIFIER} from './constants';
import {LunchLotteryDate, LunchLotteryEvent, LunchLotteryTable} from './lunch-lottery';
import {TabulatorTable} from '@dbp-toolkit/tabulator-table';
import DBPLunchlotteryLitElement from './dbp-lunchlottery-lit-element';

const VIEW_INIT = 'init';
const VIEW_SUBMISSIONS = 'submissions';
const VIEW_SETTINGS = 'settings';
const VIEW_RESULTS = 'results';

class LunchLotteryAssignSeats extends ScopedElementsMixin(DBPLunchlotteryLitElement) {
    constructor() {
        super();
        this.activity = new Activity(metadata);
        this.name = null;
        this.entryPointUrl = null;
        this.allExpanded = false;

        // activity
        this.view = VIEW_INIT;
        this.loading = false;
        this.dateOptions = {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        };

        // formalize data
        this.dates = [];
        this.submissions = [];

        // expanded formalize data
        this.expandedDates = [];
        this.expandedSubmissions = [];

        let langs = {
            en: {
                columns: {
                    details: this._i18n.t('results.details', {lng: 'en'}),
                    givenName: this._i18n.t('results.givenName', {lng: 'en'}),
                    familyName: this._i18n.t('results.familyName', {lng: 'en'}),
                    email: this._i18n.t('results.email', {lng: 'en'}),
                    organizationNames: this._i18n.t('results.organizationNames', {lng: 'en'}),
                    preferredLanguage: this._i18n.t('results.preferredLanguage', {lng: 'en'}),
                    date: this._i18n.t('results.date', {lng: 'en'}),
                    table: this._i18n.t('results.table', {lng: 'en'}),
                    privacyConsent: this._i18n.t('results.privacyConsent', {lng: 'en'}),
                },
            },
            de: {
                columns: {
                    details: this._i18n.t('results.details', {lng: 'de'}),
                    givenName: this._i18n.t('results.givenName', {lng: 'de'}),
                    familyName: this._i18n.t('results.familyName', {lng: 'de'}),
                    email: this._i18n.t('results.email', {lng: 'de'}),
                    organizationNames: this._i18n.t('results.organizationNames', {lng: 'de'}),
                    preferredLanguage: this._i18n.t('results.preferredLanguage', {lng: 'de'}),
                    date: this._i18n.t('results.date', {lng: 'de'}),
                    table: this._i18n.t('results.table', {lng: 'de'}),
                    privacyConsent: this._i18n.t('results.privacyConsent', {lng: 'de'}),
                },
            },
        };

        // data
        this.dataOptions = {
            langs: langs,
            layout: 'fitDataFill',
            // layout: 'fitColumns',
            responsiveLayout: 'collapse',
            responsiveLayoutCollapseStartOpen: false,
            columns: [],
            columnDefaults: {
                vertAlign: 'middle',
                hozAlign: 'left',
                resizable: false,
            },
            responsiveLayoutCollapseFormatter: function (data) {
                //data - an array of objects containing the column title and value for each cell
                let table = document.createElement('table');
                data.forEach(function (row) {
                    let tableRow = document.createElement('tr');
                    // format date title
                    if (!isNaN(Date.parse(row.title))) {
                        const date = new Date(row.title);
                        let dateString = '';
                        dateString += ('0' + date.getDate()).slice(-2) + '.';
                        dateString += ('0' + (date.getMonth() + 1)).slice(-2) + '.';
                        dateString += date.getFullYear();
                        row.title = dateString;
                    }
                    if (row.value === undefined) {
                        row.value = '';
                    }
                    tableRow.innerHTML =
                        '<td><strong>' + row.title + '</strong></td><td>' + row.value + '</td>';
                    table.appendChild(tableRow);
                });

                return Object.keys(data).length ? table : '';
            },
        };
        this.dataOptionsColumnsPrepend = [
            {
                title: 'details',
                field: 'details',
                hozAlign: 'center',
                width: 65,
                formatter: 'responsiveCollapse',
                headerHozAlign: 'center',
                sorter: 'string',
                headerSort: false,
                responsive: 0,
            },
            {
                title: this._i18n.t('results.givenName'),
                field: 'givenName',
                minWidth: 120,
                responsive: 0,
            },
            {
                title: this._i18n.t('results.familyName'),
                field: 'familyName',
                minWidth: 120,
                responsive: 0,
            },
            {title: this._i18n.t('results.email'), field: 'email', visible: 0},
            {
                title: this._i18n.t('results.organizationNames'),
                field: 'organizationNames',
                minWidth: 300,
                responsive: 1,
                formatter: function (cell, formatterParams, onRendered) {
                    return cell.getValue().join(', ');
                }.bind(this),
            },
            {title: this._i18n.t('results.preferredLanguage'), field: 'preferredLanguage'},
            {
                title: this._i18n.t('results.possibleDates'),
                field: 'possibleDates',
                responsive: 9,
                width: 120,
                visible: 0,
                xlsx: 0,
                formatter: function (cell, formatterParams, onRendered) {
                    return cell.getValue().join(', ');
                }.bind(this),
            },
            {
                title: this._i18n.t('results.date'),
                field: 'date',
                width: 120,
                minWidth: 120,
                widthShrink: 0,
                responsive: 1,
                formatter: this.dateFormatter.bind(this),
                xlsxFormatter: function (cell, formatterParams, onRendered) {
                    let value = cell.getValue();
                    if (value) {
                        value = new Date(value);
                    }
                    return value;
                }.bind(this),
            },
            {title: this._i18n.t('results.table'), field: 'table', responsive: 1},
        ];
        this.dataOptionsColumnsAppend = [
            {
                title: this._i18n.t('results.privacyConsent'),
                field: 'privacyConsent',
                responsive: 9,
                formatter: function (cell, formatterParams, onRendered) {
                    if (cell.getValue()) {
                        return this._i18n.t('results.privacyConsent-true');
                    } else {
                        return this._i18n.t('results.privacyConsent-false');
                    }
                }.bind(this),
            },
        ];
        this.dataRows = [];

        // settings
        this.processButtonDisabled = true;
        this.tables = {};

        // results
        this.variants = [];
        this.currentVariant = 0;
    }

    static get scopedElements() {
        return {
            'dbp-icon': Icon,
            'dbp-loading-button': LoadingButton,
            'dbp-mini-spinner': MiniSpinner,
            'dbp-tabulator-table': TabulatorTable,
        };
    }

    static get properties() {
        return {
            ...super.properties,
            name: {type: String},
            entryPointUrl: {type: String, attribute: 'entry-point-url'},
            loading: {type: Boolean, attribute: false},
            allExpanded: {type: Boolean, attribute: false},
        };
    }

    initialize() {
        super.initialize();
        this.loadData();
    }

    async loadData() {
        this.loading = true;
        await this.getDates();
        this.expandDates();
        await this.getSubmissions();
        this.expandSubmissions();
        this.loadTables();
        this.loading = false;
        this.displaySubmissions();
    }

    async fetchForm() {
        const response = await this.httpGetAsync(
            this.entryPointUrl + '/formalize/forms/' + encodeURIComponent(FORM_IDENTIFIER),
            {
                headers: {
                    'Content-Type': 'application/ld+json',
                    Authorization: 'Bearer ' + this.auth.token,
                },
            },
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
            for (
                let i = 0;
                i < formSchema['properties']['possibleDates']['items']['enum'].length;
                ++i
            ) {
                const isoStringWithTimezoneOffset =
                    formSchema['properties']['possibleDates']['items']['enum'][i];
                this.dates.push(isoStringWithTimezoneOffset);
            }
        }
    }

    expandDates() {
        this.expandedDates = [];

        this.dates.forEach((identifier) => {
            const item = {
                identifier: identifier,
                date: new Date(identifier),
            };
            this.expandedDates.push(item);
        });
    }

    dateFormatter(cell, formatterParams, onRendered) {
        let value = cell.getValue();
        if (value) {
            const date = new Date(value);
            let dateString = '';
            dateString += ('0' + date.getDate()).slice(-2) + '.';
            dateString += ('0' + (date.getMonth() + 1)).slice(-2) + '.';
            dateString += date.getFullYear();
            value = dateString;
        }
        return value;
    }

    async fetchSubmissionsCollection() {
        const response = await this.httpGetAsync(
            this.entryPointUrl +
                '/formalize/submissions?formIdentifier=' +
                encodeURIComponent(FORM_IDENTIFIER) +
                '&perPage=99999',
            {
                headers: {
                    'Content-Type': 'application/ld+json',
                    Authorization: 'Bearer ' + this.auth.token,
                },
            },
        );

        if (!response.ok) {
            this.handleErrorResponse(response);
        }

        return response;
    }

    async getSubmissions() {
        let response = await this.fetchSubmissionsCollection();
        const responseBody = await response.json();
        let submissions = {};
        let submissionsCreated = {};
        for (let i = 0; i < responseBody['hydra:member'].length; ++i) {
            const item = JSON.parse(responseBody['hydra:member'][i]['dataFeedElement']);
            const created = new Date(responseBody['hydra:member'][i]['dateCreated']);
            if (
                !(item['identifier'] in submissions) ||
                created > submissionsCreated[item['identifier']]
            ) {
                submissions[item['identifier']] = item;
                submissionsCreated[item['identifier']] = created;
            }
        }
        this.submissions = Object.values(submissions);
    }

    expandSubmissions() {
        this.expandedSubmissions = [];

        let availableDates = {};
        this.expandedDates.forEach((expandedDate) => {
            availableDates[expandedDate['identifier']] = false;
        });

        this.submissions.forEach((submission) => {
            let expandedPossibleDates = {...availableDates};
            submission['possibleDates'].forEach((identifier) => {
                if (identifier in expandedPossibleDates) {
                    expandedPossibleDates[identifier] = true;
                } else {
                    console.error({
                        error: 'possibleDates mismatch',
                        identifier: identifier,
                        availableDates: availableDates,
                        submission: submission,
                    });
                }
            });

            let item = Object.assign(submission, expandedPossibleDates);

            this.expandedSubmissions.push(item);
        });
    }

    updateDataOptionsColumns() {
        let dataOptionsColumns = [];

        this.expandedDates.forEach((expandedDate) => {
            const title = expandedDate['date'].toISOString();
            const identifier = expandedDate['identifier'];
            dataOptionsColumns.push({
                title: title,
                field: identifier,
                titleFormatter: this.dateFormatter.bind(this),
                formatter: function (cell, formatterParams, onRendered) {
                    if (cell.getValue()) {
                        return this._i18n.t('results.availableDate-true');
                    } else {
                        return this._i18n.t('results.availableDate-false');
                    }
                }.bind(this),
            });
        });

        this.dataOptions['columns'] = [
            ...this.dataOptionsColumnsPrepend,
            ...dataOptionsColumns,
            ...this.dataOptionsColumnsAppend,
        ];
    }

    displaySubmissions() {
        this.updateDataOptionsColumns();
        this.dataRows = this.expandedSubmissions;

        this.view = VIEW_SUBMISSIONS;

        const tabulatorTable = /** @type {TabulatorTable} */ (
            this._('#tabulator-table-submissions')
        );
        // tabulatorTable.options = this.dataOptions;
        tabulatorTable.buildTable();
        tabulatorTable.setData(this.dataRows);
    }

    downloadSubmissions() {
        let table = this._('#tabulator-table-submissions');
        let fileFormat = 'xlsx';
        const today = new Date();
        let month = today.getMonth() + 1;
        month = month.toString();
        let day = today.getDate();
        day = day.toString();
        let year = today.getFullYear();
        year = year.toString();
        let dataName = 'LLRegistrations' + day + month + year;
        table.download(fileFormat, dataName);
    }

    downloadResults() {
        let table = this._('#tabulator-table-results');
        let fileFormat = 'xlsx';
        const today = new Date();
        let month = today.getMonth() + 1;
        month = month.toString();
        let day = today.getDate();
        day = day.toString();
        let year = today.getFullYear();
        year = year.toString();
        let dataName = 'LLSubmissions' + day + month + year;
        table.download(fileFormat, dataName);
    }

    showSettings() {
        this.view = VIEW_SETTINGS;
        this.requestUpdate();
    }

    validateSettings() {
        if (this.expandedDates.length) {
            this.processButtonDisabled = false;
            this.expandedDates.forEach((expandedDate, index) => {
                if (index in this.tables && this.tables[index].length) {
                    let dateSeats = 0;
                    this.tables[index].forEach((table) => {
                        const tableSeats = table['number'] * table['seats'];
                        if (tableSeats < 0) {
                            this.processButtonDisabled = true;
                        }
                        dateSeats += tableSeats;
                    });
                    if (dateSeats <= 0) {
                        this.processButtonDisabled = true;
                    }
                } else {
                    this.processButtonDisabled = true;
                }
            });
        } else {
            this.processButtonDisabled = true;
        }
    }

    saveTables() {
        localStorage.setItem('tables', JSON.stringify(this.tables));
        this.validateSettings();
        this.requestUpdate();
    }

    loadTables() {
        const data = localStorage.getItem('tables');
        if (data) {
            this.tables = JSON.parse(data);
            this.validateSettings();
        }
    }

    addTable(dateIndex) {
        this.tables[dateIndex].push({
            number: 0,
            seats: 0,
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
            this.tables[index].forEach((table) => {
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
        let submissions = this.expandedSubmissions;

        while (submissions.length) {
            let distances = {};
            submissions.forEach((submission) => {
                const [distance, table, date] = lunchLotteryEvent.getShortestDistance(submission);
                // we need integer keys for shortest distance; float numbers are casted to string, then it's not working
                const distanceKey = Math.floor(distance);

                if (!(distanceKey in distances)) {
                    distances[distanceKey] = [];
                }

                distances[distanceKey].push({
                    submission: submission,
                    table: table,
                    date: date,
                });
            });

            const shortestDistance = Object.keys(distances)[0];
            if (shortestDistance >= 9999) {
                break;
            }

            const randomKey = Math.floor(Math.random() * distances[shortestDistance].length);
            const randomItem = distances[shortestDistance][randomKey];

            lunchLotteryEvent.assign(
                randomItem['date'],
                randomItem['table'],
                randomItem['submission'],
            );
            submissions = submissions.filter(
                (submission) => submission !== randomItem['submission'],
            );
        }
        if (submissions.length) {
            lunchLotteryEvent.setUnassigned(submissions);
        }

        return lunchLotteryEvent;
    }

    flattenResults(lunchLotteryEvent) {
        let rows = [];
        lunchLotteryEvent.dates.forEach((date) => {
            date.tables.forEach((table, index) => {
                let seat = 1;
                table.seats.forEach((assignment) => {
                    let row = Object.assign({}, assignment); // clone
                    row['date'] = date.identifier;
                    row['table'] = index + 1 + ': ' + seat + '/' + table.availableSeats;
                    rows.push(row);
                    ++seat;
                });
            });
        });
        lunchLotteryEvent.unassigned.forEach((submission) => {
            rows.push(submission);
        });

        return rows;
    }

    process() {
        const lunchLotteryEvent = this.calculateDistances();
        this.dataRows = this.flattenResults(lunchLotteryEvent);

        this.variants.push(this.dataRows);
        this.currentVariant = this.variants.length - 1;

        this.view = VIEW_RESULTS;
        this.requestUpdate();

        const tabulatorTable = this._('#tabulator-table-results');
        // tabulatorTable.options = this.dataOptions;
        tabulatorTable.buildTable();
        tabulatorTable.setData(this.dataRows);
    }

    static get styles() {
        return [
            commonStyles.getThemeCSS(),
            commonStyles.getGeneralCSS(),
            commonStyles.getActivityCSS(),
            commonStyles.getButtonCSS(),
            css`
                #tabulator-table-results,
                #tabulator-table-submissions {
                    --dbp-tabulator-collapse-padding-left: 68px;
                }

                .hidden {
                    display: none;
                }

                .align-right {
                    text-align: right;
                }

                .control-button-container {
                    display: flex;
                    justify-content: flex-end;
                    gap: 1rem;
                }

                .date,
                .tabulator-table {
                    display: block;
                    margin-bottom: 2rem;
                }

                .date h4 {
                    margin: 0;
                }

                input[type='number'] {
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

                .totalSubmission {
                    display: flex;
                    justify-content: flex-start;
                }

                .buttons {
                    float: right;
                }

                .inlineElements {
                    display: inline-block;
                }

                @media screen and (max-width: 530px) {
                    .control-button-container {
                        flex-direction: column;
                    }
                }
            `,
        ];
    }

    render() {
        let i18n = this._i18n;

        return html`
            <h2>${this.activity.getName(this.lang)}</h2>
            <p class="subheadline">
                <slot name="description">${this.activity.getDescription(this.lang)}</slot>
            </p>

            <div class="control full-size-spinner ${classMap({hidden: !this.loading})}">
                <span class="loading">
                    <dbp-mini-spinner text=${i18n.t('loading')}></dbp-mini-spinner>
                </span>
            </div>

            <div class="${classMap({hidden: this.loading || this.view !== VIEW_SUBMISSIONS})}">
                <p>${i18n.t('submissions.total')} ${this.submissions.length}</p>
                <div class="control-button-container">
                    <dbp-loading-button
                        id="expand-all-btn"
                        class="${classMap({hidden: this.allExpanded})}"
                        value="${i18n.t('expand-all')}"
                        @click="${() => {
                            this.allExpanded = true;
                            const table = /** @type {TabulatorTable} */ (
                                this._('#tabulator-table-submissions')
                            );
                            table.expandAll();
                        }}"
                        title="${i18n.t('expand-all')}">
                        ${i18n.t('expand-all')}
                    </dbp-loading-button>

                    <dbp-loading-button
                        id="collapse-all-btn"
                        class="${classMap({hidden: !this.allExpanded})}"
                        value="${i18n.t('collapse-all')}"
                        @click="${() => {
                            this.allExpanded = false;
                            const table = /** @type {TabulatorTable} */ (
                                this._('#tabulator-table-submissions')
                            );
                            table.collapseAll();
                        }}"
                        title="${i18n.t('collapse-all')}">
                        ${i18n.t('collapse-all')}
                    </dbp-loading-button>
                    <button
                        type="button"
                        class="button"
                        title="${i18n.t('process.settings')}"
                        @click="${() => this.showSettings()}">
                        <dbp-icon title="${i18n.t('process.settings')}" name="dinner"></dbp-icon>
                        <span>${i18n.t('process.settings')}</span>
                    </button>
                    <button
                        type="button"
                        class="button"
                        title="${i18n.t('process.download')}"
                        @click="${() => this.downloadSubmissions()}">
                        <dbp-icon title="${i18n.t('process.download')}" name="download"></dbp-icon>
                        <span>${i18n.t('process.download')}</span>
                    </button>
                </div>
                <dbp-tabulator-table
                    lang="${this.lang}"
                    class="tabulator-table"
                    .options="${this.dataOptions}"
                    id="tabulator-table-submissions"></dbp-tabulator-table>
            </div>

            <div class="${classMap({hidden: this.loading || this.view !== VIEW_SETTINGS})}">
                ${this.expandedDates.map(
                    (date, dateIndex) => html`
                        <div class="date">
                            <h4>
                                ${new Intl.DateTimeFormat(undefined, this.dateOptions).format(
                                    date.date,
                                )}
                            </h4>
                            <table>
                                <tr>
                                    <th>${i18n.t('table.number')}</th>
                                    <th aria-hidden="true"></th>
                                    <th>${i18n.t('table.seats')}</th>
                                    <th></th>
                                </tr>
                                ${this.getTables(dateIndex).map(
                                    (table, tableIndex) => html`
                                        <tr>
                                            <td>
                                                <input
                                                    type="number"
                                                    class="textField"
                                                    size="4"
                                                    maxlength="2"
                                                    min="1"
                                                    max="99"
                                                    .value=${table.number}
                                                    @change=${(e) =>
                                                        this.updateTableNumber(
                                                            dateIndex,
                                                            tableIndex,
                                                            e.target.value,
                                                        )} />
                                            </td>
                                            <td aria-hidden="true">x</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    class="textField"
                                                    size="2"
                                                    maxlength="1"
                                                    min="1"
                                                    max="9"
                                                    .value=${table.seats}
                                                    @change=${(e) =>
                                                        this.updateTableSeats(
                                                            dateIndex,
                                                            tableIndex,
                                                            e.target.value,
                                                        )} />
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    class="button"
                                                    title="${i18n.t('table.remove')}"
                                                    @click="${() =>
                                                        this.removeTable(dateIndex, tableIndex)}">
                                                    <dbp-icon
                                                        title="${i18n.t('table.remove')}"
                                                        name="trash"></dbp-icon>
                                                    <span>${i18n.t('table.remove')}</span>
                                                </button>
                                            </td>
                                        </tr>
                                    `,
                                )}
                            </table>
                            <button
                                type="button"
                                class="button"
                                title="${i18n.t('table.add')}"
                                @click="${() => this.addTable(dateIndex)}">
                                <dbp-icon title="${i18n.t('table.add')}" name="plus"></dbp-icon>
                                <span>${i18n.t('table.add')}</span>
                            </button>
                        </div>
                    `,
                )}
                <div>
                    <button
                        type="button"
                        class="button"
                        title="${i18n.t('process.run')}"
                        ?disabled=${this.processButtonDisabled}
                        @click="${() => this.process()}">
                        <dbp-icon title="${i18n.t('process.run')}" name="dinner"></dbp-icon>
                        <span>${i18n.t('process.run')}</span>
                    </button>
                </div>
            </div>

            <div class="${classMap({hidden: this.loading || this.view !== VIEW_RESULTS})}">
                <div class="control-button-container">
                    <dbp-loading-button
                        id="expand-all-btn"
                        class="${classMap({hidden: this.allExpanded})}"
                        value="${i18n.t('expand-all')}"
                        @click="${() => {
                            this.allExpanded = true;
                            const table = /** @type {TabulatorTable} */ (
                                this._('#tabulator-table-results')
                            );
                            table.expandAll();
                        }}"
                        title="${i18n.t('expand-all')}">
                        ${i18n.t('expand-all')}
                    </dbp-loading-button>

                    <dbp-loading-button
                        id="collapse-all-btn"
                        class="${classMap({hidden: !this.allExpanded})}"
                        value="${i18n.t('collapse-all')}"
                        @click="${() => {
                            this.allExpanded = false;
                            const table = /** @type {TabulatorTable} */ (
                                this._('#tabulator-table-results')
                            );
                            table.collapseAll();
                        }}"
                        title="${i18n.t('collapse-all')}">
                        ${i18n.t('collapse-all')}
                    </dbp-loading-button>
                    <button
                        type="button"
                        class="button"
                        title="${i18n.t('process.run')}"
                        @click="${() => this.process()}">
                        <dbp-icon title="${i18n.t('process.run')}" name="dinner"></dbp-icon>
                        <span>${i18n.t('process.run')}</span>
                    </button>
                    <button
                        type="button"
                        class="button"
                        title="${i18n.t('process.download')}"
                        @click="${() => this.downloadResults()}">
                        <dbp-icon title="${i18n.t('process.download')}" name="download"></dbp-icon>
                        <span>${i18n.t('process.download')}</span>
                    </button>
                </div>
                <dbp-tabulator-table
                    lang="${this.lang}"
                    class="tabulator-table"
                    .options="${this.dataOptions}"
                    id="tabulator-table-results"></dbp-tabulator-table>
            </div>
        `;
    }
}

commonUtils.defineCustomElement('dbp-lunchlottery-assign-seats', LunchLotteryAssignSeats);
