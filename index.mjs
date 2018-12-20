import {getComponents} from "./component";
import Private from "@simpo/private";
import Event, {SingltonEventEmitter as EventEmitter} from "./event";

const $private = Private.getInstance();

export class RouterEvent extends Event {
	constructor({router}) {
		super();
		$private.set(this, 'router', router);
	}

	get paths() {
		return $private.get($private.get(this, 'router'), 'paths');
	}
}

export class RouterLoadEvent extends RouterEvent {}



export default class Router extends EventEmitter {
	constructor(options={$ref:this}) {
		super();

		$private.set(this, 'loadEventSymbol', Symbol("Load Event"));
		$private.set(this, 'ready', false);
		Object.keys(options).forEach(option=>$private.set(this, option, options[option]));
		this.middleware = this.middleware.bind(this);
		this.loadComponents();
	}

	async loadComponents() {
		$private.set(this, 'components', await getComponents($private.get(this, 'paths'), this));
		$private.set(this, 'ready', true);
		this.emit(['load', $private.get(this, 'loadEventSymbol')], new RouterLoadEvent({router:this}));
	}

	getComponents() {
		return new Promise(
			resolve=>this.once($private.get(this, 'loadEventSymbol'), ()=>resolve($private.get(this, 'components')))
		);
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