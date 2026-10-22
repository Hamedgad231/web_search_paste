import { serializeDate, serializeDateTime } from "@web/core/l10n/dates";
import { _t } from "@web/core/l10n/translation";
import { registry } from "@web/core/registry";
import { patch } from "@web/core/utils/patch";
import { SearchBar } from "@web/search/search_bar/search_bar";

const parsers = registry.category("parsers");

// Text and relational fields match the whole value, without case: "=ilike" without wildcard
const TEXT_FIELDS = ["char", "html", "many2many", "many2one", "one2many", "text"];
const UNSUPPORTED_FIELDS = ["boolean", "properties", "tags"];
const LABEL_MAX_VALUES = 3;

let nextPastedItemId = 1_000_000_000;

/**
 * @param {string} text
 * @param {RegExp} separator
 * @returns {string[]} the distinct non empty values
 */
function splitValues(text, separator) {
    const values = text
        .split(separator)
        .map((value) => value.trim())
        .filter(Boolean);
    return [...new Set(values)];
}

/**
 * Cells copied from a spreadsheet are separated by tabs (columns) and new lines (rows).
 * @param {string} text
 * @returns {string[]} the distinct non empty cells
 */
export function splitPastedText(text) {
    return splitValues(text, /\r\n|\r|\n|\t/);
}

/**
 * Values typed in the search bar are separated by commas (latin or arabic).
 * @param {string} text
 * @returns {string[]} the distinct non empty values
 */
export function splitTypedText(text) {
    return splitValues(text, /[,،]/);
}

patch(SearchBar.prototype, {
    setup() {
        super.setup(...arguments);
        // Values searched at once (pasted cells or typed values separated by commas)
        this.pastedValues = null;
        this.pastedQuery = "";
    },

    /**
     * @param {string[]} values
     * @param {string} query text shown in the search input
     */
    setPastedValues(values, query) {
        this.pastedValues = values;
        this.pastedQuery = query;
    },

    clearPastedValues() {
        this.pastedValues = null;
        this.pastedQuery = "";
    },

    /**
     * Paste of several cells: keep all the values (an input would drop the new lines)
     * and propose the fields to search them in.
     * @param {ClipboardEvent} ev
     */
    onSearchPaste(ev) {
        const values = splitPastedText(ev.clipboardData?.getData("text/plain") || "");
        if (values.length < 2) {
            // One cell: pasted as typed text, so commas still split it (see onSearchInput)
            return;
        }
        ev.preventDefault();
        this.setPastedValues(values, values.join(", "));
        this.inputDropdownState.open();
        this.computeState({ query: this.pastedQuery, expanded: [], subItems: [] });
    },

    onSearchInput(ev) {
        const query = ev.target.value;
        if (!this.pastedValues || query !== this.pastedQuery) {
            const values = splitTypedText(query);
            if (values.length >= 2) {
                this.setPastedValues(values, query);
            } else {
                this.clearPastedValues();
            }
        }
        return super.onSearchInput(...arguments);
    },

    resetState() {
        this.clearPastedValues();
        return super.resetState(...arguments);
    },

    getItems(searchItem, trimmedQuery) {
        if (this.pastedValues) {
            return this.getPastedItems(searchItem);
        }
        return super.getItems(...arguments);
    },

    /**
     * @param {Object} searchItem
     * @returns {Object[]} one item searching all the pasted values in the field, or nothing
     *      when the field can't hold one of them (e.g. a text in a number field)
     */
    getPastedItems(searchItem) {
        if (searchItem.type !== "field") {
            return [];
        }
        const fieldType = this.getFieldType(searchItem);
        if (UNSUPPORTED_FIELDS.includes(fieldType)) {
            return [];
        }
        const operator = searchItem.operator || (TEXT_FIELDS.includes(fieldType) ? "=ilike" : "=");
        const autocompleteValues = [];
        for (const label of this.pastedValues) {
            const value = this.parsePastedValue(label, fieldType, searchItem);
            if (value === undefined) {
                return [];
            }
            autocompleteValues.push({ label, operator, value, isMultiValue: true });
        }
        const shown = this.pastedValues.slice(0, LABEL_MAX_VALUES).join(", ");
        const more = this.pastedValues.length > LABEL_MAX_VALUES ? ", …" : "";
        return [
            {
                id: nextPastedItemId++,
                fieldType,
                searchItemDescription: searchItem.description,
                preposition: this.getPreposition(searchItem),
                searchItemId: searchItem.id,
                label: _t("%(count)s values (%(values)s)", {
                    count: this.pastedValues.length,
                    values: shown + more,
                }),
                pastedValues: autocompleteValues,
            },
        ];
    },

    /**
     * @param {string} label pasted cell
     * @param {string} fieldType
     * @param {Object} searchItem
     * @returns {any} the value to search, undefined if the field can't hold it
     */
    parsePastedValue(label, fieldType, searchItem) {
        if (fieldType === "selection") {
            const lowerLabel = label.toLowerCase();
            const option = this.fields[searchItem.fieldName].selection.find(
                ([key, optionLabel]) => key === label || optionLabel.toLowerCase() === lowerLabel
            );
            return option?.[0];
        }
        if (TEXT_FIELDS.includes(fieldType) || !parsers.contains(fieldType)) {
            return label;
        }
        try {
            const value = parsers.get(fieldType)(label);
            if (fieldType === "date") {
                return serializeDate(value);
            }
            if (fieldType === "datetime") {
                return serializeDateTime(value);
            }
            return value;
        } catch {
            return undefined;
        }
    },

    selectItem(item) {
        if (item.pastedValues) {
            this.env.searchModel.addAutoCompletionValuesBatch(item.searchItemId, item.pastedValues);
            this.inputDropdownState.close();
            this.resetState();
            return;
        }
        return super.selectItem(...arguments);
    },
});
