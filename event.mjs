import EventEmitterNode from "events";

export default class Event {}

export class EventEmitter extends EventEmitterNode {
	bindEmitterAction(eventNames, action, ...params) {
		if (!Array.isArray(eventNames)) return super[action](eventNames, ...params);
		eventNames.forEach(eventName=>super[action](eventName, ...params));
		return this;
	}

	emit(eventNames, ...params) {
		return this.bindEmitterAction(eventNames, 'emit', ...params);
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

const singletonEmitter = new EventEmitter();

export class SingltonEventEmitter {
	addListener(...params) {
		return singletonEmitter.addListener(...params);
	}

	emit(...params) {
		return singletonEmitter.emit(...params);
	}

	eventNames(...params) {
		return singletonEmitter.eventNames(...params);
	}

	getMaxListeners(...params) {
		return singletonEmitter.getMaxListeners(...params);
	}

	listenerCount(...params) {
		return singletonEmitter.listenerCount(...params);
	}

	listeners(...params) {
		return singletonEmitter.listeners(...params);
	}

	off(...params) {
		return singletonEmitter.off(...params);
	}

	on(...params) {
		return singletonEmitter.on(...params);
	}

	once(...params) {
		return singletonEmitter.once(...params);
	}

	prependListener(...params) {
		return singletonEmitter.prependListener(...params);
	}

	prependOnceListener(...params) {
		return singletonEmitter.prependOnceListener(...params);
	}

	removeAllListeners(...params) {
		return singletonEmitter.removeAllListeners(...params);
	}

	removeListener(...params) {
		return singletonEmitter.removeListener(...params);
	}

	setMaxListeners(...params) {
		return singletonEmitter.setMaxListeners(...params);
	}

	rawListeners(...params) {
		return singletonEmitter.rawListeners(...params);
	}
}