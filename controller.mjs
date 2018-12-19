import Private from "@simpo/private";
import {getFiles} from "../fs";
import {makeArray} from "../array";
import {sep} from "path";
import flattenDeep from "lodash/flattenDeep";
import isObject from "lodash/isObject";
import uniq from "lodash/uniq";
import EventEmitter from "events";
import {parseParameters} from "../function";

const controllerExtensions = ['mjs','js'];
const xControllerName = new RegExp(`\/([^/]*?)\.(?:${controllerExtensions.join('|')})`+'$');
const controllerExtensonsFilter = controllerExtensions.map(ext=>`*.${ext}`);

const $private = Private.getInstance();


function makePromise(func) {
	return (ctx, done)=>{
		const namedParams = parseParameters(func);
		const params = namedParams.map(namedParam=>{
			if (namedParam in ctx) return ctx[namedParam];
			if (namedParam === 'done') return done;
			if (namedParam === 'ctx') return ctx;
		});

		const result = func(...params);
		return Promise.resolve(result);
	}
}

function _setReady() {
	if (!$private.get(this, 'controllerLoaded', false)) return undefined;
	$private.set(this, 'ready', true);
	const events = $private.get(this, 'events');
	events.emit('ready');
}

export default class Controller {
	constructor({name, path, component}) {
		const events = new EventEmitter();
		const setReady = _setReady.bind(this);

		$private.set(this, 'name', name);
		$private.set(this, 'path', path);
		$private.set(this, 'priority', ((name==='index')?2:1));
		$private.set(this, 'component', component);
		$private.set(this, 'ready', false);
		$private.set(this, 'controllerLoaded', false);
		$private.set(this, 'events', events);

		events.on('controllerLoaded', ()=>{
			$private.set(this, 'controllersLoaded', true);
			setReady();
		});

		import(path).then(controller=>{
			const _controller = {};

			Object.keys(controller).forEach(methodName=>
				_controller[methodName] = makePromise(controller[methodName])
			);

			$private.set(this, 'controller', _controller)
		});
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

	get priority() {
		return $private.get(this, 'priority', 2);
	}

	get component() {
		return $private.get(this, 'component');
	}

	ready(cb=()=>{}) {
		if ($private.get(this, 'name', false)) {
			cb(this);
			return ()=>{};
		}

		const listener = ()=>cb(this);
		const events = $private.get(this, 'events');
		events.on('ready', listener);
		return ()=>events.removeListener('ready', listener);
	}
}

export async function getControllers(paths, componentName) {
	const _paths = makeArray(paths);
	const controllers = {};

	const controllerPaths = await Promise.all(
		_paths.map(async (path)=>getFiles(`${path}${sep}controllers`, controllerExtensonsFilter))
	);

	uniq(flattenDeep(controllerPaths)).map(controllerPath=>{
		const [, name] = controllerPath.match(xControllerName);
		controllers[name] = new Controller({name, path:controllerPath, component:componentName});
	});

	return controllers;
}