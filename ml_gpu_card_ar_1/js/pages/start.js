window.addEventListener("DOMContentLoaded", () => {
	const startBtn = document.getElementById("start-btn");
	startBtn.addEventListener("click", async () => {
		const {width, height} = GLOBAL_CONSTANTS;
		pageSwitcher.showPageAsync("main");
		let stream = null;
		try {
			stream = await navigator.mediaDevices.getUserMedia({
				video: {
					width,
					height
				},
				audio: false
			});
		}
		catch ( err ) {
			alert("Error: failed to get video input. Please check your browser permissions and make sure your device has a connected camera input.");
			location.reload();
		}
		if ( stream !== null ) {
			pageSwitcher.pageControls.advanced.start(stream);
		}
	}, {
		once: true
	});
}, {
	once: true
});