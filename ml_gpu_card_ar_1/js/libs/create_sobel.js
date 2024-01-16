const createSobel = (width, height) => {
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
		void main() {
			gl_Position = vec4(position, 0, 1);
		}
	`;
	const fragmentShaderSource = `
		precision lowp float;
		uniform sampler2D u_texture;
		uniform float width;
		uniform float height;
		void main() {
			float x = gl_FragCoord.x / width;
			float y = 1.0 - gl_FragCoord.y / height;
			float pxx = 1.0 / width;
			float pxy = 1.0 / height;
			vec3 a0 = texture2D(u_texture, vec2(x - pxx, y + pxy)).xyz;
			vec3 a1 = texture2D(u_texture, vec2(x, y + pxy)).xyz;
			vec3 a2 = texture2D(u_texture, vec2(x + pxx, y + pxy)).xyz;
			vec3 a3 = texture2D(u_texture, vec2(x - pxx, y)).xyz;
			vec3 a5 = texture2D(u_texture, vec2(x + pxx, y)).xyz;
			vec3 a6 = texture2D(u_texture, vec2(x - pxx, y - pxy)).xyz;
			vec3 a7 = texture2D(u_texture, vec2(x, y - pxy)).xyz;
			vec3 a8 = texture2D(u_texture, vec2(x + pxx, y - pxy)).xyz;
			vec3 gx = -a0 + a2 - 2.0 * a3 + 2.0 * a5 - a6 + a8;
			vec3 gy = -a0 - 2.0 * a1 - a2 + a6 + 2.0 * a7 + a8;
			gl_FragColor = vec4(sqrt(gx * gx + gy * gy), 1.0);
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
	const widthLocation = gl.getUniformLocation(program, "width");
	const heightLocation = gl.getUniformLocation(program, "height");
	const positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	gl.useProgram(program);
	gl.enableVertexAttribArray(positionAttributeLocation);
	gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
		-1, -1, -1, 1, 1, -1,
		1, 1, 1, -1, -1, 1,
	]), gl.STATIC_DRAW);
	gl.uniform1f(widthLocation, width);
	gl.uniform1f(heightLocation, height);
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
	return {
		canvas,
		sobel: image => {
			texture.image = image;
			handleLoadedTexture(gl, texture);
		}
	};
};