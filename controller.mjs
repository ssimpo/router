import Private from "@simpo/private";
import {getFiles} from "../fs";
import {makeArray} from "../array";
import {sep} from "path";
import flattenDeep from "lodash/flattenDeep";
import isObject from "lodash/isObject";
import isFunction from "lodash/isFunction";
import uniq from "lodash/uniq";
import EventEmitter from "events";
import {parseParameters} from "../function";

const controllerExtensions = ['mjs','js'];
const xControllerName = new RegExp(`\/([^/]*?)\.(?:${controllerExtensions.join('|')})`+'$');
const controllerExtensonsFilter = controllerExtensions.map(ext=>`*.${ext}`);

const $private = Private.getInstance();


function getControllerMethod(func, controller) {
	const logger = $private.get(controller, 'logger', null);
	const controllerName = $private.get(controller, 'name', '');
	const componentName = $private.get(controller, 'component', '');
	const methodName = func.name;

	return (ctx, done, injectors)=>{
		if (logger) logger.info({
			label:'routing',
			message:`Fired controller method (${componentName}/${controllerName}/${methodName}) for: ${ctx.path}`
		});

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


export default class Controller {
	constructor({name, path, component, logger=null}) {
		this.init({name, path, component,logger})
		this.setControllerLoaded();
		this.loadControlers(path);
	}

	init({name, path, component, logger}) {
		$private.set(this, 'name', name);
		$private.set(this, 'path', path);
		$private.set(this, 'logger', logger);
		$private.set(this, 'component', component);
		$private.set(this, 'ready', false);
		$private.set(this, 'controllerLoaded', false);
		$private.set(this, 'events', new EventEmitter());
	}

	async loadControlers(path) {
		const controller = await import(path);
		const logger = $private.get(this, 'logger', null);
		if (logger) logger.info({label:'load', message:`Loaded controller at: ${path}`});

		$private.set(this, 'controller', Object.assign({}, ...Object.keys(controller).map(methodName=>(
			{[methodName]:getControllerMethod(controller[methodName], this)}
		))));
	}

	setControllerLoaded() {
		$private.get(this, 'events').once('controllerLoaded', ()=>{
			$private.set(this, 'controllersLoaded', true);
			this.setReady();
		});
	}

	setReady() {
		if (!$private.get(this, 'controllerLoaded', false)) return undefined;
		$private.set(this, 'ready', true);
		$private.get(this, 'events').emit('ready');
		process.nextTick(()=>$private.delete(this, 'events'));
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
		$private.get(this, 'events').once('ready', ()=>cb(this));
	}
}

export async function getControllers(paths, componentName, logger) {
	const controllers = {};

	const controllerPaths = await Promise.all(
		makeArray(paths).map(async (path)=>getFiles(`${path}${sep}controllers`, controllerExtensonsFilter))
	);

	uniq(flattenDeep(controllerPaths)).map(controllerPath=>{
		const [, name] = controllerPath.match(xControllerName);
		controllers[name] = new Controller({name, path:controllerPath, component:componentName, logger});
	});

	return controllers;
}