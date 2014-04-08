(function(exports) {
    "use strict";
    /*global window,vec3*/

    exports = exports || window;

    function step(edge, x) {
        return [
            (x[0] < edge[0]) ? 0.0 : 1.0, (x[1] < edge[1]) ? 0.0 : 1.0, (x[2] < edge[2]) ? 0.0 : 1.0
        ];
    }

    function step_vec4(edge, x) {
        return [
            (x[0] < edge[0]) ? 0.0 : 1.0, (x[1] < edge[1]) ? 0.0 : 1.0, (x[2] < edge[2]) ? 0.0 : 1.0, (x[3] < edge[3]) ? 0.0 : 1.0
        ];
    }

    function min(x, y) {
        return [
            y[0] < x[0] ? y[0] : x[0],
            y[1] < x[1] ? y[1] : x[1],
            y[2] < x[2] ? y[2] : x[2]
        ];
    }

    function max(x, y) {
        return [
            y[0] > x[0] ? y[0] : x[0],
            y[1] > x[1] ? y[1] : x[1],
            y[2] > x[2] ? y[2] : x[2]
        ];
    }

    function max_vec4(x, y) {
        return [
            y[0] > x[0] ? y[0] : x[0],
            y[1] > x[1] ? y[1] : x[1],
            y[2] > x[2] ? y[2] : x[2],
            y[3] > x[3] ? y[3] : x[3]
        ];
    }

    function vec4_dot(left, right) {
        return left[0] * right[0] +
            left[1] * right[1] +
            left[2] * right[2] +
            left[3] * right[3];
    }

    //
    // Description : Array and textureless GLSL 2D/3D/4D simplex 
    //               noise functions.
    //      Author : Ian McEwan, Ashima Arts.
    //  Maintainer : ijm
    //     Lastmod : 20110822 (ijm)
    //     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
    //               Distributed under the MIT License. See LICENSE file.
    //               https://github.com/ashima/webgl-noise
    // 

    function mod289_vec3(x) {
        var temp = (1.0 / 289.0);
        return [
            x[0] - Math.floor(x[0] * temp) * 289.0,
            x[1] - Math.floor(x[1] * temp) * 289.0,
            x[2] - Math.floor(x[2] * temp) * 289.0
        ];
    }

    function mod289_vec4(x) {
        var temp = (1.0 / 289.0);
        return [
            x[0] - Math.floor(x[0] * temp) * 289.0,
            x[1] - Math.floor(x[1] * temp) * 289.0,
            x[2] - Math.floor(x[2] * temp) * 289.0,
            x[3] - Math.floor(x[3] * temp) * 289.0
        ];
    }

    function permute_vec4(x) {
        return mod289_vec4([
            ((x[0] * 34.0) + 1.0) * x[0], ((x[1] * 34.0) + 1.0) * x[1], ((x[2] * 34.0) + 1.0) * x[2], ((x[3] * 34.0) + 1.0) * x[3]
        ]);
    }

    function taylorInvSqrt_vec4(r) {
        return [
            1.79284291400159 - 0.85373472095314 * r[0],
            1.79284291400159 - 0.85373472095314 * r[1],
            1.79284291400159 - 0.85373472095314 * r[2],
            1.79284291400159 - 0.85373472095314 * r[3]
        ];
    }

    exports.snoise = function(v) {
        var C = [1.0 / 6.0, 1.0 / 3.0];
        var D = [0.0, 0.5, 1.0, 2.0];

        var temp0 = vec3.create();
        var temp3 = vec3.dot(v, [C[1], C[1], C[1]]);
        vec3.add(v, [temp3, temp3, temp3], temp0);
        var i = [Math.floor(temp0[0]), Math.floor(temp0[1]), Math.floor(temp0[2])];
        var temp1 = vec3.create();
        vec3.subtract(v, i, temp1);
        var temp2 = vec3.dot(i, [C[0], C[0], C[0]]);
        var x0 = vec3.create();
        vec3.add(temp1, [temp2, temp2, temp2], x0);

        var g = step([x0[1], x0[2], x0[0]], [x0[0], x0[1], x0[2]]);
        var l = [1.0 - g[0], 1.0 - g[1], 1.0 - g[2]];
        var i1 = min([g[0], g[1], g[2]], [l[2], l[0], l[1]]);
        var i2 = max([g[0], g[1], g[2]], [l[2], l[0], l[1]]);

        var temp4 = vec3.create();
        vec3.subtract(x0, i1, temp4);
        var x1 = vec3.create();
        vec3.add(temp4, [C[0], C[0], C[0]], x1);
        var temp5 = vec3.create();
        vec3.subtract(x0, i2, temp5);
        var x2 = vec3.create();
        vec3.add(temp5, [C[1], C[1], C[1]], x2);
        var x3 = vec3.create();
        vec3.subtract(x0, [D[1], D[1], D[1]], x3);

        i = mod289_vec3(i);
        var p = permute_vec4([i[2] + 0.0, i[2] + i1[2], i[2] + i2[2], i[2] + 1.0]);
        p[0] += i[1] + 0.0;
        p[1] += i[1] + i1[1];
        p[2] += i[1] + i2[1];
        p[3] += i[1] + 1.0;
        p = permute_vec4(p);
        p[0] += i[0] + 0.0;
        p[1] += i[0] + i1[0];
        p[2] += i[0] + i2[0];
        p[3] += i[0] + 1.0;
        p = permute_vec4(p);

        var ns = [
            0.28571430, -0.92857140,
            0.14285715
        ];

        var j = [
            p[0] - 49.0 * Math.floor(p[0] * ns[2] * ns[2]),
            p[1] - 49.0 * Math.floor(p[1] * ns[2] * ns[2]),
            p[2] - 49.0 * Math.floor(p[2] * ns[2] * ns[2]),
            p[3] - 49.0 * Math.floor(p[3] * ns[2] * ns[2])
        ];

        var x_ = [
            Math.floor(j[0] * ns[2]),
            Math.floor(j[1] * ns[2]),
            Math.floor(j[2] * ns[2]),
            Math.floor(j[3] * ns[2])
        ];
        var y_ = [
            Math.floor(j[0] - 7.0 * x_[0]),
            Math.floor(j[1] - 7.0 * x_[1]),
            Math.floor(j[2] - 7.0 * x_[2]),
            Math.floor(j[3] - 7.0 * x_[3])
        ];

        var x = [
            x_[0] * ns[0] + ns[1],
            x_[1] * ns[0] + ns[1],
            x_[2] * ns[0] + ns[1],
            x_[3] * ns[0] + ns[1]
        ];
        var y = [
            y_[0] * ns[0] + ns[1],
            y_[1] * ns[0] + ns[1],
            y_[2] * ns[0] + ns[1],
            y_[3] * ns[0] + ns[1]
        ];
        var h = [
            1.0 - Math.abs(x[0]) - Math.abs(y[0]),
            1.0 - Math.abs(x[1]) - Math.abs(y[1]),
            1.0 - Math.abs(x[2]) - Math.abs(y[2]),
            1.0 - Math.abs(x[3]) - Math.abs(y[3])
        ];

        var b0 = [x[0], x[1], y[0], y[1]];
        var b1 = [x[2], x[3], y[2], y[3]];

        var s0 = [
            Math.floor(b0[0]) * 2.0 + 1.0,
            Math.floor(b0[1]) * 2.0 + 1.0,
            Math.floor(b0[2]) * 2.0 + 1.0,
            Math.floor(b0[3]) * 2.0 + 1.0
        ];
        var s1 = [
            Math.floor(b1[0]) * 2.0 + 1.0,
            Math.floor(b1[1]) * 2.0 + 1.0,
            Math.floor(b1[2]) * 2.0 + 1.0,
            Math.floor(b1[3]) * 2.0 + 1.0
        ];
        var sh = step_vec4(h, [0.0, 0.0, 0.0, 0.0]);
        sh[0] = -sh[0];
        sh[1] = -sh[1];
        sh[2] = -sh[2];
        sh[3] = -sh[3];

        var a0 = [
            b0[0] + s0[0] * sh[0],
            b0[2] + s0[2] * sh[0],
            b0[1] + s0[1] * sh[1],
            b0[3] + s0[3] * sh[1]
        ];
        var a1 = [
            b1[0] + s1[0] * sh[2],
            b1[2] + s1[2] * sh[2],
            b1[1] + s1[1] * sh[3],
            b1[3] + s1[3] * sh[3]
        ];

        var p0 = [a0[0], a0[1], h[0]];
        var p1 = [a0[2], a0[3], h[1]];
        var p2 = [a1[0], a1[1], h[2]];
        var p3 = [a1[2], a1[3], h[3]];

        var norm = taylorInvSqrt_vec4([vec3.dot(p0, p0), vec3.dot(p1, p1), vec3.dot(p2, p2), vec3.dot(p3, p3)]);
        p0 = [p0[0] * norm[0], p0[1] * norm[0], p0[2] * norm[0]];
        p1 = [p1[0] * norm[1], p1[1] * norm[1], p1[2] * norm[1]];
        p2 = [p2[0] * norm[2], p2[1] * norm[2], p2[2] * norm[2]];
        p3 = [p3[0] * norm[3], p3[1] * norm[3], p3[2] * norm[3]];

        var m = max_vec4([
            0.6 - vec3.dot(x0, x0),
            0.6 - vec3.dot(x1, x1),
            0.6 - vec3.dot(x2, x2),
            0.6 - vec3.dot(x3, x3)
        ], [
            0.0,
            0.0,
            0.0,
            0.0
        ]);
        m[0] *= m[0];
        m[1] *= m[1];
        m[2] *= m[2];
        m[3] *= m[3];

        return 42.0 * vec4_dot([
            m[0] * m[0],
            m[1] * m[1],
            m[2] * m[2],
            m[3] * m[3]
        ], [
            vec3.dot(p0, x0),
            vec3.dot(p1, x1),
            vec3.dot(p2, x2),
            vec3.dot(p3, x3)
        ]);
    };

}());
