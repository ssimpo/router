import EventEmitterNode from "events";
import Private from "@simpo/private";
import {makeArray} from "../array";
import isSymbol from "lodash/isSymbol";

export default class Event {}

export class EventEmitter extends EventEmitterNode {
	addListener(eventNames, listener) {
		return this.bindEmitterAction(eventNames, 'addListener', listener);
	}

	bindEmitterAction(eventNames, action, ...params) {
		makeArray(eventNames).forEach(eventName=>super[action](eventName, ...params));
		return this;
	}

	emit(eventNames, ...params) {
		return this.bindEmitterAction(eventNames, 'emit', ...params);
	}

	mirror(eventNames, source) {
		let listeners = [];
		makeArray(eventNames).forEach(eventName=>{
			const listener = (...params)=>this.emit(eventName, ...params);
			source.on(eventName, listener);
			listeners.push([eventName, listener]);
		});

		return ()=>{
			listeners.forEach(([eventName, listener])=>source.removeListener(eventName, listener));
			listeners = [];
		}
	}

	mirrorTo(eventNames, destination) {
		let listeners = [];
		makeArray(eventNames).forEach(eventName=>{
			const listener = (...params)=>destination.emit(eventName, ...params);
			this.on(eventName, listener);
			listeners.push([eventName, listener]);
		});

		return ()=>{
			listeners.forEach(([eventName, listener])=>source.removeListener(eventName, listener));
			listeners = [];
		}
	}

	on(eventNames, listener) {
		return this.bindEmitterAction(eventNames, 'on', listener);
	}

	once(eventNames, listener) {
		return this.bindEmitterAction(eventNames, 'once', listener);
	}

	off(eventNames, listener) {
		return this.bindEmitterAction(eventNames, 'off', listener);
	}

	prependListener(eventNames, listener) {
		return this.bindEmitterAction(eventNames, 'prependListener', listener);
	}

	prependOnceListener(eventNames, listener) {
		return this.bindEmitterAction(eventNames, 'prependOnceListener', listener);
	}
}