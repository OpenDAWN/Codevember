precision mediump float;

varying vec2 uv;

const float PI      = 3.141592657;
const int NUM_BALLS = {{NUM_BALL}};
const int NUM_ITER  = {{NUM_ITER}};
// const float maxDist = 5.0;

uniform sampler2D texture;
uniform sampler2D textureMap;
uniform float time;
uniform float focus;
uniform float seed;
uniform float metaK;
uniform float zGap;
uniform float maxDist;
uniform float theta;
uniform vec3 bubblePos[NUM_ITER];
uniform float bubbleSize[NUM_ITER];


//	TOOLS
vec2 rotate(vec2 pos, float angle) {
	float c = cos(angle);
	float s = sin(angle);

	return mat2(c, s, -s, c) * pos;
}

float smin( float a, float b, float k )
{
    float res = exp( -k*a ) + exp( -k*b );
    return -log( res )/k;
}

float smin( float a, float b )
{
    return smin(a, b, 7.0);
}

//	GEOMETRY
float sphere(vec3 pos, float radius) {
	return length(pos) - radius;
}

float capsule(vec3 p, float r, float c) {
	return mix(length(p.xz)-r, length(vec3(p.x,abs(p.y)-c,p.z))-r, step(c,abs(p.y)));
}

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

float hash( vec2 p ) {
	float h = dot(p,vec2(127.1,311.7));	
    return fract(sin(h)*43758.5453123);
}
float noise( in vec2 p ) {
    vec2 i = floor( p );
    vec2 f = fract( p );	
	vec2 u = f*f*(3.0-2.0*f);
    return -1.0+2.0*mix( mix( hash( i + vec2(0.0,0.0) ), 
                     hash( i + vec2(1.0,0.0) ), u.x),
                mix( hash( i + vec2(0.0,1.0) ), 
                     hash( i + vec2(1.0,1.0) ), u.x), u.y);
}


const float sphereSize = 2.0;

float displacement(vec3 pos) {
	//	rotation
	// pos.xy = rotate(pos.xy,  .64);
	// pos.yz = rotate(pos.yz, -.4);
	float n1 = noise(vec2(pos.xy-time*.1));
	float n2 = noise(vec2(n1, pos.z-time*.1));
	float r = length(pos.xy) / sphereSize + n1;

	float a = atan(pos.y, pos.x);
	
	float seed = a*20.0 - r*50.0;
	float d1 = sin(seed) * .5 + .5 * n2;
	return d1;
}


float map(vec3 pos) {
	float ds = sphere(pos, sphereSize);
	float displace = displacement(pos);
	float n = noise(pos.xz * 2.0 + sin(pos.z*cos(pos.x*sin(pos.y*time*.12373))));

	return ds + displace * .02 + n * .05;
}

vec3 computeNormal(vec3 pos) {
	vec2 eps = vec2(0.001, 0.0);

	vec3 normal = vec3(
		map(pos + eps.xyy) - map(pos - eps.xyy),
		map(pos + eps.yxy) - map(pos - eps.yxy),
		map(pos + eps.yyx) - map(pos - eps.yyx)
	);
	return normalize(normal);
}


//	LIGHTING
const vec3 lightPos0 = vec3(1.0, 1.0, -1.0);
const vec3 lightColor0 = vec3(1.0, 1.0, .96);
const float lightWeight0 = 0.25;

const vec3 lightPos1 = vec3(-1.0, -0.75, -.6);
const vec3 lightColor1 = vec3(.96, .96, 1.0);
const float lightWeight1 = 0.15;

float ao( in vec3 pos, in vec3 nor ){
	float occ = 0.0;
    float sca = 1.0;
    for( int i=0; i<5; i++ ) {
        float hr = 0.01 + 0.12*float(i)/4.0;
        vec3 aopos =  nor * hr + pos;
        float dd = map( aopos );
        occ += -(dd-hr)*sca;
        sca *= 0.9;
    }
    return clamp( 1.0 - 3.0*occ, 0.0, 1.0 );    
}

vec3 envLight(vec3 normal, vec3 dir) {
	vec3 eye    = -dir;
	vec3 r      = reflect( eye, normal );
	float m     = 2. * sqrt( pow( r.x, 2. ) + pow( r.y, 2. ) + pow( r.z + 1., 2. ) );
	vec2 vN     = r.xy / m + .5;
	vN.y        = 1.0 - vN.y;
	vec3 color  = texture2D( texture, vN ).rgb;
    return color;
}

vec4 getColor(vec3 pos, vec3 dir, vec3 normal) {
	vec3 base = vec3(1.0, 1.0, .96) * .55;
	float _ao = ao(pos, normal);
	vec3 env  = envLight(normal, dir);
	return vec4(vec3(base+env*.5)*_ao, 1.0);
}

mat3 setCamera( in vec3 ro, in vec3 ta, float cr )
{
	vec3 cw = normalize(ta-ro);
	vec3 cp = vec3(sin(cr), cos(cr),0.0);
	vec3 cu = normalize( cross(cw,cp) );
	vec3 cv = normalize( cross(cu,cw) );
    return mat3( cu, cv, cw );
}

void main(void) {
	float r  = 5.0;
	vec3 pos = vec3(cos(theta) * r, 0.0, sin(theta)*r);
	vec3 ta  = vec3( 0.0, 0.0, 0.0 );
	mat3 ca  = setCamera( pos, ta, 0.0 );
	vec3 dir = ca * normalize( vec3(uv,focus) );

	vec4 color = vec4(.0);
	float prec = pow(.1, 5.0);
	float d;
	float offset = 0.0;
	bool hit = false;
	
	for(int i=0; i<NUM_ITER; i++) {
		d = map(pos);						//	distance to object

		if(d < prec) {						// 	if get's really close, set as hit the object
			hit = true;
		}

		pos += d * dir;						//	move forward by
		if(length(pos) > maxDist) break;
	}


	if(hit) {
		color = vec4(1.0);
		vec3 normal = computeNormal(pos);
		color = getColor(pos, dir, normal);
	}
	

    gl_FragColor = color;
}