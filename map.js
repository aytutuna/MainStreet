var G_WALK = 1;
var G_CURB = 2;
var G_ROAD = 3;
var G_LINE = 4;
var G_PLANT = 5;
var G_KERB = 6;
var G_BAY = 7;
var PXT = 1 / 16;
var near_d = 0;
var near_t = 0;

// a road is a centre line of straight and arc pieces, with the asphalt width w and a sidewalk of sw each side
function prepRoads() {
  ROADS.forEach(function (r) {
    var pos = 0;
    var x0 = 1e9;
    var y0 = 1e9;
    var x1 = -1e9;
    var y1 = -1e9;
    r.s = r.p.map(function (q) {
      var o = { k: q[0], pos: pos };
      if (q[0] === 'L') {
        o.ax = q[1];
        o.ay = q[2];
        o.bx = q[3];
        o.by = q[4];
        o.len = Math.hypot(o.bx - o.ax, o.by - o.ay);
        x0 = Math.min(x0, o.ax, o.bx);
        x1 = Math.max(x1, o.ax, o.bx);
        y0 = Math.min(y0, o.ay, o.by);
        y1 = Math.max(y1, o.ay, o.by);
      } else {
        o.cx = q[1];
        o.cy = q[2];
        o.r = q[3];
        o.a0 = q[4];
        o.sw = q[5] - q[4];
        o.len = Math.abs(o.sw) * Math.PI / 180 * o.r;
        x0 = Math.min(x0, o.cx - o.r);
        x1 = Math.max(x1, o.cx + o.r);
        y0 = Math.min(y0, o.cy - o.r);
        y1 = Math.max(y1, o.cy + o.r);
      }
      pos += o.len;
      return o;
    });
    var m = r.w / 2 + r.sw + 0.1;
    r.b = [x0 - m, y0 - m, x1 + m, y1 + m];
  });
}

// distance from (x, y) to the centre line, and how far along it the nearest point is
function near(r, x, y) {
  var best = 1e9;
  var bt = 0;
  for (var i = 0; i < r.s.length; i++) {
    var s = r.s[i];
    var d;
    var t;
    if (s.k === 'L') {
      var dx = s.bx - s.ax;
      var dy = s.by - s.ay;
      var l2 = dx * dx + dy * dy;
      var u = l2 ? ((x - s.ax) * dx + (y - s.ay) * dy) / l2 : 0;
      u = u < 0 ? 0 : u > 1 ? 1 : u;
      d = Math.hypot(x - s.ax - dx * u, y - s.ay - dy * u);
      t = s.pos + u * s.len;
    } else {
      var rad = Math.hypot(x - s.cx, y - s.cy);
      var up = (Math.atan2(y - s.cy, x - s.cx) * 180 / Math.PI - s.a0) * (s.sw < 0 ? -1 : 1);
      up = ((up % 360) + 360) % 360;
      var span = Math.abs(s.sw);
      if (up <= span) {
        d = Math.abs(rad - s.r);
        t = s.pos + up * Math.PI / 180 * s.r;
      } else {
        var e0 = s.a0 * Math.PI / 180;
        var e1 = (s.a0 + s.sw) * Math.PI / 180;
        var d0 = Math.hypot(x - s.cx - s.r * Math.cos(e0), y - s.cy - s.r * Math.sin(e0));
        var d1 = Math.hypot(x - s.cx - s.r * Math.cos(e1), y - s.cy - s.r * Math.sin(e1));
        d = Math.min(d0, d1);
        t = s.pos + (d0 < d1 ? 0 : s.len);
      }
    }
    if (d < best) {
      best = d;
      bt = t;
    }
  }
  near_d = best;
  near_t = bt;
}

function roadClass(x, y, rs) {
  rs = rs || ROADS;
  var asph = 0;
  var curb = false;
  var walk = false;
  var mark = false;
  for (var i = 0; i < rs.length; i++) {
    var r = rs[i];
    if (x < r.b[0] || x > r.b[2] || y < r.b[1] || y > r.b[3]) continue;
    near(r, x, y);
    var h = r.w / 2;
    if (near_d > h + r.sw) continue;
    if (near_d > h) walk = true;
    else if (near_d > h - 2 * PXT) curb = true;
    else {
      asph++;
      if (r.mark && near_d < PXT && (near_t * 16) % 32 < 16) mark = true;
    }
  }
  if (asph) return asph === 1 && mark ? G_LINE : G_ROAD;
  return curb ? G_CURB : walk ? G_WALK : 0;
}

function overClass(x, y) {
  for (var i = 0; i < OVER.length; i++) {
    var o = OVER[i];
    if (o.k === 'disc') {
      var d = Math.hypot(x - o.x, y - o.y);
      if (d < o.r) return d > o.r - 2 * PXT ? G_KERB : G_PLANT;
    } else if (x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h) {
      if (o.k === 'plant') {
        var e = Math.min(x - o.x, o.x + o.w - x, y - o.y, o.y + o.h - y);
        return e < 2 * PXT ? G_KERB : G_PLANT;
      }
      if (y - o.y < 2 * PXT) return G_CURB;
      return (x - o.x) % 3 < PXT ? G_LINE : G_BAY;
    }
  }
  return 0;
}

// the class of the ground at a point; overlays (median, islands, kerb bays) sit on top of the roads
function groundAt(x, y, rs) {
  return overClass(x, y) || roadClass(x, y, rs);
}

// the zone painted under the roads, '' when none is declared
function zoneAt(x, y) {
  var k = '';
  for (var i = 0; i < ZONES.length; i++) {
    var z = ZONES[i];
    if (x >= z[1] && x < z[1] + z[3] && y >= z[2] && y < z[2] + z[4]) k = z[0];
  }
  return k;
}

prepRoads();
