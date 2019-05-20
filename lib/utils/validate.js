"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validChars = /^[a-zA-Z0-9-_]+$/;
exports.isValidOpName = ({ name }) => typeof name === 'string' && validChars.test(name);
// RFCC 5322 official standard to validate emails
exports.validateEmail = (email) => {
    return /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email);
};
exports.validatePasswordFormat = (input) => {
    if (input.length < 8)
        return `❗ This password is too short, please choose a password that is at least 8 characters long`;
    return true;
};
exports.validateCpassword = (input, answers) => {
    if (input !== answers.password) {
        return `❗ Password doesn't match, please try again.`;
    }
    return true;
};
