// src/connector.ts
import { randomUUID as randomUUID2 } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

// src/format.ts
import { createHash, randomUUID } from "node:crypto";

// node_modules/fflate/esm/index.mjs
import { createRequire } from "module";
var require2 = createRequire("/");
var _a;
var Worker;
var isMarkedAsUntransferable;
try {
  _a = require2("worker_threads"), Worker = _a.Worker, isMarkedAsUntransferable = _a.isMarkedAsUntransferable;
} catch (e) {
}
var u8 = Uint8Array;
var u16 = Uint16Array;
var i32 = Int32Array;
var fleb = new u8([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]);
var fdeb = new u8([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]);
var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
var freb = function(eb, start) {
  var b = new u16(31);
  for (var i = 0; i < 31; ++i) {
    b[i] = start += 1 << eb[i - 1];
  }
  var r = new i32(b[30]);
  for (var i = 1; i < 30; ++i) {
    for (var j = b[i]; j < b[i + 1]; ++j) {
      r[j] = j - b[i] << 5 | i;
    }
  }
  return { b, r };
};
var _a = freb(fleb, 2);
var fl = _a.b;
var revfl = _a.r;
fl[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0);
var fd = _b.b;
var revfd = _b.r;
var rev = new u16(32768);
for (i = 0; i < 32768; ++i) {
  x = (i & 43690) >> 1 | (i & 21845) << 1;
  x = (x & 52428) >> 2 | (x & 13107) << 2;
  x = (x & 61680) >> 4 | (x & 3855) << 4;
  rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
}
var x;
var i;
var hMap = (function(cd, mb, r) {
  var s = cd.length;
  var i = 0;
  var l = new u16(mb);
  for (; i < s; ++i) {
    if (cd[i])
      ++l[cd[i] - 1];
  }
  var le = new u16(mb);
  for (i = 1; i < mb; ++i) {
    le[i] = le[i - 1] + l[i - 1] << 1;
  }
  var co;
  if (r) {
    co = new u16(1 << mb);
    var rvb = 15 - mb;
    for (i = 0; i < s; ++i) {
      if (cd[i]) {
        var sv = i << 4 | cd[i];
        var r_1 = mb - cd[i];
        var v = le[cd[i] - 1]++ << r_1;
        for (var m = v | (1 << r_1) - 1; v <= m; ++v) {
          co[rev[v] >> rvb] = sv;
        }
      }
    }
  } else {
    co = new u16(s);
    for (i = 0; i < s; ++i) {
      if (cd[i]) {
        co[i] = rev[le[cd[i] - 1]++] >> 15 - cd[i];
      }
    }
  }
  return co;
});
var flt = new u8(288);
for (i = 0; i < 144; ++i)
  flt[i] = 8;
var i;
for (i = 144; i < 256; ++i)
  flt[i] = 9;
var i;
for (i = 256; i < 280; ++i)
  flt[i] = 7;
var i;
for (i = 280; i < 288; ++i)
  flt[i] = 8;
var i;
var fdt = new u8(32);
for (i = 0; i < 32; ++i)
  fdt[i] = 5;
var i;
var flm = /* @__PURE__ */ hMap(flt, 9, 0);
var flrm = /* @__PURE__ */ hMap(flt, 9, 1);
var fdm = /* @__PURE__ */ hMap(fdt, 5, 0);
var fdrm = /* @__PURE__ */ hMap(fdt, 5, 1);
var max = function(a) {
  var m = a[0];
  for (var i = 1; i < a.length; ++i) {
    if (a[i] > m)
      m = a[i];
  }
  return m;
};
var bits = function(d, p, m) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8) >> (p & 7) & m;
};
var bits16 = function(d, p) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
};
var shft = function(p) {
  return (p + 7) / 8 | 0;
};
var slc = function(v, s, e) {
  if (s == null || s < 0)
    s = 0;
  if (e == null || e > v.length)
    e = v.length;
  return new u8(v.subarray(s, e));
};
var ec = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  // determined by compression function
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
  // determined by unknown compression method
];
var err = function(ind, msg, nt) {
  var e = new Error(msg || ec[ind]);
  e.code = ind;
  if (Error.captureStackTrace)
    Error.captureStackTrace(e, err);
  if (!nt)
    throw e;
  return e;
};
var inflt = function(dat, st, buf, dict) {
  var sl = dat.length, dl = dict ? dict.length : 0;
  if (!sl || st.f && !st.l)
    return buf || new u8(0);
  var noBuf = !buf;
  var resize = noBuf || st.i != 2;
  var noSt = st.i;
  if (noBuf)
    buf = new u8(sl * 3);
  var cbuf = function(l2) {
    var bl = buf.length;
    if (l2 > bl) {
      var nbuf = new u8(Math.max(bl * 2, l2));
      nbuf.set(buf);
      buf = nbuf;
    }
  };
  var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
  var tbts = sl * 8;
  do {
    if (!lm) {
      final = bits(dat, pos, 1);
      var type = bits(dat, pos + 1, 3);
      pos += 3;
      if (!type) {
        var s = shft(pos) + 4, l = dat[s - 4] | dat[s - 3] << 8, t = s + l;
        if (t > sl) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + l);
        buf.set(dat.subarray(s, t), bt);
        st.b = bt += l, st.p = pos = t * 8, st.f = final;
        continue;
      } else if (type == 1)
        lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
      else if (type == 2) {
        var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
        var tl = hLit + bits(dat, pos + 5, 31) + 1;
        pos += 14;
        var ldt = new u8(tl);
        var clt = new u8(19);
        for (var i = 0; i < hcLen; ++i) {
          clt[clim[i]] = bits(dat, pos + i * 3, 7);
        }
        pos += hcLen * 3;
        var clb = max(clt), clbmsk = (1 << clb) - 1;
        var clm = hMap(clt, clb, 1);
        for (var i = 0; i < tl; ) {
          var r = clm[bits(dat, pos, clbmsk)];
          pos += r & 15;
          var s = r >> 4;
          if (s < 16) {
            ldt[i++] = s;
          } else {
            var c = 0, n = 0;
            if (s == 16)
              n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i - 1];
            else if (s == 17)
              n = 3 + bits(dat, pos, 7), pos += 3;
            else if (s == 18)
              n = 11 + bits(dat, pos, 127), pos += 7;
            while (n--)
              ldt[i++] = c;
          }
        }
        var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
        lbt = max(lt);
        dbt = max(dt);
        lm = hMap(lt, lbt, 1);
        dm = hMap(dt, dbt, 1);
      } else
        err(1);
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
    }
    if (resize)
      cbuf(bt + 131072);
    var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
    var lpos = pos;
    for (; ; lpos = pos) {
      var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
      pos += c & 15;
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
      if (!c)
        err(2);
      if (sym < 256)
        buf[bt++] = sym;
      else if (sym == 256) {
        lpos = pos, lm = null;
        break;
      } else {
        var add = sym - 254;
        if (sym > 264) {
          var i = sym - 257, b = fleb[i];
          add = bits(dat, pos, (1 << b) - 1) + fl[i];
          pos += b;
        }
        var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
        if (!d)
          err(3);
        pos += d & 15;
        var dt = fd[dsym];
        if (dsym > 3) {
          var b = fdeb[dsym];
          dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
        }
        if (pos > tbts) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + 131072);
        var end = bt + add;
        if (bt < dt) {
          var shift = dl - dt, dend = Math.min(dt, end);
          if (shift + bt < 0)
            err(3);
          for (; bt < dend; ++bt)
            buf[bt] = dict[shift + bt];
        }
        for (; bt < end; ++bt)
          buf[bt] = buf[bt - dt];
      }
    }
    st.l = lm, st.p = lpos, st.b = bt, st.f = final;
    if (lm)
      final = 1, st.m = lbt, st.d = dm, st.n = dbt;
  } while (!final);
  return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
};
var wbits = function(d, p, v) {
  v <<= p & 7;
  var o = p / 8 | 0;
  d[o] |= v;
  d[o + 1] |= v >> 8;
};
var wbits16 = function(d, p, v) {
  v <<= p & 7;
  var o = p / 8 | 0;
  d[o] |= v;
  d[o + 1] |= v >> 8;
  d[o + 2] |= v >> 16;
};
var hTree = function(d, mb) {
  var t = [];
  for (var i = 0; i < d.length; ++i) {
    if (d[i])
      t.push({ s: i, f: d[i] });
  }
  var s = t.length;
  var t2 = t.slice();
  if (!s)
    return { t: et, l: 0 };
  if (s == 1) {
    var v = new u8(t[0].s + 1);
    v[t[0].s] = 1;
    return { t: v, l: 1 };
  }
  t.sort(function(a, b) {
    return a.f - b.f;
  });
  t.push({ s: -1, f: 25001 });
  var l = t[0], r = t[1], i0 = 0, i1 = 1, i2 = 2;
  t[0] = { s: -1, f: l.f + r.f, l, r };
  while (i1 != s - 1) {
    l = t[t[i0].f < t[i2].f ? i0++ : i2++];
    r = t[i0 != i1 && t[i0].f < t[i2].f ? i0++ : i2++];
    t[i1++] = { s: -1, f: l.f + r.f, l, r };
  }
  var maxSym = t2[0].s;
  for (var i = 1; i < s; ++i) {
    if (t2[i].s > maxSym)
      maxSym = t2[i].s;
  }
  var tr = new u16(maxSym + 1);
  var mbt = ln(t[i1 - 1], tr, 0);
  if (mbt > mb) {
    var i = 0, dt = 0;
    var lft = mbt - mb, cst = 1 << lft;
    t2.sort(function(a, b) {
      return tr[b.s] - tr[a.s] || a.f - b.f;
    });
    for (; i < s; ++i) {
      var i2_1 = t2[i].s;
      if (tr[i2_1] > mb) {
        dt += cst - (1 << mbt - tr[i2_1]);
        tr[i2_1] = mb;
      } else
        break;
    }
    dt >>= lft;
    while (dt > 0) {
      var i2_2 = t2[i].s;
      if (tr[i2_2] < mb)
        dt -= 1 << mb - tr[i2_2]++ - 1;
      else
        ++i;
    }
    for (; i >= 0 && dt; --i) {
      var i2_3 = t2[i].s;
      if (tr[i2_3] == mb) {
        --tr[i2_3];
        ++dt;
      }
    }
    mbt = mb;
  }
  return { t: new u8(tr), l: mbt };
};
var ln = function(n, l, d) {
  return n.s == -1 ? Math.max(ln(n.l, l, d + 1), ln(n.r, l, d + 1)) : l[n.s] = d;
};
var lc = function(c) {
  var s = c.length;
  while (s && !c[--s])
    ;
  var cl = new u16(++s);
  var cli = 0, cln = c[0], cls = 1;
  var w = function(v) {
    cl[cli++] = v;
  };
  for (var i = 1; i <= s; ++i) {
    if (c[i] == cln && i != s)
      ++cls;
    else {
      if (!cln && cls > 2) {
        for (; cls > 138; cls -= 138)
          w(32754);
        if (cls > 2) {
          w(cls > 10 ? cls - 11 << 5 | 28690 : cls - 3 << 5 | 12305);
          cls = 0;
        }
      } else if (cls > 3) {
        w(cln), --cls;
        for (; cls > 6; cls -= 6)
          w(8304);
        if (cls > 2)
          w(cls - 3 << 5 | 8208), cls = 0;
      }
      while (cls--)
        w(cln);
      cls = 1;
      cln = c[i];
    }
  }
  return { c: cl.subarray(0, cli), n: s };
};
var clen = function(cf, cl) {
  var l = 0;
  for (var i = 0; i < cl.length; ++i)
    l += cf[i] * cl[i];
  return l;
};
var wfblk = function(out, pos, dat) {
  var s = dat.length;
  var o = shft(pos + 2);
  out[o] = s & 255;
  out[o + 1] = s >> 8;
  out[o + 2] = out[o] ^ 255;
  out[o + 3] = out[o + 1] ^ 255;
  for (var i = 0; i < s; ++i)
    out[o + i + 4] = dat[i];
  return (o + 4 + s) * 8;
};
var wblk = function(dat, out, final, syms, lf, df, eb, li, bs, bl, p) {
  wbits(out, p++, final);
  ++lf[256];
  var _a2 = hTree(lf, 15), dlt = _a2.t, mlb = _a2.l;
  var _b2 = hTree(df, 15), ddt = _b2.t, mdb = _b2.l;
  var _c = lc(dlt), lclt = _c.c, nlc = _c.n;
  var _d = lc(ddt), lcdt = _d.c, ndc = _d.n;
  var lcfreq = new u16(19);
  for (var i = 0; i < lclt.length; ++i)
    ++lcfreq[lclt[i] & 31];
  for (var i = 0; i < lcdt.length; ++i)
    ++lcfreq[lcdt[i] & 31];
  var _e = hTree(lcfreq, 7), lct = _e.t, mlcb = _e.l;
  var nlcc = 19;
  for (; nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc)
    ;
  var flen = bl + 5 << 3;
  var ftlen = clen(lf, flt) + clen(df, fdt) + eb;
  var dtlen = clen(lf, dlt) + clen(df, ddt) + eb + 14 + 3 * nlcc + clen(lcfreq, lct) + 2 * lcfreq[16] + 3 * lcfreq[17] + 7 * lcfreq[18];
  if (bs >= 0 && flen <= ftlen && flen <= dtlen)
    return wfblk(out, p, dat.subarray(bs, bs + bl));
  var lm, ll, dm, dl;
  wbits(out, p, 1 + (dtlen < ftlen)), p += 2;
  if (dtlen < ftlen) {
    lm = hMap(dlt, mlb, 0), ll = dlt, dm = hMap(ddt, mdb, 0), dl = ddt;
    var llm = hMap(lct, mlcb, 0);
    wbits(out, p, nlc - 257);
    wbits(out, p + 5, ndc - 1);
    wbits(out, p + 10, nlcc - 4);
    p += 14;
    for (var i = 0; i < nlcc; ++i)
      wbits(out, p + 3 * i, lct[clim[i]]);
    p += 3 * nlcc;
    var lcts = [lclt, lcdt];
    for (var it = 0; it < 2; ++it) {
      var clct = lcts[it];
      for (var i = 0; i < clct.length; ++i) {
        var len = clct[i] & 31;
        wbits(out, p, llm[len]), p += lct[len];
        if (len > 15)
          wbits(out, p, clct[i] >> 5 & 127), p += clct[i] >> 12;
      }
    }
  } else {
    lm = flm, ll = flt, dm = fdm, dl = fdt;
  }
  for (var i = 0; i < li; ++i) {
    var sym = syms[i];
    if (sym > 255) {
      var len = sym >> 18 & 31;
      wbits16(out, p, lm[len + 257]), p += ll[len + 257];
      if (len > 7)
        wbits(out, p, sym >> 23 & 31), p += fleb[len];
      var dst = sym & 31;
      wbits16(out, p, dm[dst]), p += dl[dst];
      if (dst > 3)
        wbits16(out, p, sym >> 5 & 8191), p += fdeb[dst];
    } else {
      wbits16(out, p, lm[sym]), p += ll[sym];
    }
  }
  wbits16(out, p, lm[256]);
  return p + ll[256];
};
var deo = /* @__PURE__ */ new i32([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]);
var et = /* @__PURE__ */ new u8(0);
var dflt = function(dat, lvl, plvl, pre, post, st) {
  var s = st.z || dat.length;
  var o = new u8(pre + s + 5 * (1 + Math.ceil(s / 7e3)) + post);
  var w = o.subarray(pre, o.length - post);
  var lst = st.l;
  var pos = (st.r || 0) & 7;
  if (lvl) {
    if (pos)
      w[0] = st.r >> 3;
    var opt = deo[lvl - 1];
    var n = opt >> 13, c = opt & 8191;
    var msk_1 = (1 << plvl) - 1;
    var prev = st.p || new u16(32768), head = st.h || new u16(msk_1 + 1);
    var bs1_1 = Math.ceil(plvl / 3), bs2_1 = 2 * bs1_1;
    var hsh = function(i2) {
      return (dat[i2] ^ dat[i2 + 1] << bs1_1 ^ dat[i2 + 2] << bs2_1) & msk_1;
    };
    var syms = new i32(25e3);
    var lf = new u16(288), df = new u16(32);
    var lc_1 = 0, eb = 0, i = st.i || 0, li = 0, wi = st.w || 0, bs = 0;
    for (; i + 2 < s; ++i) {
      var hv = hsh(i);
      var imod = i & 32767, pimod = head[hv];
      prev[imod] = pimod;
      head[hv] = imod;
      if (wi <= i) {
        var rem = s - i;
        if ((lc_1 > 7e3 || li > 24576) && (rem > 423 || !lst)) {
          pos = wblk(dat, w, 0, syms, lf, df, eb, li, bs, i - bs, pos);
          li = lc_1 = eb = 0, bs = i;
          for (var j = 0; j < 286; ++j)
            lf[j] = 0;
          for (var j = 0; j < 30; ++j)
            df[j] = 0;
        }
        var l = 2, d = 0, ch_1 = c, dif = imod - pimod & 32767;
        if (rem > 2 && hv == hsh(i - dif)) {
          var maxn = Math.min(n, rem) - 1;
          var maxd = Math.min(32767, i);
          var ml = Math.min(258, rem);
          while (dif <= maxd && --ch_1 && imod != pimod) {
            if (dat[i + l] == dat[i + l - dif]) {
              var nl = 0;
              for (; nl < ml && dat[i + nl] == dat[i + nl - dif]; ++nl)
                ;
              if (nl > l) {
                l = nl, d = dif;
                if (nl > maxn)
                  break;
                var mmd = Math.min(dif, nl - 2);
                var md = 0;
                for (var j = 0; j < mmd; ++j) {
                  var ti = i - dif + j & 32767;
                  var pti = prev[ti];
                  var cd = ti - pti & 32767;
                  if (cd > md)
                    md = cd, pimod = ti;
                }
              }
            }
            imod = pimod, pimod = prev[imod];
            dif += imod - pimod & 32767;
          }
        }
        if (d) {
          syms[li++] = 268435456 | revfl[l] << 18 | revfd[d];
          var lin = revfl[l] & 31, din = revfd[d] & 31;
          eb += fleb[lin] + fdeb[din];
          ++lf[257 + lin];
          ++df[din];
          wi = i + l;
          ++lc_1;
        } else {
          syms[li++] = dat[i];
          ++lf[dat[i]];
        }
      }
    }
    for (i = Math.max(i, wi); i < s; ++i) {
      syms[li++] = dat[i];
      ++lf[dat[i]];
    }
    pos = wblk(dat, w, lst, syms, lf, df, eb, li, bs, i - bs, pos);
    if (!lst) {
      st.r = pos & 7 | w[pos / 8 | 0] << 3;
      pos -= 7;
      st.h = head, st.p = prev, st.i = i, st.w = wi;
    }
  } else {
    for (var i = st.w || 0; i < s + lst; i += 65535) {
      var e = i + 65535;
      if (e >= s) {
        w[pos / 8 | 0] = lst;
        e = s;
      }
      pos = wfblk(w, pos + 1, dat.subarray(i, e));
    }
    st.i = s;
  }
  return slc(o, 0, pre + shft(pos) + post);
};
var crct = /* @__PURE__ */ (function() {
  var t = new Int32Array(256);
  for (var i = 0; i < 256; ++i) {
    var c = i, k = 9;
    while (--k)
      c = (c & 1 && -306674912) ^ c >>> 1;
    t[i] = c;
  }
  return t;
})();
var crc = function() {
  var c = -1;
  return {
    p: function(d) {
      var cr = c;
      for (var i = 0; i < d.length; ++i)
        cr = crct[cr & 255 ^ d[i]] ^ cr >>> 8;
      c = cr;
    },
    d: function() {
      return ~c;
    }
  };
};
var dopt = function(dat, opt, pre, post, st) {
  if (!st) {
    st = { l: 1 };
    if (opt.dictionary) {
      var dict = opt.dictionary.subarray(-32768);
      var newDat = new u8(dict.length + dat.length);
      newDat.set(dict);
      newDat.set(dat, dict.length);
      dat = newDat;
      st.w = dict.length;
    }
  }
  return dflt(dat, opt.level == null ? 6 : opt.level, opt.mem == null ? st.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5) : 20 : 12 + opt.mem, pre, post, st);
};
var mrg = function(a, b) {
  var o = {};
  for (var k in a)
    o[k] = a[k];
  for (var k in b)
    o[k] = b[k];
  return o;
};
var b2 = function(d, b) {
  return d[b] | d[b + 1] << 8;
};
var b4 = function(d, b) {
  return (d[b] | d[b + 1] << 8 | d[b + 2] << 16 | d[b + 3] << 24) >>> 0;
};
var b8 = function(d, b) {
  return b4(d, b) + b4(d, b + 4) * 4294967296;
};
var wbytes = function(d, b, v) {
  for (; v; ++b)
    d[b] = v, v >>>= 8;
};
function deflateSync(data, opts) {
  return dopt(data, opts || {}, 0, 0);
}
function inflateSync(data, opts) {
  return inflt(data, { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
var fltn = function(d, p, t, o) {
  for (var k in d) {
    var val = d[k], n = p + k, op = o;
    if (Array.isArray(val))
      op = mrg(o, val[1]), val = val[0];
    if (ArrayBuffer.isView(val))
      t[n] = [val, op];
    else {
      t[n += "/"] = [new u8(0), op];
      fltn(val, n, t, o);
    }
  }
};
var te = typeof TextEncoder != "undefined" && /* @__PURE__ */ new TextEncoder();
var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
var tds = 0;
try {
  td.decode(et, { stream: true });
  tds = 1;
} catch (e) {
}
var dutf8 = function(d) {
  for (var r = "", i = 0; ; ) {
    var c = d[i++];
    var eb = (c > 127) + (c > 223) + (c > 239);
    if (i + eb > d.length)
      return { s: r, r: slc(d, i - 1) };
    if (!eb)
      r += String.fromCharCode(c);
    else if (eb == 3) {
      c = ((c & 15) << 18 | (d[i++] & 63) << 12 | (d[i++] & 63) << 6 | d[i++] & 63) - 65536, r += String.fromCharCode(55296 | c >> 10, 56320 | c & 1023);
    } else if (eb & 1)
      r += String.fromCharCode((c & 31) << 6 | d[i++] & 63);
    else
      r += String.fromCharCode((c & 15) << 12 | (d[i++] & 63) << 6 | d[i++] & 63);
  }
};
function strToU8(str, latin1) {
  if (latin1) {
    var ar_1 = new u8(str.length);
    for (var i = 0; i < str.length; ++i)
      ar_1[i] = str.charCodeAt(i);
    return ar_1;
  }
  if (te)
    return te.encode(str);
  var l = str.length;
  var ar = new u8(str.length + (str.length >> 1));
  var ai = 0;
  var w = function(v) {
    ar[ai++] = v;
  };
  for (var i = 0; i < l; ++i) {
    if (ai + 5 > ar.length) {
      var n = new u8(ai + 8 + (l - i << 1));
      n.set(ar);
      ar = n;
    }
    var c = str.charCodeAt(i);
    if (c < 128 || latin1)
      w(c);
    else if (c < 2048)
      w(192 | c >> 6), w(128 | c & 63);
    else if (c > 55295 && c < 57344)
      c = 65536 + (c & 1023 << 10) | str.charCodeAt(++i) & 1023, w(240 | c >> 18), w(128 | c >> 12 & 63), w(128 | c >> 6 & 63), w(128 | c & 63);
    else
      w(224 | c >> 12), w(128 | c >> 6 & 63), w(128 | c & 63);
  }
  return slc(ar, 0, ai);
}
function strFromU8(dat, latin1) {
  if (latin1) {
    var r = "";
    for (var i = 0; i < dat.length; i += 16384)
      r += String.fromCharCode.apply(null, dat.subarray(i, i + 16384));
    return r;
  } else if (td) {
    return td.decode(dat);
  } else {
    var _a2 = dutf8(dat), s = _a2.s, r = _a2.r;
    if (r.length)
      err(8);
    return s;
  }
}
var slzh = function(d, b) {
  return b + 30 + b2(d, b + 26) + b2(d, b + 28);
};
var zh = function(d, b, z) {
  var fnl = b2(d, b + 28), efl = b2(d, b + 30), fn = strFromU8(d.subarray(b + 46, b + 46 + fnl), !(b2(d, b + 8) & 2048)), es = b + 46 + fnl;
  var _a2 = z64hs(d, es, efl, z, b4(d, b + 20), b4(d, b + 24), b4(d, b + 42)), sc = _a2[0], su = _a2[1], off = _a2[2];
  return [b2(d, b + 10), sc, su, fn, es + efl + b2(d, b + 32), off];
};
var z64hs = function(d, b, l, z, sc, su, off) {
  var nsc = sc == 4294967295, nsu = su == 4294967295, noff = off == 4294967295, e = b + l;
  var nf = nsc + nsu + noff;
  if (z && nf) {
    for (; b + 4 < e; b += 4 + b2(d, b + 2)) {
      if (b2(d, b) == 1) {
        return [
          nsc ? b8(d, b + 4 + 8 * nsu) : sc,
          nsu ? b8(d, b + 4) : su,
          noff ? b8(d, b + 4 + 8 * (nsu + nsc)) : off,
          1
        ];
      }
    }
    if (z < 2)
      err(13);
  }
  return [sc, su, off, 0];
};
var exfl = function(ex) {
  var le = 0;
  if (ex) {
    for (var k in ex) {
      var l = ex[k].length;
      if (l > 65535)
        err(9);
      le += l + 4;
    }
  }
  return le;
};
var wzh = function(d, b, f, fn, u, c, ce, co) {
  var fl2 = fn.length, ex = f.extra, col = co && co.length;
  var exl = exfl(ex);
  wbytes(d, b, ce != null ? 33639248 : 67324752), b += 4;
  if (ce != null)
    d[b++] = 20, d[b++] = f.os;
  d[b] = 20, b += 2;
  d[b++] = f.flag << 1 | (c < 0 && 8), d[b++] = u && 8;
  d[b++] = f.compression & 255, d[b++] = f.compression >> 8;
  var dt = new Date(f.mtime == null ? Date.now() : f.mtime), y = dt.getFullYear() - 1980;
  if (y < 0 || y > 119)
    err(10);
  wbytes(d, b, y << 25 | dt.getMonth() + 1 << 21 | dt.getDate() << 16 | dt.getHours() << 11 | dt.getMinutes() << 5 | dt.getSeconds() >> 1), b += 4;
  if (c != -1) {
    wbytes(d, b, f.crc);
    wbytes(d, b + 4, c < 0 ? -c - 2 : c);
    wbytes(d, b + 8, f.size);
  }
  wbytes(d, b + 12, fl2);
  wbytes(d, b + 14, exl), b += 16;
  if (ce != null) {
    wbytes(d, b, col);
    wbytes(d, b + 6, f.attrs);
    wbytes(d, b + 10, ce), b += 14;
  }
  d.set(fn, b);
  b += fl2;
  if (exl) {
    for (var k in ex) {
      var exf = ex[k], l = exf.length;
      wbytes(d, b, +k);
      wbytes(d, b + 2, l);
      d.set(exf, b + 4), b += 4 + l;
    }
  }
  if (col)
    d.set(co, b), b += col;
  return b;
};
var wzf = function(o, b, c, d, e) {
  wbytes(o, b, 101010256);
  wbytes(o, b + 8, c);
  wbytes(o, b + 10, c);
  wbytes(o, b + 12, d);
  wbytes(o, b + 16, e);
};
function zipSync(data, opts) {
  if (!opts)
    opts = {};
  var r = {};
  var files = [];
  fltn(data, "", r, opts);
  var o = 0;
  var tot = 0;
  for (var fn in r) {
    var _a2 = r[fn], file2 = _a2[0], p = _a2[1];
    var compression = p.level == 0 ? 0 : 8;
    var f = strToU8(fn), s = f.length;
    var com = p.comment, m = com && strToU8(com), ms = m && m.length;
    var exl = exfl(p.extra);
    if (s > 65535)
      err(11);
    var d = compression ? deflateSync(file2, p) : file2, l = d.length;
    var c = crc();
    c.p(file2);
    files.push(mrg(p, {
      size: file2.length,
      crc: c.d(),
      c: d,
      f,
      m,
      u: s != fn.length || m && com.length != ms,
      o,
      compression
    }));
    o += 30 + s + exl + l;
    tot += 76 + 2 * (s + exl) + (ms || 0) + l;
  }
  var out = new u8(tot + 22), oe = o, cdl = tot - o;
  for (var i = 0; i < files.length; ++i) {
    var f = files[i];
    wzh(out, f.o, f, f.f, f.u, f.c.length);
    var badd = 30 + f.f.length + exfl(f.extra);
    out.set(f.c, f.o + badd);
    wzh(out, o, f, f.f, f.u, f.c.length, f.o, f.m), o += 16 + badd + (f.m ? f.m.length : 0);
  }
  wzf(out, o, files.length, cdl, oe);
  return out;
}
function unzipSync(data, opts) {
  var files = {};
  var e = data.length - 22;
  for (; b4(data, e) != 101010256; --e) {
    if (!e || data.length - e > 65558)
      err(13);
  }
  ;
  var c = b2(data, e + 8);
  if (!c)
    return {};
  var o = b4(data, e + 16);
  var z = b4(data, e - 20) == 117853008;
  if (z) {
    var ze = b4(data, e - 12);
    z = b4(data, ze) == 101075792;
    if (z) {
      c = b4(data, ze + 32);
      o = b4(data, ze + 48);
    }
  }
  var fltr = opts && opts.filter;
  for (var i = 0; i < c; ++i) {
    var _a2 = zh(data, o, z), c_2 = _a2[0], sc = _a2[1], su = _a2[2], fn = _a2[3], no = _a2[4], off = _a2[5], b = slzh(data, off);
    o = no;
    if (!fltr || fltr({
      name: fn,
      size: sc,
      originalSize: su,
      compression: c_2
    })) {
      if (!c_2)
        files[fn] = slc(data, b, b + sc);
      else if (c_2 == 8)
        files[fn] = inflateSync(data.subarray(b, b + sc), { out: new u8(su) });
      else
        err(14, "unknown compression type " + c_2);
    }
  }
  return files;
}

// src/png.ts
import { deflateSync as deflateSync2 } from "node:zlib";
var SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
var crcTable;
function table() {
  if (crcTable) return crcTable;
  crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
    crcTable[n] = c >>> 0;
  }
  return crcTable;
}
function crc32(bytes) {
  let crc2 = 4294967295;
  const values = table();
  for (const value of bytes) crc2 = values[(crc2 ^ value) & 255] ^ crc2 >>> 8;
  return (crc2 ^ 4294967295) >>> 0;
}
function encodeChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const body = Buffer.from(data);
  const result = Buffer.allocUnsafe(body.length + 12);
  result.writeUInt32BE(body.length, 0);
  typeBytes.copy(result, 4);
  body.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([typeBytes, body])), body.length + 8);
  return result;
}
function parsePngChunks(input) {
  const bytes = Buffer.from(input);
  if (bytes.length < 20 || !bytes.subarray(0, 8).equals(SIGNATURE)) throw new Error("\u4E0D\u662F\u6709\u6548\u7684 PNG \u6587\u4EF6");
  const chunks = [];
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (end > bytes.length) throw new Error("PNG chunk \u957F\u5EA6\u8D8A\u754C");
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    chunks.push({ type, data: Buffer.from(bytes.subarray(offset + 8, offset + 8 + length)) });
    offset = end;
    if (type === "IEND") break;
  }
  if (chunks.at(-1)?.type !== "IEND") throw new Error("PNG \u7F3A\u5C11 IEND chunk");
  return chunks;
}
function decodeText(chunk) {
  if (chunk.type !== "tEXt") return void 0;
  const zero = chunk.data.indexOf(0);
  if (zero < 1) return void 0;
  return {
    keyword: chunk.data.toString("latin1", 0, zero),
    value: chunk.data.toString("latin1", zero + 1)
  };
}
function readCharacterFromPng(input) {
  const texts = parsePngChunks(input).map(decodeText).filter((v) => Boolean(v));
  const payload = texts.find((value) => value.keyword === "ccv3") ?? texts.find((value) => value.keyword === "chara");
  if (!payload) throw new Error("PNG \u4E2D\u6CA1\u6709 ccv3 \u6216 chara \u89D2\u8272\u5361\u5143\u6570\u636E");
  return JSON.parse(Buffer.from(payload.value, "base64").toString("utf8"));
}
function readExtendedAssetsFromPng(input) {
  return parsePngChunks(input).map(decodeText).filter((value) => Boolean(value)).filter((value) => value.keyword.startsWith("chara-ext-asset_:")).map((value) => ({
    path: value.keyword.slice("chara-ext-asset_:".length).replaceAll("\\", "/").replace(/^\/+/, ""),
    bytes: Buffer.from(value.value, "base64")
  }));
}
function makePlaceholderPng(width = 512, height = 768) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * stride] = 0;
    for (let x = 0; x < width; x += 1) {
      const at = y * stride + 1 + x * 4;
      raw[at] = 33;
      raw[at + 1] = 28;
      raw[at + 2] = 49;
      raw[at + 3] = 255;
    }
  }
  return Buffer.concat([
    SIGNATURE,
    encodeChunk("IHDR", ihdr),
    encodeChunk("IDAT", deflateSync2(raw, { level: 9 })),
    encodeChunk("IEND", Buffer.alloc(0))
  ]);
}
function writeCharacterToPng(input, v2, v3, extendedAssets) {
  const chunks = parsePngChunks(input ?? makePlaceholderPng());
  const meta = /* @__PURE__ */ new Map([
    ["chara", Buffer.from(JSON.stringify(v2), "utf8").toString("base64")],
    ["ccv3", Buffer.from(JSON.stringify(v3), "utf8").toString("base64")]
  ]);
  const encodedMeta = [...meta].map(([keyword, value]) => encodeChunk("tEXt", Buffer.from(`${keyword}\0${value}`, "latin1")));
  const encodedAssets = extendedAssets?.map((resource) => encodeChunk("tEXt", Buffer.from(
    `chara-ext-asset_:${resource.path}\0${Buffer.from(resource.bytes).toString("base64")}`,
    "latin1"
  ))) ?? [];
  const output = [SIGNATURE];
  for (const chunk of chunks) {
    const text = decodeText(chunk);
    if (text && meta.has(text.keyword)) continue;
    if (extendedAssets && text?.keyword.startsWith("chara-ext-asset_:")) continue;
    if (chunk.type === "IEND") output.push(...encodedMeta, ...encodedAssets);
    output.push(encodeChunk(chunk.type, chunk.data));
  }
  return Buffer.concat(output);
}

// src/format.ts
var REQUIRED_CHARACTER_FIELDS = ["name", "description", "personality", "scenario", "first_mes", "mes_example"];
function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function toLosslessJson(value) {
  const active = /* @__PURE__ */ new WeakSet();
  const visit = (current, path) => {
    if (current === void 0) return void 0;
    if (current === null || typeof current === "string" || typeof current === "boolean") return current;
    if (typeof current === "number") {
      if (!Number.isFinite(current)) throw new Error(`\u5DE5\u5177\u8F93\u51FA ${path} \u542B\u6709\u975E\u6709\u9650\u6570\u5B57`);
      return Object.is(current, -0) ? 0 : current;
    }
    if (typeof current !== "object") throw new Error(`\u5DE5\u5177\u8F93\u51FA ${path} \u542B\u6709\u65E0\u6CD5 JSON \u5316\u7684 ${typeof current}`);
    if (active.has(current)) throw new Error(`\u5DE5\u5177\u8F93\u51FA ${path} \u542B\u6709\u5FAA\u73AF\u5F15\u7528`);
    active.add(current);
    try {
      if (Array.isArray(current)) {
        const output2 = [];
        for (let index = 0; index < current.length; index += 1) {
          output2.push(visit(current[index], `${path}[${index}]`) ?? null);
        }
        return output2;
      }
      const prototype = Object.getPrototypeOf(current);
      if (prototype !== Object.prototype && prototype !== null) throw new Error(`\u5DE5\u5177\u8F93\u51FA ${path} \u4E0D\u662F\u666E\u901A JSON \u5BF9\u8C61`);
      const output = {};
      for (const [key, item] of Object.entries(current)) {
        const next = visit(item, `${path}.${key}`);
        if (next !== void 0) output[key] = next;
      }
      return output;
    } finally {
      active.delete(current);
    }
  };
  const result = visit(value, "$");
  if (result === void 0) throw new Error("\u5DE5\u5177\u8F93\u51FA\u6839\u503C\u4E0D\u80FD\u662F undefined");
  return result;
}
function clone(value) {
  return structuredClone(value);
}
function stringValue(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}
function characterData(card) {
  return isObject(card.data) ? card.data : card;
}
function characterVersion(card) {
  if (card.spec === "chara_card_v3" || String(card.spec_version ?? "").startsWith("3")) return "character-v3";
  if (card.spec === "chara_card_v2" || String(card.spec_version ?? "").startsWith("2")) return "character-v2";
  return "character-v1";
}
function completeCharacterData(source) {
  const data = clone(source);
  for (const field of REQUIRED_CHARACTER_FIELDS) if (typeof data[field] !== "string") data[field] = "";
  if (!Array.isArray(data.alternate_greetings)) data.alternate_greetings = [];
  if (!Array.isArray(data.tags)) data.tags = [];
  if (!Array.isArray(data.group_only_greetings)) data.group_only_greetings = [];
  if (!isObject(data.extensions)) data.extensions = {};
  if (typeof data.creator !== "string") data.creator = "";
  if (typeof data.character_version !== "string") data.character_version = "";
  if (typeof data.creator_notes !== "string") data.creator_notes = "";
  if (typeof data.system_prompt !== "string") data.system_prompt = "";
  if (typeof data.post_history_instructions !== "string") data.post_history_instructions = "";
  return data;
}
function toCharacterV2(card) {
  return {
    ...clone(card),
    spec: "chara_card_v2",
    spec_version: "2.0",
    data: completeCharacterData(characterData(card))
  };
}
function toCharacterV3(card) {
  return {
    ...clone(card),
    spec: "chara_card_v3",
    spec_version: "3.0",
    data: completeCharacterData(characterData(card))
  };
}
function toCharacterV1(card) {
  const data = characterData(card);
  return Object.fromEntries(REQUIRED_CHARACTER_FIELDS.map((field) => [field, stringValue(data[field])]));
}
function createBlankData(kind) {
  if (kind === "character") {
    return {
      format: "character-v3",
      data: toCharacterV3({
        name: "\u672A\u547D\u540D\u89D2\u8272",
        description: "",
        personality: "",
        scenario: "",
        first_mes: "",
        mes_example: "",
        creator_notes: "",
        system_prompt: "",
        post_history_instructions: "",
        alternate_greetings: [],
        group_only_greetings: [],
        tags: [],
        creator: "",
        character_version: "1.0",
        extensions: {}
      })
    };
  }
  if (kind === "worldbook") return { format: "worldbook", data: { entries: {} } };
  return {
    format: "chat-completion-preset",
    data: {
      name: "\u672A\u547D\u540D\u9884\u8BBE",
      temperature: 1,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      prompts: [
        { name: "Main Prompt", system_prompt: true, role: "system", content: "", identifier: "main" },
        { identifier: "worldInfoBefore", name: "World Info (before)", system_prompt: true, marker: true },
        { identifier: "charDescription", name: "Char Description", system_prompt: true, marker: true },
        { identifier: "worldInfoAfter", name: "World Info (after)", system_prompt: true, marker: true },
        { identifier: "chatHistory", name: "Chat History", system_prompt: true, marker: true }
      ],
      prompt_order: [{ character_id: 100001, order: [
        { identifier: "main", enabled: true },
        { identifier: "worldInfoBefore", enabled: true },
        { identifier: "charDescription", enabled: true },
        { identifier: "worldInfoAfter", enabled: true },
        { identifier: "chatHistory", enabled: true }
      ] }]
    }
  };
}
function detectPresetFormat(data) {
  if (Array.isArray(data.prompts) || Array.isArray(data.prompt_order)) return "chat-completion-preset";
  if (typeof data.story_string === "string") return "context-preset";
  if (typeof data.input_sequence === "string" || typeof data.output_sequence === "string") return "instruct-preset";
  if ("temperature" in data || "top_p" in data || "rep_pen" in data) return "textgen-preset";
  return "unknown-preset";
}
function detectKind(data) {
  const inner = characterData(data);
  const hasCharacterFields = REQUIRED_CHARACTER_FIELDS.filter((field) => typeof inner[field] === "string").length >= 3;
  if (data.spec === "chara_card_v2" || data.spec === "chara_card_v3" || hasCharacterFields) {
    return { kind: "character", format: characterVersion(data) };
  }
  if (isObject(data.entries) || Array.isArray(data.entries)) return { kind: "worldbook", format: "worldbook" };
  return { kind: "preset", format: detectPresetFormat(data) };
}
function assetName(data, fallback, kind) {
  if (kind === "character") return stringValue(characterData(data).name, fallback);
  return stringValue(data.name, fallback);
}
function baseName(filename) {
  const leaf = filename.replaceAll("\\", "/").split("/").at(-1) || "\u672A\u547D\u540D";
  return leaf.replace(/\.(json|png|charx)$/i, "") || "\u672A\u547D\u540D";
}
function normalizeResourcePath(value) {
  return value.replaceAll("\\", "/").replace(/^\/+/, "").split("/").filter((part) => part && part !== "." && part !== "..").join("/");
}
function resourceMimeType(filename) {
  const ext = filename.split(".").at(-1)?.toLowerCase();
  return {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    mp4: "video/mp4",
    webm: "video/webm",
    json: "application/json",
    txt: "text/plain",
    css: "text/css",
    js: "text/javascript",
    html: "text/html",
    glb: "model/gltf-binary",
    gltf: "model/gltf+json"
  }[ext || ""];
}
function makeResource(path, container, bytes) {
  const normalized = normalizeResourcePath(path);
  return { id: randomUUID(), path: normalized, container, mimeType: resourceMimeType(normalized), dataBase64: Buffer.from(bytes).toString("base64") };
}
function attachedBytes(resource) {
  if (typeof resource.dataBase64 !== "string") throw new Error(`\u9644\u5C5E\u8D44\u6E90\u5C1A\u672A\u52A0\u8F7D\uFF1A${resource.path}`);
  return Buffer.from(resource.dataBase64, "base64");
}
function createAsset(kind, name) {
  const now2 = (/* @__PURE__ */ new Date()).toISOString();
  const blank = createBlankData(kind);
  if (name) {
    if (kind === "character") characterData(blank.data).name = name;
    else blank.data.name = name;
  }
  return {
    id: randomUUID(),
    kind,
    format: blank.format,
    name: name ?? assetName(blank.data, "\u672A\u547D\u540D", kind),
    data: blank.data,
    createdAt: now2,
    updatedAt: now2
  };
}
function parseJsonBytes(bytes) {
  const value = JSON.parse(Buffer.from(bytes).toString("utf8").replace(/^\uFEFF/, ""));
  if (!isObject(value)) throw new Error("\u9876\u5C42\u5FC5\u987B\u662F JSON \u5BF9\u8C61");
  return value;
}
function importAsset(filename, bytes) {
  let data;
  let pngBase64;
  let container = "json";
  let resources = [];
  if (/\.png$/i.test(filename)) {
    const parsed = readCharacterFromPng(bytes);
    if (!isObject(parsed)) throw new Error("PNG \u89D2\u8272\u5361\u5143\u6570\u636E\u4E0D\u662F JSON \u5BF9\u8C61");
    data = parsed;
    pngBase64 = Buffer.from(bytes).toString("base64");
    container = "png";
    resources = readExtendedAssetsFromPng(bytes).map((value) => makeResource(value.path, "png", value.bytes));
  } else if (/\.charx$/i.test(filename)) {
    const files = unzipSync(bytes);
    const cardEntry = Object.entries(files).find(([name]) => name.replaceAll("\\", "/").toLowerCase() === "card.json");
    if (!cardEntry) throw new Error("CHARX \u7F3A\u5C11\u6839\u76EE\u5F55 card.json");
    data = parseJsonBytes(cardEntry[1]);
    container = "charx";
    resources = Object.entries(files).filter(([name]) => name.replaceAll("\\", "/").toLowerCase() !== "card.json" && !name.endsWith("/")).map(([name, value]) => makeResource(name, "charx", value));
  } else {
    data = parseJsonBytes(bytes);
  }
  const detected = detectKind(data);
  const now2 = (/* @__PURE__ */ new Date()).toISOString();
  return {
    id: randomUUID(),
    ...detected,
    name: assetName(data, baseName(filename), detected.kind),
    data,
    source: { filename, mimeType: /\.png$/i.test(filename) ? "image/png" : /\.charx$/i.test(filename) ? "application/zip" : "application/json", pngBase64, container },
    resources: resources.length ? resources : void 0,
    createdAt: now2,
    updatedAt: now2
  };
}
function importArchive(filename, bytes) {
  if (!/\.zip$/i.test(filename) || /\.charx$/i.test(filename)) return { assets: [importAsset(filename, bytes)], errors: [] };
  const files = unzipSync(bytes);
  const assets = [];
  const errors = [];
  for (const [entryName, entryBytes] of Object.entries(files)) {
    if (!/\.(json|png|charx)$/i.test(entryName)) continue;
    try {
      assets.push(importAsset(entryName, entryBytes));
    } catch (error) {
      errors.push({ filename: entryName, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return { assets, errors };
}
function safeExportName(name) {
  const safe = name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").trim().replace(/[. ]+$/g, "");
  return safe || "untitled";
}
function jsonFile(filename, data) {
  return { filename, mimeType: "application/json; charset=utf-8", bytes: Buffer.from(`${JSON.stringify(data, null, 2)}
`, "utf8") };
}
function convertEmbeddedUris(card, container) {
  const result = toCharacterV3(card);
  const data = characterData(result);
  if (!Array.isArray(data.assets)) return result;
  data.assets = data.assets.map((value) => {
    if (!isObject(value) || typeof value.uri !== "string") return value;
    const next = clone(value);
    const uri = value.uri;
    if (container === "charx" && uri.startsWith("__asset:")) next.uri = `embeded://${normalizeResourcePath(uri.slice("__asset:".length))}`;
    if (container === "png" && /^(?:embeded|embedded):\/\//i.test(uri)) next.uri = `__asset:${normalizeResourcePath(uri.replace(/^(?:embeded|embedded):\/\//i, ""))}`;
    return next;
  });
  return result;
}
function exportAsset(asset, requested) {
  const stem = safeExportName(asset.name);
  if (asset.kind === "character") {
    if (requested === "v1") return jsonFile(`${stem}.v1.json`, toCharacterV1(asset.data));
    if (requested === "v2") return jsonFile(`${stem}.v2.json`, toCharacterV2(asset.data));
    if (requested === "json" || requested === "v3") return jsonFile(`${stem}.json`, toCharacterV3(asset.data));
    if (requested === "charx") {
      const card = Buffer.from(`${JSON.stringify(convertEmbeddedUris(asset.data, "charx"), null, 2)}
`, "utf8");
      const files = { "card.json": card };
      for (const resource of asset.resources ?? []) {
        const path = normalizeResourcePath(resource.path);
        if (path && path.toLowerCase() !== "card.json") files[path] = attachedBytes(resource);
      }
      return { filename: `${stem}.charx`, mimeType: "application/zip", bytes: zipSync(files, { level: 9 }) };
    }
    const original = asset.source?.pngBase64 ? Buffer.from(asset.source.pngBase64, "base64") : makePlaceholderPng();
    return {
      filename: `${stem}.png`,
      mimeType: "image/png",
      bytes: writeCharacterToPng(
        original,
        toCharacterV2(asset.data),
        convertEmbeddedUris(asset.data, "png"),
        (asset.resources ?? []).map((resource) => ({ path: normalizeResourcePath(resource.path), bytes: attachedBytes(resource) }))
      )
    };
  }
  return jsonFile(`${stem}.json`, asset.data);
}
function exportProject(project) {
  const used = /* @__PURE__ */ new Map();
  const files = {};
  for (const asset of project.assets) {
    const characterFormat = asset.source?.container === "charx" ? "charx" : "png";
    const exported = exportAsset(asset, asset.kind === "character" ? characterFormat : "json");
    const folder = asset.kind === "character" ? "characters" : asset.kind === "worldbook" ? "worldbooks" : "presets";
    let filename = `${folder}/${exported.filename}`;
    const count = used.get(filename) ?? 0;
    used.set(filename, count + 1);
    if (count > 0) filename = filename.replace(/(\.[^.]+)$/, `-${count + 1}$1`);
    files[filename] = exported.bytes;
  }
  files["project.json"] = Buffer.from(JSON.stringify({ name: project.name, exportedAt: (/* @__PURE__ */ new Date()).toISOString() }, null, 2));
  return { filename: `${safeExportName(project.name)}.zip`, mimeType: "application/zip", bytes: zipSync(files, { level: 6 }) };
}
function embeddedPath(uri) {
  if (uri.startsWith("__asset:")) return normalizeResourcePath(uri.slice("__asset:".length));
  if (/^(?:embeded|embedded):\/\//i.test(uri)) return normalizeResourcePath(uri.replace(/^(?:embeded|embedded):\/\//i, ""));
  return void 0;
}
var TEXT_EXTENSIONS = /* @__PURE__ */ new Set([
  "txt",
  "md",
  "markdown",
  "json",
  "jsonl",
  "yaml",
  "yml",
  "xml",
  "html",
  "htm",
  "css",
  "js",
  "mjs",
  "cjs",
  "ts",
  "tsx",
  "jsx",
  "csv",
  "tsv",
  "ini",
  "toml",
  "cfg",
  "conf",
  "log",
  "prompt",
  "py",
  "lua",
  "sql",
  "svg"
]);
function declaredText(path, mimeType) {
  const mime = (mimeType || "").toLowerCase().split(";")[0];
  if (mime.startsWith("text/") || /\b(?:json|javascript|xml|yaml|toml|svg\+xml)$/.test(mime)) return true;
  return TEXT_EXTENSIONS.has(path.split(".").at(-1)?.toLowerCase() || "");
}
function decodeTextBytes(bytes, path, mimeType) {
  const input = Buffer.from(bytes);
  let text;
  let encoding;
  if (input[0] === 255 && input[1] === 254) {
    text = new TextDecoder("utf-16le", { fatal: true }).decode(input.subarray(2));
    encoding = "utf-16le";
  } else if (input[0] === 254 && input[1] === 255) {
    text = new TextDecoder("utf-16be", { fatal: true }).decode(input.subarray(2));
    encoding = "utf-16be";
  } else {
    const start = input[0] === 239 && input[1] === 187 && input[2] === 191 ? 3 : 0;
    text = new TextDecoder("utf-8", { fatal: true }).decode(input.subarray(start));
    encoding = "utf-8";
  }
  if (!declaredText(path, mimeType)) {
    const controls = [...text].filter((value) => {
      const code = value.charCodeAt(0);
      return code < 32 && code !== 9 && code !== 10 && code !== 13;
    }).length;
    if (text.includes("\0") || controls > Math.max(2, text.length * 0.01)) throw new Error("\u6240\u9009\u9644\u4EF6\u4E0D\u662F\u53EF\u5B89\u5168\u8BFB\u53D6\u7684\u6587\u672C\u683C\u5F0F");
  }
  return { text, encoding };
}
function parseDataUri(uri) {
  if (!uri.startsWith("data:")) return void 0;
  const comma = uri.indexOf(",");
  if (comma < 0) throw new Error("\u9644\u4EF6 data URI \u683C\u5F0F\u9519\u8BEF");
  const metadata = uri.slice(5, comma);
  const mimeType = metadata.split(";")[0] || void 0;
  const encoded = uri.slice(comma + 1);
  try {
    return { mimeType, bytes: metadata.split(";").includes("base64") ? Buffer.from(encoded, "base64") : Buffer.from(decodeURIComponent(encoded), "utf8") };
  } catch {
    throw new Error("\u9644\u4EF6 data URI \u65E0\u6CD5\u89E3\u7801");
  }
}
function readCharacterTextResource(asset, selector) {
  if (asset.kind !== "character") throw new Error("\u53EA\u80FD\u8BFB\u53D6\u89D2\u8272\u5361\u9644\u5E26\u7684\u6587\u672C\u8D44\u6E90");
  if (selector.assetIndex !== void 0) {
    const assets = Array.isArray(characterData(asset.data).assets) ? characterData(asset.data).assets : [];
    const item = assets[selector.assetIndex];
    if (!isObject(item) || typeof item.uri !== "string") throw new Error("data.assets \u4E0B\u6807\u65E0\u6548\u6216\u8BE5\u9879\u6CA1\u6709 URI");
    const inline = parseDataUri(item.uri);
    if (inline) {
      const path2 = `${stringValue(item.name, `asset-${selector.assetIndex}`)}.${stringValue(item.ext, "txt")}`;
      const decoded2 = decodeTextBytes(inline.bytes, path2, inline.mimeType);
      return { resourceId: `asset:${selector.assetIndex}`, path: path2, mimeType: inline.mimeType, ...decoded2, source: "data-uri" };
    }
    const path = embeddedPath(item.uri);
    if (!path) throw new Error("\u8BE5\u8D44\u4EA7\u662F\u8FDC\u7A0B\u6216\u9ED8\u8BA4 URI\uFF0C\u6CA1\u6709\u53EF\u8BFB\u53D6\u7684\u5185\u5D4C\u6587\u672C");
    selector = { path };
  }
  const resource = selector.resourceId ? asset.resources?.find((value) => value.id === selector.resourceId) : selector.path ? asset.resources?.find((value) => normalizeResourcePath(value.path).toLowerCase() === normalizeResourcePath(selector.path).toLowerCase()) : void 0;
  if (!resource) throw new Error("\u627E\u4E0D\u5230\u89D2\u8272\u5361\u9644\u5E26\u8D44\u6E90\uFF1B\u8BF7\u63D0\u4F9B resourceId\u3001path \u6216 assetIndex");
  const bytes = attachedBytes(resource);
  let decoded;
  try {
    decoded = decodeTextBytes(bytes, resource.path, resource.mimeType);
  } catch (error) {
    if (!declaredText(resource.path, resource.mimeType)) throw new Error("\u6240\u9009\u9644\u4EF6\u4E0D\u662F\u53EF\u5B89\u5168\u8BFB\u53D6\u7684\u6587\u672C\u683C\u5F0F");
    throw new Error(`\u6587\u672C\u9644\u4EF6\u89E3\u7801\u5931\u8D25\uFF1A${error instanceof Error ? error.message : String(error)}`);
  }
  return { resourceId: resource.id, path: resource.path, mimeType: resource.mimeType, ...decoded, source: "embedded" };
}
function canReadCharacterTextResource(resource) {
  try {
    decodeTextBytes(attachedBytes(resource), resource.path, resource.mimeType);
    return true;
  } catch {
    return false;
  }
}
function replaceEmbeddedPath(uri, path) {
  return uri.startsWith("__asset:") ? `__asset:${path}` : `embeded://${path}`;
}
function renamedPath(path, used) {
  const dot = path.lastIndexOf(".");
  const stem = dot > path.lastIndexOf("/") ? path.slice(0, dot) : path;
  const ext = dot > path.lastIndexOf("/") ? path.slice(dot) : "";
  for (let index = 2; ; index += 1) {
    const candidate = `${stem}-copy-${index}${ext}`;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
}
function valueShape(value) {
  if (typeof value === "string") return { type: "string", chars: value.length };
  if (Array.isArray(value)) return { type: "array", items: value.length };
  if (value && typeof value === "object") return { type: "object", keys: Object.keys(value).length };
  return { type: value === null ? "null" : typeof value };
}
function worldbookEntryRecords(asset) {
  const book = asset.kind === "character" ? isObject(characterData(asset.data).character_book) ? characterData(asset.data).character_book : void 0 : asset.kind === "worldbook" ? asset.data : void 0;
  if (!book || !isObject(book.entries) && !Array.isArray(book.entries)) return [];
  if (Array.isArray(book.entries)) {
    return book.entries.flatMap((entry, index) => isObject(entry) ? [{ id: String(entry.id ?? entry.uid ?? index), entry, index }] : []);
  }
  return Object.entries(book.entries).flatMap(([id, entry]) => isObject(entry) ? [{ id, entry }] : []);
}
function mutableWorldbook(asset) {
  if (asset.kind === "worldbook") {
    if (!isObject(asset.data.entries) && !Array.isArray(asset.data.entries)) asset.data.entries = {};
    return asset.data;
  }
  if (asset.kind !== "character") throw new Error("\u6240\u9009\u8D44\u6E90\u4E0D\u662F\u89D2\u8272\u5361\u6216\u4E16\u754C\u4E66");
  const data = characterData(asset.data);
  if (!isObject(data.character_book)) data.character_book = { name: `${asset.name} \u4E16\u754C\u4E66`, entries: [] };
  const book = data.character_book;
  if (!isObject(book.entries) && !Array.isArray(book.entries)) book.entries = [];
  return book;
}
function nextEntryId(records) {
  const numeric = records.map((value) => Number(value.id)).filter((value) => Number.isSafeInteger(value) && value >= 0);
  return String((numeric.length ? Math.max(...numeric) : -1) + 1);
}
function setEntryIdentity(entry, id, arrayContainer) {
  const numeric = Number(id);
  const value = Number.isSafeInteger(numeric) && String(numeric) === id ? numeric : id;
  if ("uid" in entry) entry.uid = value;
  if (arrayContainer && ("id" in entry || !("uid" in entry))) entry.id = value;
}
function upsertWorldbookEntry(asset, requestedId, input) {
  const book = mutableWorldbook(asset);
  const records = worldbookEntryRecords(asset);
  const entryId = requestedId || nextEntryId(records);
  const existing = records.find((value) => value.id === entryId);
  const entry = clone(input);
  if (Array.isArray(book.entries)) {
    setEntryIdentity(entry, entryId, true);
    if (existing?.index !== void 0) book.entries[existing.index] = entry;
    else book.entries.push(entry);
  } else {
    setEntryIdentity(entry, entryId, false);
    book.entries[entryId] = entry;
  }
  asset.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  return { entryId, created: !existing };
}
function deleteWorldbookEntry(asset, entryId) {
  const book = mutableWorldbook(asset);
  const existing = worldbookEntryRecords(asset).find((value) => value.id === entryId);
  if (!existing) return false;
  if (Array.isArray(book.entries)) book.entries.splice(existing.index, 1);
  else delete book.entries[entryId];
  asset.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  return true;
}
function copyWorldbookEntries(source, target, entryIds, conflict = "renumber") {
  if (!["character", "worldbook"].includes(source.kind) || !["character", "worldbook"].includes(target.kind)) throw new Error("\u6761\u76EE\u53EA\u80FD\u5728\u89D2\u8272\u5361\u5185\u5D4C\u4E16\u754C\u4E66\u6216\u72EC\u7ACB\u4E16\u754C\u4E66\u4E4B\u95F4\u590D\u5236");
  const requested = entryIds ? new Set(entryIds) : void 0;
  const sourceRecords = worldbookEntryRecords(source).filter((value) => !requested || requested.has(value.id));
  if (requested) {
    const missing = [...requested].filter((id) => !sourceRecords.some((value) => value.id === id));
    if (missing.length) throw new Error(`\u6E90\u4E16\u754C\u4E66\u627E\u4E0D\u5230\u6761\u76EE\uFF1A${missing.join(", ")}`);
  }
  let copied = 0;
  let overwritten = 0;
  let skipped = 0;
  const mappings = [];
  for (const sourceRecord of sourceRecords) {
    const exists2 = worldbookEntryRecords(target).some((value) => value.id === sourceRecord.id);
    if (exists2 && conflict === "skip") {
      skipped += 1;
      mappings.push({ sourceId: sourceRecord.id, targetId: sourceRecord.id, status: "skipped" });
      continue;
    }
    const targetId = exists2 && conflict === "renumber" ? void 0 : sourceRecord.id;
    const result = upsertWorldbookEntry(target, targetId, sourceRecord.entry);
    if (exists2 && conflict === "overwrite") overwritten += 1;
    else copied += 1;
    mappings.push({ sourceId: sourceRecord.id, targetId: result.entryId, status: exists2 && conflict === "overwrite" ? "overwritten" : "copied" });
  }
  return { copied, overwritten, skipped, mappings };
}
function patchCharacterFields(asset, patch) {
  if (asset.kind !== "character") throw new Error("\u6240\u9009\u8D44\u6E90\u4E0D\u662F\u89D2\u8272\u5361");
  const forbidden = Object.keys(patch).filter((key) => key === "character_book" || key === "assets");
  if (forbidden.length) throw new Error(`${forbidden.join(", ")} \u8BF7\u4F7F\u7528\u4E13\u7528\u4E16\u754C\u4E66\u6216\u9644\u5C5E\u8D44\u6E90\u5DE5\u5177\u7F16\u8F91`);
  const data = characterData(asset.data);
  for (const [key, value] of Object.entries(patch)) data[key] = clone(value);
  if (typeof patch.name === "string" && patch.name.trim()) asset.name = patch.name.trim();
  asset.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  return Object.keys(patch);
}
function assetSummaryForAgent(asset) {
  const data = asset.kind === "character" ? characterData(asset.data) : asset.data;
  const summary = {
    id: asset.id,
    kind: asset.kind,
    format: asset.format,
    name: asset.name,
    updatedAt: asset.updatedAt,
    fields: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, valueShape(value)]))
  };
  if (asset.kind === "character") {
    summary.hasEmbeddedWorldbook = isObject(data.character_book);
    summary.worldbookEntryCount = worldbookEntryRecords(asset).length;
    summary.attachmentCount = asset.resources?.length ?? 0;
    summary.declaredAssetCount = Array.isArray(data.assets) ? data.assets.length : 0;
  } else if (asset.kind === "worldbook") {
    summary.entryCount = worldbookEntryRecords(asset).length;
  } else {
    summary.promptCount = Array.isArray(data.prompts) ? data.prompts.length : 0;
  }
  return toLosslessJson(summary);
}
function projectManifestForAgent(project) {
  return toLosslessJson({
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    assetCount: project.assets.length,
    assets: project.assets.map(assetSummaryForAgent)
  });
}
function characterResourceSummary(asset) {
  const data = characterData(asset.data);
  const rawAssets = Array.isArray(data.assets) ? data.assets : [];
  const resources = asset.resources ?? [];
  const objectAssets = [];
  rawAssets.forEach((value, index) => {
    if (isObject(value)) objectAssets.push({ value, index });
  });
  const assets = objectAssets.filter((item) => !["lorebook", "worldbook"].includes(String(item.value.type ?? "").toLowerCase())).map(({ value, index }) => {
    const uri = stringValue(value.uri);
    const path = embeddedPath(uri);
    return {
      index,
      type: stringValue(value.type, "other"),
      name: stringValue(value.name, `\u8D44\u6E90 ${index + 1}`),
      uri,
      ext: stringValue(value.ext),
      path,
      backingPresent: path ? resources.some((resource) => normalizeResourcePath(resource.path).toLowerCase() === path.toLowerCase()) : true
    };
  });
  const referenced = new Set(assets.map((value) => value.path?.toLowerCase()).filter((value) => Boolean(value)));
  return {
    hasEmbeddedWorldbook: isObject(data.character_book),
    assets,
    resources: resources.map((resource) => ({
      resourceId: resource.id,
      path: resource.path,
      mimeType: resource.mimeType,
      referenced: referenced.has(normalizeResourcePath(resource.path).toLowerCase()),
      bytes: resource.binary?.bytes ?? attachedBytes(resource).length,
      textReadable: canReadCharacterTextResource(resource)
    }))
  };
}
function migrateCharacterResources(target, source, options = {}) {
  if (source.kind !== "character" || target.kind !== "character") throw new Error("\u9644\u5C5E\u8D44\u6E90\u53EA\u80FD\u5728\u89D2\u8272\u5361\u4E4B\u95F4\u8FC1\u79FB");
  const sourceData = characterData(source.data);
  const targetData = characterData(target.data);
  const sourceAssets = Array.isArray(sourceData.assets) ? sourceData.assets : [];
  if (!Array.isArray(targetData.assets)) targetData.assets = [];
  const targetAssets = targetData.assets;
  if (!target.resources) target.resources = [];
  const selectedIndexes = new Set(options.assetIndexes ?? sourceAssets.map((_, index) => index));
  const selectedResourceIds = new Set(options.resourceIds ?? []);
  const used = new Set(target.resources.map((resource) => normalizeResourcePath(resource.path).toLowerCase()));
  let migratedAssets = 0;
  let migratedResources = 0;
  let renamed = 0;
  const copyBacking = (path) => {
    const sourceResource = source.resources?.find((resource) => normalizeResourcePath(resource.path).toLowerCase() === path.toLowerCase());
    if (!sourceResource) return path;
    const same = target.resources.find((resource) => normalizeResourcePath(resource.path).toLowerCase() === path.toLowerCase());
    if (same && same.binary?.sha256 && same.binary.sha256 === sourceResource.binary?.sha256) return path;
    if (same && same.dataBase64 !== void 0 && same.dataBase64 === sourceResource.dataBase64) return path;
    let destination = path;
    if (same || used.has(path.toLowerCase())) {
      destination = renamedPath(path, used);
      renamed += 1;
    }
    target.resources.push({ ...clone(sourceResource), id: randomUUID(), path: destination });
    used.add(destination.toLowerCase());
    migratedResources += 1;
    return destination;
  };
  for (let index = 0; index < sourceAssets.length; index += 1) {
    const value = sourceAssets[index];
    if (!selectedIndexes.has(index) || !isObject(value)) continue;
    if (["lorebook", "worldbook"].includes(String(value.type ?? "").toLowerCase())) continue;
    const next = clone(value);
    if (typeof next.uri === "string") {
      const path = embeddedPath(next.uri);
      if (path) next.uri = replaceEmbeddedPath(next.uri, copyBacking(path));
    }
    const duplicate = targetAssets.some((item) => isObject(item) && item.type === next.type && item.name === next.name && item.uri === next.uri);
    if (!duplicate) {
      targetAssets.push(next);
      migratedAssets += 1;
    }
  }
  for (const resource of source.resources ?? []) {
    if (!selectedResourceIds.has(resource.id)) continue;
    copyBacking(normalizeResourcePath(resource.path));
  }
  target.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  return { migratedAssets, migratedResources, renamed };
}
function assetForAgent(asset) {
  const source = asset.source ? { ...asset.source, pngBase64: void 0 } : void 0;
  const tokens = new Set((asset.inlineBinaries ?? []).map((value) => value.token));
  const sanitize = (value, pointer = "") => {
    if (typeof value === "string" && value.startsWith("data:")) {
      const comma = value.indexOf(",");
      const metadata = comma < 0 ? "" : value.slice(5, comma);
      const mime = metadata.split(";")[0].toLowerCase() || "text/plain";
      const textual = mime.startsWith("text/") || /(?:json|javascript|xml|yaml|toml|svg\+xml)$/.test(mime);
      if (!textual) {
        const token = `tavernres-binary://${createHash("sha256").update(pointer).digest("hex").slice(0, 32)}`;
        return tokens.has(token) ? token : `[\u4E0D\u53EF\u6587\u672C\u5316\u7684 ${mime} Data URI \u5DF2\u6392\u9664]`;
      }
      return value;
    }
    if (Array.isArray(value)) return value.map((item, index) => sanitize(item, `${pointer}/${index}`));
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitize(item, `${pointer}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`)]));
    return value;
  };
  const data = sanitize(asset.data);
  if (asset.kind !== "character") return toLosslessJson({ ...asset, source, data });
  const summary = characterResourceSummary(asset);
  const safeSummary = {
    ...summary,
    assets: summary.assets.map((item) => ({ ...item, uri: item.uri.startsWith("data:") ? "[Data URI \u5185\u5BB9\u5DF2\u6392\u9664\uFF1B\u4F7F\u7528 assetIndex \u6309\u9700\u8BFB\u53D6\u6587\u672C\u9644\u4EF6]" : item.uri }))
  };
  return toLosslessJson({ ...asset, source, data, resources: safeSummary.resources, resourceSummary: safeSummary });
}
function selectedAssetFieldsForAgent(asset, requestedFields) {
  const projected = assetForAgent(asset);
  const projectedData = isObject(projected.data) ? projected.data : {};
  const root = asset.kind === "character" && isObject(projectedData.data) ? projectedData.data : projectedData;
  if (requestedFields.includes("*")) return { fields: root, missing: [] };
  const fields = {};
  const missing = [];
  for (const field of requestedFields) {
    if (Object.hasOwn(root, field)) fields[field] = root[field];
    else missing.push(field);
  }
  return { fields, missing };
}
function projectForAgent(project) {
  const view = { ...project, assets: project.assets.map(assetForAgent) };
  return toLosslessJson(view);
}
function orderedPresetPrompts(data) {
  const prompts = Array.isArray(data.prompts) ? data.prompts.filter(isObject) : [];
  const byId = new Map(prompts.map((prompt) => [String(prompt.identifier ?? ""), prompt]));
  const groups = Array.isArray(data.prompt_order) ? data.prompt_order.filter(isObject) : [];
  const preferred = groups.find((group) => group.character_id === 100001) ?? groups[0];
  if (!preferred || !Array.isArray(preferred.order)) return prompts;
  return preferred.order.filter(isObject).filter((item) => item.enabled !== false).map((item) => byId.get(String(item.identifier ?? ""))).filter(isObject);
}
function decodeUtf8(bytes) {
  return strFromU8(bytes);
}

// src/connector.ts
var REMOTE_CATEGORIES = [
  { id: "characters", directory: "characters", kind: "character", extensions: [".png", ".json"] },
  { id: "worlds", directory: "worlds", kind: "worldbook", extensions: [".json"] },
  { id: "chat-completion", directory: "OpenAI Settings", kind: "preset", extensions: [".json"] },
  { id: "textgen", directory: "TextGen Settings", kind: "preset", extensions: [".json"] },
  { id: "context", directory: "context", kind: "preset", extensions: [".json"] },
  { id: "instruct", directory: "instruct", kind: "preset", extensions: [".json"] },
  { id: "sysprompt", directory: "sysprompt", kind: "preset", extensions: [".json"] }
];
var REMOTE_PRESET_CATEGORY_IDS = REMOTE_CATEGORIES.filter((category) => category.kind === "preset").map((category) => category.id);
var PRESET_FORMAT_CATEGORY = {
  "chat-completion-preset": "chat-completion",
  "textgen-preset": "textgen",
  "context-preset": "context",
  "instruct-preset": "instruct",
  "unknown-preset": "sysprompt"
};
function connectorConfigPath(storeRoot) {
  return join(dirname(resolve(storeRoot)), "connector.json");
}
async function readConnectorConfig(storeRoot) {
  try {
    const parsed = JSON.parse(await readFile(connectorConfigPath(storeRoot), "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return void 0;
    const config = parsed;
    if (config.version !== 1 || typeof config.path !== "string" || typeof config.userDataRoot !== "string") return void 0;
    return {
      version: 1,
      path: config.path,
      userHandle: typeof config.userHandle === "string" ? config.userHandle : "",
      userDataRoot: config.userDataRoot,
      savedAt: typeof config.savedAt === "string" ? config.savedAt : ""
    };
  } catch {
    return void 0;
  }
}
async function writeConnectorConfig(storeRoot, config) {
  const destination = connectorConfigPath(storeRoot);
  await mkdir(dirname(destination), { recursive: true });
  const temporary = join(dirname(destination), `.connector.${randomUUID2()}.tmp`);
  await writeFile(temporary, `${JSON.stringify(config, null, 2)}
`, { encoding: "utf8", flag: "wx" });
  await rename(temporary, destination);
}
async function clearConnectorConfig(storeRoot) {
  await rm(connectorConfigPath(storeRoot), { force: true });
}
async function requireConfig(storeRoot) {
  const config = await readConnectorConfig(storeRoot);
  if (!config) throw new Error("\u5C1A\u672A\u914D\u7F6E\u9152\u9986\u8FDE\u63A5\uFF1B\u8BF7\u5148\u5728\u8FDE\u63A5\u5668\u9762\u677F\u914D\u7F6E\u9152\u9986\u76EE\u5F55\uFF0C\u6216\u4F7F\u7528 tavern_connect_configure");
  return config;
}
async function isDirectory(path) {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}
async function fileExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
async function readdirFiles(directory, extensions) {
  const entries = await readdir(directory, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile() && extensions.some((ext) => entry.name.toLowerCase().endsWith(ext))).map((entry) => entry.name).sort((a, b) => a.localeCompare(b));
}
async function describeConnection(userDataRoot) {
  const root = resolve(userDataRoot);
  const categories = await Promise.all(REMOTE_CATEGORIES.map(async (category) => {
    const directory = join(root, category.directory);
    const exists2 = await isDirectory(directory);
    return { id: category.id, directory: category.directory, kind: category.kind, exists: exists2, count: exists2 ? (await readdirFiles(directory, category.extensions)).length : 0 };
  }));
  return { userDataRoot: root, categories };
}
async function probePath(path) {
  if (typeof path !== "string" || !path.trim()) {
    return { path: String(path ?? ""), type: "unknown", message: "\u8BF7\u586B\u5199\u9152\u9986\u5B89\u88C5\u6839\u76EE\u5F55\u6216\u7528\u6237\u6570\u636E\u76EE\u5F55", userHandles: [] };
  }
  const target = resolve(path.trim());
  if (await isDirectory(join(target, "characters"))) {
    return { path, type: "user-data-root", message: "\u8BC6\u522B\u4E3A\u9152\u9986\u7528\u6237\u6570\u636E\u76EE\u5F55", userHandles: [], userHandle: "", status: await describeConnection(target) };
  }
  const dataBase = await isDirectory(join(target, "data")) ? join(target, "data") : target;
  const handles = [];
  if (await isDirectory(dataBase)) {
    for (const entry of await readdir(dataBase, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      if (await isDirectory(join(dataBase, entry.name, "characters"))) handles.push(entry.name);
    }
  }
  if (handles.length) {
    const userHandle = handles.includes("default-user") ? "default-user" : handles[0];
    return {
      path,
      type: "install-root",
      message: dataBase === target ? `\u8BC6\u522B\u4E3A\u9152\u9986\u7528\u6237\u76EE\u5F55\u96C6\u5408\uFF0C\u542B ${handles.length} \u4E2A\u7528\u6237` : `\u8BC6\u522B\u4E3A\u9152\u9986\u5B89\u88C5\u6839\u76EE\u5F55\uFF0Cdata/ \u4E0B\u6709 ${handles.length} \u4E2A\u7528\u6237`,
      userHandles: handles,
      userHandle,
      status: await describeConnection(join(dataBase, userHandle))
    };
  }
  return { path, type: "unknown", message: "\u76EE\u5F55\u4E0B\u6CA1\u6709 characters/\uFF0C\u4E5F\u6CA1\u6709 data/<\u7528\u6237>/characters\uFF1B\u8BF7\u786E\u8BA4\u8DEF\u5F84\u6307\u5411\u9152\u9986\u5B89\u88C5\u6839\u76EE\u5F55\u6216\u7528\u6237\u6570\u636E\u76EE\u5F55", userHandles: [] };
}
async function resolveUserDataRoot(path, handleOverride) {
  const probe = await probePath(path);
  if (probe.type === "unknown") throw new Error(probe.message);
  if (probe.type === "user-data-root") return { type: probe.type, userDataRoot: resolve(path.trim()), userHandle: "" };
  const target = resolve(path.trim());
  const dataBase = await isDirectory(join(target, "data")) ? join(target, "data") : target;
  const userHandle = handleOverride && probe.userHandles.includes(handleOverride) ? handleOverride : probe.userHandle;
  return { type: probe.type, userDataRoot: join(dataBase, userHandle), userHandle };
}
async function saveConnector(storeRoot, path, userHandle) {
  const resolved = await resolveUserDataRoot(path, userHandle?.trim() || void 0);
  const config = {
    version: 1,
    path: path.trim(),
    userHandle: resolved.userHandle,
    userDataRoot: resolved.userDataRoot,
    savedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await writeConnectorConfig(storeRoot, config);
  return { config, status: await describeConnection(config.userDataRoot) };
}
async function listRemote(storeRoot, kind) {
  const config = await requireConfig(storeRoot);
  const entries = [];
  for (const category of REMOTE_CATEGORIES) {
    if (kind && category.kind !== kind) continue;
    const directory = join(config.userDataRoot, category.directory);
    if (!await isDirectory(directory)) continue;
    for (const filename of await readdirFiles(directory, category.extensions)) {
      const info = await stat(join(directory, filename));
      entries.push({
        category: category.id,
        directory: category.directory,
        kind: category.kind,
        name: filename.replace(/\.[^.]+$/, ""),
        file: `${category.directory}/${filename}`,
        bytes: info.size,
        modifiedAt: info.mtime.toISOString()
      });
    }
  }
  return entries.sort((a, b) => a.file.localeCompare(b.file));
}
function safeRemoteFile(userDataRoot, file2) {
  const normalized = file2.replaceAll("\\", "/").replace(/^\/+/, "");
  if (!normalized || normalized.split("/").some((part) => !part || part === "." || part === "..")) throw new Error(`\u975E\u6CD5\u7684\u9152\u9986\u6587\u4EF6\u8DEF\u5F84\uFF1A${file2}`);
  const first = normalized.slice(0, normalized.indexOf("/"));
  const category = REMOTE_CATEGORIES.find((value) => value.directory.toLowerCase() === first.toLowerCase());
  if (!category) throw new Error(`\u4E0D\u652F\u6301\u7684\u9152\u9986\u76EE\u5F55\uFF1A${first}\uFF08\u652F\u6301 ${REMOTE_CATEGORIES.map((value) => value.directory).join("\u3001")}\uFF09`);
  if (!category.extensions.some((ext) => normalized.toLowerCase().endsWith(ext))) throw new Error(`\u4E0D\u652F\u6301\u7684\u6587\u4EF6\u7C7B\u578B\uFF1A${normalized}`);
  const absolute = resolve(userDataRoot, normalized);
  const back = relative(resolve(userDataRoot), absolute);
  if (!back || back.startsWith("..")) throw new Error(`\u6587\u4EF6\u8DEF\u5F84\u8D8A\u51FA\u9152\u9986\u6570\u636E\u76EE\u5F55\uFF1A${file2}`);
  return { category, file: normalized, absolute };
}
var MAX_REMOTE_ITEMS = 500;
async function importRemote(store, projectId, files, options = {}) {
  if (!Array.isArray(files) || !files.length) throw new Error("files \u4E0D\u80FD\u4E3A\u7A7A");
  if (files.length > MAX_REMOTE_ITEMS) throw new Error(`files \u6700\u591A\u5141\u8BB8 ${MAX_REMOTE_ITEMS} \u9879`);
  const config = await requireConfig(store.root);
  const replaceExisting = options.replaceExisting !== false;
  const assets = [];
  const errors = [];
  for (const file2 of [...new Set(files)]) {
    try {
      const located = safeRemoteFile(config.userDataRoot, file2);
      const bytes = await readFile(located.absolute);
      const result = importArchive(located.file, bytes);
      assets.push(...result.assets);
      for (const error of result.errors) errors.push({ file: file2, error: `${error.filename}: ${error.error}` });
    } catch (error) {
      errors.push({ file: file2, error: error instanceof Error ? error.message : String(error) });
    }
  }
  let imported = 0;
  let replaced = 0;
  const project = await store.update(projectId, (value) => {
    for (const asset of assets) {
      const index = replaceExisting ? value.assets.findIndex((item) => item.source?.filename === asset.source?.filename) : -1;
      if (index >= 0) {
        const { id, createdAt } = value.assets[index];
        value.assets[index] = { ...asset, id, createdAt };
        replaced += 1;
      } else {
        value.assets.push(asset);
        imported += 1;
      }
    }
  });
  return { project, imported, replaced, errors };
}
function remoteExportName(asset) {
  const data = asset.kind === "character" ? characterData(asset.data) : asset.data;
  return safeExportName(typeof data.name === "string" && data.name.trim() ? data.name : asset.name);
}
function categoryForAsset(asset, presetTarget) {
  if (asset.kind === "character") return REMOTE_CATEGORIES[0];
  if (asset.kind === "worldbook") return REMOTE_CATEGORIES[1];
  const requested = presetTarget ? REMOTE_CATEGORIES.find((value) => value.id === presetTarget && value.kind === "preset") : void 0;
  if (requested) return requested;
  return REMOTE_CATEGORIES.find((value) => value.id === (PRESET_FORMAT_CATEGORY[asset.format] ?? "sysprompt"));
}
async function exportRemote(store, projectId, assetIds, options = {}) {
  if (!Array.isArray(assetIds) || !assetIds.length) throw new Error("assetIds \u4E0D\u80FD\u4E3A\u7A7A");
  if (assetIds.length > MAX_REMOTE_ITEMS) throw new Error(`assetIds \u6700\u591A\u5141\u8BB8 ${MAX_REMOTE_ITEMS} \u9879`);
  const config = await requireConfig(store.root);
  const conflict = options.conflict ?? "overwrite";
  const project = await store.get(projectId);
  const userDataRoot = resolve(config.userDataRoot);
  const results = [];
  for (const assetId of [...new Set(assetIds)]) {
    const asset = project.assets.find((value) => value.id === assetId);
    if (!asset) throw new Error(`\u627E\u4E0D\u5230\u8D44\u6E90\uFF1A${assetId}`);
    const category = categoryForAsset(asset, options.presetTarget);
    const directory = resolve(userDataRoot, category.directory);
    const back = relative(userDataRoot, directory);
    if (!back || back.startsWith("..")) throw new Error(`\u76EE\u6807\u76EE\u5F55\u8D8A\u51FA\u9152\u9986\u6570\u636E\u76EE\u5F55\uFF1A${category.directory}`);
    const exported = exportAsset(asset, asset.kind === "character" ? "png" : "json");
    const extension = exported.filename.slice(exported.filename.lastIndexOf("."));
    const stem = remoteExportName(asset);
    let filename = `${stem}${extension}`;
    let status = "written";
    if (await fileExists(join(directory, filename))) {
      if (conflict === "skip") {
        results.push({ assetId, name: asset.name, kind: asset.kind, category: category.id, directory: category.directory, file: `${category.directory}/${filename}`, status: "skipped" });
        continue;
      }
      if (conflict === "rename") {
        let index = 2;
        while (await fileExists(join(directory, `${stem} (${index})${extension}`))) index += 1;
        filename = `${stem} (${index})${extension}`;
        status = "renamed";
      } else {
        status = "overwritten";
      }
    }
    await mkdir(directory, { recursive: true });
    const temporary = join(directory, `.${randomUUID2()}.tmp`);
    await writeFile(temporary, exported.bytes, { flag: "wx" });
    await rename(temporary, join(directory, filename));
    results.push({ assetId, name: asset.name, kind: asset.kind, category: category.id, directory: category.directory, file: `${category.directory}/${filename}`, status });
  }
  return results;
}

// src/store.ts
import { createHash as createHash2, randomUUID as randomUUID3 } from "node:crypto";
import { mkdir as mkdir2, readFile as readFile2, readdir as readdir2, rename as rename2, rm as rm2, writeFile as writeFile2 } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname as dirname2, isAbsolute, join as join2, relative as relative2, resolve as resolve2, sep } from "node:path";
var SAFE_ID = /^[a-zA-Z0-9-]{1,80}$/;
function now() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function clone2(value) {
  return structuredClone(value);
}
function sha256(bytes) {
  return createHash2("sha256").update(bytes).digest("hex");
}
function binaryDataUri(value) {
  if (!value.startsWith("data:")) return void 0;
  const comma = value.indexOf(",");
  if (comma < 0) return void 0;
  const metadata = value.slice(5, comma);
  const mimeType = metadata.split(";")[0].toLowerCase() || "text/plain";
  if (mimeType.startsWith("text/") || /(?:json|javascript|xml|yaml|toml|svg\+xml)$/.test(mimeType)) return void 0;
  const encoded = value.slice(comma + 1);
  try {
    return { mimeType, bytes: metadata.toLowerCase().split(";").includes("base64") ? Buffer.from(encoded, "base64") : Buffer.from(decodeURIComponent(encoded), "utf8") };
  } catch {
    return void 0;
  }
}
function resolveDshHome() {
  return process.env.DSH_HOME || join2(homedir(), ".dsh");
}
function resolveDataRoot() {
  return process.env.DSH_STCARDWRITER_DATA || join2(resolveDshHome(), "st-card-writer", "projects");
}
function resolveWorkspaceDataRoot(workspacePath) {
  if (!workspacePath || !isAbsolute(workspacePath)) throw new Error("\u9700\u8981\u6709\u6548\u7684 DSH \u5DE5\u4F5C\u533A\u7EDD\u5BF9\u8DEF\u5F84");
  return join2(resolve2(workspacePath), ".tavernres", "projects");
}
function assertId(id) {
  if (!SAFE_ID.test(id)) throw new Error("\u65E0\u6548 ID");
}
function validateProject(value) {
  if (!value || typeof value !== "object") throw new Error("\u9879\u76EE\u6587\u4EF6\u635F\u574F");
  const project = value;
  if (typeof project.id !== "string" || typeof project.name !== "string" || !Array.isArray(project.assets)) throw new Error("\u9879\u76EE\u6587\u4EF6\u635F\u574F");
  assertId(project.id);
}
var ProjectStore = class {
  root;
  queues = /* @__PURE__ */ new Map();
  constructor(root = resolveDataRoot()) {
    this.root = root;
  }
  async initialize() {
    await mkdir2(this.root, { recursive: true });
  }
  path(id) {
    assertId(id);
    return join2(this.root, `${id}.json`);
  }
  binaryDirectory(id) {
    assertId(id);
    return join2(this.root, `${id}.assets`);
  }
  referencedPath(file2) {
    const root = resolve2(this.root);
    const destination = resolve2(root, file2.replaceAll("/", sep));
    const back = relative2(root, destination);
    if (!back || back.startsWith("..") || isAbsolute(back)) throw new Error("\u9879\u76EE\u4E8C\u8FDB\u5236\u5F15\u7528\u8D8A\u51FA\u5B58\u50A8\u76EE\u5F55");
    return destination;
  }
  async writeBinary(file2, bytes) {
    const destination = this.referencedPath(file2);
    await mkdir2(dirname2(destination), { recursive: true });
    const temporary = `${destination}.${randomUUID3()}.tmp`;
    await writeFile2(temporary, bytes, { flag: "wx" });
    await rename2(temporary, destination);
    return { file: file2.replaceAll("\\", "/"), bytes: bytes.length, sha256: sha256(bytes) };
  }
  async readBinary(reference) {
    const bytes = await readFile2(this.referencedPath(reference.file));
    if (bytes.length !== reference.bytes || sha256(bytes) !== reference.sha256) throw new Error(`\u9879\u76EE\u4E8C\u8FDB\u5236\u6587\u4EF6\u6821\u9A8C\u5931\u8D25\uFF1A${reference.file}`);
    return bytes;
  }
  async prepareForPersistence(project) {
    const persisted = clone2(project);
    for (const asset of persisted.assets) {
      if (asset.source?.pngBase64) {
        const bytes = Buffer.from(asset.source.pngBase64, "base64");
        asset.source.pngFile = await this.writeBinary(`${project.id}.assets/${asset.id}/source.png`, bytes);
      }
      if (asset.source) delete asset.source.pngBase64;
      for (const resource of asset.resources ?? []) {
        if (resource.dataBase64 !== void 0) {
          const bytes = Buffer.from(resource.dataBase64, "base64");
          const key = createHash2("sha256").update(resource.id).digest("hex").slice(0, 32);
          resource.binary = await this.writeBinary(`${project.id}.assets/${asset.id}/resources/${key}.bin`, bytes);
        }
        delete resource.dataBase64;
      }
      const references = new Map((asset.inlineBinaries ?? []).map((value) => [value.token, value]));
      const retained = /* @__PURE__ */ new Map();
      const externalize = async (value, pointer) => {
        if (typeof value === "string") {
          const existing = references.get(value);
          if (existing) {
            retained.set(existing.token, existing);
            return value;
          }
          const inline = binaryDataUri(value);
          if (!inline) return value;
          const key = sha256(Buffer.from(pointer, "utf8")).slice(0, 32);
          const token = `tavernres-binary://${key}`;
          const binary = await this.writeBinary(`${project.id}.assets/${asset.id}/inline/${key}.bin`, inline.bytes);
          retained.set(token, { token, mimeType: inline.mimeType, binary });
          return token;
        }
        if (Array.isArray(value)) return Promise.all(value.map((item, index) => externalize(item, `${pointer}/${index}`)));
        if (value && typeof value === "object") {
          const entries = await Promise.all(Object.entries(value).map(async ([key, item]) => [key, await externalize(item, `${pointer}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`)]));
          return Object.fromEntries(entries);
        }
        return value;
      };
      asset.data = await externalize(asset.data, "");
      asset.inlineBinaries = retained.size ? [...retained.values()] : void 0;
    }
    return persisted;
  }
  async hydrate(project) {
    for (const asset of project.assets) {
      if (asset.source?.pngFile && asset.source.pngBase64 === void 0) asset.source.pngBase64 = (await this.readBinary(asset.source.pngFile)).toString("base64");
      for (const resource of asset.resources ?? []) {
        if (resource.binary && resource.dataBase64 === void 0) resource.dataBase64 = (await this.readBinary(resource.binary)).toString("base64");
      }
      if (asset.inlineBinaries?.length) {
        const replacements = /* @__PURE__ */ new Map();
        for (const reference of asset.inlineBinaries) {
          const bytes = await this.readBinary(reference.binary);
          replacements.set(reference.token, `data:${reference.mimeType || "application/octet-stream"};base64,${bytes.toString("base64")}`);
        }
        const restore = (value) => {
          if (typeof value === "string") return replacements.get(value) ?? value;
          if (Array.isArray(value)) return value.map(restore);
          if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, restore(item)]));
          return value;
        };
        asset.data = restore(asset.data);
      }
    }
    return project;
  }
  async persist(project) {
    const persisted = await this.prepareForPersistence(project);
    const destination = this.path(project.id);
    const temporary = join2(this.root, `.${project.id}.${randomUUID3()}.tmp`);
    await writeFile2(temporary, `${JSON.stringify(persisted, null, 2)}
`, { encoding: "utf8", flag: "wx" });
    await rename2(temporary, destination);
  }
  async serialize(id, task) {
    const prior = this.queues.get(id) ?? Promise.resolve();
    const next = prior.catch(() => void 0).then(task);
    this.queues.set(id, next);
    try {
      return await next;
    } finally {
      if (this.queues.get(id) === next) this.queues.delete(id);
    }
  }
  async list() {
    await this.initialize();
    const names = await readdir2(this.root);
    const projects = await Promise.all(names.filter((name) => SAFE_ID.test(name.replace(/\.json$/, "")) && name.endsWith(".json")).map(async (name) => {
      try {
        return await this.get(name.slice(0, -5));
      } catch {
        return void 0;
      }
    }));
    return projects.filter((project) => Boolean(project)).map((project) => ({
      id: project.id,
      name: project.name,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      assetCount: project.assets.length,
      counts: {
        character: project.assets.filter((asset) => asset.kind === "character").length,
        worldbook: project.assets.filter((asset) => asset.kind === "worldbook").length,
        preset: project.assets.filter((asset) => asset.kind === "preset").length
      }
    })).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  async get(id) {
    const value = JSON.parse(await readFile2(this.path(id), "utf8"));
    validateProject(value);
    return this.hydrate(value);
  }
  async create(name = "\u672A\u547D\u540D\u9152\u9986\u9879\u76EE") {
    const timestamp = now();
    const project = { id: randomUUID3(), name: name.trim() || "\u672A\u547D\u540D\u9152\u9986\u9879\u76EE", createdAt: timestamp, updatedAt: timestamp, assets: [] };
    await this.write(project);
    return clone2(project);
  }
  async write(project) {
    validateProject(project);
    await this.initialize();
    await this.serialize(project.id, async () => {
      await this.persist(project);
    });
  }
  async update(id, mutator) {
    return this.serialize(id, async () => {
      const project = await this.get(id);
      mutator(project);
      project.updatedAt = now();
      await this.persist(project);
      return clone2(project);
    });
  }
  async rename(id, name) {
    return this.update(id, (project) => {
      project.name = name.trim() || project.name;
    });
  }
  async delete(id) {
    assertId(id);
    await rm2(this.path(id), { force: true });
    await rm2(this.binaryDirectory(id), { recursive: true, force: true });
  }
  async addBlankAsset(projectId, kind, name) {
    return this.update(projectId, (project) => {
      project.assets.push(createAsset(kind, name));
    });
  }
  async putAsset(projectId, assetId, input) {
    assertId(assetId);
    return this.update(projectId, (project) => {
      const index = project.assets.findIndex((asset) => asset.id === assetId);
      if (index < 0) throw new Error("\u627E\u4E0D\u5230\u6761\u76EE");
      const createdAt = project.assets[index].createdAt;
      project.assets[index] = { ...clone2(input), id: assetId, createdAt, updatedAt: now() };
    });
  }
  async deleteAsset(projectId, assetId) {
    assertId(assetId);
    return this.update(projectId, (project) => {
      const index = project.assets.findIndex((asset) => asset.id === assetId);
      if (index < 0) throw new Error("\u627E\u4E0D\u5230\u6761\u76EE");
      project.assets.splice(index, 1);
    });
  }
  async importFiles(projectId, files) {
    const imported = [];
    const errors = [];
    for (const file2 of files) {
      try {
        const result = importArchive(file2.name, Buffer.from(file2.data, "base64"));
        imported.push(...result.assets);
        errors.push(...result.errors);
      } catch (error) {
        errors.push({ filename: file2.name, error: error instanceof Error ? error.message : String(error) });
      }
    }
    const project = await this.update(projectId, (value) => {
      value.assets.push(...imported);
    });
    return { project, imported: imported.length, errors };
  }
  async migrateCharacterAssets(projectId, targetAssetId, sourceAssetId, options = {}) {
    let result = { migratedAssets: 0, migratedResources: 0, renamed: 0 };
    const project = await this.update(projectId, (value) => {
      const target = value.assets.find((asset) => asset.id === targetAssetId);
      const source = value.assets.find((asset) => asset.id === sourceAssetId);
      if (!target || !source) throw new Error("\u627E\u4E0D\u5230\u6E90\u89D2\u8272\u5361\u6216\u76EE\u6807\u89D2\u8272\u5361");
      if (target.id === source.id) throw new Error("\u6E90\u89D2\u8272\u5361\u548C\u76EE\u6807\u89D2\u8272\u5361\u4E0D\u80FD\u76F8\u540C");
      result = migrateCharacterResources(target, source, options);
    });
    return { project, result };
  }
};

// src/api.ts
var API_PREFIX = "/api/dsh-stcardwriter";
var MAX_BODY = 80 * 1024 * 1024;
var HttpError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const bytes = Buffer.from(chunk);
    size += bytes.length;
    if (size > MAX_BODY) throw new HttpError(413, "\u8BF7\u6C42\u4F53\u8FC7\u5927");
    chunks.push(bytes);
  }
  if (chunks.length === 0) return {};
  let parsed;
  try {
    parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "JSON \u683C\u5F0F\u9519\u8BEF");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new HttpError(400, "\u8BF7\u6C42\u4F53\u5FC5\u987B\u662F JSON \u5BF9\u8C61");
  return parsed;
}
function json(res, status, value) {
  const body = Buffer.from(JSON.stringify(value));
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": body.length,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  res.end(body);
}
function file(res, value) {
  const body = Buffer.from(value.bytes);
  const encoded = encodeURIComponent(value.filename);
  res.writeHead(200, {
    "content-type": value.mimeType,
    "content-length": body.length,
    "content-disposition": `attachment; filename*=UTF-8''${encoded}`,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  res.end(body);
}
function relativePath(req) {
  const origin = `http://${req.headers.host || "localhost"}`;
  const url = new URL(req.url || "/", origin);
  const index = url.pathname.indexOf(API_PREFIX);
  const pathname = index >= 0 ? url.pathname.slice(index + API_PREFIX.length) : url.pathname;
  const parts = pathname.split("/").filter(Boolean).map((part) => decodeURIComponent(part));
  return { parts, query: url.searchParams };
}
function oneOfKind(value) {
  if (value === "character" || value === "worldbook" || value === "preset") return value;
  throw new HttpError(400, "kind \u5FC5\u987B\u662F character\u3001worldbook \u6216 preset");
}
function stringArray(value, label, max2 = 500) {
  if (!Array.isArray(value) || !value.length || !value.every((item) => typeof item === "string" && item.trim())) throw new HttpError(400, `${label} \u5FC5\u987B\u662F\u975E\u7A7A\u5B57\u7B26\u4E32\u6570\u7EC4`);
  if (value.length > max2) throw new HttpError(400, `${label} \u6700\u591A\u5141\u8BB8 ${max2} \u9879`);
  return [...new Set(value)];
}
function conflictPolicy(value) {
  if (value === void 0 || value === null || value === "") return "overwrite";
  if (value === "overwrite" || value === "rename" || value === "skip") return value;
  throw new HttpError(400, "conflict \u5FC5\u987B\u662F overwrite\u3001rename \u6216 skip");
}
function presetTargetCategory(value) {
  if (value === void 0 || value === null || value === "") return void 0;
  if (typeof value === "string" && REMOTE_PRESET_CATEGORY_IDS.includes(value)) return value;
  throw new HttpError(400, `presetTarget \u5FC5\u987B\u662F ${REMOTE_PRESET_CATEGORY_IDS.join("\u3001")} \u4E4B\u4E00`);
}
function findAsset(project, id) {
  const asset = project.assets.find((value) => value.id === id);
  if (!asset) throw new HttpError(404, "\u627E\u4E0D\u5230\u8D44\u6E90");
  return asset;
}
function workspacePathFromRequest(req) {
  const origin = `http://${req.headers.host || "localhost"}`;
  const url = new URL(req.url || "/", origin);
  const queryPath = url.searchParams.get("workspace");
  if (queryPath) return queryPath;
  const raw = Array.isArray(req.headers["x-dsh-workspace"]) ? req.headers["x-dsh-workspace"][0] : req.headers["x-dsh-workspace"];
  if (!raw) throw new HttpError(400, "\u7F3A\u5C11\u5F53\u524D DSH \u5DE5\u4F5C\u533A\u8DEF\u5F84");
  try {
    return decodeURIComponent(raw);
  } catch {
    throw new HttpError(400, "\u5DE5\u4F5C\u533A\u8DEF\u5F84\u7F16\u7801\u65E0\u6548");
  }
}
function createWorkspaceStoreResolver() {
  const stores = /* @__PURE__ */ new Map();
  return (req) => {
    const root = resolveWorkspaceDataRoot(workspacePathFromRequest(req));
    let store = stores.get(root);
    if (!store) {
      store = new ProjectStore(root);
      stores.set(root, store);
    }
    return store;
  };
}
function createApiHandler(storeOrResolver) {
  return async (req, res) => {
    try {
      const method = req.method || "GET";
      const { parts, query } = relativePath(req);
      if (method === "OPTIONS") {
        res.writeHead(204, { allow: "GET, POST, PUT, DELETE, OPTIONS" });
        res.end();
        return;
      }
      const store = typeof storeOrResolver === "function" ? storeOrResolver(req) : storeOrResolver;
      if (parts.length === 1 && parts[0] === "projects") {
        if (method === "GET") return json(res, 200, { projects: await store.list() });
        if (method === "POST") {
          const body = await readJson(req);
          return json(res, 201, { project: await store.create(typeof body.name === "string" ? body.name : void 0) });
        }
      }
      if (parts[0] === "connector") {
        if (parts.length === 1 && method === "GET") {
          const config = await readConnectorConfig(store.root);
          if (!config) return json(res, 200, { connected: false });
          return json(res, 200, { connected: true, config, status: await describeConnection(config.userDataRoot) });
        }
        if (parts.length === 1 && method === "PUT") {
          const body = await readJson(req);
          if (typeof body.path !== "string" || !body.path.trim()) throw new HttpError(400, "\u7F3A\u5C11\u9152\u9986\u76EE\u5F55\u8DEF\u5F84 path");
          const probe = await probePath(body.path);
          if (probe.type === "unknown") throw new HttpError(400, probe.message);
          const userHandle = typeof body.userHandle === "string" && body.userHandle.trim() ? body.userHandle.trim() : void 0;
          const saved = await saveConnector(store.root, body.path, userHandle);
          return json(res, 200, { connected: true, config: saved.config, status: saved.status });
        }
        if (parts.length === 1 && method === "DELETE") {
          await clearConnectorConfig(store.root);
          return json(res, 200, { connected: false });
        }
        if (parts.length === 2 && parts[1] === "probe" && method === "POST") {
          const body = await readJson(req);
          if (typeof body.path !== "string" || !body.path.trim()) throw new HttpError(400, "\u7F3A\u5C11\u9152\u9986\u76EE\u5F55\u8DEF\u5F84 path");
          return json(res, 200, { probe: await probePath(body.path) });
        }
        if (parts.length === 2 && parts[1] === "remote" && method === "GET") {
          if (!await readConnectorConfig(store.root)) throw new HttpError(400, "\u5C1A\u672A\u914D\u7F6E\u9152\u9986\u8FDE\u63A5\uFF0C\u8BF7\u5148 PUT /connector");
          const kindParam = query.get("kind");
          return json(res, 200, { entries: await listRemote(store.root, kindParam ? oneOfKind(kindParam) : void 0) });
        }
        if (parts.length === 2 && parts[1] === "import" && method === "POST") {
          if (!await readConnectorConfig(store.root)) throw new HttpError(400, "\u5C1A\u672A\u914D\u7F6E\u9152\u9986\u8FDE\u63A5\uFF0C\u8BF7\u5148 PUT /connector");
          const body = await readJson(req);
          if (typeof body.projectId !== "string" || !body.projectId.trim()) throw new HttpError(400, "\u7F3A\u5C11 projectId");
          const files = stringArray(body.files, "files");
          return json(res, 200, await importRemote(store, body.projectId, files, { replaceExisting: body.replaceExisting !== false }));
        }
        if (parts.length === 2 && parts[1] === "export" && method === "POST") {
          if (!await readConnectorConfig(store.root)) throw new HttpError(400, "\u5C1A\u672A\u914D\u7F6E\u9152\u9986\u8FDE\u63A5\uFF0C\u8BF7\u5148 PUT /connector");
          const body = await readJson(req);
          if (typeof body.projectId !== "string" || !body.projectId.trim()) throw new HttpError(400, "\u7F3A\u5C11 projectId");
          const assetIds = stringArray(body.assetIds, "assetIds");
          const results = await exportRemote(store, body.projectId, assetIds, { conflict: conflictPolicy(body.conflict), presetTarget: presetTargetCategory(body.presetTarget) });
          return json(res, 200, { results });
        }
      }
      if (parts[0] !== "projects" || !parts[1]) throw new HttpError(404, "\u63A5\u53E3\u4E0D\u5B58\u5728");
      const projectId = parts[1];
      if (parts.length === 2) {
        if (method === "GET") return json(res, 200, { project: await store.get(projectId) });
        if (method === "PUT") {
          const body = await readJson(req);
          if (typeof body.name !== "string") throw new HttpError(400, "\u7F3A\u5C11\u9879\u76EE\u540D\u79F0");
          return json(res, 200, { project: await store.rename(projectId, body.name) });
        }
        if (method === "DELETE") {
          await store.delete(projectId);
          return json(res, 200, { ok: true });
        }
      }
      if (parts.length === 3 && parts[2] === "import" && method === "POST") {
        const body = await readJson(req);
        if (!Array.isArray(body.files)) throw new HttpError(400, "files \u5FC5\u987B\u662F\u6570\u7EC4");
        const files = body.files.map((value) => {
          if (!isObject(value) || typeof value.name !== "string" || typeof value.data !== "string") throw new HttpError(400, "\u6587\u4EF6\u9879\u683C\u5F0F\u9519\u8BEF");
          return { name: value.name, data: value.data };
        });
        return json(res, 200, await store.importFiles(projectId, files));
      }
      if (parts.length === 3 && parts[2] === "export" && method === "GET") return file(res, exportProject(await store.get(projectId)));
      if (parts.length === 3 && parts[2] === "assets" && method === "POST") {
        const body = await readJson(req);
        return json(res, 201, { project: await store.addBlankAsset(projectId, oneOfKind(body.kind), typeof body.name === "string" ? body.name : void 0) });
      }
      if (parts[2] === "assets" && parts[3]) {
        const assetId = parts[3];
        if (parts.length === 4 && method === "PUT") {
          const body = await readJson(req);
          if (!isObject(body.asset)) throw new HttpError(400, "\u7F3A\u5C11 asset");
          return json(res, 200, { project: await store.putAsset(projectId, assetId, body.asset) });
        }
        if (parts.length === 4 && method === "DELETE") return json(res, 200, { project: await store.deleteAsset(projectId, assetId) });
        if (parts.length === 5 && parts[4] === "export" && method === "GET") {
          const project = await store.get(projectId);
          return file(res, exportAsset(findAsset(project, assetId), query.get("format") || void 0));
        }
        if (parts.length === 5 && parts[4] === "migrate" && method === "POST") {
          const body = await readJson(req);
          if (typeof body.sourceAssetId !== "string") throw new HttpError(400, "\u7F3A\u5C11\u6E90\u89D2\u8272\u5361 ID");
          const assetIndexes = body.assetIndexes === void 0 ? void 0 : Array.isArray(body.assetIndexes) ? body.assetIndexes.map((value) => {
            if (!Number.isInteger(value) || Number(value) < 0) throw new HttpError(400, "assetIndexes \u683C\u5F0F\u9519\u8BEF");
            return Number(value);
          }) : (() => {
            throw new HttpError(400, "assetIndexes \u5FC5\u987B\u662F\u6570\u7EC4");
          })();
          const resourceIds = body.resourceIds === void 0 ? void 0 : Array.isArray(body.resourceIds) ? body.resourceIds.map((value) => {
            if (typeof value !== "string") throw new HttpError(400, "resourceIds \u683C\u5F0F\u9519\u8BEF");
            return value;
          }) : (() => {
            throw new HttpError(400, "resourceIds \u5FC5\u987B\u662F\u6570\u7EC4");
          })();
          return json(res, 200, await store.migrateCharacterAssets(projectId, assetId, body.sourceAssetId, { assetIndexes, resourceIds }));
        }
      }
      throw new HttpError(405, "\u4E0D\u652F\u6301\u7684\u8BF7\u6C42");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const code = error instanceof HttpError ? error.status : /ENOENT/.test(message) ? 404 : 500;
      json(res, code, { error: message });
    }
  };
}

// src/preset.ts
import { copyFile, mkdir as mkdir3, readFile as readFile3, writeFile as writeFile3 } from "node:fs/promises";
import { dirname as dirname3, join as join3 } from "node:path";
import { fileURLToPath } from "node:url";
async function exists(path) {
  try {
    await readFile3(path);
    return true;
  } catch {
    return false;
  }
}
var MANAGED_V2 = "# dsh-stcardwriter managed preset v2";
var MANAGED_V3 = "# dsh-stcardwriter managed preset v3";
async function ensureAgentPreset() {
  const destination = join3(resolveDshHome(), ".agent-presets", "tavern-authoring");
  const target = join3(destination, "agent.cordis.yml");
  if (await exists(target)) {
    const current = await readFile3(target, "utf8");
    if (current.startsWith(MANAGED_V2) && current.includes("    complete: true")) {
      const migrated = current.replace(MANAGED_V2, MANAGED_V3).replace("    complete: true", "    complete: false");
      await writeFile3(target, migrated, "utf8");
      return { installed: false, updated: true, path: destination };
    }
    return { installed: false, updated: false, path: destination };
  }
  const packageRoot = dirname3(dirname3(fileURLToPath(import.meta.url)));
  const source = join3(packageRoot, "agent-presets", "tavern-authoring");
  await mkdir3(destination, { recursive: true });
  await Promise.all([
    copyFile(join3(source, "agent.cordis.yml"), target),
    copyFile(join3(source, "preset.yml"), join3(destination, "preset.yml"))
  ]);
  return { installed: true, updated: false, path: destination };
}

// src/index.ts
var inject = ["webServer"];
var PRESET_PLUS_SCOPES = ["preset-plus", "tavern-authoring"];
function filterPresetPlusSection(sections, presetId) {
  return PRESET_PLUS_SCOPES.includes(presetId ?? "") ? sections : sections.filter((section) => section.name !== "preset-plus");
}
function installPresetPlusScopeGuard(ctx) {
  const agentPresets = ctx.get?.("agentPresets");
  if (!agentPresets || !ctx.on) return;
  ctx.on("system-prompt/assemble", (assembly, context, next) => {
    const presetId = context.agent ? agentPresets.composedPreset(context.agent.ctx) : void 0;
    assembly.sections = filterPresetPlusSection(assembly.sections, presetId);
    return next();
  }, { global: true });
}
function apply(ctx) {
  void ensureAgentPreset().catch((error) => console.warn("[dsh-stcardwriter] Agent \u9884\u8BBE\u5B89\u88C5\u5931\u8D25:", error));
  const register = () => ctx.webServer.register({ kind: "prefix", path: API_PREFIX, handler: createApiHandler(createWorkspaceStoreResolver()) });
  if (ctx.effect) ctx.effect(register, "dsh-stcardwriter: api");
  else register();
  installPresetPlusScopeGuard(ctx);
}
export {
  API_PREFIX,
  PRESET_PLUS_SCOPES,
  ProjectStore,
  REMOTE_CATEGORIES,
  REMOTE_PRESET_CATEGORY_IDS,
  apply,
  assetForAgent,
  assetSummaryForAgent,
  canReadCharacterTextResource,
  characterData,
  characterResourceSummary,
  characterVersion,
  clearConnectorConfig,
  connectorConfigPath,
  copyWorldbookEntries,
  createApiHandler,
  createAsset,
  createBlankData,
  createWorkspaceStoreResolver,
  decodeText,
  decodeUtf8,
  deleteWorldbookEntry,
  describeConnection,
  detectKind,
  embeddedPath,
  ensureAgentPreset,
  exportAsset,
  exportProject,
  exportRemote,
  filterPresetPlusSection,
  importArchive,
  importAsset,
  importRemote,
  inject,
  isObject,
  listRemote,
  makePlaceholderPng,
  migrateCharacterResources,
  normalizeResourcePath,
  orderedPresetPrompts,
  parsePngChunks,
  patchCharacterFields,
  probePath,
  projectForAgent,
  projectManifestForAgent,
  readCharacterFromPng,
  readCharacterTextResource,
  readConnectorConfig,
  readExtendedAssetsFromPng,
  safeExportName,
  saveConnector,
  selectedAssetFieldsForAgent,
  toCharacterV1,
  toCharacterV2,
  toCharacterV3,
  toLosslessJson,
  upsertWorldbookEntry,
  workspacePathFromRequest,
  worldbookEntryRecords,
  writeCharacterToPng,
  writeConnectorConfig
};
//# sourceMappingURL=index.js.map
