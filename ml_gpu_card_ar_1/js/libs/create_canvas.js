const createCanvas = (className = null, w = null, h = null) => {
	const {width, height} = GLOBAL_CONSTANTS;
	const canvas = document.createElement("canvas");
	canvas.width = w === null ? width : w;
	canvas.height = h === null ? height : h;
	if ( className !== null ) {
		canvas.className = className;
	}
	const ctx = canvas.getContext("2d");
	return {
		canvas,
		ctx
	};
};