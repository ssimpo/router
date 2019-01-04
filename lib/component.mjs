import Private from "@simpo/private";
import {getDirectories, getFiles} from "../fs";
import {Controller} from "./controller";
import flattenDeep from "lodash/flattenDeep";
import {sep} from "path";
import uniq from "lodash/uniq";
import Event, {EventEmitter} from "./event";
import {ProcedureError, codes as Error_Codes} from "./error";
import {makeArray} from "../array";

const xComponentName = /\/([^/]*?)$/;
const xTrimSlashes = /^\/|\/$/g;
const controllerExtensions = ['mjs','js'];
const controllerExtensonsFilter = controllerExtensions.map(ext=>`*.${ext}`);
const xControllerName = new RegExp(`\/([^/]*?)\.(?:${controllerExtensions.join('|')})`+'$');

const $private = Private.getInstance();


export class ComponentEvent extends Event {
	constructor({component}) {
		super();
		$private.set(this, 'component', component);
	}

	get path() {
		return $private.get($private.get(this, 'component'), 'path');
	}

	get name() {
		return $private.get($private.get(this, 'component'), 'name');
	}
}

export class ComponentLoadEvent extends ComponentEvent {}
export class ComponentReadyEvent extends ComponentEvent {}

export class Component extends EventEmitter {
	constructor(options={}) {
		super(options);

		$private.set(this, 'init', false);
		$private.set(this, 'loadEventSymbol', Symbol("Load Event"));
		$private.set(this, 'readyEventSymbol', Symbol("Ready Event"));
		$private.set(this, 'EVENTS', new Set([...Controller.EVENTS]));
		$private.set(this, 'controllers', {});

		this.setControllersLoaded();
		this.init(options);
	}

	init({name, path}) {
		if (!name && !path) return Promise.resolve(this);
		if ($private.get(this, 'init', false)) throw new ProcedureError(Error_Codes.INSTANCE_INIT_CALLED_TWICE);
		$private.set(this, 'init', true);

		$private.set(this, 'name', name);
		$private.set(this, 'path', path);
		$private.set(this, 'ready', false);
		$private.set(this, 'controllersLoaded', false);

		return new Promise(resolve=>{
			this.on($private.get(this, 'readyEventSymbol'), ()=>resolve(this));
			return this.loadControllers(path, name);
		});
	}

	static get EVENTS() {
		return uniq(['ready', 'load', ...Controller.EVENTS]);
	}

	async loadControllers(path) {
		const controllerPaths = await Promise.all(
			makeArray(path).map(async (path)=>getFiles(`${path}${sep}controllers`, controllerExtensonsFilter))
		);
		uniq(flattenDeep(controllerPaths)).map(controllerPath=>{
			const [, name] = controllerPath.match(xControllerName);
			this.addController(new Controller({name, path:controllerPath, component:this.name}))
		});


		this.emit(['load', $private.get(this, 'loadEventSymbol')], new ComponentLoadEvent({component:this}));
	}

	addController(controller, name=controller.name) {
		const controllers = $private.get(this, 'controllers');
		let unmirror = this.mirror(controller.constructor.EVENTS, controller);
		controllers[name] = controller;
		$private.set(this, 'controllers', controllers);
		$private.set(this, `controllers.unmirror.${name}`, ()=>{
			unmirror();
			$private.delete(this, `controllers.unmirror.${name}`);
			unmirror = undefined;
		});
	}

	deleteController(controller, name=controller.name) {
		const controllers = $private.get(this, 'controllers');
		delete controllers[name];
		const unmirror = $private.get(this, `controllers.unmirror.${name}`, ()=>{});
		unmirror();
		$private.set(this, 'controllers', controllers);
	}

	setControllersLoaded() {
		this.once($private.get(this, 'loadEventSymbol'), ()=>{
			$private.set(this, 'controllersLoaded', true);
			this.setReady();
		});
	}

	setReady() {
		if (!$private.get(this, 'controllersLoaded', false)) return undefined;
		$private.set(this, 'ready', true);
		this.emit(['ready', $private.get(this, 'readyEventSymbol')], new ComponentReadyEvent({component:this}));
	}

	get controllers() {
		return $private.get(this, 'controllers', {});
	}

	get name() {
		return $private.get(this, 'name');
	}
}

export class ComponentCollection extends EventEmitter {
	constructor(config={}) {
		super(config);
		$private.set(this, 'components', {});
	}

	static get EVENTS() {
		return uniq(['ready', 'load', ...Controller.EVENTS, ...Component.EVENTS]);
	}

	get components() {
		return $private.get(this, 'components', {});
	}

	async load(paths='./components') {
		const componentDirs = await getDirectories(paths);
		return Promise.all(componentDirs.map(componentDir=>{
			const [, name] = componentDir.match(xComponentName);
			const component = new Component();
			this.add(component, name);
			return component.init({name, path:componentDir});
		}));
	}

	add(component, name=component.name) {
		const components = $private.get(this, 'components', {});
		components[name] = component;
		let unmirror = this.mirror(component.constructor.EVENTS, component);
		$private.set(this, `component.unmirror.${name}`, ()=>{
			unmirror();
			$private.delete(this, `component.unmirror.${name}`);
			unmirror = undefined;
		});
		$private.set(this, 'components', components);
	}

	delete(component, name=component.name) {
		const components = $private.get(this, 'components', {});
		delete components[name];
		const unmirror = $private.set(this, `component.unmirror.${name}`, ()=>{});
		unmirror();
		$private.set(this, 'components', components);
	}

	getComponent(componentName) {
		return this.components[componentName];
	}

	getController(componentName, controllerName) {
		const component = this.getComponent(componentName);
		if (!component) return undefined;
		return component.controllers[controllerName];
	}

	match(path) {
		const parsedPath = path.replace(xTrimSlashes, '');

		const [part1, part2, part3] = parsedPath.split('/')
			.map(part=>part.trim())
			.filter(part=>(part!==''));

		if ((part1==='index') || (part2==='index') || (part3==='default')) return false;

		const method = part3 || part2 || 'default';
		const controller = (!!part3?part2:'index') || 'index';
		const component = part1 || 'index';

		return uniq([
			this.getController(component, controller),
			this.getController(component, 'index'),
			this.getController('index', controller),
			this.getController('index', 'index')
		].filter(controller=>!!controller)
		).map(
			controller=>(controller.getMethod(method) || controller.getMethod('default'))
		).filter(method=>!!method)
	}
}

export default Component;