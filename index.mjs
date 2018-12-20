import {getComponents} from "./component";
import EventEmitter from "events";
import Private from "@simpo/private";

const $private = Private.getInstance();


export default class Router {
	constructor(options={}) {
		$private.set(this, 'events', new EventEmitter());
		$private.set(this, 'ready', false);
		Object.keys(options).forEach(option=>$private.set(this, option, options[option]));
		this.middleware = this.middleware.bind(this);
		this.loadComponents();
	}

	async loadComponents() {
		$private.set(this, 'components', await getComponents($private.get(this, 'paths')));
		$private.set(this, 'ready', true);
		$private.get(this, 'events').emit('loaded');
		process.nextTick(()=>$private.delete(this, 'events'))
	}

	getComponents() {
		return new Promise(resolve=>{
			$private.get(this, 'events').once(
				'loaded',
				()=>resolve($private.get(this, 'components'))
			);
		});
	}

	async middleware(ctx, next) {
		const components = (!!$private.get(this, 'ready')?
			$private.get(this, 'components'):
			await this.getComponents()
		);
		const methods = components.match(ctx.path);
		let done = false;

		while (methods.length && !done && !ctx.headerSent) {
			await methods.shift()(
				ctx,
				()=>{done=true},
				$private.get(this, 'injectors', {})
			);
		}

		return next();
	}
}