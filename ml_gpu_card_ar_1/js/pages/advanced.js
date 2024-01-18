window.addEventListener("DOMContentLoaded", () => {
	document.getElementById("open-main-btn").addEventListener("click", () => {
		pageSwitcher.showPageAsync("main");
	});
	const modelPromise = (async () => {
		const model = await tmImage.load("./model/model.json", "./model/metadata.json");
		const maxPredictions = model.getTotalClasses();
		return {
			model,
			maxPredictions
		};
	})();
	const {width, height} = GLOBAL_CONSTANTS;
	const advancedPageContent = document.getElementById("advanced-page-content");
	const createSection = (title, contentNode) => {
		const h1 = document.createElement("h1");
		h1.innerText = title;
		advancedPageContent.appendChild(h1);
		advancedPageContent.appendChild(contentNode);
	};
	class Slider {
		constructor(title){
			const h1 = document.createElement("h1");
			h1.innerText = title + ": 0%";
			advancedPageContent.appendChild(h1);
			const slider = document.createElement("div");
			slider.className = "slider";
			advancedPageContent.appendChild(slider);
			const sliderBar = document.createElement("div");
			sliderBar.className = "slider-bar";
			sliderBar.style.width = "0";
			slider.appendChild(sliderBar);
			this.update = decimal => {
				h1.innerText = `${title}: ${Math.round(100 * decimal)}%`;
				sliderBar.style.width = `${100 * decimal}%`;
			};
		}
	};
	const controls = pageSwitcher.pageControls.advanced = {
		start: stream => {
			const rawVideo = document.createElement("video");
			pageSwitcher.pageControls.main.video = rawVideo;
			rawVideo.addEventListener("loadedmetadata", () => {
				rawVideo.play();
			}, {
				once: true
			});
			rawVideo.srcObject = stream;
			const {
				canvas: summaryCanvas,
				ctx: summaryCtx
			} = createCanvas("advanced-canvas");
			createSection("Summary", summaryCanvas);
			const {
				canvas: rawCanvas,
				ctx: rawCtx
			} = createCanvas("advanced-canvas");
			createSection("Raw video input", rawCanvas);
			const {
				canvas: grayscaleCanvas,
				ctx: grayscaleCtx
			} = createCanvas("advanced-canvas");
			createSection("Grayscale image", grayscaleCanvas);
			const {
				canvas: sobelCanvas,
				ctx: sobelCtx
			} = createCanvas("advanced-canvas");
			createSection("Sobel edge detection", sobelCanvas);
			const {
				canvas: thresholdedSobelCanvas,
				ctx: thresholdedSobelCtx
			} = createCanvas("advanced-canvas");
			createSection("Maximum thresholded sobel edge detection (>= 32)", thresholdedSobelCanvas);
			const {
				canvas: neighborEdgeCanvas,
				ctx: neighborEdgeCtx
			} = createCanvas("advanced-canvas");
			createSection("Neighboring pixel based edge detection", neighborEdgeCanvas);
			const {
				canvas: objectBoundaryCanvas,
				ctx: objectBoundaryCtx
			} = createCanvas("advanced-canvas");
			createSection("Object boundaries", objectBoundaryCanvas);
			const {
				canvas: cardBoundryCanvas,
				ctx: cardBoundryCtx
			} = createCanvas("advanced-canvas");
			createSection("Card boundry", cardBoundryCanvas);
			const {
				canvas: mlInputCanvas,
				ctx: mlInputCtx
			} = createCanvas("advanced-canvas", 200, 200);
			(async () => {
				const {
					model,
					maxPredictions
				} = await modelPromise;
				const prediction = await model.predict(mlInputCanvas);
			})();
			createSection("ML input", mlInputCanvas);
			const houseSlider = new Slider("House");
			const catSlider = new Slider("Cat");
			const happyFaceSlider = new Slider("Happy face");
			const neutralSlider = new Slider("Neutral");
			const {
				canvas: outputCanvas,
				ctx: outputCtx
			} = createCanvas("advanced-canvas");
			pageSwitcher.pageControls.main.canvas = outputCanvas;
			createSection("Output", outputCanvas);
			const sobel = createSobel(width, height);
			const correctBrightness = createCorrectBrightness(width, height);
			let currentBrightness = 1;
			//Fast loop: cycles at the screen refresh rate, only GPU operations.
			(async () => {
				while ( true ) {
					await new Promise(resolve => requestAnimationFrame(resolve));
					rawCtx.drawImage(rawVideo, 0, 0);
					correctBrightness.correctBrightness(rawCanvas, 0.5 / currentBrightness);
					rawCtx.drawImage(correctBrightness.canvas, 0, 0);
					grayscaleCtx.drawImage(rawCanvas, 0, 0);
					sobel.sobel(grayscaleCanvas);
					sobelCtx.drawImage(sobel.canvas, 0, 0);
				}
			})();
			const toLinear = s => {
				if ( s <= 0.03928 ) {
					return s / 12.92;
				} else {
					return Math.pow((s + 0.055) / 1.055, 2.4);
				}
			};
			const toStandard = s => {
				if ( s <= 0.00304 ) {
					return 19.92 * s;
				} else {
					return 1.055 * Math.pow(s, 1.0 / 2.4) - 0.055;
				}
			};
			//Slow loop: cycles every 500ms to update currentBrightness
			(async () => {
				while ( true ) {
					await new Promise(resolve => setTimeout(resolve, 500));
					const {data} = rawCtx.getImageData(0, 0, width, height);
					currentBrightness = 0;
					for ( let i4 = 0, l = 4 * width * height; i4 < l; i4 += 4 ) {
						currentBrightness += 0.2126 * toLinear(data[i4] / 255) + 0.7152 * toLinear(data[i4 + 1] / 255) + 0.0722 * toLinear(data[i4 + 2] / 255);
					}
					currentBrightness /= 4 * width * height;
					currentBrightness = toStandard(currentBrightness);
				}
			})();
			//Most modern CPUs are little endian, but it is better to check.
			const isLittleEndian = new Uint8Array(new Uint32Array([0x000000ff]).buffer)[0] === 0xff;
			const blackUi32Value = isLittleEndian ? 0xff000000 : 0x000000ff;
			//The flood fill algorithm is hard-coded to replace black with white.
			const fill = (ui32, neighborEdgeUi32, colorData, x, y) => {
				const inside = (x, y) => {
					return (
						x >= 0
						&& y >= 0
						&& x < width
						&& y < height
						&& ui32[y * width + x] === blackUi32Value
					);
				};
				if ( inside(x, y) === false ) {
					return null;
				}
				const s = [
					x, x, y, 1,
					x, x, y - 1, -1
				];
				let minX = x;
				let minY = y;
				let maxX = x;
				let maxY = y;
				const edgePoints = [];
				let area = 0;
				let meanR = 0;
				let meanG = 0;
				let meanB = 0;
				const colorUi8c = new Uint8ClampedArray(4);
				const colorUi32 = new Uint32Array(colorUi8c.buffer);
				const set = (x, y) => {
					ui32[y * width + x] = 0xffffffff;
					if ( x < minX ) {
						minX = x;
					}
					if ( y < minY ) {
						minY = y;
					}
					if ( x > maxX ) {
						maxX = x;
					}
					if ( y > maxY ) {
						maxY = y;
					}
					if ( neighborEdgeUi32[y * width + x] === 0xffffffff ) {
						//Since untyped numbers in JavaScript are stored as doubles, combining x and y into one index should use half as much memory (64 vs 128 bits per point).
						edgePoints.push(y * width + x);
					}
					area++;
					meanR += colorData[4 * (y * width + x)];
					meanG += colorData[4 * (y * width + x) + 1];
					meanB += colorData[4 * (y * width + x) + 2];
 				};
				while ( s.length !== 0 ) {
					const dy = s.pop();
					const y = s.pop();
					const x2 = s.pop();
					let x1 = s.pop();
					let x = x1;
					if ( inside(x, y) ) {
						while ( inside(x - 1, y) ) {
							set(x - 1, y);
							x--;
						}
						if ( x < x1 ) {
							s.push(x, x1 - 1, y - dy, -dy);
						}
					}
					while ( x1 <= x2 ) {
						while ( inside(x1, y) ) {
							set(x1, y);
							x1++;
						}
						if ( x1 > x ) {
							s.push(x, x1 - 1, y + dy, dy);
						}
						if ( x1 - 1 > x2 ) {
							s.push(x2 + 1, x1 - 1, y - dy, -dy);
						}
						x1++;
						while ( x1 < x2 && inside(x1, y) === false ) {
							x1++;
						}
						x = x1
					}
				}
				meanR /= area;
				meanG /= area;
				meanB /= area;
				const w = maxX - minX;
				const h = maxY - minY;
				if ( w * h === 0 || edgePoints.length === 0 ) {
					return null;
				}
				return {
					edgePoints,
					rect: [minX, minY, w, h],
					area,
					meanColor: [meanR, meanG, meanB]
				};
			};
			const scaleToContain = (ctx, image, width, height, dx, dy, dWidth, dHeight) => {
				const scale = Math.min(width / dWidth, height / dHeight);
				ctx.drawImage(
					image,
					dx,
					dy,
					dWidth,
					dHeight,
					Math.floor(0.5 * (width - scale * dWidth)),
					Math.floor(0.5 * (height - scale * dHeight)),
					Math.floor(scale * dWidth),
					Math.floor(scale * dHeight)
				);
			};
			let corners = null;
			//Slow loop: may lag behind the screen refresh rate, includes CPU operations.
			(async () => {
				while ( true ) {
					await new Promise(resolve => requestAnimationFrame(resolve));
					const imageData = sobelCtx.getImageData(0, 0, width, height);
					const {data} = imageData;
					for ( let i4 = 0, l = 4  * width * height; i4 < l; i4 += 4 ) {
						data[i4] = data[i4 + 1] = data[i4 + 2] = data[i4] >= 32 ? 255 : 0;
					}
					if ( pageSwitcher.currentPage === "advanced" ) {
						thresholdedSobelCtx.putImageData(imageData, 0, 0);
					}
					//Instead of addressing r, g, b, and a seperately, since each take up 8 bytes,
					//all 3 values can be addressed as 1 32 bit unsigned integer.
					const ui32 = new Uint32Array(data.buffer);
					const neighborEdgeData = new Uint8ClampedArray(4 * width * height);
					const neighborEdgeUi32 = new Uint32Array(neighborEdgeData.buffer);
					for ( let y = 0; y < height; y ++ ) {
						for ( let x = 0; x < width; x++ ) {
							const isWhite = ui32[y * width + x] === 0xffffffff;
							if ( isWhite ) {
								neighborEdgeUi32[y * width + x] = blackUi32Value;
								continue;
							}
							if ( x !== 0 && ui32[y * width + (x - 1)] === 0xffffffff ) {
								neighborEdgeUi32[y * width + x] = 0xffffffff;
								continue;
							}
							if ( x !== width - 1 && ui32[y * width + (x + 1)] === 0xffffffff ) {
								neighborEdgeUi32[y * width + x] = 0xffffffff;
								continue;
							}
							if ( y !== 0 && ui32[(y - 1) * width + x] === 0xffffffff ) {
								neighborEdgeUi32[y * width + x] = 0xffffffff;
								continue;
							}
							if ( y !== height - 1 && ui32[(y + 1) * width + x] === 0xffffffff ) {
								neighborEdgeUi32[y * width + x] = 0xffffffff;
								continue;
							}
							neighborEdgeUi32[y * width + x] = blackUi32Value;
						}
					}
					if ( pageSwitcher.currentPage === "advanced" ) {
						neighborEdgeCtx.putImageData(new ImageData(neighborEdgeData, width), 0, 0);
					}
					const {data: colorData} = rawCtx.getImageData(0, 0, width, height);
					//Because "object" has an abstract meaning in JavaScript, I called these "real objects" since it refers to objects that physically exist in the real world.
					let realObjects = [];
					for ( let y = 0; y < height; y ++ ) {
						for ( let x = 0; x < width; x++ ) {
							const realObject = fill(ui32, neighborEdgeUi32, colorData, x, y);
							if ( realObject === null ) {
								continue;
							}
							realObjects.push(realObject);
						}
					}
					const realObjectData = new Uint8ClampedArray(4 * width * height);
					const realObjectUi32 = new Uint32Array(realObjectData.buffer);
					realObjectUi32.fill(blackUi32Value);
					for ( let i = 0, l = realObjects.length; i < l; i++ ) {
						const {edgePoints} = realObjects[i];
						const randomColor = new Uint32Array(new Uint8ClampedArray([256 * Math.random(), 256 * Math.random(), 256 * Math.random(), 255]).buffer)[0];
						for ( let i = 0, l = edgePoints.length; i < l; i++ ) {
							const edgePoint = edgePoints[i];
							realObjectUi32[edgePoint] = randomColor;
						}
					}
					if ( pageSwitcher.currentPage === "advanced" ) {
						objectBoundaryCtx.putImageData(new ImageData(realObjectData, width), 0, 0);
					}
					realObjects = realObjects.filter(({rect, meanColor}) => {
						const [x, y, w, h] = rect;
						const grayscale = (meanColor[0] + meanColor[1] + meanColor[2]) / 3;
						return x > 10
							&& y > 10
							&& width - x - w > 10
							&& height - y - h > 10
							&& grayscale > 128;
					});
					let card = null;
					let maxArea = -Infinity;
					for ( let i = 0, l = realObjects.length; i < l; i++ ) {
						const realObject = realObjects[i];
						const area = realObject.rect[2] * realObject.rect[3];
						if ( area > maxArea ) {
							maxArea = area;
							card = realObject;
						}
					}
					cardBoundryCtx.drawImage(rawCanvas, 0, 0);
					if ( card !== null ) {
						cardBoundryCtx.lineWidth = 4;
						cardBoundryCtx.strokeStyle = "#0ff";
						cardBoundryCtx.strokeRect(...card.rect);
					}
					corners = card === null ? null : getCorners(card.edgePoints, width);
					if ( card !== null ) {
						cardBoundryCtx.lineWidth = 4;
						cardBoundryCtx.strokeStyle = "#0ff";
						cardBoundryCtx.beginPath();
						cardBoundryCtx.moveTo(corners[0].x, corners[0].y);
						cardBoundryCtx.lineTo(corners[1].x, corners[1].y);
						cardBoundryCtx.lineTo(corners[2].x, corners[2].y);
						cardBoundryCtx.lineTo(corners[3].x, corners[3].y);
						cardBoundryCtx.closePath();
						cardBoundryCtx.stroke();
					}
					mlInputCtx.fillStyle = "#fff";
					mlInputCtx.fillRect(0, 0, 200, 200);
					if ( card !== null ) {
						scaleToContain(
							mlInputCtx,
							rawCanvas,
							200,
							200,
							...card.rect
						);
					}
				}
			})();
			let bestClassName = "neutral";
			(async () => {
				while ( true ) {
					await new Promise(resolve => setTimeout(resolve, 500));
					const {
						model,
						maxPredictions
					} = await modelPromise;
					const prediction = await model.predict(mlInputCanvas);
					let bestProbability = -Infinity;
					const map = new Map;
					for ( let i = 0; i < maxPredictions; i++ ) {
						const {
							className,
							probability
						} = prediction[i];
						map.set(className, probability);
						if ( probability > bestProbability && className !== "neutral" ) {
							bestClassName = className;
							bestProbability = probability;
						}
					}
					houseSlider.update(map.get("house"));
					catSlider.update(map.get("cat"));
					happyFaceSlider.update(map.get("happy_face"));
					neutralSlider.update(map.get("neutral"));
				}
			})();
			const fxCanvas = fx.canvas();
			fxCanvas.width = width;
			fxCanvas.height = height;
			(async () => {
				const loadImageAsync = src => new Promise(resolve => {
					const img = new Image;
					img.addEventListener("load", () => {
						const {width: w, height: h} = img;
						const max = Math.max(width, height);
						const canvas = document.createElement("canvas");
						canvas.width = max;
						canvas.height = max;
						const ctx = canvas.getContext("2d");
						let w1;
						let h1;
						if ( img.width > img.height ) {
							w1 = max;
							h1 = (h / w) * max;
						} else {
							w1 = (w / h) * max;
							h1 = max;
						}
						ctx.drawImage(img, 0, 0, w1, h1);
						resolve({
							width: w1,
							height: h1,
							canvas
						});
					}, {
						once: true
					});
					img.src = src
				});
				const houseImg = await loadImageAsync("./img/house.jpg");
				const catImg = await loadImageAsync("./img/cat.jpg");
				const happyFaceImg = await loadImageAsync("./img/happy_face.jpg");
				while ( true ) {
					await new Promise(resolve => requestAnimationFrame(resolve));
					outputCtx.drawImage(rawVideo, 0, 0);
					correctBrightness.correctBrightness(outputCanvas, 0.5 / currentBrightness);
					outputCtx.drawImage(correctBrightness.canvas, 0, 0);
					if ( corners === null || bestClassName === "neutral" ) {
						continue;
					}
					let image;
					switch ( bestClassName ) {
						case "house":
							image = houseImg;
							break;
						case "cat":
							image = catImg;
							break;
						case "happy_face":
							image = happyFaceImg;
							break;
					}
					let minDistanceFromOrigin = Infinity;
					let minDistanceFromOriginIndex = 0;
					for ( let i = 0; i < 4; i++ ) {
						const {x, y} = corners[i];
						const distanceFromOrigin = Math.hypot(x, y);
						if ( distanceFromOrigin < minDistanceFromOrigin ) {
							minDistanceFromOrigin = distanceFromOrigin;
							minDistanceFromOriginIndex = i;
						}
					}
					for ( let i = 0; i <= minDistanceFromOriginIndex; i++ ) {
						corners.push(corners.shift());
					}
					corners.push(corners.shift());
					corners.push(corners.shift());
					const cornerPolygon = [];
					for ( let i = 0; i < 4; i++ ) {
						const {x, y} = corners[i];
						cornerPolygon.push(x, y);
					}
					const texture = fxCanvas.texture(image.canvas);
					fxCanvas.draw(texture).perspective([
						0, 0,
						image.width, 0,
						image.width, image.height,
						0, image.height
					], cornerPolygon).update();
					outputCtx.drawImage(fxCanvas, 0, 0);
				}
			})();
			const summaryArray = [
				rawCanvas,
				grayscaleCanvas,
				sobelCanvas,
				thresholdedSobelCanvas,
				neighborEdgeCanvas,
				objectBoundaryCanvas,
				cardBoundryCanvas,
				outputCanvas,
				null
			];
			(async () => {
				let startTime = performance.now();
				const transitionMs = 5000;
				let lastI = 0;
				while ( true ) {
					await new Promise(resolve => requestAnimationFrame(resolve));
					const now = performance.now();
					const i = Math.floor((now - startTime) / transitionMs) % (summaryArray.length - 1);
					if ( i !== lastI ) {
						lastI = i;
						if ( i === 0 ) {
							startTime = now;
						}
					}
					const fromTime = startTime + transitionMs * i;
					const decimal = (now - fromTime) / transitionMs;
					summaryCtx.globalAlpha = 1;
					summaryCtx.drawImage(summaryArray[i], 0, 0);
					summaryCtx.globalAlpha = decimal;
					if ( summaryArray[i + 1] === null ) {
						summaryCtx.fillStyle = "#000";
						summaryCtx.fillRect(0, 0, width, height);
					} else {
						summaryCtx.drawImage(summaryArray[i + 1], 0, 0);
					}
				}
			})();
		}
	};
}, {
	once: true
});