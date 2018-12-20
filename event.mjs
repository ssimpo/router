import EventEmitterNode from "events";

export default class Event {}


export class EventEmitter extends EventEmitterNode {
	bindEmitterAction(eventNames, action, listener) {
		if (!Array.isArray(eventNames)) return super[action](eventNames, listener);
		eventNames.forEach(eventName=>super[action](eventName, listener));
		return this;
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

	addListener(eventNames, listener) {
		return this.bindEmitterAction(eventNames, 'addListener', listener);
	}

	prependListener(eventNames, listener) {
		return this.bindEmitterAction(eventNames, 'prependListener', listener);
	}

	prependOnceListener(eventNames, listener) {
		return this.bindEmitterAction(eventNames, 'prependOnceListener', listener);
	}
}