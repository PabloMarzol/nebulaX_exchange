export type RawArgs = {
    [key: string]: string | undefined;
} & {
    _: string[];
};
export type ParseOptions = {
    /**
     * Consider these keys as flags (no value expected).
     * Value going after a flag will be treated as a positional argument.
     */
    flags?: string[];
};
/**
 * Parse command-line arguments into a key-value object.
 * Does not transform values.
 */
export declare function parseArgs(args: string[], options?: ParseOptions): RawArgs;
export interface TransformOptions {
    /**
     * Transform rule for flags (keys without values).
     * @value `undefined`
     * @default "true"
     */
    flag?: "true" | "false" | ((key: string) => "true" | "false");
    /**
     * Transform rule for null values.
     * @value `"null"` (case insensitive)
     * @default "null"
     */
    null?: "null" | "string" | ((key: string, value: string) => "null" | "string");
    /**
     * Transform rule for boolean values.
     * @value `"true"`, `"false"` (case insensitive)
     * @default "bool"
     */
    bool?: "bool" | "string" | ((key: string, value: string) => "bool" | "string");
    /**
     * Transform rule for hexadecimal values.
     * @value `"0xff"`, `"0X1A"` (case insensitive) (0x prefix required)
     * @default "string"
     */
    hex?: "string" | "number" | ((key: string, value: string) => "string" | "number");
    /**
     * Transform rule for special numeric values.
     * @value `"Infinity"`, `"-Infinity"`, `"NaN"`, `"-NaN"` (case insensitive)
     * @default "string"
     */
    specialNumber?: "string" | "number" | ((key: string, value: string) => "string" | "number");
    /**
     * Transform rule for numeric values.
     * @value `"123"`, `"12.3"`, `"1e+2"`, `"+123"`, `"-123"` (anything that can be parsed by `Number(value)`) (excludes hex values)
     * @default "number"
     */
    number?: "number" | "string" | ((key: string, value: string) => "number" | "string");
    /**
     * Transform rule for JSON object/array values.
     * @value `"{ \"a\": 1 }"`, `"[invalid array string]"` (anything that begins with `{` and ends with `}` or begins with `[` and ends with `]`)
     * @default "object"
     */
    json?: "object" | "string" | ((key: string, value: string) => "object" | "string");
}
export interface Args {
    [key: string]: string | number | boolean | null | Record<string, unknown> | unknown[];
    _: string[];
}
/**
 * Transform raw args (string values) into typed args based on rules.
 *
 * Order of transformation:
 * 1. flag (`undefined`)
 * 2. null (`"null"`)
 * 3. boolean (`"true"`, `"false"`)
 * 4. hex (`"0x..."`)
 * 5. special number (`"Infinity"`, `"-Infinity"`, `"NaN", "-NaN"`)
 * 6. number (numeric strings)
 * 7. json (object/array strings)
 * 8. string (default)
 */
export declare function transformArgs(args: RawArgs, options?: TransformOptions): Args;
//# sourceMappingURL=_utils.d.ts.map