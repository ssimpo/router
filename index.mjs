import {getComponents} from "./component";

export default async function router(app) {
	const components = await getComponents();

	app.use(async (ctx, next)=>{
		const methods = components.match(ctx.path);
		let done = false;

		while (methods.length && !done && !ctx.headerSent) {
			await methods.shift()(ctx, ()=>{done=true});
		}

		return next();
	});

	return app;
}