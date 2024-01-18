const createCorrectBrightness = (width, height) => {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const gl = canvas.getContext("webgl", {
		alpha: false
	});
	gl.clearColor(1, 1, 1, 1);
	gl.clear(gl.COLOR_BUFFER_BIT);
	const createShader = (gl, type, shaderSource) => {
		const shader = gl.createShader(type);
		gl.shaderSource(shader, shaderSource);
		gl.compileShader(shader);
		const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
		if ( !success ) {
			console.warn(gl.getShaderInfoLog(shader));
			gl.deleteShader(shader);
		}
		return shader;
	};
	const vertexShaderSource = `
		attribute vec2 position;
		varying vec2 v_coord;
		void main() {
			gl_Position = vec4(position, 0, 1);
			v_coord = gl_Position.xy * 0.5 + 0.5;
		}
	`;
	const fragmentShaderSource = `
		precision lowp float;
		varying vec2 v_coord;
		uniform sampler2D u_texture;
		uniform float u_brightness;
		void main() {
			vec4 sampleColor = texture2D(u_texture, vec2(v_coord.x, 1.0 - v_coord.y));
			//convert to linear RGB
			if ( sampleColor.r <= 0.03928 ) {
				sampleColor.r = sampleColor.r / 12.92;
			} else {
				sampleColor.r = pow((sampleColor.r + 0.055) / 1.055, 2.4);
			}
			if ( sampleColor.g <= 0.03928 ) {
				sampleColor.g = sampleColor.g / 12.92;
			} else {
				sampleColor.g = pow((sampleColor.g + 0.055) / 1.055, 2.4);
			}
			if ( sampleColor.b <= 0.03928 ) {
				sampleColor.b = sampleColor.b / 12.92;
			} else {
				sampleColor.b = pow((sampleColor.b + 0.055) / 1.055, 2.4);
			}
			//multiply by brightness
			sampleColor.rgb *= u_brightness;
			//convert back to standard RGB
			if ( sampleColor.r <= 0.00304 ) {
				sampleColor.r = 19.92 * sampleColor.r;
			} else {
				sampleColor.r = 1.055 * pow(sampleColor.r, 1.0 / 2.4) - 0.055;
			}
			if ( sampleColor.g <= 0.00304 ) {
				sampleColor.g = 19.92 * sampleColor.g;
			} else {
				sampleColor.g = 1.055 * pow(sampleColor.g, 1.0 / 2.4) - 0.055;
			}
			if ( sampleColor.b <= 0.00304 ) {
				sampleColor.b = 19.92 * sampleColor.b;
			} else {
				sampleColor.b = 1.055 * pow(sampleColor.b, 1.0 / 2.4) - 0.055;
			}
			gl_FragColor = sampleColor;
		}
	`;
	const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
	const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
	const createProgram = (gl, vertexShader, fragmentShader) => {
		const program = gl.createProgram();
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);
		const success = gl.getProgramParameter(program, gl.LINK_STATUS);
		if ( !success ) {
			console.log(gl.getProgramInfoLog(program));
			gl.deleteProgram(program);
		}
		return program;
	};
	const program = createProgram(gl, vertexShader, fragmentShader);
	const positionAttributeLocation = gl.getAttribLocation(program, "position");
	const brightnessLocation = gl.getUniformLocation(program, "u_brightness");
	const positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	gl.useProgram(program);
	gl.enableVertexAttribArray(positionAttributeLocation);
	gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
	//gl.STATIC_DRAW tells WebGL that the data are not likely to change.
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
		-1, -1, -1, 1, 1, -1,
		1, 1, 1, -1, -1, 1,
	]), gl.STATIC_DRAW);
	let texture = gl.createTexture();
	const handleLoadedTexture = (gl, texture, callback) => {
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
		gl.drawArrays(gl.TRIANGLES, 0, 6);
	};
	let lastBrightness = null;
	return {
		canvas,
		correctBrightness: (image, brightness) => {
			//don't force it to recompile every time
			if ( brightness !== lastBrightness ) {
				lastBrightness = brightness;
				gl.uniform1f(brightnessLocation, brightness);
			}
			texture.image = image;
			handleLoadedTexture(gl, texture);
		}
	};
};