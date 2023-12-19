import {assert} from 'chai';

import '../src/dbp-lunchlottery';
import '../src/dbp-lunchlottery-app.js';

suite('dbp-lunchlottery basics', () => {
    let node;

    suiteSetup(async () => {
        node = document.createElement('dbp-lunchlottery');
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
