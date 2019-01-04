import isBoolean from "lodash/isBoolean";
import isString from "lodash/isString";

const xPreFunctionParams = /\)[\s\S]*/;
const xPostFunctionParams = /^.*?\(/;
const paramDefaultMatchers = new Map([['null',null],['undefined',undefined],['true',true],['false',false]]);
const xQuoted = /^(["'])(.*)\1$/;
const xObject = /^\{.*\}$/;
const xArray = /^\[.*\]$/;

const paramCache = new WeakMap();

let getParameters;

function isNumeric(value) {
	return !Number.isNaN(parseFloat(value)) && isFinite(value);
}

function replaceSequence(txt, sequence) {
	let _sequence = (sequence?sequence:txt);

	let _replaceSequence = txt=>{
		let _txt = (isString(txt) ? txt : txt.toString());
		_sequence.forEach(operation=>{
			_txt = _txt.replace(operation[0], operation[1] || '');
		});
		return _txt;
	};

	return (sequence?_replaceSequence(txt):_replaceSequence)
}

export function parseParameters(func, evaluate=true) {
	getParameters = getParameters || replaceSequence([[xPreFunctionParams],[xPostFunctionParams]]);
	if (paramCache.has(func)) return paramCache.get(func);

	const defaults = new Map();
	const params = getParameters(func).split(',')
		.map(param=>param.trim())
		.map(param=>{
			const [paramName, defaultValue] = param.split('=').map(item=>item.trim());
			if (defaultValue) {
				if (xQuoted.test(defaultValue)) {
					const _defaultValue = xQuoted.exec(defaultValue)[2];
					defaults.set(paramName, ()=>()=>_defaultValue);
				} else if (paramDefaultMatchers.has(defaultValue)) {
					const _defaultValue = paramDefaultMatchers.get(defaultValue);
					defaults.set(paramName, ()=>_defaultValue);
				} else if (isNumeric(defaultValue)) {
					if (defaultValue.indexOf('.') !== -1) {
						const _defaultValue = parseFloat(defaultValue);
						defaults.set(paramName, ()=>_defaultValue);
					} else {
						const _defaultValue = parseInt(defaultValue, 10);
						defaults.set(paramName, ()=>_defaultValue);
					}
				} else if (xArray.test(defaultValue) || xObject.test(defaultValue)) {
					defaults.set(paramName, ()=>JSON.parse(defaultValue));
				} else {
					defaults.set(paramName, ()=>defaultValue);
				}
			}
			return paramName;
		});

	if (!evaluate) return [params, defaults];
	params.defaults = defaults;
	paramCache.set(func, params);
	return params;
}