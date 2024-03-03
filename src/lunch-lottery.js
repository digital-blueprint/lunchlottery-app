export class LunchLotteryEvent {
    constructor() {
        this.dates = [];
        this.unassigned = [];
    }

    addDate(date) {
        this.dates.push(date);
    }

    getShortestDistance(submission) {
        let distance = null;
        let selectedTable = null;
        let selectedDate = null;

        this.dates.forEach((date, index) => {
            const [dateDistance, dateSelectedTable] = date.getShortestDistance(submission);
            if (distance === null || dateDistance < distance) {
                distance = dateDistance;
                selectedTable = dateSelectedTable;
                selectedDate = index;
            }
        });
        return [
            distance,
            selectedTable,
            selectedDate
        ];
    }

    assign(date, table, submission) {
        this.dates[date].assign(table, submission);
    }

    setUnassigned(submissions) {
        this.unassigned = submissions;
    }
}

export class LunchLotteryDate {
    constructor(identifier) {
        this.identifier = identifier;
        this.tables = [];
    }

    addTable(table) {
        this.tables.push(table);
    }

    getShortestDistance(submission) {
        let distance = null;
        let selectedTable = null;

        this.tables.forEach((table, index) => {
            const [tableDistance] = table.getShortestDistance(submission);
            if (distance === null || tableDistance < distance) {
                distance = tableDistance;
                selectedTable = index;
            }
        });

        return [
            distance,
            selectedTable
        ];
    }

    assign(table, submission) {
        this.tables[table].assign(submission);
    }
}

export class LunchLotteryTable {
    constructor(availableSeats) {
        this.availableSeats = availableSeats;
        this.seats = [];
    }

    getShortestDistance(submission) {
        let distance = 0;

        distance += (submission['possibleDates'].length - 1);

        if (this.seats.length === 0) {
            distance += 100;
        } else if (this.seats.length >= this.availableSeats) {
            distance += 9999;
        } else {
            distance += (this.seats.length / this.availableSeats) * 100;
        }

        this.seats.forEach(seat => {
            if (submission['preferredLanguage'] !== seat['preferredLanguage']) {
                if (submission['preferredLanguage'] !== 'both' && seat['preferredLanguage'] !== 'both') {
                    distance += 9999;
                } else {
                    distance += 2;
                }
            }

            submission['organizationIds'].forEach(organizationId => {
                if (seat['organizationIds'].includes(organizationId)) {
                    distance += 9999;
                }
            });
        });

        return [distance];
    }

    assign(submission) {
        this.seats.push(submission);
    }
}
