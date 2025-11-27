/**
 * Replaces placeholders like {{key}} with HTML templates
 * @param {string} text - Text with placeholders
 * @param {object} replacements - Object with placeholder replacements
 * @returns {Array} Array of strings and templates for Lit to render
 */
export function replacePlaceholders(text, replacements) {
    const parts = [];
    const regex = /{{(\w+)}}/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
        }

        const key = match[1];
        parts.push(replacements[key] || match[0]);

        lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }

    return parts;
}
