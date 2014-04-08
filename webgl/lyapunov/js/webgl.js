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

var pos = [0, 0, 0];
var maxSpeed = 1;

function initShaders(gl, fragment, vertex) {
    var fragmentShader = getShader(gl, fragment);
    if (!fragmentShader) {
        return;
    }
    var vertexShader = getShader(gl, vertex);
    if (!vertexShader) {
        return;
    }

    var shader = gl.createProgram();
    gl.attachShader(shader, vertexShader);
    gl.attachShader(shader, fragmentShader);
    gl.linkProgram(shader);

    if (!gl.getProgramParameter(shader, gl.LINK_STATUS)) {
        alert("Unable to link the shader program: " + gl.getProgramInfoLog(shader));
        return null;
    }

    gl.useProgram(shader);
    shader.aVertexPosition = gl.getAttribLocation(shader, "aVertexPosition");
    shader.uTime = gl.getUniformLocation(shader, "uTime");
    shader.uPos = gl.getUniformLocation(shader, "uPos");
    shader.uDir = gl.getUniformLocation(shader, "uDir");
    return shader;
}

function getShader(gl, id) {
    var source = readFile('./shaders/' + id);
    var type = id.substring(id.length - 2);

    var shader = null;
    if (type == "fs") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (type == "vs") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

function readFile(path) {
    var request = new XMLHttpRequest();
    request.open("GET", path, false);
    request.send(null);
    var returnValue = request.responseText;
    return returnValue;
}

function zirconCity() {
    lyapunov("zirconCity", "zirconcity-fs", "shader-vs")
}

function zirconCityFull() {
    lyapunov("zircon_full", "zirconfull-fs", "shader-vs")
}

function ab_tan() {
    lyapunov("simpleLog", "ab_tan-fs", "shader-vs")
}
function tester() {
    lyapunov("test", "shader-fs", "shader-vs")
}

function lyapunov(id, fragmentShader, vertexShader) {
    var canvas = document.getElementById(id);
    var gl = canvas.getContext("experimental-webgl");

    var fps = document.createElement("p");
    fps.appendChild(document.createTextNode("...initializing..."));
    canvas.parentNode.appendChild(fps);

    /* initialize shaders. */
    var shader = initShaders(gl, fragmentShader, vertexShader);
    if (!shader) {
        return;
    }

    effectInit(gl, shader, canvas, fps);
}

function effectInit(gl, shader, canvasElement, fps) {
    effectStart(gl, shader, canvasElement, fps);
}
var effectPos = function(x, y, z) {
    pos = [x, y, z];
}

var effectSpeed = function(s) {
    maxSpeed = s;
}

var effectStart = function(gl, shader, canvas, fps) {
    /* Initialize the quad required for world rendering */
    var quadVertex = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVertex);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        1.0, 1.0, 0.0,
        1.0, -1.0, 0.0, -1.0, 1.0, 0.0, -1.0, -1.0, 0.0
    ]), gl.STATIC_DRAW);

    var forward = false;
    var speed = 0;
    var mouseX = 0.5;
    var mouseY = 0.5;

    canvas.addEventListener('mousemove', function(evt) {
        mouseX = (evt.offsetX || evt.layerX) / this.width;
        mouseY = (evt.offsetY || evt.layerY) / this.height;
    }, false);

    canvas.addEventListener('mousedown', function(evt) {
        speed = 0;
        forward = true;
    }, false);
    canvas.addEventListener('mouseup', function(evt) {
        forward = false;
    }, false);

    var lastTime = 0;
    var startTime = Date.now();
    var fpsNumber = 0;
    var anim = requestAnimationFrame(step);

    function step() {
        var oldLastTime = lastTime;
        lastTime = (Date.now() - startTime) / 1000;
        var timeStep = lastTime - oldLastTime;

        gl.uniform1f(shader.uTime, lastTime);
        var dz = Math.cos(mouseY * Math.PI);
        var dz2 = Math.sin(mouseY * Math.PI);
        var dx = Math.sin(mouseX * Math.PI * 2) * dz2;
        var dy = Math.cos(mouseX * Math.PI * 2) * dz2;
        if (forward) {
            pos[0] += dx * timeStep * speed;
            pos[1] += dy * timeStep * speed;
            pos[2] += dz * timeStep * speed;
            speed += timeStep * maxSpeed;
            if (speed > maxSpeed) {
                speed = maxSpeed;
            }
        }
        gl.uniform3f(shader.uPos, pos[0], pos[1], pos[2]);
        gl.uniform3f(shader.uDir, dx, dy, dz);
        fps.removeChild(fps.firstChild);
        fps.appendChild(document.createTextNode(Math.round(fpsNumber / lastTime) + " fps"));
        fpsNumber++;

        gl.bindBuffer(gl.ARRAY_BUFFER, quadVertex);
        gl.vertexAttribPointer(shader.aVertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shader.aVertexPosition);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.flush();
        requestAnimationFrame(step);
    }
}
