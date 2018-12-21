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
import {ProcedureError, codes as Error_Codes} from "./error";

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
		super({name, path, component});

		$private.set(this, 'init', false);
		$private.set(this, 'loadEventSymbol', Symbol("Load Event"));
		$private.set(this, 'readyEventSymbol', Symbol("Ready Event"));
		$private.set(this, 'EVENTS', new Set());

		this.init({name, path, component});
		this.setControllerLoaded();
		this.loadControlers(path);
	}

	init({name, path, component}) {
		if ($private.get(this, 'init', false)) throw new ProcedureError(Error_Codes.INSTANCE_INIT_CALLED_TWICE);
		$private.set(this, 'init', true);

		$private.set(this, 'name', name);
		$private.set(this, 'path', path);
		$private.set(this, 'component', component);
		$private.set(this, 'ready', false);
		$private.set(this, 'controllerLoaded', false);
	}

	static get EVENTS() {
		return ['ready', 'load'];
	}

	get EVENTS() {
		return [...this.constructor.EVENTS, ...$private.get(this, 'EVENTS')];
	}

	async loadControlers(path) {
		const controller = await import(path);
		this.emit(['load', $private.get(this, 'loadEventSymbol')], new ControllerLoadEvent({controller:this}));
		$private.set(this, 'controller', Object.assign({}, ...Object.keys(controller).map(methodName=>(
			{[methodName]:getControllerMethod(controller[methodName], this)}
		))));
	}

	setControllerLoaded() {
		this.once($private.get(this, 'loadEventSymbol'), ()=>{
			$private.set(this, 'controllerLoaded', true);
			this.setReady();
		});
	}

	setReady() {
		if (!$private.get(this, 'controllerLoaded', false)) return undefined;
		$private.set(this, 'ready', true);
		this.emit(['ready', $private.get(this, 'readyEventSymbol')], new ControllerReadyEvent({controller:this}));
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
		this.once($private.get(this, 'readyEventSymbol'), ()=>cb(this));
	}
}

export async function getControllers(paths, componentName) {
	const controllers = {};

	const controllerPaths = await Promise.all(
		makeArray(paths).map(async (path)=>getFiles(`${path}${sep}controllers`, controllerExtensonsFilter))
	);

	uniq(flattenDeep(controllerPaths)).map(controllerPath=>{
		const [, name] = controllerPath.match(xControllerName);
		controllers[name] = new Controller({name, path:controllerPath, component:componentName});
	});

	return controllers;
}