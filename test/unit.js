import {assert} from 'chai';

import '../src/dbp-lunchlottery-register';
import '../src/dbp-lunchlottery-app.js';
import {LunchLotteryEvent, LunchLotteryDate} from '../src/lunch-lottery.js';
// Add real integration tests using LunchLotteryTable logic
import {LunchLotteryTable} from '../src/lunch-lottery.js';

suite('dbp-lunchlottery basics', () => {
    let node;

    suiteSetup(async () => {
        node = document.createElement('dbp-lunchlottery-register');
        document.body.appendChild(node);
        await node.updateComplete;
    });

    suiteTeardown(() => {
        node.remove();
    });

    test('should render', () => {
        assert(!!node.shadowRoot);
    });
});

// New unit tests for LunchLotteryDate.getShortestDistance and LunchLotteryEvent.getShortestDistance
suite('LunchLotteryDate.getShortestDistance', () => {
    class StubTable {
        constructor(distance) {
            this._distance = distance;
        }
        getShortestDistance() {
            return [this._distance];
        }
        assign() {}
    }

    test('returns closest table index and distance when date is possible', () => {
        const date = new LunchLotteryDate('2025-09-01');
        date.addTable(new StubTable(50));
        date.addTable(new StubTable(30));
        date.addTable(new StubTable(40));

        const submission = {
            possibleDates: ['2025-09-01', '2025-09-02'],
        };

        const [distance, tableIndex] = date.getShortestDistance(submission);
        assert.strictEqual(distance, 30, 'expected minimal distance 30');
        assert.strictEqual(tableIndex, 1, 'expected table index 1');
    });

    test('returns 9999 and null table when date not in possibleDates', () => {
        const date = new LunchLotteryDate('2025-09-01');
        date.addTable(new StubTable(10));
        const submission = {possibleDates: ['2025-09-02']};
        const [distance, tableIndex] = date.getShortestDistance(submission);
        assert.strictEqual(distance, 9999);
        assert.isNull(tableIndex);
    });

    test('returns first table on tie (stable selection)', () => {
        const date = new LunchLotteryDate('2025-09-01');
        date.addTable(new StubTable(10));
        date.addTable(new StubTable(10));
        const submission = {possibleDates: ['2025-09-01']};
        const [distance, tableIndex] = date.getShortestDistance(submission);
        assert.strictEqual(distance, 10);
        assert.strictEqual(tableIndex, 0, 'on tie the first minimal distance should win');
    });

    test('returns [null, null] when date is possible but has no tables', () => {
        const date = new LunchLotteryDate('2025-09-01');
        const submission = {possibleDates: ['2025-09-01']};
        const [distance, tableIndex] = date.getShortestDistance(submission);
        assert.isNull(distance);
        assert.isNull(tableIndex);
    });
});

suite('LunchLotteryEvent.getShortestDistance', () => {
    class StubDate {
        constructor(distance, tableIndex) {
            this._distance = distance;
            this._tableIndex = tableIndex;
        }
        getShortestDistance() {
            return [this._distance, this._tableIndex];
        }
    }

    test('selects date and table with minimal distance', () => {
        const event = new LunchLotteryEvent();
        const d1 = new StubDate(50, 0);
        const d2 = new StubDate(20, 1);
        const d3 = new StubDate(35, 0);
        event.addDate(d1);
        event.addDate(d2);
        event.addDate(d3);
        const submission = {}; // unused by stub
        const [distance, tableIndex, dateIndex] = event.getShortestDistance(submission);
        assert.strictEqual(distance, 20);
        assert.strictEqual(tableIndex, 1);
        assert.strictEqual(dateIndex, 1);
    });

    test('handles a date returning large (9999) distance', () => {
        const event = new LunchLotteryEvent();
        event.addDate(new StubDate(9999, null));
        event.addDate(new StubDate(120, 0));
        const [distance, tableIndex, dateIndex] = event.getShortestDistance({});
        assert.strictEqual(distance, 120);
        assert.strictEqual(tableIndex, 0);
        assert.strictEqual(dateIndex, 1);
    });

    test('prefers earlier date when distances equal (stable)', () => {
        const event = new LunchLotteryEvent();
        event.addDate(new StubDate(10, 0));
        event.addDate(new StubDate(10, 1));
        const [distance, tableIndex, dateIndex] = event.getShortestDistance({});
        assert.strictEqual(distance, 10);
        assert.strictEqual(tableIndex, 0);
        assert.strictEqual(dateIndex, 0, 'first date should win on tie');
    });
});

// Integration tests with real tables and submissions
suite('LunchLotteryDate.getShortestDistance (integration)', () => {
    function makeSubmission(overrides = {}) {
        return Object.assign(
            {
                possibleDates: ['2025-09-01'],
                preferredLanguage: 'en',
                organizationIds: ['org1A'],
            },
            overrides,
        );
    }

    test('selects table with lower occupancy distance over empty table', () => {
        const date = new LunchLotteryDate('2025-09-01');
        const tEmpty = new LunchLotteryTable(4); // empty -> +100
        const tOneSeat = new LunchLotteryTable(4); // one seat -> (1/4)*100=25
        tOneSeat.assign(makeSubmission({preferredLanguage: 'en', organizationIds: ['org2A']}));
        date.addTable(tEmpty); // index 0 distance expected 101 ( (2-1)=1 + 100 )
        date.addTable(tOneSeat); // index 1 distance expected 26 (1 + 25)

        const submission = makeSubmission({possibleDates: ['2025-09-01', '2025-09-02']});
        const [distance, tableIndex] = date.getShortestDistance(submission);
        assert.strictEqual(distance, 26);
        assert.strictEqual(tableIndex, 1);
    });

    test('language hard mismatch causes large penalty vs soft mismatch with both', () => {
        const date = new LunchLotteryDate('2025-09-01');
        const tHard = new LunchLotteryTable(2);
        const tSoft = new LunchLotteryTable(2);
        tHard.assign(makeSubmission({preferredLanguage: 'de', organizationIds: ['org2A']})); // mismatch en vs de -> +9999
        tSoft.assign(makeSubmission({preferredLanguage: 'both', organizationIds: ['org3A']})); // mismatch en vs both -> +2
        date.addTable(tHard); // index 0
        date.addTable(tSoft); // index 1

        const submission = makeSubmission();
        const [distance, tableIndex] = date.getShortestDistance(submission);
        // Calculate expected distances:
        // Base (possibleDates length 1 => 0)
        // tHard: occupancy (1/2)*100=50 + 9999 = 10049
        // tSoft: occupancy 50 + 2 = 52
        assert.strictEqual(distance, 52);
        assert.strictEqual(tableIndex, 1);
    });

    test('organization conflict triggers exclusion (9999 penalty)', () => {
        const date = new LunchLotteryDate('2025-09-01');
        const tConflict = new LunchLotteryTable(2);
        const tOk = new LunchLotteryTable(2);
        tConflict.assign(makeSubmission({preferredLanguage: 'en', organizationIds: ['orgX1']}));
        tOk.assign(makeSubmission({preferredLanguage: 'en', organizationIds: ['orgY1']}));
        date.addTable(tConflict); // index 0
        date.addTable(tOk); // index 1

        // New submission shares same trimmed org prefix 'orgX' with tConflict seat (orgX1 vs orgX2)
        const submission = makeSubmission({organizationIds: ['orgX2']});
        const [distance, tableIndex] = date.getShortestDistance(submission);
        assert.strictEqual(tableIndex, 1, 'should avoid conflicting organization table');
        // Confirm distance is not huge (should be normal for the second table)
        assert.isBelow(distance, 1000);
    });
});

suite('LunchLotteryEvent.getShortestDistance (integration)', () => {
    function makeSubmission(overrides = {}) {
        return Object.assign(
            {
                possibleDates: ['2025-09-02'],
                preferredLanguage: 'en',
                organizationIds: ['org1A'],
            },
            overrides,
        );
    }

    test('skips date not in possibleDates (distance 9999) and selects valid date', () => {
        const event = new LunchLotteryEvent();
        const date1 = new LunchLotteryDate('2025-09-01');
        date1.addTable(new LunchLotteryTable(3)); // will yield 9999 because date not possible
        const date2 = new LunchLotteryDate('2025-09-02');
        date2.addTable(new LunchLotteryTable(3)); // empty table distance: 0 + 100 = 100
        event.addDate(date1);
        event.addDate(date2);

        const submission = makeSubmission();
        const [distance, tableIndex, dateIndex] = event.getShortestDistance(submission);
        assert.strictEqual(distance, 100);
        assert.strictEqual(dateIndex, 1);
        assert.strictEqual(tableIndex, 0);
    });

    test('avoids organization conflict on one date choosing alternative date', () => {
        const event = new LunchLotteryEvent();
        const dateA = new LunchLotteryDate('2025-09-02');
        const tableA = new LunchLotteryTable(2);
        tableA.assign(makeSubmission({organizationIds: ['deptZ1'], preferredLanguage: 'en'}));
        dateA.addTable(tableA);

        const dateB = new LunchLotteryDate('2025-09-02');
        const tableB = new LunchLotteryTable(2);
        tableB.assign(makeSubmission({organizationIds: ['deptY1'], preferredLanguage: 'en'}));
        dateB.addTable(tableB);

        // Intentionally add both dates (same identifier) to simulate scenario; both are valid
        event.addDate(dateA);
        event.addDate(dateB);

        // The new submission conflicts with deptZ (deptZ1 vs deptZ2) so first date table distance huge
        const submission = makeSubmission({organizationIds: ['deptZ2']});
        const [distance, tableIndex, dateIndex] = event.getShortestDistance(submission);
        assert.strictEqual(dateIndex, 1, 'should pick second date without org conflict');
        assert.strictEqual(tableIndex, 0);
        assert.isBelow(distance, 1000);
    });
});

suite('LunchLotteryTable.getShortestDistance (organization penalty)', () => {
    function makeSubmission(overrides = {}) {
        return Object.assign(
            {
                possibleDates: ['2025-09-01'],
                preferredLanguage: 'en',
                organizationIds: ['orgBASE1'],
            },
            overrides,
        );
    }

    test('adds 9999 penalty when organization IDs share same trimmed prefix', () => {
        const table = new LunchLotteryTable(2);
        // Existing seat at table
        table.assign(makeSubmission({organizationIds: ['orgX1'], preferredLanguage: 'en'}));

        const noConflictSubmission = makeSubmission({organizationIds: ['orgY1']}); // trimmed orgY
        const conflictSubmission = makeSubmission({organizationIds: ['orgX2']}); // trimmed orgX -> conflict

        const [distanceNoConflict] = table.getShortestDistance(noConflictSubmission);
        const [distanceConflict] = table.getShortestDistance(conflictSubmission);

        // Baseline occupancy distance should be identical except for the 9999 penalty
        assert.strictEqual(
            distanceConflict - distanceNoConflict,
            9999,
            'organization conflict should add 9999',
        );
        assert.isAbove(distanceConflict, 5000, 'conflict distance should be very large');
        assert.isBelow(distanceNoConflict, 1000, 'non-conflict distance should stay small');
    });

    test('ignores last digit when comparing organization IDs (prefix match causes penalty)', () => {
        const table = new LunchLotteryTable(4);
        table.assign({
            possibleDates: ['2025-09-01'],
            preferredLanguage: 'en',
            organizationIds: ['orgABC7'],
        });

        const diffLastDigitConflict = {
            possibleDates: ['2025-09-01'],
            preferredLanguage: 'en',
            organizationIds: ['orgABC3'], // same prefix orgABC -> should conflict
        };
        const differentPrefixNoConflict = {
            possibleDates: ['2025-09-01'],
            preferredLanguage: 'en',
            organizationIds: ['orgABD7'], // different prefix orgABD -> no conflict
        };

        const [distanceConflict] = table.getShortestDistance(diffLastDigitConflict);
        const [distanceNoConflict] = table.getShortestDistance(differentPrefixNoConflict);

        // Base occupancy & language identical, only organization penalty differs
        assert.strictEqual(
            distanceConflict - distanceNoConflict,
            9999,
            'matching trimmed prefix should add 9999 even if last digit differs',
        );
    });
});
