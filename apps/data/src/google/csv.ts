import { camelCase } from 'lodash';
import { parse, unparse } from 'papaparse';
import type { CsvRow, RowError } from './types';

const COLUMN_DELIMITER = ',';

export class ValidationException extends Error {
    messageArr: RowError[];

    constructor(messageArr: RowError[]) {
        super('Validation Errors');
        this.messageArr = messageArr;
    }
}

export const parseCsv = (fileContent: string): CsvRow[] => {
    const { data, errors } = parse<CsvRow>(fileContent, {
        header: true,
        delimiter: COLUMN_DELIMITER,
        skipEmptyLines: true,
        transformHeader(h: string) {
            return camelCase(h.trim());
        },
    });

    if (errors.length > 0) {
        const errorMessage = errors.map((each) => ({
            code: each.code,
            row: each.row ? each.row + 1 : 0,
            originalRow: each.row ? JSON.stringify(data[each.row]) : each.message,
            message: each.message,
        }));
        throw new ValidationException(errorMessage);
    }
    return data;
};

export const parseCsvFile = async (file: File): Promise<CsvRow[]> =>
    new Promise((resolve, reject) => {
        parse<CsvRow>(file, {
            header: true,
            delimiter: COLUMN_DELIMITER,
            skipEmptyLines: true,
            transformHeader(h: string) {
                return camelCase(h.trim());
            },
            complete: (results) => {
                if (results.errors.length > 0) {
                    const errorMessage = results.errors.map((each) => ({
                        code: each.code,
                        row: each.row ? each.row + 1 : 0,
                        originalRow: each.row ? JSON.stringify(results.data[each.row]) : each.message,
                        message: each.message,
                    }));
                    reject(errorMessage);
                }
                resolve(results.data);
            },
        });
    });

export const convertObjectToCsvString = <T>(rows: T[], addHeaders = true): string =>
    unparse<T>(rows, {
        quoteChar: '"',
        escapeChar: '"',
        delimiter: ',',
        header: addHeaders,
        newline: '\n',
    });
