import Private from "@simpo/private";
import {getDirectories} from "../fs";
import EventEmitter from "events";
import {getControllers} from "./controller";
import uniq from "lodash/uniq";

const xComponentName = /\/([^/]*?)$/;
const xTrimSlashes = /^\/|\/$/g;

const $private = Private.getInstance();



export default class Component {
	constructor({name, path}) {
		this.init({name, path});
		this.setControllersLoaded();
		this.loadControllers(path, name);
	}

	init({name, path}) {
		$private.set(this, 'name', name);
		$private.set(this, 'path', path);
		$private.set(this, 'ready', false);
		$private.set(this, 'controllersLoaded', false);
		$private.set(this, 'events', new EventEmitter());
	}

	async loadControllers(path, name) {
		const controllers = await getControllers(path, name);
		$private.set(this, 'controllers', controllers);
		$private.get(this, 'events').emit('controllersLoaded');
	}

	setControllersLoaded() {
		$private.get(this, 'events').once('controllersLoaded', ()=>{
			$private.set(this, 'controllersLoaded', true);
			this.setReady();
		});
	}

	setReady() {
		if (!$private.get(this, 'controllersLoaded', false)) return undefined;
		$private.set(this, 'ready', true);
		$private.get(this, 'events').emit('ready');
		process.nextTick(()=>$private.delete(this, 'events'));
	}

	get controllers() {
		return $private.get(this, 'controllers', {});
	}

	get name() {
		return $private.get(this, 'name');
	}

	ready(cb=()=>{}) {
		if ($private.get(this, 'ready', false)) cb(this);
		$private.get(this, 'events').once('ready', ()=>cb(this));
	}
}

class Components {
	constructor(components) {
		$private.set(this, 'components', components);
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
			component=>(component.getMethod(method) || component.getMethod('default'))
		).filter(method=>!!method)
	}
}

export async function getComponents(paths='./components') {
	const componentDirs = await getDirectories(paths);
	const components = {};

	return new Promise(resolve=>{
		let ready = 0;

		componentDirs.map(componentDir=>{
			const [, name] = componentDir.match(xComponentName);
			components[name] = new Component({name, path:componentDir});
		});

		Object.keys(components).forEach(name=>{
			components[name].ready(()=>{
				ready++;
				if (ready >= componentDirs.length) resolve(new Components(components));
			});
		});
	});
}