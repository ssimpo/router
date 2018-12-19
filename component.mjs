import Private from "@simpo/private";
import {getDirectories} from "../fs";
import EventEmitter from "events";
import {getControllers} from "./controller";
import uniq from "lodash/uniq";

const xComponentName = /\/([^/]*?)$/;
const xTrimSlashes = /^\/|\/$/g;

const $private = Private.getInstance();


function _setReady() {
	if (!$private.get(this, 'controllersLoaded', false)) return undefined;
	$private.set(this, 'ready', true);
	const events = $private.get(this, 'events');
	events.emit('ready');
}

export default class Component {
	constructor({name, path}) {
		const events = new EventEmitter();
		const setReady = _setReady.bind(this);

		$private.set(this, 'name', name);
		$private.set(this, 'path', path);
		$private.set(this, 'priority', ((name==='index')?4:1));
		$private.set(this, 'ready', false);
		$private.set(this, 'controllersLoaded', false);
		$private.set(this, 'events', events);

		events.on('controllersLoaded', ()=>{
			$private.set(this, 'controllersLoaded', true);
			setReady()
		});

		getControllers(path, name).then(controllers=>{
			$private.set(this, 'controllers', controllers);
			events.emit('controllersLoaded');
		});
	}

	get priority() {
		return $private.get(this, 'priority', 4);
	}

	get controllers() {
		return $private.get(this, 'controllers', {});
	}

	get name() {
		return $private.get(this, 'name');
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

class Components {
	constructor(components) {
		$private.set(this, 'components', components);
	}

	all() {
		return $private.get(this, 'components', {});
	}

	getComponent(component) {
		return this.all()[component];
	}

	getController(component, controller) {
		const components = $private.get(this, 'components', {});
		if (!components.hasOwnProperty(component)) return undefined;
		return components[component].controllers[controller];
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
			const off = components[name].ready(()=>{
				ready++;
				process.nextTick(()=>off());
				if (ready >= componentDirs.length) resolve(new Components(components));
			});
		});
	});
}