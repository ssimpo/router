import Private from "@simpo/private";
import {getDirectories} from "../fs";
import {getControllers} from "./controller";
import uniq from "lodash/uniq";
import Event, {EventEmitter} from "./event";

const xComponentName = /\/([^/]*?)$/;
const xTrimSlashes = /^\/|\/$/g;

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

export default class Component extends EventEmitter {
	constructor({name, path, emitter={emit:()=>{}}}) {
		super();
		this.init({name, path});
		this.setControllersLoaded();
		this.loadControllers(path, name, emitter);
	}

	static get EVENTS() {
		return ['ready', 'load'];
	}

	init({name, path}) {
		$private.set(this, 'name', name);
		$private.set(this, 'path', path);
		$private.set(this, 'ready', false);
		$private.set(this, 'controllersLoaded', false);
	}

	async loadControllers(path, name, emitter) {
		const controllers = await getControllers(path, name, emitter);
		$private.set(this, 'controllers', controllers);
		this.emit('load', new ComponentLoadEvent({component:this}));
	}

	setControllersLoaded() {
		this.once('load', ()=>{
			$private.set(this, 'controllersLoaded', true);
			this.setReady();
		});
	}

	setReady() {
		if (!$private.get(this, 'controllersLoaded', false)) return undefined;
		$private.set(this, 'ready', true);
		this.emit('ready', new ComponentLoadEvent({component:this}));
	}

	get controllers() {
		return $private.get(this, 'controllers', {});
	}

	get name() {
		return $private.get(this, 'name');
	}

	ready(cb=()=>{}) {
		if ($private.get(this, 'ready', false)) cb(this);
		this.once('ready', ()=>cb(this));
	}
}

class Components extends EventEmitter {
	constructor(components) {
		super();
		$private.set(this, 'components', components);
	}

	init(components) {
		Object.keys(components).forEach(componentName=>{
			const component = components[componentName];
		})
	}

	get components() {
		return $private.get(this, 'components', {});
	}

	getComponent(component) {
		return this.components[component];
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

export async function getComponents(paths='./components', emitter={emit:()=>{}}) {
	const componentDirs = await getDirectories(paths);
	const components = {};

	return new Promise(resolve=>{
		let ready = 0;

		componentDirs.map(componentDir=>{
			const [, name] = componentDir.match(xComponentName);
			components[name] = new Component({name, path:componentDir, emitter});
			Component.EVENTS.forEach(eventName=>
				components[name].on(eventName, (...params)=>emitter.emit(eventName, ...params))
			);
		});

		Object.keys(components).forEach(name=>{
			components[name].ready(()=>{
				ready++;
				if (ready >= componentDirs.length) resolve(new Components(components));
			});
		});
	});
}