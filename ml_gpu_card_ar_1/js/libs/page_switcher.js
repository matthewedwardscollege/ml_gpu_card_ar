const pageSwitcher = (() => {
	let currentPage = null;
	const pageMapPromise = new Promise(resolve => {
		window.addEventListener("DOMContentLoaded", () => {
			const pages = document.getElementsByClassName("page");
			const pageMap = new Map;
			for ( let i = 0, l = pages.length; i < l; i++ ) {
				const page = pages[i];
				const name = page.getAttribute("data-pagename");
				if ( name === null ) {
					continue;
				}
				if ( currentPage === null ) {
					currentPage = name;
				}
				pageMap.set(name, {
					page,
					index: i
				});
			}
			resolve(pageMap);
		}, {
			once: true
		});
	});
	const pageSliderPromise = new Promise(resolve => {
		window.addEventListener("DOMContentLoaded", () => {
			const pageSlider = document.getElementById("page-slider");
			pageSlider.style.top = "0";
			resolve(pageSlider);
		}, {
			once: true
		});
	});
	const pageSwitchDurationMs = 1000;
	let lastPageSwitchTime = -Infinity;
	return {
		pageControls: {},
		//Not async but can be null.
		get currentPage(){
			return currentPage;
		},
		//Async and can never be null.
		getCurrentPageAsync: async () => {
			await pageMapPromise;
			return currentPage;
		},
		showPageAsync: async name => {
			const pageMap = await pageMapPromise;
			if ( pageMap.has(name) == false ) {
				return false;
			}
			const {index} = pageMap.get(name);
			const pageSlider = await pageSliderPromise;
			const now = performance.now();
			if ( lastPageSwitchTime + pageSwitchDurationMs > now ) {
				return false;
			}
			lastPageSwitchTime = now;
			currentPage = name;
			pageSlider.style.top = `-${100 * index}vh`;
			return true;
		}
	};
})();