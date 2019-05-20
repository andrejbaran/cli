"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
async function validate(op) {
    if (typeof op.name !== 'string' || !op.name.match('^[a-z0-9_-]*$')) {
        console.log('Op Name must only contain numbers, letters, -, or _');
        process.exit();
    }
}
exports.default = validate;
