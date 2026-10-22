import { Domain } from "@web/core/domain";
import { patch } from "@web/core/utils/patch";
import { SearchModel } from "@web/search/search_model";

patch(SearchModel.prototype, {
    /**
     * Same as addAutoCompletionValues, for several values of one field at once: they are
     * combined with OR in one facet and the search is only done once.
     * @param {number} searchItemId
     * @param {Object[]} autocompleteValues list of { label, operator, value }
     */
    addAutoCompletionValuesBatch(searchItemId, autocompleteValues) {
        const searchItem = this.searchItems[searchItemId];
        if (!["field", "field_property"].includes(searchItem.type)) {
            return;
        }
        for (const autocompleteValue of autocompleteValues) {
            const exists = this.query.some(
                (queryElem) =>
                    queryElem.searchItemId === searchItemId &&
                    "autocompleteValue" in queryElem &&
                    queryElem.autocompleteValue.value === autocompleteValue.value &&
                    queryElem.autocompleteValue.operator === autocompleteValue.operator
            );
            if (!exists) {
                this.query.push({ searchItemId, autocompleteValue });
            }
        }
        this._notify();
    },

    /**
     * Values searched at once are only searched in the selected field: the filter_domain of
     * the field in the search view (which may search other fields) is not used for them.
     */
    _getFieldDomain(field, autocompleteValues) {
        const multiValues = autocompleteValues.filter((value) => value.isMultiValue);
        if (!multiValues.length || field.type !== "field") {
            return super._getFieldDomain(...arguments);
        }
        const domains = multiValues.map(
            ({ operator, value }) => new Domain([[field.fieldName, operator, value]])
        );
        const otherValues = autocompleteValues.filter((value) => !value.isMultiValue);
        if (otherValues.length) {
            domains.push(super._getFieldDomain(field, otherValues));
        }
        return Domain.or(domains);
    },
});
