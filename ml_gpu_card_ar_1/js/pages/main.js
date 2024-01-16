window.addEventListener("DOMContentLoaded", () => {
	document.getElementById("open-advanced-btn").addEventListener("click", () => {
		pageSwitcher.showPageAsync("advanced");
	});
	const {width, height} = GLOBAL_CONSTANTS;
	const controls = pageSwitcher.pageControls.main = {
		canvas: null
	};
	const mainCanvas = document.getElementById("main-canvas");
	mainCanvas.width = width;
	mainCanvas.height = height;
	const ctx = mainCanvas.getContext("2d");
	(async () => {
		while ( true ) {
			await new Promise(resolve => requestAnimationFrame(resolve));
			if (
				controls.canvas === null
				|| controls.canvas.width === 0
				|| controls.canvas.height === 0
			) {
				continue;
			}
			ctx.drawImage(controls.canvas, 0, 0);
		}
	})();
}, {
	once: true
});