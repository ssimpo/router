export const codes = {
	INSTANCE_INIT_CALLED_TWICE: "Init called twice on a class instance."
};

export class ProcedureError extends Error {
	constructor(code, message) {
		if (codes.hasOwnProperty(code)) {
			super(message || codes[code]);
			this.code = code;
		} else {
			super(code);
		}
	}
}