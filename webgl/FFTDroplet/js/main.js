'use strict';
// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating

// requestAnimationFrame polyfill by Erik Möller
// fixes from Paul Irish and Tino Zijdel

(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() {
                    callback(currTime + timeToCall);
                },
                timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());

var SHADERSCRIPTS = ['fs-default', 'fs-show', 'fs-advect', 'fs-MacCormack', 'fs-gravity', 'fs-proj', 'fs-fft', 'fs-fftv'];

function getShader(gl, id) {
    var type = id.substring(0, 2);
    var str = readFile('./shaders/' + id);
    var shader;
    if (type == "fs")
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    else if (type == "vs")
        shader = gl.createShader(gl.VERTEX_SHADER);
    else return null;
    gl.shaderSource(shader, str);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) == 0)
        alert(id + "\n" + gl.getShaderInfoLog(shader));
    return shader;
}

function getProgram(gl, vs_id, fs_id) {
    var program = gl.createProgram();
    gl.attachShader(program, getShader(gl, vs_id));
    if (arguments.length == 3) {
        gl.attachShader(program, getShader(gl, fs_id));
    } else {
        gl.attachShader(program, getShader(gl, "vs-default"));
    }
    gl.linkProgram(program);

    return program;
}

function readFile(path) {
    var request = new XMLHttpRequest();
    request.open("GET", path, false);
    request.send(null);
    var returnValue = request.responseText;
    return returnValue;
}

function createTexture(gl, width, height, pixels) {
    if (!gl.ntextures) {
        gl.ntextures = 1;
    } else {
        gl.ntextures++;
    }
    var id = gl.ntextures - 1;

    var texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + id);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    //gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, width, height, 0,
        gl.RGB, gl.FLOAT, pixels);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    texture.id = id;
    texture.width = width;
    texture.height = height;

    return texture;
}

function textureFramebuffer(gl, texture) {
    var fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D, texture, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE)
        alert(err + "FLOAT as the color attachment to an FBO");

    return fb;
}

function bindFramebuffer(gl, texture) {
    texture.fb = textureFramebuffer(gl, texture);
}

function render(gl, prog, src, tgt, uniforms) {
    gl.useProgram(prog);
    var sampLoc = gl.getUniformLocation(prog, "samp");
    gl.uniform1i(sampLoc, src.id);
    gl.uniform1f(gl.getUniformLocation(prog, "M"), src.width);
    gl.uniform1f(gl.getUniformLocation(prog, "N"), src.height);

    if (uniforms) {
        for (var u in uniforms) {
            gl.uniform1f(gl.getUniformLocation(prog, u), uniforms[u]);
        }
    }
    if (!tgt) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, tgt.fb);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.flush();
}

function FluidSim(gl, width, height) {
    this.gl = gl;
    this.width = gl.canvas.width;
    this.height = gl.canvas.height;

    this.log2width = Math.log(this.width) / Math.LN2;
    this.log2height = Math.log(this.height) / Math.LN2;
    if (Math.floor(this.log2width) != this.log2width || Math.floor(this.log2height) != this.log2height) {
        return false;
    }

    this.current = 0;
    this.other = 1;
    this.textures = [];

    this.init = function() {
        var gl = this.gl;

        this.loadPrograms();

        var prog_default = this.programs["fs-default"];

        gl.useProgram(prog_default);
        var aPosLoc = gl.getAttribLocation(prog_default, "aPos");
        var aTexLoc = gl.getAttribLocation(prog_default, "aTexCoord");
        gl.enableVertexAttribArray(aPosLoc);
        gl.enableVertexAttribArray(aTexLoc);
        var data = new Float32Array([-1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1,
            1, 1, 1, 1
        ]);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, gl.FALSE, 16, 0);
        gl.vertexAttribPointer(aTexLoc, 2, gl.FLOAT, gl.FALSE, 16, 8);

        this.textures[0] = createTexture(gl, this.width, this.height, null);
        this.textures[1] = createTexture(gl, this.width, this.height, null);
        this.textures[2] = createTexture(gl, this.width, this.height, null);
        this.textures[3] = createTexture(gl, this.width, this.height, null);

        bindFramebuffer(gl, this.textures[0]);
        bindFramebuffer(gl, this.textures[1]);
        bindFramebuffer(gl, this.textures[2]);
        bindFramebuffer(gl, this.textures[3]);

        var W_M = new Float32Array(3 * this.width);
        var W_N = new Float32Array(3 * this.height);
        var pi2 = 2 * Math.PI;
        var a = pi2 / this.width;
        for (var i = 0; i < this.width; i++) {
            W_M[3 * i] = Math.cos(a * i);
            W_M[3 * i + 1] = Math.sin(a * i);
        }
        a = pi2 / this.height;
        for (var i = 0; i < this.height; i++) {
            W_N[3 * i] = Math.cos(a * i);
            W_N[3 * i + 1] = Math.sin(a * i);
        }
        var textureW_M = createTexture(gl, this.width, 1, W_M);
        var textureW_N = createTexture(gl, this.height, 1, W_N);

        this.setSampler("fs-fft", "W_M", textureW_M);
        this.setSampler("fs-fft", "W_N", textureW_N);

        this.setSampler("fs-fftv", "W_M", textureW_M);

        this.setTimeStep(0.01);
    }

    this.setTimeStep = function(timestep) {
        this.timestep = timestep;
        this.setUniform1f("fs-gravity", "dt", timestep);
        this.setUniform1f("fs-advect", "dt", timestep);
        this.setUniform1f("fs-MacCormack", "dt", timestep);
        this.setUniform1f("fs-proj", "dt", timestep);
    }

    this.setViscosity = function(visc) {
        this.setUniform1f("fs-proj", "visc", visc);
    }

    this.setGravity = function(g) {
        this.setUniform1f("fs-gravity", "g", g);
    }

    this.setData = function(data) {
        var gl = this.gl;

        gl.activeTexture(gl.TEXTURE0 + this.current);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[this.current]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, this.width, this.height, 0,
            gl.RGB, gl.FLOAT, data);
    }

    this.loadPrograms = function() {
        this.programs = [];
        for (var i = 0; i < SHADERSCRIPTS.length; i++) {
            var id = SHADERSCRIPTS[i];
            this.programs[id] = getProgram(this.gl, SHADERSCRIPTS[i]);

        }
    }

    this.setUniform1f = function(prog_id, uniform, value) {
        var gl = this.gl;
        var prog = this.programs[prog_id];

        gl.useProgram(prog);
        gl.uniform1f(gl.getUniformLocation(prog, uniform), value);
    }

    this.setUniform1i = function(prog_id, uniform, value) {
        var gl = this.gl;
        var prog = this.programs[prog_id];

        gl.useProgram(prog);
        gl.uniform1i(gl.getUniformLocation(prog, uniform), value);
    }

    this.setSampler = function(prog_id, sampler, texture) {
        this.setUniform1i(prog_id, sampler, texture.id);
    }

    this.runProgram = function(prog_id) {
        render(this.gl, this.programs[prog_id], this.textures[this.current], this.textures[this.other]);
        this.current = this.other;
        this.other = (this.current + 1) % 2;
    }

    this.show = function(fs) {
        if (fs) {
            render(this.gl, this.programs[fs], this.textures[this.current], null);
        } else {
            render(this.gl, this.programs["fs-default"], this.textures[this.current], null);
        }
    }

    this.project = function() {
        if (this.width == this.height) {
            this.setUniform1f("fs-fftv", "sign", -1);
            for (var i = 1; i <= this.log2width; i++) {
                this.setUniform1f("fs-fftv", "iter", i);
                this.runProgram("fs-fftv");
            }
        } else {
            this.setUniform1f("fs-fft", "sign", -1);
            this.setUniform1f("fs-fft", "dim", 0);
            for (var i = 1; i <= this.log2width; i++) {
                this.setUniform1f("fs-fft", "iter", i);
                this.runProgram("fs-fft");
            }

            this.setUniform1f("fs-fft", "dim", 1);
            for (var i = 1; i <= this.log2height; i++) {
                this.setUniform1f("fs-fft", "iter", i);
                this.runProgram("fs-fft");
            }
        }

        this.runProgram("fs-proj");

        if (this.width == this.height) {
            this.setUniform1f("fs-fftv", "sign", 1);
            for (var i = 1; i <= this.log2width; i++) {
                this.setUniform1f("fs-fftv", "iter", i);
                this.runProgram("fs-fftv");
            }
        } else {
            this.setUniform1f("fs-fft", "sign", 1);
            this.setUniform1f("fs-fft", "dim", 0);
            for (var i = 1; i <= this.log2width; i++) {
                this.setUniform1f("fs-fft", "iter", i);
                this.runProgram("fs-fft");
            }

            this.setUniform1f("fs-fft", "dim", 1);
            for (var i = 1; i <= this.log2height; i++) {
                this.setUniform1f("fs-fft", "iter", i);
                this.runProgram("fs-fft");
            }
        }
    }

    this.advectMacCormack = function(mode) {
        this.setUniform1i("fs-advect", "mode", mode);
        render(this.gl, this.programs["fs-advect"], this.textures[this.current], this.textures[2]);
        this.setUniform1f("fs-advect", "dt", -this.timestep);
        render(this.gl, this.programs["fs-advect"], this.textures[2], this.textures[3]);
        this.setUniform1f("fs-advect", "dt", this.timestep);

        this.setUniform1i("fs-MacCormack", "mode", mode);
        this.setSampler("fs-MacCormack", "samphat", this.textures[3]);
        this.setSampler("fs-MacCormack", "samphat1", this.textures[2]);
        render(this.gl, this.programs["fs-MacCormack"], this.textures[this.current], this.textures[this.other]);
        this.current = this.other;
        this.other = (this.current + 1) % 2;
    }

    this.step = function() {
        this.runProgram("fs-gravity");

        // this.project();  //one more projection, more accurate 

        // this.setUniform1i("fs-advect","mode",1);
        // this.runProgram("fs-advect");
        this.advectMacCormack(1);

        this.project();

        // this.setUniform1i("fs-advect","mode",2);
        // this.runProgram("fs-advect");
        this.advectMacCormack(2);

        this.show("fs-show");
    }

    this.startAnimation = function() {
        if (this.running) {
            return;
        }
        var self = this;
        var frames = 0;
        var t0 = Date.now();
        this.running = requestAnimationFrame(stepMe);

        function stepMe() {
            self.step();
            frames++;
            var t1 = Date.now();
            if (t1 - t0 >= 1000) {
                document.getElementById("fps").innerHTML = "FPS:" + Math.round(frames * 1000 / (t1 - t0));
                t0 = t1;
                frames = 0;
            }
            requestAnimationFrame(stepMe);
        };
    }

    this.stopAnimation = function() {
        if (this.running) {
            cancelAnimationFrame(this.running);
            this.running = null;
        }
    }

    this.init();
}

var sim, initdata;

function main() {
    var c = document.getElementById("c");
    var gl = c.getContext("experimental-webgl");
    if (!gl) alert("Can't get WebGL");
    gl.getExtension("OES_texture_float");
    gl.getExtension("OES_texture_float_linear");

    var M = c.width,
        N = c.height;
    sim = new FluidSim(gl);

    var pixels = [],
        T;
    var minD = Math.min(M, N);
    var centerX = M / minD;
    var centerY = N / minD;
    for (var i = 0; i < N; i++) {
        for (var j = 0; j < M; j++) {
            var x = 2 / minD * (j + 0.5) - centerX,
                y = 2 / minD * (i + 0.5) - centerY - .75;
            if (x * x + y * y > .05) T = 0;
            else T = 1;
            pixels.push(0, 0, T);
        }
    }

    initdata = new Float32Array(M * N * 3);
    initdata.set(pixels);
    sim.setData(initdata);

    setGravity();
    setViscosity();

    sim.show("fs-show");
}

function toggleAnimation() {
    if (!sim.running) {
        sim.startAnimation();
        document.getElementById("toggle").innerHTML = "Pause";
    } else {
        sim.stopAnimation();
        document.getElementById("toggle").innerHTML = "Continue";
    }
}

function reset() {
    var running = sim.running;
    sim.stopAnimation();
    sim.setData(initdata);
    sim.show("fs-show");

    if (running) {
        sim.startAnimation();
    }
}

function setGravity() {
    sim.setGravity(-document.getElementById("gravity").value);
}

function setViscosity() {
    sim.setViscosity(document.getElementById("viscosity").value);
}