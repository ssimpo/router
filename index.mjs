import {ComponentCollection} from "./src/component";
import Private from "@simpo/private";
import Event, {EventEmitter} from "@simpo/async-event-emitter";
import {ProcedureError, codes as Error_Codes} from "./src/error";

const $private = new Private();


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
export class RouterReadyEvent extends RouterEvent {}



export default class Router extends EventEmitter {
	constructor(options={}) {
		super();

		$private.set(this, 'loadEventSymbol', Symbol("Load Event"));
		$private.set(this, 'ready', false);
		$private.set(this, 'init', false);
		Object.keys(options).forEach(option=>$private.set(this, option, options[option]));
		this.middleware = this.middleware.bind(this);
		this.once($private.get(this, 'loadEventSymbol'), this.onReady.bind(this));
	}

	init(paths) {
		if ($private.get(this, 'init', false)) throw new ProcedureError(Error_Codes.INSTANCE_INIT_CALLED_TWICE);
		$private.set(this, 'init', true);
		this.load(paths);
	}

	onReady() {
		$private.set(this, 'ready', true);
		this.emit('ready', new RouterReadyEvent({router:this}));
	}

	async load(paths) {
		const components = new ComponentCollection();
		$private.set(this, 'components', components);
		this.mirror(components.constructor.EVENTS, components);
		await components.load(paths);
		this.emit(['load', $private.get(this, 'loadEventSymbol')], new RouterLoadEvent({router:this}));
	}

	getComponents() {
		return new Promise(
			resolve=>this.once($private.get(this, 'loadEventSymbol'), ()=>resolve($private.get(this, 'components')))
		);
	}

	async middleware(ctx, next) {
		const ready = $private.get(this, 'ready');
		const components = (!!ready? $private.get(this, 'components'): await this.getComponents());
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