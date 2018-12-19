import {getComponents} from "./component";

export default async function router(app) {
	const components = await getComponents();

	app.all('/*', async (req, res, next)=>{
		const methods = components.match(req.path);
		let done = false;

		while (methods.length && !done) {
			await methods.shift()(req, res, ()=>{done=true});
		}

		return next();
	});

	return app;
}