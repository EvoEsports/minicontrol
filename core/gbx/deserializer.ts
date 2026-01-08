import sax from "sax";
import dateFormatter from "xmlrpc/lib/date_formatter.js";

/**
 * Reusable XML-RPC deserializer using non-streaming sax.parser().
 * Unlike the xmlrpc library's Deserializer which creates a new sax stream each time,
 * this class can be reset and reused to avoid GC pressure.
 */
export default class Deserializer {
    type: string | null = null;
    responseType: string | null = null;
    stack: any[] = [];
    marks: number[] = [];
    data: string[] = [];
    methodname: string | null = null;
    value: boolean = false;
    error: Error | null = null;
    callback: ((error: Error | null, result?: any[]) => void) | null = null;
    private parser: sax.SAXParser;

    constructor() {
        this.parser = sax.parser(true);
        this.parser.onopentag = this.onOpentag.bind(this);
        this.parser.onclosetag = this.onClosetag.bind(this);
        this.parser.ontext = this.onText.bind(this);
        this.parser.oncdata = this.onCDATA.bind(this);
        this.parser.onerror = this.onError.bind(this);
    }

    reset() {
        this.type = null;
        this.responseType = null;
        this.stack.length = 0;
        this.marks.length = 0;
        this.data.length = 0;
        this.methodname = null;
        this.value = false;
        this.error = null;
        this.callback = null;
        // Reset parser state for reuse
        this.parser.resume();
    }

    parse(xml: string, callback: (error: Error | null, result?: any[]) => void) {
        this.reset();
        this.callback = callback;
        try {
            this.parser.write(xml).close();
            this.onDone();
        } catch (e: any) {
            this.onError(e);
        }
    }

    private onDone() {
        if (!this.error && this.callback) {
            if (this.type === null || this.marks.length) {
                this.callback(new Error('Invalid XML-RPC message'));
            } else if (this.responseType === 'fault') {
                const fault = this.stack[0];
                const error: any = new Error('XML-RPC fault' + (fault.faultString ? ': ' + fault.faultString : ''));
                error.code = fault.faultCode;
                error.faultCode = fault.faultCode;
                error.faultString = fault.faultString;
                this.callback(error);
            } else {
                this.callback(null, this.stack);
            }
        }
    }

    private onError(err: any) {
        if (!this.error) {
            this.error = typeof err === 'string' ? new Error(err) : err;
            this.callback?.(this.error);
        }
    }

    private push(value: any) {
        this.stack.push(value);
    }

    private onOpentag(node: sax.Tag | sax.QualifiedTag) {
        const name = node.name.toUpperCase();
        if (name === 'ARRAY' || name === 'STRUCT') {
            this.marks.push(this.stack.length);
        }
        this.data.length = 0;
        this.value = (name === 'VALUE');
    }

    private onText(text: string) {
        this.data.push(text);
    }

    private onCDATA(cdata: string) {
        this.data.push(cdata);
    }

    private onClosetag(el: string) {
        const data = this.data.join('');
        const tag = el.toUpperCase();
        try {
            switch (tag) {
                case 'BOOLEAN':
                    if (data === '1') this.push(true);
                    else if (data === '0') this.push(false);
                    else throw new Error(`Illegal boolean value '${data}'`);
                    this.value = false;
                    break;
                case 'INT':
                case 'I4': {
                    const val = parseInt(data, 10);
                    if (isNaN(val)) throw new Error(`Expected an integer but got '${data}'`);
                    this.push(val);
                    this.value = false;
                    break;
                }
                case 'I8': {
                    if (!/^-?\d+$/.test(data)) throw new Error(`Expected integer (I8) value but got '${data}'`);
                    this.push(data);
                    this.value = false;
                    break;
                }
                case 'DOUBLE': {
                    const val = parseFloat(data);
                    if (isNaN(val)) throw new Error(`Expected a double but got '${data}'`);
                    this.push(val);
                    this.value = false;
                    break;
                }
                case 'STRING':
                case 'NAME':
                    this.push(data);
                    this.value = false;
                    break;
                case 'ARRAY': {
                    const mark = this.marks.pop()!;
                    this.stack.splice(mark, this.stack.length - mark, this.stack.slice(mark));
                    this.value = false;
                    break;
                }
                case 'STRUCT': {
                    const mark = this.marks.pop()!;
                    const struct: Record<string, any> = {};
                    const items = this.stack.slice(mark);
                    for (let i = 0; i < items.length; i += 2) {
                        struct[items[i]] = items[i + 1];
                    }
                    this.stack.splice(mark, this.stack.length - mark, struct);
                    this.value = false;
                    break;
                }
                case 'BASE64':
                    this.push(Buffer.from(data, 'base64'));
                    this.value = false;
                    break;
                case 'DATETIME.ISO8601':
                    this.push(dateFormatter.decodeIso8601(data));
                    this.value = false;
                    break;
                case 'VALUE':
                    if (this.value) {
                        this.push(data);
                        this.value = false;
                    }
                    break;
                case 'PARAMS':
                    this.responseType = 'params';
                    break;
                case 'FAULT':
                    this.responseType = 'fault';
                    break;
                case 'METHODRESPONSE':
                    this.type = 'methodresponse';
                    break;
                case 'METHODNAME':
                    this.methodname = data;
                    break;
                case 'METHODCALL':
                    this.type = 'methodcall';
                    break;
                case 'NIL':
                    this.push(null);
                    this.value = false;
                    break;
                case 'DATA':
                case 'PARAM':
                case 'MEMBER':
                    // Ignored by design
                    break;
                default:
                    this.onError(`Unknown XML-RPC tag '${el}'`);
                    break;
            }
        } catch (e) {
            this.onError(e);
        }
    }
}