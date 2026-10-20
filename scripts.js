"use strict";
const KW = ['int', 'float', 'double', 'char', 'long', 'short', 'unsigned'];
const unesc = s => s.replace(/\\(.)/g, (a, c) => ({n: '\n', t: '\t', '0': '\0'}[c] ?? c));
function lex(src) {
  const T = [], re = /\s+|\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*|(\d+\.\d*|\.\d+|\d+)|([A-Za-z_]\w*)|"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])+)'|(\+\+|--|\+=|-=|\*=|\/=|%=|==|!=|<=|>=|&&|\|\||[-+*\/%=<>!&(){}\[\];,])/y;
  let pos = 0, line = 1, m;
  while (pos < src.length) {
    re.lastIndex = pos; m = re.exec(src);
    if (!m) throw Error('Linha ' + line + ': caractere não reconhecido "' + src[pos] + '"');
    const s = m[0];
    if (m[1] !== undefined) T.push({t: 'n', v: parseFloat(s), f: s.includes('.'), l: line});
    else if (m[2]) T.push({t: 'i', v: s, l: line});
    else if (m[3] !== undefined) T.push({t: 's', v: unesc(m[3]), l: line});
    else if (m[4] !== undefined) T.push({t: 'n', v: unesc(m[4]).charCodeAt(0), f: false, ch: true, raw: s, l: line});
    else if (m[5]) T.push({t: 'p', v: s, l: line});
    line += (s.match(/\n/g) || []).length; pos = re.lastIndex;
  }
  return T;
}
function parse(T) {
  let p = 0;
  const err = m => {throw Error('Linha ' + (T[p] ? T[p].l : (T.length ? T[T.length - 1].l : 1)) + ': ' + m)};
  const is = v => T[p] && (T[p].t === 'p' || T[p].t === 'i') && T[p].v === v;
  const eat = v => {if (!is(v)) err('esperava "' + v + '"'); return T[p++]};
  const nx = () => T[p++];
  const sub = fn => {const s = p, r = fn(); return [r, T.slice(s, p).map(t => t.t === 's' ? '"' + t.v + '"' : t.ch ? t.raw : t.v).join(' ').replace(/ ?\[ ?/g, '[').replace(/ \]/g, ']').replace(/\( /g, '(').replace(/ \)/g, ')').replace(/(\w) \(/g, '$1(')]};
  const LV = [['||'], ['&&'], ['==', '!='], ['<', '>', '<=', '>='], ['+', '-'], ['*', '/', '%']];
  function asg() {
    const l = bin(0), t = T[p];
    if (t && t.t === 'p' && /^[-+*\/%]?=$/.test(t.v) && t.v !== '==') {p++; return {k: 'as', op: t.v, l, r: asg()}}
    return l
  }
  function bin(i) {
    if (i === LV.length) return un();
    let a = bin(i + 1);
    while (T[p] && T[p].t === 'p' && LV[i].includes(T[p].v)) {const o = T[p++].v; a = {k: 'b', o, a, b: bin(i + 1)}}
    return a
  }
  function un() {
    const t = T[p]; if (!t) err('expressão incompleta');
    if (t.t === 'p' && ['!', '-', '+', '&'].includes(t.v)) {p++; return {k: 'u', o: t.v, e: un()}}
    if (is('++') || is('--')) {p++; return {k: 'inc', pre: 1, d: t.v === '++' ? 1 : -1, e: un()}}
    if (is('(') && T[p + 1] && KW.includes(T[p + 1].v)) {p++; const ty = nx().v; eat(')'); return {k: 'cast', ty, e: un()}}
    return post()
  }
  function post() {
    let e = prim();
    for (; ;) {
      if (is('[')) {p++; const i = asg(); eat(']'); e = {k: 'ix', a: e, i}}
      else if (is('++') || is('--')) {e = {k: 'inc', pre: 0, d: T[p++].v === '++' ? 1 : -1, e}}
      else break
    }
    return e
  }
  function prim() {
    const t = nx(); if (!t) {p--; err('expressão incompleta')}
    if (t.t === 'n') return {k: 'n', v: t.v, f: t.f, ch: t.ch};
    if (t.t === 's') return {k: 's', v: t.v};
    if (t.t === 'i') {
      if (is('(')) {p++; const a = []; while (!is(')')) {if (!T[p]) err('faltou ")"'); a.push(asg()); if (is(',')) p++} eat(')'); return {k: 'call', n: t.v, a, ln: t.l}}
      return {k: 'id', n: t.v, ln: t.l}
    }
    if (t.v === '(') {const e = asg(); eat(')'); return e}
    p--; err('símbolo inesperado "' + t.v + '"')
  }
  function lst() {eat('{'); const a = []; while (!is('}')) {if (!T[p]) err('faltou "}"'); a.push(is('{') ? lst() : asg()); if (is(',')) p++} eat('}'); return {k: 'lst', a}}
  function decl(ns) {
    const ln = T[p].l; let ty = 'int';
    while (T[p] && KW.includes(T[p].v)) {const w = T[p].v; if (w === 'float' || w === 'double') ty = 'float'; else if (w === 'char') ty = 'char'; p++}
    const ds = [];
    do {
      if (is(',')) p++;
      const n = nx(); if (!n || n.t !== 'i') err('nome de variável esperado');
      if (is('(')) err('funções próprias ainda não são suportadas nesta página');
      const dm = []; while (is('[')) {p++; dm.push(is(']') ? null : asg()); eat(']')}
      let init = null; if (is('=')) {p++; init = is('{') ? lst() : asg()}
      ds.push({n: n.v, dm, init});
    } while (is(','));
    if (!ns) eat(';');
    return {k: 'decl', ty, ds, ln}
  }
  function stmt() {
    const t = T[p]; if (!t) err('fim inesperado do código'); const ln = t.l;
    if (is('{')) {p++; const b = []; while (!is('}')) {if (!T[p]) err('faltou fechar "}"'); b.push(stmt())} p++; return {k: 'blk', b, ln}}
    if (t.t === 'i' && KW.includes(t.v)) return decl();
    if (is('for')) {
      p++; eat('(');
      const i = is(';') ? null : (T[p].t === 'i' && KW.includes(T[p].v) ? decl(1) : {k: 'ex', e: asg(), ln}); eat(';');
      const [c, ct] = is(';') ? [null, ''] : sub(asg); eat(';');
      const s = is(')') ? null : asg(); eat(')');
      return {k: 'for', i, c, ct, s, b: stmt(), ln}
    }
    if (is('while')) {p++; eat('('); const [c, ct] = sub(asg); eat(')'); return {k: 'wh', c, ct, b: stmt(), ln}}
    if (is('do')) {p++; const b = stmt(); eat('while'); eat('('); const [c, ct] = sub(asg); eat(')'); eat(';'); return {k: 'dw', c, ct, b, ln}}
    if (is('if')) {p++; eat('('); const [c, ct] = sub(asg); eat(')'); const a = stmt(); let e = null; if (is('else')) {p++; e = stmt()} return {k: 'if', c, ct, a, e, ln}}
    if (is('return')) {p++; if (!is(';')) asg(); eat(';'); return {k: 'ret', ln}}
    if (is(';')) {p++; return {k: 'blk', b: [], ln}}
    const e = asg(); eat(';'); return {k: 'ex', e, ln}
  }
  const out = [];
  while (p < T.length) {
    if (T[p].t === 'i' && KW.includes(T[p].v) && T[p + 1] && T[p + 1].v === 'main') {p += 2; eat('('); while (!is(')')) {if (!T[p]) err('faltou ")"'); p++} p++; out.push(stmt())}
    else out.push(stmt())
  }
  return out;
}
function execute(prog, inp, raw) {
  const E = {}, out = [], MAX = 4000;
  let acc = null, msg = '', wn = 0, ip = 0, cmp = null;
  const Y = (l, m) => {const r = {l, m: (m + msg).trim() + (wn ? ' ⚠ valor não inicializado lido como 0.' : ''), c: cmp}; msg = ''; wn = 0; cmp = null; return r};
  const mk = dm => {const f = d => d === dm.length ? null : Array.from({length: dm[d]}, () => f(d + 1)); return dm.length ? f(0) : null};
  const zero = a => Array.isArray(a) ? a.map(zero) : 0;
  const fmt = v => Number.isInteger(v) ? v : +v.toFixed(4);
  const gv = n => {const v = E[n.n]; if (!v) throw Error('Linha ' + n.ln + ': a variável "' + n.n + '" não foi declarada'); return v};
  const chk = (b, v, d, i) => {if (!Number.isInteger(i) || i < 0 || i >= v.d[d]) throw Error('Linha ' + b.ln + ': índice ' + i + ' fora dos limites de "' + b.n + '" (válido: 0 a ' + (v.d[d] - 1) + ')')};
  function loc(n) {
    if (n.k === 'id') {const v = gv(n); if (v.d.length) throw Error('Linha ' + n.ln + ': "' + n.n + '" é vetor/matriz; use índices, como ' + n.n + '[0]'); return {c: v, k: 'v', t: v.t, name: n.n, idx: []}}
    if (n.k === 'ix') {
      const ix = []; let b = n;
      while (b.k === 'ix') {ix.unshift(ev(b.i)[0]); b = b.a}
      if (b.k !== 'id') throw Error('índice inválido');
      const v = gv(b);
      if (ix.length !== v.d.length) throw Error('Linha ' + b.ln + ': "' + b.n + '" precisa de ' + v.d.length + ' índice(s)');
      let c = v.v;
      for (let d = 0; d < ix.length; d++) {chk(b, v, d, ix[d]); if (d < ix.length - 1) c = c[ix[d]]}
      acc = {name: b.n, idx: ix};
      return {c, k: ix[ix.length - 1], t: v.t, name: b.n, idx: ix}
    }
    throw Error('só é possível atribuir a variáveis ou posições de vetor/matriz')
  }
  const rd = L => {const v = L.c[L.k]; if (v === null) {wn = 1; return [0, L.t === 'float']} return [v, L.t === 'float']};
  function st(L, r) {
    const v = L.t === 'float' ? r[0] : Math.trunc(r[0]);
    L.c[L.k] = v; msg += L.name + L.idx.map(i => '[' + i + ']').join('') + ' \u2190 ' + fmt(v) + '. '; return v
  }
  function arith(o, a, b) {
    const fl = a[1] || b[1], x = a[0], y = b[0];
    if ((o === '/' || o === '%') && y === 0) throw Error('divis\u00e3o por zero');
    return [o === '+' ? x + y : o === '-' ? x - y : o === '*' ? x * y : o === '/' ? (fl ? x / y : Math.trunc(x / y)) : x % y, fl]
  }
  function ev(n) {
    switch (n.k) {
      case 'n': return [n.v, n.f];
      case 'id': case 'ix': return rd(loc(n));
      case 'u': {if (n.o === '&') return ev(n.e); const [x, f] = ev(n.e); return n.o === '!' ? [+!x, 0] : n.o === '-' ? [-x, f] : [x, f]}
      case 'cast': {const [x] = ev(n.e); return (n.ty === 'float' || n.ty === 'double') ? [x, 1] : [Math.trunc(x), 0]}
      case 'b': {
        const o = n.o, a = ev(n.a);
        if (o === '&&') return [+!!(a[0] && ev(n.b)[0]), 0];
        if (o === '||') return [+!!(a[0] || ev(n.b)[0]), 0];
        const b = ev(n.b), x = a[0], y = b[0];
        const c = {'<': x < y, '>': x > y, '<=': x <= y, '>=': x >= y, '==': x == y, '!=': x != y}[o];
        return c !== undefined ? [+c, 0] : arith(o, a, b)
      }
      case 'as': {const L = loc(n.l); let r = ev(n.r); if (n.op !== '=') r = arith(n.op[0], rd(L), r); return [st(L, r), L.t === 'float']}
      case 'inc': {const L = loc(n.e), c = rd(L), nv = st(L, [c[0] + n.d, c[1]]); return [n.pre ? nv : c[0], c[1]]}
      case 'call': return call(n);
      case 's': throw Error('texto entre aspas s\u00f3 pode ser usado no printf');
    }
  }
  function call(n) {
    if (n.n === 'printf') {
      const f = n.a[0]; if (!f || f.k !== 's') throw Error('Linha ' + n.ln + ': o printf precisa de um texto entre aspas');
      let ai = 1;
      const s = f.v.replace(/%(\d*)(\.\d+)?(l{0,2})([dfcisu%])/g, (m, w, pr, l, c) => {
        if (c === '%') return '%';
        const a = n.a[ai++]; if (!a) throw Error('Linha ' + n.ln + ': faltam argumentos no printf');
        let r;
        if (c === 's') {const sv = a.k === 'id' && E[a.n] && E[a.n].d.length === 1 ? E[a.n].v : null; if (!sv) throw Error('Linha ' + n.ln + ': %s precisa de um vetor de char'); r = ''; for (const x of sv) {if (!x) break; r += String.fromCharCode(x)} }
        else {const v = ev(a)[0]; r = c === 'f' ? v.toFixed(pr ? +pr.slice(1) : 6) : c === 'c' ? String.fromCharCode(v) : String(Math.trunc(v))}
        return r.padStart(+w || 0)
      });
      out.push(s); msg += 'Imprime ' + JSON.stringify(s) + '. '; return [0, 0]
    }
    if (n.n === 'scanf') {
      for (const a of n.a.slice(1)) {
        if (a.k !== 'u' || a.o !== '&') throw Error('Linha ' + n.ln + ': no scanf use & antes da vari\u00e1vel');
        if (ip >= inp.length) throw Error('Linha ' + n.ln + ': o scanf pediu mais valores do que h\u00e1 no campo "Entradas"');
        const L = loc(a.e), v = parseFloat(inp[ip++]);
        if (isNaN(v)) throw Error('entrada inv\u00e1lida: "' + inp[ip - 1] + '"');
        st(L, [v, L.t === 'float']); msg += '(lido do teclado) '
      }
      return [0, 0]
    }
    if (n.n === 'tolower' || n.n === 'toupper') {const s = String.fromCharCode(ev(n.a[0])[0]); return [(n.n === 'tolower' ? s.toLowerCase() : s.toUpperCase()).charCodeAt(0), 0]}
    if (n.n === 'strlen' || n.n === 'fgets') {
      const a = n.a[0]; if (!a || a.k !== 'id' || !E[a.n] || E[a.n].d.length !== 1) throw Error('Linha ' + n.ln + ': ' + n.n + ' precisa de um vetor de char');
      const arr = E[a.n].v;
      if (n.n === 'strlen') {let k = 0; while (arr[k]) k++; return [k, 0]}
      const size = ev(n.a[1])[0], s = ((raw || '').split('\n')[0] + '\n').slice(0, size - 1);
      if (s.length + 1 > arr.length) throw Error('Linha ' + n.ln + ': o texto lido n\u00e3o cabe em "' + a.n + '"');
      for (let k = 0; k < arr.length; k++)arr[k] = k < s.length ? s.charCodeAt(k) : (k === s.length ? 0 : arr[k]);
      acc = null; msg += 'fgets leu ' + JSON.stringify(s) + ' (o Enter tamb\u00e9m fica guardado, como \\n). '; return [0, 0]
    }
    throw Error('Linha ' + n.ln + ': a fun\u00e7\u00e3o "' + n.n + '" n\u00e3o \u00e9 suportada nesta p\u00e1gina')
  }
  function fill(a, l, t) {
    l.a.forEach((e, i) => {
      if (i >= a.length) throw Error('inicializador com elementos demais');
      if (e.k === 'lst') fill(a[i], e, t); else {const r = ev(e)[0]; a[i] = t === 'float' ? r : Math.trunc(r)}
    })
  }
  const chs = c => "'" + (c === 0 ? '\\0' : c === 10 ? '\\n' : c === 32 ? ' ' : String.fromCharCode(c)) + "'";
  const PR = {'||': 1, '&&': 2, '==': 3, '!=': 3, '<': 4, '>': 4, '<=': 4, '>=': 4, '+': 5, '-': 5, '*': 6, '/': 6, '%': 6};
  function sh(n, pp, rt) {
    switch (n.k) {
      case 'n': return n.ch ? chs(n.v) : String(fmt(n.v));
      case 'id': case 'ix': {const L = loc(n), v = L.c[L.k]; return v === null ? '?' : L.t === 'char' ? chs(v) : String(fmt(v))}
      case 'u': {if (n.o === '&') return null; const x = sh(n.e, 7, 1); return x === null ? null : n.o + x}
      case 'cast': return sh(n.e, pp, rt);
      case 'b': {const q = PR[n.o], a = sh(n.a, q, 0), b = sh(n.b, q, 1); if (a === null || b === null) return null; const s = a + ' ' + n.o + ' ' + b; return pp && (q < pp || (q === pp && rt)) ? '(' + s + ')' : s}
      default: return null
    }
  }
  const cond = (c, ct, nd) => {let s = null; try {s = sh(nd, 0, 0)} catch (e) { } cmp = {e: ct, v: s, r: !!c}; return 'Teste (' + ct + ') \u2192 ' + (c ? 'verdadeiro. ' : 'falso. ')};
  function* ex(n) {
    switch (n.k) {
      case 'blk': for (const s of n.b) yield* ex(s); break;
      case 'decl':
        for (const d of n.ds) {
          const dm = d.dm.map(e => e ? ev(e)[0] : null); if (dm.length && dm[0] === null) {const i0 = d.init; if (i0 && i0.k === 's') dm[0] = i0.v.length + 1; else if (i0 && i0.k === 'lst') dm[0] = i0.a.length; else throw Error('Linha ' + n.ln + ': informe o tamanho de "' + d.n + '" ou inicialize-o')}
          const v = {t: n.ty, d: dm, v: mk(dm)}; E[d.n] = v;
          if (d.init) {
            if (d.init.k === 's') {if (n.ty !== 'char' || dm.length !== 1) throw Error('Linha ' + n.ln + ': texto entre aspas s\u00f3 pode iniciar um vetor de char'); const s = d.init.v; if (s.length + 1 > dm[0]) throw Error('Linha ' + n.ln + ': o texto n\u00e3o cabe em "' + d.n + '" (precisa de ' + (s.length + 1) + ' posi\u00e7\u00f5es, contando o \\0)'); v.v = zero(v.v);[...s].forEach((ch, k) => {v.v[k] = ch.charCodeAt(0)}); msg += d.n + ' \u2190 "' + s + '" (termina com \\0). '} else if (d.init.k === 'lst') {if (!dm.length) throw Error('Linha ' + n.ln + ': use {...} s\u00f3 em vetores e matrizes'); v.v = zero(v.v); fill(v.v, d.init, n.ty)}
            else st({c: v, k: 'v', t: n.ty, name: d.n, idx: []}, ev(d.init))
          }
        }
        yield Y(n.ln, 'Declara ' + n.ds.map(d => d.n).join(', ') + '. '); break;
      case 'ex': ev(n.e); yield Y(n.ln, ''); break;
      case 'if': {const c = ev(n.c)[0]; yield Y(n.ln, cond(c, n.ct, n.c)); if (c) yield* ex(n.a); else if (n.e) yield* ex(n.e); break}
      case 'for':
        if (n.i) {msg = 'In\u00edcio do for. '; yield* ex(n.i)}
        for (; ;) {
          const c = n.c ? ev(n.c)[0] : 1;
          yield Y(n.ln, cond(c, n.ct, n.c) + (c ? 'Entra no corpo. ' : 'Sai do la\u00e7o. '));
          if (!c) break;
          yield* ex(n.b);
          if (n.s) {ev(n.s); yield Y(n.ln, 'Incremento do for. ')}
        }
        break;
      case 'wh':
        for (; ;) {const c = ev(n.c)[0]; yield Y(n.ln, cond(c, n.ct, n.c)); if (!c) break; yield* ex(n.b)}
        break;
      case 'dw': {let c; do {yield* ex(n.b); c = ev(n.c)[0]; yield Y(n.ln, cond(c, n.ct, n.c))} while (c); break}
      case 'ret': throw 'STOP';
    }
  }
  function* all() {for (const s of prog) yield* ex(s)}
  const steps = []; let error = null;
  try {
    const g = all();
    for (; ;) {
      const r = g.next(); if (r.done) break;
      steps.push({...r.value, v: JSON.stringify(E), o: out.join(''), a: acc}); acc = null;
      if (steps.length >= MAX) {error = 'Limite de ' + MAX + ' passos atingido. Confira se o la\u00e7o tem condi\u00e7\u00e3o de parada (la\u00e7o infinito?).'; break}
    }
  } catch (e) {if (e !== 'STOP') error = e.message}
  return {steps, error};
}
/* ---------- interface ---------- */
const $ = id => document.getElementById(id);
let S = [], I = -1, timer = null, cols = [];
const esc = s => s.replace(/[&<>]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'}[c]));
const fc = x => x === null ? '?' : x === 0 ? '\\0' : x === 10 ? '\\n' : x === 32 ? '\u2423' : String.fromCharCode(x);
const KWS = new Set(['if', 'else', 'for', 'while', 'do', 'return', 'break', 'continue']), TYS = new Set(['int', 'float', 'double', 'char', 'long', 'short', 'unsigned', 'void']);
function hl(s) {
  return s.replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(#[^\n]*)|(\"(?:\\.|[^"\\\n])*\"|'(?:\\.|[^'\\\n])*')|(\b\d+\.?\d*\b)|([A-Za-z_]\w*)(\s*\()?|([&<>])/g, (m, cm, pp, st, nu, id, pa, sp) => {
    if (sp) return {'&': '&amp;', '<': '&lt;', '>': '&gt;'}[sp];
    const e = esc(m);
    if (cm) return '<span class="cm">' + e + '</span>'; if (pp) return '<span class="pp">' + e + '</span>'; if (st) return '<span class="st">' + e + '</span>'; if (nu) return '<span class="nu">' + e + '</span>';
    if (id) {const k = KWS.has(id) ? 'kw' : TYS.has(id) ? 'ty' : pa ? 'fn' : ''; return k ? '<span class="' + k + '">' + id + '</span>' + esc(pa || '') : e}
    return e
  })
}
const f = x => x === null || x === undefined ? '?' : Number.isInteger(x) ? x : +x.toFixed(4);
for (const k in EX) $('ex').add(new Option(k, k));
function showErr(m) {$('err').textContent = m; $('err').hidden = !m}
function stop() {clearInterval(timer); timer = null; $('pl').textContent = '\u25b6 Reproduzir'}
function runCode() {
  stop(); showErr('');
  const e = EX[$('ex').value];
  if (!e) return;
  const src = e.c;
  let r;
  try {r = execute(parse(lex(src)), $('inp').value.trim().split(/\s+/).filter(Boolean), $('inp').value)} catch (err) {showErr(err.message); return }
  S = r.steps; I = -1;
  $('code').innerHTML = src.split('\n').map((l, k) => '<li><span class="n">' + (k + 1) + '</span>' + (hl(l) || ' ') + '</li>').join('');
  const last = S.length ? JSON.parse(S[S.length - 1].v) : {};
  cols = Object.keys(last).filter(n => !last[n].d.length);
  if (r.error) showErr(r.error + (S.length ? ' A execu\u00e7\u00e3o parou neste ponto.' : ''));
  else if (!S.length) showErr('Nenhuma instru\u00e7\u00e3o foi executada.');
  show();
}
function loadEx() {
  const e = EX[$('ex').value];
  if (!e) return;
  $('inp').value = e.i;
  const inplbl = $('inplbl');
  if (inplbl) inplbl.hidden = !e.i;
  runCode();
}
function show() {
  const s = S[I], cur = s ? JSON.parse(s.v) : {}, prev = I > 0 ? JSON.parse(S[I - 1].v) : {};
  document.querySelectorAll('#code li').forEach((li, k) => li.classList.toggle('on', !!s && k + 1 === s.l));
  const on = document.querySelector('#code li.on'); if (on) on.scrollIntoView({block: 'nearest'});
  $('msg').textContent = s ? s.m : 'Clique em "Pr\u00f3ximo" (ou "Reproduzir") para executar a primeira linha.';
  const cm = s && s.c; $('cmp').hidden = !(cm && cm.e);
  if (cm && cm.e) $('cmp').innerHTML = '<div>Comparando <code>' + esc(cm.e) + '</code></div>' + (cm.v ? '<div class="cv">' + esc(cm.v) + '</div>' : '') + '<div class="cr ' + (cm.r ? 'ok' : 'no') + '">' + (cm.r ? 'verdadeiro' : 'falso') + '</div>';
  $('cnt').textContent = (I + 1) + ' / ' + S.length;
  $('out').textContent = s ? s.o : '';
  const sc = [], ar = []; for (const n in cur) (cur[n].d.length ? ar : sc).push(n);
  let h = '<div class="chips">' + sc.map(n => '<span class="chip' + (!prev[n] || prev[n].v !== cur[n].v ? ' chg' : '') + '"><b>' + n + '</b> = ' + (cur[n].t === 'char' && cur[n].v !== null ? fc(cur[n].v) + ' (' + cur[n].v + ')' : f(cur[n].v)) + '</span>').join('') + '</div>';
  for (const n of ar) {
    const v = cur[n], pv = prev[n] ? prev[n].v : null, a = s && s.a && s.a.name === n ? s.a.idx : null;
    const cell = (x, p, c, ex = '') => '<div class="c' + (c ? ' cur' : '') + (p !== undefined && p !== x ? ' chg' : '') + '">' + (v.t === 'char' ? fc : f)(x) + ex + '</div>';
    if (v.d.length === 1) {
      h += '<div class="arr"><div class="nm">' + n + '[' + v.d[0] + ']</div><div class="g" style="grid-template-columns:repeat(' + v.d[0] + ',minmax(34px,1fr))">' + v.v.map((x, k) => cell(x, pv ? pv[k] : undefined, a && a[0] === k, '<i>' + k + '</i>')).join('') + '</div></div>';
    } else {
      const R = v.d[0], C = v.d[1];
      h += '<div class="arr"><div class="nm">' + n + '[' + R + '][' + C + ']</div><div class="g" style="grid-template-columns:auto repeat(' + C + ',minmax(34px,1fr))"><div></div>';
      for (let c = 0; c < C; c++)h += '<div class="h' + (a && a[1] === c ? ' cur' : '') + '">' + c + '</div>';
      for (let r = 0; r < R; r++) {h += '<div class="h' + (a && a[0] === r ? ' cur' : '') + '">' + r + '</div>'; for (let c = 0; c < C; c++)h += cell(v.v[r][c], pv && pv[r] ? pv[r][c] : undefined, a && a[0] === r && a[1] === c)}
      h += '</div></div>';
    }
  }
  $('mem').innerHTML = h || '<span class="note">Nenhuma vari\u00e1vel declarada ainda.</span>';
  const rows = S.slice(Math.max(0, I - 39), I + 1);
  $('tr').innerHTML = I < 0 ? '' : '<tr><th>linha</th>' + cols.map(c => '<th>' + c + '</th>').join('') + '</tr>' + rows.map((st, k) => {const v = JSON.parse(st.v); return '<tr' + (k === rows.length - 1 ? ' class="on"' : '') + '><td>' + st.l + '</td>' + cols.map(c => '<td>' + (v[c] ? (v[c].t === 'char' ? fc(v[c].v) : f(v[c].v)) : '') + '</td>').join('') + '</tr>'}).join('');
}
const go = d => {I = Math.max(-1, Math.min(S.length - 1, I + d)); show(); if (I >= S.length - 1) stop()};
$('ex').onchange = loadEx;
$('inp').onchange = runCode;
$('nx').onclick = () => {stop(); go(1)}; $('pv').onclick = () => {stop(); go(-1)}; $('rs').onclick = () => {stop(); I = -1; show()};
$('pl').onclick = () => {
  if (timer) {stop(); return }
  if (I >= S.length - 1) {I = -1}
  $('pl').textContent = '\u23f8 Pausar';
  const tick = () => {go(1); if (timer) timer = setTimeout(tick, 1150 - 100 * $('sp').value)};
  timer = setTimeout(tick, 50)
};
loadEx();
