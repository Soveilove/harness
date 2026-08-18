#!/usr/bin/env node

import { parseArgs } from 'node:util';

const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FORBIDDEN_WORDS = new Set(['i', 'me', 'my', 'we', 'our', 'you', 'your']);
const FORBIDDEN_CHINESE_TERMS = ['我', '我们', '你', '你们', '您', '咱', '咱们'];

const collectDescriptionWords = (description) => {
    const matches = description.toLowerCase().match(/\b\w+\b/g) ?? [];

    return new Set(matches);
};

const collectForbiddenTerms = (description) => {
    const descriptionWords = collectDescriptionWords(description);
    const foundEnglishTerms = [...FORBIDDEN_WORDS].filter((word) => descriptionWords.has(word));
    const foundChineseTerms = FORBIDDEN_CHINESE_TERMS.filter((term) => description.includes(term));

    return [...new Set([...foundEnglishTerms, ...foundChineseTerms])];
};

const validateMetadata = (name, description) => {
    const errors = [];

    if (name.length < 1 || name.length > 64) {
        errors.push(`NAME ERROR: '${name}' is ${name.length} characters. Must be between 1-64.`);
    }

    if (!NAME_PATTERN.test(name)) {
        errors.push(
            `NAME ERROR: '${name}' contains invalid characters. `
            + 'Use only lowercase letters, numbers, and single hyphens. '
            + 'No consecutive hyphens, and cannot start/end with a hyphen.',
        );
    }

    if (description.length > 1024) {
        errors.push(
            `DESCRIPTION ERROR: Description is ${description.length} characters. `
            + 'Must be 1,024 characters or fewer.',
        );
    }

    const foundForbidden = collectForbiddenTerms(description);

    if (foundForbidden.length > 0) {
        errors.push(
            `STYLE WARNING: Description contains first/second person terms: ${JSON.stringify(foundForbidden)}. `
            + "Use third-person imperative (e.g., 'Creates...', 'Updates...').",
        );
    }

    return errors;
};

const main = () => {
    const { values } = parseArgs({
        options: {
            name: {
                type: 'string',
            },
            description: {
                type: 'string',
            },
        },
        strict: true,
        allowPositionals: false,
    });

    if (!values.name || !values.description) {
        process.stderr.write('USAGE ERROR: Missing required --name or --description argument.\n');
        process.exit(1);
    }

    const errors = validateMetadata(values.name, values.description);

    if (errors.length > 0) {
        process.stderr.write(`${errors.join('\n')}\n`);
        process.exit(1);
    }

    process.stdout.write('SUCCESS: Metadata is valid and optimized for discovery.\n');
};

main();