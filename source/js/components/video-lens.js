/**
 * <video-player> 中央按钮的 WebGL 液态玻璃（按需动态加载，见 video-player.js）。
 *
 * 取自 loomix 的思路——播放 / 快进快退三枚按钮下各有一片「透镜」，直接折射视频画面——
 * 但不依赖 html-to-image 与 2800 行的通用库：视频帧用 texImage2D 直传 GPU（浏览器的零拷贝
 * 通道），一张覆盖按钮簇的小画布、一个全屏三角形、一段片元着色器画完所有玻璃。
 *
 * 光学模型（片元着色器）：
 * - 形状：三个圆的有向距离场做 smooth-min 并集，按钮按下胀大时相邻玻璃会像液滴一样
 *   牵出一道桥（Apple GlassEffectContainer 的融合观感）
 * - 厚度：边缘是凸起的 squircle 斜面 h(t) = (1 − (1 − t)⁴)^¼，按高度场梯度求法线，
 *   视线垂直入射，按斯涅尔定律（n = 1.5）折射后穿过玻璃厚度落到底面取样——边缘把画面
 *   向内拉伸放大；R / G / B 取略有差异的折射率，边缘带出一线色散
 * - 磨砂：取样时抬高 mip 级（textureLod），用 GPU 预生成的 mipmap 做廉价的轻度模糊，
 *   同时解决视频缩小显示时的走样
 * - 可读性：在按钮正下方取一个覆盖整枚按钮的粗 mip 级读出区域亮度，画面越亮压暗越多
 *   （loomix 用 CPU getImageData 20 次/秒读回，这里在着色器里一次采样完成，零读回）
 * - 光照：极细的高光边（左上迎光最亮、右下回光）、斜面菲涅尔提亮、顶部内侧一弯柔光，
 *   外侧一圈柔和投影；指针悬停微微提亮，按下时从按压点亮起一团光（iOS 的 illumination）
 *
 * 渲染只在「有新视频帧」或「按钮动画进行中」时发生，由 video-player.js 驱动；
 * 视频跨域且未开 CORS 时 texImage2D 会抛 SecurityError，上传失败即交回 CSS 玻璃。
 */

const VERTEX_SHADER = `#version 300 es
in vec2 a_pos;
uniform vec2 u_size;
out vec2 v_px;
void main() {
  vec2 uv = a_pos * 0.5 + 0.5;
  v_px = vec2(uv.x, 1.0 - uv.y) * u_size;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_px;
out vec4 outColor;

uniform sampler2D u_tex;
uniform vec2 u_size;      // 画布尺寸（CSS px）
uniform vec2 u_origin;    // 画布左上角在播放器中的位置（CSS px）
uniform vec4 u_video;     // 视频内容区（object-fit: contain 之后）在播放器中的位置与尺寸
uniform vec2 u_texSize;   // 视频原始像素尺寸
uniform float u_dpr;
uniform int u_count;
uniform vec4 u_orb[3];    // xy 圆心（画布 CSS px）、z 半径、w 按压 0..1
uniform vec4 u_fx[3];     // xy 指针位置（画布 CSS px）、z 悬停 0..1

const float IOR = 1.5;
const float MERGE = 8.0;

float smin(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}

float field(vec2 p) {
  float d = 1e4;
  for (int i = 0; i < 3; i++) {
    if (i >= u_count) break;
    d = smin(d, length(p - u_orb[i].xy) - u_orb[i].z, MERGE);
  }
  return d;
}

int owner(vec2 p) {
  int k = 0;
  float best = 1e4;
  for (int i = 0; i < 3; i++) {
    if (i >= u_count) break;
    float d = length(p - u_orb[i].xy) - u_orb[i].z;
    if (d < best) {
      best = d;
      k = i;
    }
  }
  return k;
}

vec3 sampleVideo(vec2 playerPx, float lod) {
  vec2 uv = (playerPx - u_video.xy) / u_video.zw;
  vec2 inside = step(vec2(0.0), uv) * step(uv, vec2(1.0));
  return textureLod(u_tex, clamp(uv, 0.0, 1.0), lod).rgb * inside.x * inside.y;
}

vec2 refractOffset(vec3 n, float eta, float thickness, float limit) {
  vec3 t = refract(vec3(0.0, 0.0, -1.0), n, eta);
  vec2 offset = t.xy / max(-t.z, 0.3) * thickness;
  float len = length(offset);
  return len > limit ? offset * (limit / len) : offset;
}

void main() {
  vec2 p = v_px;
  float d = field(p);
  float aa = 1.0 / u_dpr;

  int k = owner(p);
  vec4 orb = u_orb[k];
  vec4 fx = u_fx[k];
  float radius = orb.z;
  float press = orb.w;

  // 外侧投影：略向下偏，随按钮大小放宽
  float shadowDistance = max(field(p - vec2(0.0, 3.0)), 0.0);
  float spread = radius * 0.3 + 6.0;
  float shadow = exp(-(shadowDistance * shadowDistance) / (spread * spread)) * 0.3;

  float cover = clamp(0.5 - d / aa, 0.0, 1.0);
  if (cover <= 0.0) {
    outColor = vec4(0.0, 0.0, 0.0, shadow);
    return;
  }

  vec2 e = vec2(0.5, 0.0);
  vec2 g = vec2(field(p + e.xy) - field(p - e.xy), field(p + e.yx) - field(p - e.yx));
  vec2 nOut = g / max(length(g), 1e-4);

  // squircle 斜面：t 为离边深度 / 斜面宽度，slope = dh/dt
  float depth = max(-d, 0.0);
  float bevel = max(radius * 0.62, 6.0);
  float t = clamp(depth / bevel, 0.0, 1.0);
  float u = 1.0 - t;
  float base = max(1.0 - u * u * u * u, 1e-4);
  float slope = min(u * u * u * pow(base, -0.75), 10.0);
  float height = bevel * 0.55;
  vec3 n = normalize(vec3(nOut * slope * height / bevel, 1.0));
  float thickness = height * pow(base, 0.25) + radius * 0.35;
  float limit = radius * 0.55;

  // 按下时玻璃胀起：整体向圆心收拢取样，画面在按钮里被放大一点
  vec2 lift = (orb.xy - p) * (0.05 + 0.1 * press);
  vec2 at = p + u_origin + lift;

  float texelsPerPixel = u_texSize.x / max(u_video.z * u_dpr, 1.0);
  float lod = max(log2(max(texelsPerPixel, 1e-3)), 0.0) + 1.15;

  vec3 color = vec3(
    sampleVideo(at + refractOffset(n, 1.0 / (IOR - 0.014), thickness, limit), lod).r,
    sampleVideo(at + refractOffset(n, 1.0 / IOR, thickness, limit), lod).g,
    sampleVideo(at + refractOffset(n, 1.0 / (IOR + 0.02), thickness, limit), lod).b
  );

  // 与 CSS 玻璃一致：保留原始饱和度，仅将背景亮度降到 95%。
  color *= 0.95;

  // 斜面菲涅尔提亮 + 顶部内侧一弯柔光
  vec2 light = normalize(vec2(-0.6, -0.8));
  float facing = dot(nOut, light);
  color += pow(1.0 - n.z, 2.0) * 0.2;
  // GLSL 的 pow 对负底数未定义，高斯项用平方
  float band = (depth - bevel * 0.2) / (bevel * 0.16);
  float crescent = exp(-band * band) * pow(max(facing, 0.0), 3.0);
  color += crescent * 0.14;

  // 极细高光边：迎光侧最亮，对角是穿过玻璃的回光
  float rimBand = 1.0 - smoothstep(0.0, 1.5, depth);
  float rim = rimBand * (0.2 + 0.8 * pow(max(facing, 0.0), 1.6) + 0.45 * pow(max(-facing, 0.0), 2.0));
  color = mix(color, vec3(1.0), clamp(rim, 0.0, 1.0) * 0.82);

  // 悬停提亮、按压时从指针处亮起一团光
  vec2 toPointer = p - fx.xy;
  float glow = exp(-dot(toPointer, toPointer) / (radius * radius * 0.9));
  color += fx.z * 0.05 + press * 0.24 * glow;

  color = clamp(color, 0.0, 1.0);
  float alpha = cover + shadow * (1.0 - cover);
  outColor = vec4(color * cover, alpha);
}`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`video-lens: shader compile failed: ${log}`);
  }
  return shader;
}

function link(gl) {
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
  gl.bindAttribLocation(program, 0, "a_pos");
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`video-lens: program link failed: ${gl.getProgramInfoLog(program)}`);
  }
  return program;
}

/**
 * 创建透镜渲染器；不支持 WebGL2 或编译失败返回 null（调用方保留 CSS 玻璃）。
 * @param {HTMLCanvasElement} canvas
 * @param {{ onLost?: () => void }} [options]
 */
export function createVideoLens(canvas, { onLost } = {}) {
  let gl;
  try {
    gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: "low-power",
    });
  } catch {
    return null;
  }
  if (!gl) return null;

  let program;
  try {
    program = link(gl);
  } catch (error) {
    console.warn(error);
    return null;
  }

  const uniforms = {};
  for (const name of ["u_tex", "u_size", "u_origin", "u_video", "u_texSize", "u_dpr", "u_count", "u_orb", "u_fx"]) {
    uniforms[name] = gl.getUniformLocation(program, name);
  }

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  // 一个盖满视口的大三角形，比两个三角形的矩形少一条对角线上的重复着色
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);

  let lost = false;
  let hasFrame = false;
  const textureSize = [1, 1];
  const orbData = new Float32Array(12);
  const fxData = new Float32Array(12);

  const handleLost = (event) => {
    event.preventDefault();
    lost = true;
    onLost?.();
  };
  canvas.addEventListener("webglcontextlost", handleLost);

  return {
    get ready() {
      return !lost && hasFrame;
    },

    /** 上传当前视频帧；跨域未授权（SecurityError）或尚无画面时返回 false */
    upload(video) {
      if (lost || video.readyState < 2 || !video.videoWidth) return false;
      try {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        gl.generateMipmap(gl.TEXTURE_2D);
      } catch {
        return false;
      }
      textureSize[0] = video.videoWidth;
      textureSize[1] = video.videoHeight;
      hasFrame = true;
      return true;
    },

    /**
     * @param {{ width: number, height: number, dpr: number, origin: [number, number],
     *   video: [number, number, number, number], orbs: Array<{ x: number, y: number, r: number,
     *   press: number, hover: number, px: number, py: number }> }} scene
     */
    draw(scene) {
      if (lost || !hasFrame) return;
      const pixelWidth = Math.max(1, Math.round(scene.width * scene.dpr));
      const pixelHeight = Math.max(1, Math.round(scene.height * scene.dpr));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      const count = Math.min(3, scene.orbs.length);
      scene.orbs.slice(0, count).forEach((orb, index) => {
        orbData.set([orb.x, orb.y, orb.r, orb.press], index * 4);
        fxData.set([orb.px, orb.py, orb.hover, 0], index * 4);
      });

      gl.viewport(0, 0, pixelWidth, pixelHeight);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(uniforms.u_tex, 0);
      gl.uniform2f(uniforms.u_size, scene.width, scene.height);
      gl.uniform2f(uniforms.u_origin, scene.origin[0], scene.origin[1]);
      gl.uniform4f(uniforms.u_video, ...scene.video);
      gl.uniform2f(uniforms.u_texSize, textureSize[0], textureSize[1]);
      gl.uniform1f(uniforms.u_dpr, scene.dpr);
      gl.uniform1i(uniforms.u_count, count);
      gl.uniform4fv(uniforms.u_orb, orbData);
      gl.uniform4fv(uniforms.u_fx, fxData);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },

    destroy() {
      canvas.removeEventListener("webglcontextlost", handleLost);
      if (lost) return;
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      lost = true;
    },
  };
}
