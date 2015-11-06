precision mediump float;

varying vec2 uv;

const float PI      = 3.141592657;
const int NUM_ITER  = {{NUM_ITER}};


uniform float time;
uniform float focus;
uniform float metaK;
uniform float maxDist;


//	TOOLS
vec2 rotate(vec2 pos, float angle) {
	float c = cos(angle);
	float s = sin(angle);

	return mat2(c, s, -s, c) * pos;
}

//	GEOMETRY
float sphere(vec3 pos, float radius) {
	return length(pos) - radius;
}

float plane(vec3 pos) {
	return pos.y;
}


//	INTERSECT / MAP / NORMAL

float displacement(vec3 p) {
	return sin(2.0*p.x+time*.983265)*sin(2.0*p.y+time*.57834)*sin(1.0*p.z+time*0.857834) * .5 + .5;
}

float map(vec3 pos) {
	pos.xz = rotate(pos.xz, time+pos.y*1.5 + pos.x*.5);

	float sphereSize = 2.5;
	float d1 = sphere(pos, sphereSize);
	float d2 = displacement(pos)*.1;
	float d3 = sphere(pos+vec3(.15, 0.0, 0.0), sphereSize);

	return max(d3, -(d1+d2));
}

vec3 computeNormal(vec3 pos) {
	vec2 eps = vec2(0.01, 0.0);

	vec3 normal = vec3(
		map(pos + eps.xyy) - map(pos - eps.xyy),
		map(pos + eps.yxy) - map(pos - eps.yxy),
		map(pos + eps.yyx) - map(pos - eps.yyx)
	);
	return normalize(normal);
}


//	LIGHTING

const vec3 lightDirection = vec3(1.0, .75, -1.0);


float diffuse(vec3 normal) {
	return max(dot(normal, normalize(lightDirection)), 0.0);
}

float specular(vec3 normal, vec3 dir) {
	vec3 h = normalize(normal - dir);
	return pow(max(dot(h, normal), 0.0), 40.0);
}

//	COLOR


vec4 getColor(vec3 pos, vec3 dir, vec3 normal) {
	float ambient = .2;
	float diff = diffuse(normal) * .75;
	float spec = specular(normal, dir) * .5;
	vec3 color = vec3(ambient + diff + spec * .5);
	return vec4(color, 1.0);
}

void main(void) {
	vec3 pos = vec3(0.0, 0.0, -10.0);		//	position of camera
	vec3 dir = normalize(vec3(uv, focus));	//	ray
	

	vec4 color = vec4(.1, .1, .1, 1.0);
	float prec = pow(.1, 5.0);
	float d;
	
	for(int i=0; i<NUM_ITER; i++) {
		d = map(pos);						//	distance to object

		if(d < prec) {						// 	if get's really close, set as hit the object
			color = vec4(1.0);
			vec3 normal = computeNormal(pos);
			color = getColor(pos, dir, normal);
			break;
		}

		pos += d * dir;						//	move forward by
		if(length(pos) > maxDist) break;
	}
	

    gl_FragColor = vec4(color);
}