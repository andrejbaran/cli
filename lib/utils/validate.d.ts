import { Op } from '../types';
export declare const isValidOpName: ({ name }: Op) => boolean;
export declare const validateEmail: (email: string) => boolean;
export declare const validatePasswordFormat: (input: string) => true | "❗ This password is too short, please choose a password that is at least 8 characters long";
export declare const validateCpassword: (input: string, answers: {
    password: string;
}) => string | boolean;
