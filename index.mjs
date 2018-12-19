import {getComponents} from "./component";
import EventEmitter from "events";

let events = new EventEmitter();
let allComponents;


getComponents().then(_components=>{
	events.emit('loaded');
	allComponents = _components;
	events = undefined;
});

function loadComponents() {
	return new Promise(resolve=>{
		const listener = ()=>{
			process.nextTick(()=>{
				events.removeListener('loaded', listener);
				events = undefined;
			});
			resolve(allComponents);
		};
		events.on('loaded', listener);
	});
}

export default async function router(ctx, next) {
	const components = !!allComponents?allComponents:await loadComponents();
	const methods = components.match(ctx.path);
	let done = false;
	const doc = {};

	while (methods.length && !done && !ctx.headerSent) {
		await methods.shift()(ctx, ()=>{done=true}, doc);
	}

	return next();
}