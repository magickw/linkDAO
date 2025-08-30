declare module 'csv-parser' {
  import { Transform } from 'stream';

  interface CsvParserOptions {
    separator?: string;
    quote?: string;
    escape?: string;
    newline?: string;
    headers?: boolean | string[];
    skipEmptyLines?: boolean;
    skipLinesWithError?: boolean;
    maxRowBytes?: number;
    strict?: boolean;
    raw?: boolean;
  }

  function csvParser(options?: CsvParserOptions): Transform;
  export = csvParser;
}