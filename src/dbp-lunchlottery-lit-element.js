import {createInstance} from './i18n.js';
import DBPLitElement from '@dbp-toolkit/common/dbp-lit-element';
import {send} from '@dbp-toolkit/common/notification';
import {AuthMixin, LangMixin} from '@dbp-toolkit/common';

export default class DBPLunchlotteryLitElement extends LangMixin(AuthMixin(DBPLitElement), createInstance) {
    constructor() {
        super();
        this._initialized = false;
    }

    loginCallback() {
        if (!this._initialized) {
            this.initialize();
            this._initialized = true;
        }
    }

    initialize() {}

    handleErrorResponse(response) {
        switch (response.status) {
            case 401:
                send({
                    summary: this._i18n.t('errors.unauthorized-title'),
                    body: this._i18n.t('errors.unauthorized-body'),
                    type: 'danger',
                    timeout: 5
                });
                break;
            case 403:
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
            case 422: // unprocessable entity
                send({
                    summary: this._i18n.t('errors.unprocessable_entity-title'),
                    body: this._i18n.t('errors.unprocessable_entity-body'),
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
        //throw new Error(response);
    }

    async httpGetAsync(url, options) {
        let response = await fetch(url, options)
            .then((result) => {
                if (!result.ok) throw result;
                return result;
            })
            .catch((error) => {
                return error;
            });

        return response;
    }
}