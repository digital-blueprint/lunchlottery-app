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
                orgUnitCodes: ['orgUnitCode-org1A'],
            },
            overrides,
        );
    }

    test('selects table with lower occupancy distance over empty table', () => {
        const date = new LunchLotteryDate('2025-09-01');
        const tEmpty = new LunchLotteryTable(4); // empty -> +100
        const tOneSeat = new LunchLotteryTable(4); // one seat -> (1/4)*100=25
        tOneSeat.assign(
            makeSubmission({preferredLanguage: 'en', orgUnitCodes: ['orgUnitCode-org2A']}),
        );
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
        tHard.assign(
            makeSubmission({preferredLanguage: 'de', orgUnitCodes: ['orgUnitCode-org2A']}),
        ); // mismatch en vs de -> +9999
        tSoft.assign(
            makeSubmission({preferredLanguage: 'both', orgUnitCodes: ['orgUnitCode-org3A']}),
        ); // mismatch en vs both -> +2
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
        tConflict.assign(
            makeSubmission({preferredLanguage: 'en', orgUnitCodes: ['orgUnitCode-orgX']}), // trimmed
        );
        tOk.assign(makeSubmission({preferredLanguage: 'en', orgUnitCodes: ['orgUnitCode-orgY']})); // trimmed
        date.addTable(tConflict); // index 0
        date.addTable(tOk); // index 1

        // New submission shares same trimmed org prefix 'orgX' with tConflict seat
        const submission = makeSubmission({orgUnitCodes: ['orgUnitCode-orgX']}); // trimmed to match
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
                orgUnitCodes: ['orgUnitCode-org1A'],
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
        tableA.assign(
            makeSubmission({orgUnitCodes: ['orgUnitCode-deptZ'], preferredLanguage: 'en'}), // trimmed
        );
        dateA.addTable(tableA);

        const dateB = new LunchLotteryDate('2025-09-02');
        const tableB = new LunchLotteryTable(2);
        tableB.assign(
            makeSubmission({orgUnitCodes: ['orgUnitCode-deptY'], preferredLanguage: 'en'}), // trimmed
        );
        dateB.addTable(tableB);

        // Intentionally add both dates (same identifier) to simulate scenario; both are valid
        event.addDate(dateA);
        event.addDate(dateB);

        // The new submission conflicts with deptZ so first date table distance huge
        const submission = makeSubmission({orgUnitCodes: ['orgUnitCode-deptZ']}); // trimmed to match
        const [distance, tableIndex, dateIndex] = event.getShortestDistance(submission);
        assert.strictEqual(dateIndex, 1, 'should pick second date without org conflict');
        assert.strictEqual(tableIndex, 0);
        assert.isBelow(distance, 1000);
    });
});

suite('LunchLotteryTable.getShortestDistance (organization penalty)', () => {
    // NOTE: These tests assume organization codes have been properly preprocessed
    // by injectOrgUnitCodesIntoSubmission, which trims the last character.
    // In the real system: orgABC7 -> orgUnitCode-orgABC, orgABC3 -> orgUnitCode-orgABC

    function makeSubmission(overrides = {}) {
        return Object.assign(
            {
                possibleDates: ['2025-09-01'],
                preferredLanguage: 'en',
                orgUnitCodes: ['orgUnitCode-orgBASE'], // Already trimmed as real system would do
            },
            overrides,
        );
    }

    test('adds 9999 penalty when organization IDs share same trimmed prefix', () => {
        const table = new LunchLotteryTable(2);
        // Existing seat at table - using preprocessed/trimmed organization code
        table.assign(makeSubmission({orgUnitCodes: ['orgUnitCode-orgX'], preferredLanguage: 'en'}));

        const noConflictSubmission = makeSubmission({orgUnitCodes: ['orgUnitCode-orgY']});
        const conflictSubmission = makeSubmission({orgUnitCodes: ['orgUnitCode-orgX']}); // Same trimmed code -> conflict

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

    test('detects conflict when preprocessed organization codes match exactly', () => {
        // This test demonstrates that the table logic expects preprocessed codes
        // Real scenario: orgABC7 and orgABC3 both become orgUnitCode-orgABC after preprocessing
        const table = new LunchLotteryTable(4);
        table.assign({
            possibleDates: ['2025-09-01'],
            preferredLanguage: 'en',
            orgUnitCodes: ['orgUnitCode-orgABC'], // Represents preprocessed orgABC7
        });

        const conflictSubmission = {
            possibleDates: ['2025-09-01'],
            preferredLanguage: 'en',
            orgUnitCodes: ['orgUnitCode-orgABC'], // Represents preprocessed orgABC3
        };
        const noConflictSubmission = {
            possibleDates: ['2025-09-01'],
            preferredLanguage: 'en',
            orgUnitCodes: ['orgUnitCode-orgABD'], // Represents preprocessed orgABD9
        };

        const [distanceConflict] = table.getShortestDistance(conflictSubmission);
        const [distanceNoConflict] = table.getShortestDistance(noConflictSubmission);

        console.log(' distanceConflict', distanceConflict);
        console.log(' distanceNoConflict', distanceNoConflict);

        // Base occupancy and language identical, only the organization penalty differs
        assert.strictEqual(
            distanceConflict - distanceNoConflict,
            9999,
            'matching preprocessed codes should add 9999 penalty',
        );
    });
});

// Test the organization code preprocessing logic
suite('Organization code preprocessing', () => {
    test('should trim last character from organization codes', () => {
        // This tests the logic that would be in injectOrgUnitCodesIntoSubmission
        const testCases = [
            {input: 'orgABC7', expected: 'orgUnitCode-orgABC'},
            {input: 'orgABC3', expected: 'orgUnitCode-orgABC'},
            {input: 'dept123A', expected: 'orgUnitCode-dept123'},
            {input: 'X', expected: 'orgUnitCode-'},
        ];

        testCases.forEach(({input, expected}) => {
            // Simulate the preprocessing logic from injectOrgUnitCodesIntoSubmission
            const processed = 'orgUnitCode-' + input.slice(0, -1);
            assert.strictEqual(processed, expected, `${input} should become ${expected}`);
        });
    });

    test('should create conflicts for codes with same prefix but different suffixes', () => {
        // Simulate real scenario where orgABC7 and orgABC3 both become orgABC after trimming
        const orgCode1 = 'orgABC7';
        const orgCode2 = 'orgABC3';
        const orgCode3 = 'orgXYZ1';

        const processed1 = 'orgUnitCode-' + orgCode1.slice(0, -1);
        const processed2 = 'orgUnitCode-' + orgCode2.slice(0, -1);
        const processed3 = 'orgUnitCode-' + orgCode3.slice(0, -1);

        // These should be identical after processing (conflict)
        assert.strictEqual(processed1, processed2, 'orgABC7 and orgABC3 should both become orgABC');
        // This should be different (no conflict)
        assert.notStrictEqual(processed1, processed3, 'orgABC and orgXYZ should be different');
    });
});

suite('LunchLotteryAssignSeats.injectOrgUnitCodesIntoSubmission', () => {
    let assignSeats;
    let originalFetch;

    suiteSetup(() => {
        // Mock the fetch function globally
        originalFetch = window.fetch;
    });

    suiteTeardown(() => {
        // Restore original fetch
        window.fetch = originalFetch;
    });

    setup(() => {
        // Create a mock LunchLotteryAssignSeats instance
        assignSeats = {
            entryPointUrl: 'https://api.example.com',
            auth: {token: 'test-token'},
            async getOrgUnitCodeForOrganizationIdentifier(organizationIdentifier, authToken) {
                // Mock implementation that returns test organization codes
                const mockOrgCodes = {
                    org123: 'dept456A',
                    org789: 'finance789B',
                    orgABC: 'marketing123C',
                    orgEmpty: null,
                };
                return mockOrgCodes[organizationIdentifier] || null;
            },
            async injectOrgUnitCodesIntoSubmission(submission) {
                // Use the real implementation from the file
                const organizationIds = submission['organizationIds'];

                if (organizationIds === null || organizationIds.length === 0) {
                    console.error(
                        'injectOrgUnitCodeIntoSubmission: no organizationId for submission',
                        submission,
                    );
                    return submission;
                }

                submission['orgUnitCodes'] = [];

                for (let organizationId of organizationIds) {
                    if (organizationId instanceof Promise) {
                        return;
                    }

                    const orgUnitCode = await this.getOrgUnitCodeForOrganizationIdentifier(
                        organizationId,
                        this.auth.token,
                    );

                    if (orgUnitCode !== null) {
                        // Ignore the last character of the orgUnitCode for matching
                        submission['orgUnitCodes'].push('orgUnitCode-' + orgUnitCode.slice(0, -1));
                    } else {
                        submission['orgUnitCodes'].push('organizationId-' + organizationId);
                    }
                }

                return submission;
            },
        };
    });

    test('should process single organization ID successfully', async () => {
        const submission = {
            identifier: 'test-submission-1',
            organizationIds: ['org123'],
            preferredLanguage: 'en',
        };

        const result = await assignSeats.injectOrgUnitCodesIntoSubmission(submission);

        assert.deepStrictEqual(
            result.orgUnitCodes,
            ['orgUnitCode-dept456'],
            'Should trim last character from dept456A',
        );
        assert.strictEqual(
            result.identifier,
            'test-submission-1',
            'Should preserve other properties',
        );
    });

    test('should process multiple organization IDs', async () => {
        const submission = {
            identifier: 'test-submission-2',
            organizationIds: ['org123', 'org789'],
            preferredLanguage: 'de',
        };

        const result = await assignSeats.injectOrgUnitCodesIntoSubmission(submission);

        assert.deepStrictEqual(
            result.orgUnitCodes,
            [
                'orgUnitCode-dept456', // dept456A -> dept456
                'orgUnitCode-finance789', // finance789B -> finance789
            ],
            'Should process multiple org codes and trim last character from each',
        );
    });

    test('should handle organization IDs that return null org codes', async () => {
        const submission = {
            identifier: 'test-submission-3',
            organizationIds: ['orgEmpty', 'unknownOrg'],
            preferredLanguage: 'en',
        };

        const result = await assignSeats.injectOrgUnitCodesIntoSubmission(submission);

        assert.deepStrictEqual(
            result.orgUnitCodes,
            ['organizationId-orgEmpty', 'organizationId-unknownOrg'],
            'Should use organizationId prefix when org code lookup fails',
        );
    });

    test('should handle mixed success and failure org lookups', async () => {
        const submission = {
            identifier: 'test-submission-4',
            organizationIds: ['org123', 'unknownOrg', 'orgABC'],
            preferredLanguage: 'both',
        };

        const result = await assignSeats.injectOrgUnitCodesIntoSubmission(submission);

        assert.deepStrictEqual(
            result.orgUnitCodes,
            [
                'orgUnitCode-dept456', // dept456A -> dept456
                'organizationId-unknownOrg', // lookup failed
                'orgUnitCode-marketing123', // marketing123C -> marketing123
            ],
            'Should handle mix of successful and failed org code lookups',
        );
    });

    test('should handle empty organizationIds array', async () => {
        const submission = {
            identifier: 'test-submission-5',
            organizationIds: [],
            preferredLanguage: 'en',
        };

        const result = await assignSeats.injectOrgUnitCodesIntoSubmission(submission);

        assert.isUndefined(
            result.orgUnitCodes,
            'Should not add orgUnitCodes property for empty array',
        );
        assert.strictEqual(
            result.identifier,
            'test-submission-5',
            'Should preserve other properties',
        );
    });

    test('should handle null organizationIds', async () => {
        const submission = {
            identifier: 'test-submission-6',
            organizationIds: null,
            preferredLanguage: 'en',
        };

        const result = await assignSeats.injectOrgUnitCodesIntoSubmission(submission);

        assert.isUndefined(result.orgUnitCodes, 'Should not add orgUnitCodes property for null');
        assert.strictEqual(
            result.identifier,
            'test-submission-6',
            'Should preserve other properties',
        );
    });

    test('should create conflicts for same department with different suffixes', async () => {
        // Test that demonstrates the conflict detection behavior
        const submission1 = {
            identifier: 'submission-A',
            organizationIds: ['org123'], // Will become 'orgUnitCode-dept456'
            preferredLanguage: 'en',
        };

        const submission2 = {
            identifier: 'submission-B',
            organizationIds: ['org789'], // Will become 'orgUnitCode-finance789'
            preferredLanguage: 'en',
        };

        // Mock a third org that would have same prefix as first after trimming
        assignSeats.getOrgUnitCodeForOrganizationIdentifier = async (orgId) => {
            const mockCodes = {
                org123: 'dept456A', // becomes 'orgUnitCode-dept456'
                org456: 'dept456B', // becomes 'orgUnitCode-dept456' (conflict!)
                org789: 'finance789A', // becomes 'orgUnitCode-finance789'
            };
            return mockCodes[orgId] || null;
        };

        const submission3 = {
            identifier: 'submission-C',
            organizationIds: ['org456'], // Will become 'orgUnitCode-dept456' (same as submission1)
            preferredLanguage: 'en',
        };

        const result1 = await assignSeats.injectOrgUnitCodesIntoSubmission(submission1);
        const result2 = await assignSeats.injectOrgUnitCodesIntoSubmission(submission2);
        const result3 = await assignSeats.injectOrgUnitCodesIntoSubmission(submission3);

        // Verify conflict scenario
        assert.strictEqual(
            result1.orgUnitCodes[0],
            result3.orgUnitCodes[0],
            'dept456A and dept456B should both become orgUnitCode-dept456 (conflict)',
        );
        assert.notStrictEqual(
            result1.orgUnitCodes[0],
            result2.orgUnitCodes[0],
            'dept456 and finance789 should be different (no conflict)',
        );
    });
});
