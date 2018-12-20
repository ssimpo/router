import Private from "@simpo/private";
import {getFiles} from "../fs";
import {makeArray} from "../array";
import {sep} from "path";
import flattenDeep from "lodash/flattenDeep";
import isObject from "lodash/isObject";
import isFunction from "lodash/isFunction";
import uniq from "lodash/uniq";
import Event, {EventEmitter} from "./event";
import {parseParameters} from "../function";

const controllerExtensions = ['mjs','js'];
const xControllerName = new RegExp(`\/([^/]*?)\.(?:${controllerExtensions.join('|')})`+'$');
const controllerExtensonsFilter = controllerExtensions.map(ext=>`*.${ext}`);

const $private = Private.getInstance();

export class ControllerEvent extends Event {
	constructor({controller}) {
		super();
		$private.set(this, 'controller', controller);
	}

	get path() {
		return $private.get($private.get(this, 'controller'), 'path');
	}

	get name() {
		return $private.get($private.get(this, 'controller'), 'name');
	}

	get component() {
		return $private.get($private.get(this, 'controller'), 'component');
	}
}

export class ControllerLoadEvent extends ControllerEvent {}
export class ControllerReadyEvent extends ControllerEvent {}

export class ControllerRoutingEvent extends ControllerEvent {
	constructor({controller, ctx, method}) {
		super({controller});
		$private.set(this, 'requestPath', ctx.path);
		$private.set(this, 'method', method);
	}

	get requestPath() {
		return $private.get(this, 'requestPath');
	}

	get method() {
		return $private.get(this, 'method');
	}
}


function getControllerMethod(func, controller) {
	return (ctx, done, injectors)=>{
		controller.emit('routing', new ControllerRoutingEvent({controller, ctx, method:func.name}));

		const namedParams = parseParameters(func);
		const params = namedParams.map(namedParam=>{
			if (namedParam in ctx) return ctx[namedParam];
			if (injectors.hasOwnProperty(namedParam)) return (isFunction(injectors[namedParam])?
					injectors[namedParam]():
					injectors[namedParam]
			);
			if (namedParam === 'done') return done;
			if (namedParam === 'ctx') return ctx;
		});

		const result = func(...params);
		return Promise.resolve(result);
	}
}


export default class Controller extends EventEmitter {
	constructor({name, path, component}) {
		super();
		this.init({name, path, component});
		this.setControllerLoaded();
		this.loadControlers(path);
	}

	static get EVENTS() {
		return ['ready', 'load', 'routing'];
	}

	init({name, path, component}) {
		$private.set(this, 'name', name);
		$private.set(this, 'path', path);
		$private.set(this, 'component', component);
		$private.set(this, 'ready', false);
		$private.set(this, 'controllerLoaded', false);
	}

	async loadControlers(path) {
		const controller = await import(path);
		this.emit('load', new ControllerLoadEvent({controller:this}));
		$private.set(this, 'controller', Object.assign({}, ...Object.keys(controller).map(methodName=>(
			{[methodName]:getControllerMethod(controller[methodName], this)}
		))));
	}

	setControllerLoaded() {
		this.once('load', ()=>{
			$private.set(this, 'controllerLoaded', true);
			this.setReady();
		});
	}

	setReady() {
		if (!$private.get(this, 'controllerLoaded', false)) return undefined;
		$private.set(this, 'ready', true);
		this.emit('ready', new ControllerReadyEvent({controller:this}));
	}

	getMethod(methodName) {
		const controller = $private.get(this, 'controller', {});
		return controller[methodName];
	}

	get name() {
		return $private.get(this, 'name');
	}

	get path() {
		return $private.get(this, 'path');
	}

	get component() {
		return $private.get(this, 'component');
	}

	ready(cb=()=>{}) {
		if ($private.get(this, 'ready', false)) cb(this);
		this.once('ready', ()=>cb(this));
	}
}

export async function getControllers(paths, componentName, emitter={emit:()=>{}}) {
	const controllers = {};

	const controllerPaths = await Promise.all(
		makeArray(paths).map(async (path)=>getFiles(`${path}${sep}controllers`, controllerExtensonsFilter))
	);

	uniq(flattenDeep(controllerPaths)).map(controllerPath=>{
		const [, name] = controllerPath.match(xControllerName);
		controllers[name] = new Controller({name, path:controllerPath, component:componentName, emitter});
		Controller.EVENTS.forEach(eventName=>
			controllers[name].on(eventName, (...params)=>emitter.emit(eventName, ...params))
		);
	});

	return controllers;
}