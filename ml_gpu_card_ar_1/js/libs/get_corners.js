const getCorners = (() => {
	const pointDistanceFromLine = (x, y, x1, y1, x2, y2, isSegment = false) => {
		const a = x - x1;
		const b = y - y1;
		const c = x2 - x1;
		const d = y2 - y1;
		const dot = a * c + b * d;
		const lengthSquare = Math.pow(c, 2) + Math.pow(d, 2);
		let param = -1;
		if ( lengthSquare !== 0 ) {
			//in case of 0 length line
			param = dot / lengthSquare;
		}
		let xx;
		let yy;
		if ( isSegment && param < 0 ) {
			xx = x1;
			yy = y1;
		} else if ( isSegment && param > 1 ) {
			xx = x2;
			yy = y2;
		} else {
			xx = x1 + param * c;
			yy = y1 + param * d;
		}
		const dx = x - xx;
		const dy = y - yy;
		return Math.sqrt(dx * dx + dy * dy);
	};
	const pointsToPolygon = points => {
		const ret = new Float32Array(2 * points.length);
		for ( let i = 0, l = points.length; i < l; i++ ) {
			const {x, y} = points[i];
			ret[2 * i] = x;
			ret[2 * i + 1] = y;
		}
		return ret;
	};
	const getRotationDirection = polygon => {
		const a = 0;
		const b = 2;
		const c = 4;
		const x = 0;
		const y = 1;
		const determinant = polygon[x + b] * polygon[y + c]
			- polygon[y + b] * polygon[x + c]
			- polygon[x + a] * polygon[y + c]
			+ polygon[y + a] * polygon[x + c]
			+ polygon[x + a] * polygon[y + b]
			- polygon[y + a] * polygon[x + b];
		return Math.sign(determinant)
	};
	const quickPermutation = function* (array) {
		const n = array.length;
		const permutationArray = [];
		for ( let i = 0; i < n; i++ ) {
			permutationArray[i] = i;
		}
		let i = 1;
		while ( true ) {
			yield array;
			if ( i >= n ) {
				break;
			}
			permutationArray[i]--;
			const j = i % 2 === 0 ? 0 : permutationArray[i];
			[
				array[j],
				array[i]
			] = [
				array[i],
				array[j]
			];
			i = 1;
			while ( permutationArray[i] === 0) {
				permutationArray[i] = i;
				i++;
			}
		}
	};
	let isConvex;
	{
		const getCrossProduct = a => {
			//stores coefficient of X
			//direction of vector A[1]A[0]
			const x1 = a[1].x - a[0].x;
			//stores coefficient of Y
			//direction of vector A[1]A[0]
			const y1 = a[1].y - a[0].y;
			//stores coefficient of X
			//direction of vector A[2]A[0]
			const x2 = a[2].x - a[0].x;
			//stores coefficient of Y
			//direction of vector A[2]A[0]
			const y2 = a[2].y - a[0].y;
			//return cross product
			return x1 * y2 - y1 * x2;
		};
		//function to check if the polygon is
		//convex polygon or not
		isConvex = points => {
			//stores count of
			//edges in polygon
			const n = points.length;
			//stores direction of cross product
			//of previous traversed edges
			let lastCrossProduct = 0;
			//yraverse the array
			for ( let i = 0; i < n; i++ ) {
				//stores direction of cross product
				//of current traversed edges
				const crossProduct = getCrossProduct([
					//stores three adjacent edges
					//of the polygon
					points[i],
					points[(i + 1) % n],
					points[(i + 2) % n]
				]);
				//if crossProduct is not equal to 0
				if ( crossProduct !== 0 ) {
					//if direction of cross product of
					//all adjacent edges are not same
					if ( crossProduct * lastCrossProduct < 0 ) {
						return false;
					} else {
						//update crossProduct
						lastCrossProduct = crossProduct;
					}
				}
			}
			return true;
		};
	}
	return (edgePoints, width) => {
		if ( edgePoints.length === 0 ) {
			return null;
		}
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;
		for ( let i = 0, l = edgePoints.length; i < l; i++ ) {
			const pointIndex = edgePoints[i];
			const x = pointIndex % width;
			const y = Math.floor(pointIndex / width);
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
		}
		const w = maxX - minX;
		const h = maxY - minY;
		const centerX = minX + 0.5 * w;
		const centerY = minY + 0.5 * h;
		const corners = [];
		{
			let lastPoint = {
				x: centerX,
				y: centerY
			};
			const addCorner = () => {
				let maxDistance = -Infinity;
				let corner = null;
				for ( let i = 0, l = edgePoints.length; i < l; i++ ) {
					const pointIndex = edgePoints[i];
					const point = {
						x: pointIndex % width,
						y: Math.floor(pointIndex / width)
					};
					const distance = Math.pow(lastPoint.x - point.x, 2) + Math.pow(lastPoint.y - point.y, 2);
					if ( distance > maxDistance ) {
						maxDistance = distance;
						corner = point;
					}
				}
				lastPoint = corner;
				corners.push(corner);
			};
			//add first two corners
			for ( let i = 0; i < 2; i++ ) {
				addCorner();
			}
			//add third corner
			{
				let maxDistance =-Infinity;
				let corner = null;
				for ( let i = 0, l = edgePoints.length; i < l; i++ ) {
					const pointIndex = edgePoints[i];
					const point = {
						x: pointIndex % width,
						y: Math.floor(pointIndex / width)
					};
					const distance = pointDistanceFromLine(point.x, point.y, corners[0].x, corners[0].y, corners[1].x, corners[1].y);
					if ( distance > maxDistance ) {
						maxDistance = distance;
						corner = point;
					}
				}
				lastPoint = corner;
				corners.push(corner);
			}
			//add fourth corner
			addCorner();
			//make sure shape is convex
			for ( const {} of quickPermutation(corners) ) {
				if ( isConvex(corners) ) {
					break;
				}
			}
			//make sure corners are clockwise
			if ( getRotationDirection(pointsToPolygon(corners)) === 1 ) {
				corners.reverse();
			}
		}
		return corners;
	};
})();