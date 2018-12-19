import {getComponents} from "./component";
import EventEmitter from "events";

const events = new EventEmitter();

let components;


getComponents().then(_components=>{
	events.emit('loaded');
	components = _components;
});

function _getComponents() {
	return (!!components?
		Promise.resolve(components):
		new Promise(resolve=>{
			const listener = ()=>{
				process.nextTick(()=>events.removeListener('loaded', listener));
				resolve(components);
			};
			events.on('loaded', listener);
		})
	);
}

export default async function router(ctx, next) {
	const components = await _getComponents();
	const methods = components.match(ctx.path);
	let done = false;
	const doc = {};

	while (methods.length && !done && !ctx.headerSent) {
		await methods.shift()(ctx, ()=>{done=true}, doc);
	}

	return next();
}