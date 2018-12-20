import EventEmitterNode from "events";
import Private from "@simpo/private";

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

const $private = Private.getInstance();
export class SingltonEventEmitter {
	constructor(options={}) {
		const {$ref=this} = options;
		if (!$private.get($ref, 'singleton')) $private.set($ref, 'singleton', new EventEmitter());
		$private.set(this, '$ref', $ref);
	}

	getSingleton() {
		return $private.get($private.get(this, '$ref'), 'singleton');
	}

	addListener(...params) {
		return this.getSingleton().addListener(...params);
	}

	emit(...params) {
		return this.getSingleton().emit(...params);
	}

	eventNames(...params) {
		return this.getSingleton().eventNames(...params);
	}

	getMaxListeners(...params) {
		return this.getSingleton().getMaxListeners(...params);
	}

	listenerCount(...params) {
		return this.getSingleton().listenerCount(...params);
	}

	listeners(...params) {
		return this.getSingleton().listeners(...params);
	}

	off(...params) {
		return this.getSingleton().off(...params);
	}

	on(...params) {
		return this.getSingleton().on(...params);
	}

	once(...params) {
		return this.getSingleton().once(...params);
	}

	prependListener(...params) {
		return this.getSingleton().prependListener(...params);
	}

	prependOnceListener(...params) {
		return this.getSingleton().prependOnceListener(...params);
	}

	removeAllListeners(...params) {
		return this.getSingleton().removeAllListeners(...params);
	}

	removeListener(...params) {
		return this.getSingleton().removeListener(...params);
	}

	setMaxListeners(...params) {
		return this.getSingleton().setMaxListeners(...params);
	}

	rawListeners(...params) {
		return this.getSingleton().rawListeners(...params);
	}
}