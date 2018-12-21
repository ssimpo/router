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
		/*makeArray(eventNames).forEach(eventName=>{
			if (!isSymbol(eventName)) {
				console.log(`${eventName} with ${params[0].constructor.name} on ${this.constructor.name}`);
			}
		});*/
		return this.bindEmitterAction(eventNames, 'emit', ...params);
	}

	mirror(eventNames, source) {
		makeArray(eventNames).forEach(
			eventName=>source.on(eventName, (...params)=>this.emit(eventName, ...params))
		);
	}

	mirrorTo(eventNames, destination) {
		makeArray(eventNames).forEach(
			eventName=>this.on(eventName, (...params)=>destination.emit(eventName, ...params))
		);
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