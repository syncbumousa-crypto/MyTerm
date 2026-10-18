// ============================================================
// # 🧮 📐  THE FINANCIAL CALCULATOR THAT A PROBLEM CARD OPENS
// # 🔤 JavaScript
// # 🎯 Draws the BA II Plus panel for one card: the registers the book
// #    sets, the keystrokes it dictates, and CPT working the answer out
// # 🔗 CARRIED OVER WHOLE from their own visuals.js, engine and all.
// #    Not reimplemented: the solver is the one their chapters were
// #    written and checked against, and a second implementation of
// #    compound interest is a second set of answers.
// # 🔗 Its data rides on the card itself in `data-calc` — the values of
// #    THIS problem, not an explanation of a law — so it needs no file
// #    of its own and nothing had to be transferred for it to work.
// #    Sixty-two cards in FIN250 carry one; ACCT210 has none.
// # 🔗 This site cannot build the reader's interactive pictures in
// #    general, and says so in their place. The calculator is the one
// #    it can: it is a hundred lines of arithmetic and a keypad, with
// #    nothing underneath it but the numbers already on the card.
// ============================================================
(() => {
  const F = (x, d) => (x === null || x === undefined || !isFinite(x)) ? '—'
    : (Math.abs(x) >= 1e9 ? x.toExponential(4)
      : x.toLocaleString('en-US', {minimumFractionDigits: d === undefined ? 2 : d, maximumFractionDigits: d === undefined ? 2 : d}));

  // ---- المحرّك: يحلّ المجهولَ الواحد من الخمسة ----
  // r هو معدّل الفترة = (I/Y ÷ 100) ÷ P/Y، وn عددُ الفترات. والمستحقّةُ تُضرب في (1+r).
  function tvmSolve(reg, want){
    const py = reg.py || 1;
    const r  = (reg.iy / 100) / py;
    const n  = reg.n;
    const due = reg.bgn ? (1 + r) : 1;
    const f   = (r === 0) ? n : (Math.pow(1 + r, n) - 1) / r;      // عاملُ الدفعات
    const g   = Math.pow(1 + r, n);                                 // عاملُ التركيب
    if(want === 'FV')  return -(reg.pv * g + reg.pmt * f * due);
    if(want === 'PV')  return -(reg.fv / g + reg.pmt * f * due / g);
    if(want === 'PMT') return -(reg.pv * g + reg.fv) / (f * due);
    if(want === 'N'){
      if(reg.pmt === 0) return Math.log(-reg.fv / reg.pv) / Math.log(1 + r);
      const a = reg.pmt * due / r;
      return Math.log((a - reg.fv) / (a + reg.pv)) / Math.log(1 + r);
    }
    if(want === 'IY'){
      // لا حلَّ مغلقًا للمعدّل: بحثٌ ثنائيّ على دالّةٍ رتيبة، كما تفعل الحاسبة نفسها
      const val = x => {
        const rr = x / py, ff = (rr === 0) ? n : (Math.pow(1+rr, n) - 1) / rr, dd = reg.bgn ? (1+rr) : 1;
        return reg.pv * Math.pow(1+rr, n) + reg.pmt * ff * dd + reg.fv;
      };
      let lo = -0.9999, hi = 10;
      if(val(lo) * val(hi) > 0) return NaN;
      for(let i = 0; i < 200; i++){ const mid = (lo + hi) / 2; if(val(lo) * val(mid) <= 0) hi = mid; else lo = mid; }
      return ((lo + hi) / 2) * 100;
    }
    return NaN;
  }
  function npvOf(cf, rate){ return cf.reduce((s, c, i) => s + c / Math.pow(1 + rate, i), 0); }

  // ---- المُرسِل: مدخلٌ واحدٌ لكلّ المحالّ، تستعمله الواجهةُ والفاحصُ معًا ----
  // فلو اختلف حسابُ الشاشة عن حساب الفحص لصدّق كلٌّ نفسَه. ومنه يُشتقّ كلُّ رقمٍ يُعرض.
  function calcSolve(d){
    const s = d.set || {}, want = d.solve;
    const mode = d.mode || 'tvm';
    if(mode === 'cf'){
      const r = s.iy / 100, n = (s.cf || []).length - 1;
      const npv = npvOf(s.cf || [], r);
      if(want === 'NPV' || want === 'PV') return npv;
      if(want === 'FV') return npv * Math.pow(1 + r, s.fvAt !== undefined ? s.fvAt : n);
      return NaN;
    }
    if(mode === 'iconv'){
      const cy = s.cy || 1;
      if(want === 'EFF') return (Math.pow(1 + (s.nom / 100) / cy, cy) - 1) * 100;
      if(want === 'NOM') return (Math.pow(1 + s.eff / 100, 1 / cy) - 1) * cy * 100;
      return NaN;
    }
    if(mode === 'ex'){                              // التركيبُ المستمرّ: 2ND [e^x]
      const r = s.iy / 100;
      if(want === 'FV')  return Math.abs(s.pv) * Math.exp(r * s.n);
      if(want === 'EFF') return (Math.exp(r) - 1) * 100;
      return NaN;
    }
    return tvmSolve({n:s.n, iy:s.iy, pv:s.pv||0, pmt:s.pmt||0, fv:s.fv||0, py:s.py||1, bgn:!!s.bgn}, want);
  }

  const draw = function (el, opts) {
    const ar = (opts && opts.lang) !== 'en';
    // الوسمُ في ملفّ البيانات يُكتب بعلاماتٍ مفردة ليسكن داخل سمةٍ مزدوجة، فيُقبل الشكلان.
    const parseCalc = s => { if(!s) return {}; try { return JSON.parse(s); } catch(e){ try { return JSON.parse(s.replace(/'/g, '"')); } catch(e2){ return {}; } } };
    const o  = (opts && opts.calc) ? opts.calc : parseCalc(el.dataset.calc);
    const pre   = o.set || {};
    const want  = o.solve || 'FV';
    const steps = (ar ? o.stepsAr : o.stepsEn) || o.steps || [];
    const mode  = o.mode || 'tvm';
    const T = ar
      ? {t:'الحاسبة المالية — اضغط المفاتيح بنفسك', solve:'المطلوب', keys:'الخطوات كما يمليها الكتاب',
         hintSign:'<b>عُرف الإشارة:</b> الداخلُ موجبٌ والخارجُ سالب [ص243]. فإن أدخلتَ الوديعةَ موجبةً خرج الجوابُ سالبًا — وهو صحيحٌ بمقداره.',
         got:'الناتج', cpt:'اضغط <kbd>CPT</kbd> ثم مفتاحَ المجهول', clr:'مُسحت محالُّ TVM', reset:'إعادة التحميل بمعطيات المسألة'}
      : {t:'Financial calculator — press the keys yourself', solve:'Solve for', keys:'The keystrokes, as the book gives them',
         hintSign:'<b>Sign convention:</b> inflows positive, outflows negative [p.243]. Enter the deposit as positive and the answer comes out negative — correct in magnitude.',
         got:'Result', cpt:'Press <kbd>CPT</kbd> then the unknown key', clr:'TVM registers cleared', reset:'Reload the problem values'};

    // المحالُّ غيرُ TVM (CF/NPV · ICONV · e^x) تُعرض لوحًا خاصًّا بها: مفاتيحُ الروتين
    // وحدَها وسجلَّاتُه، ثم زرُّ CPT يُظهر الناتجَ من المُرسِل نفسه. فالطالبُ يرى
    // **الروتين الذي يمليه الكتاب** لا لوحةَ TVM في غير موضعها.
    if(mode !== 'tvm'){
      const S = o.set || {};
      const names = mode === 'cf'
          ? (S.cf || []).map((v, i) => ['CF' + i, v, 2])
          : mode === 'iconv'
            ? [['NOM', S.nom, 4], ['C/Y', S.cy, 0], ['EFF', S.eff, 4]]
            : [['PV', S.pv, 2], ['I/Y', S.iy, 4], ['N', S.n, 2]];
      if(mode === 'cf') names.push(['I', S.iy, 4]);
      const routine = mode === 'cf' ? 'CF · NPV' : mode === 'iconv' ? '2ND [ICONV]' : '2ND [e<sup>x</sup>]';
      let shown = null;
      const paint = () => {
        el.innerHTML =
          '<div class="w5Title">' + T.t + '</div>' +
          '<div class="w5Calc">' +
            '<div class="w5CalcBody">' +
              '<div class="w5Disp"><span class="w5DispK">' + (shown === null ? routine : want) + '</span>' +
              '<span class="w5DispV">' + (shown === null ? '0.0000' : F(shown, 4)) + '</span></div>' +
              '<div class="w5Mode"><span>' + routine + '</span><span>' + (ar ? 'محلٌّ خاصّ' : 'worksheet') + '</span></div>' +
              '<div class="w5Pad">' +
                names.map(r => '<button class="tvm" data-r="' + r[0] + '">' + r[0] + '</button>').join('') +
                '<button class="cpt" data-r="__cpt">CPT ' + want + '</button>' +
                '<button class="fn" data-r="__reset">&#8635;</button>' +
              '</div>' +
            '</div>' +
            '<div class="w5CalcSide">' +
              '<div class="w5Regs">' + names.map(r =>
                '<div class="w5Reg set"><span class="w5RegK">' + r[0] + '</span><span class="w5RegV">' +
                (r[1] === undefined || r[1] === null ? '—' : F(r[1], r[2])) + '</span></div>').join('') +
                (shown === null ? '' : '<div class="w5Reg solved"><span class="w5RegK">' + want + '</span><span class="w5RegV">' + F(shown, 2) + '</span></div>') +
              '</div>' +
              (steps.length ? '<div class="w5Title" style="margin:4px 0 5px">' + T.keys + '</div><ol class="w5Steps">' + steps.map(s => '<li>' + s + '</li>').join('') + '</ol>' : '') +
              '<div class="w5CalcMsg">' + (shown === null ? T.hintSign : '<b>' + want + ' = ' + F(shown, 2) + '</b>') + '</div>' +
            '</div>' +
          '</div>';
        el.querySelectorAll('.w5Pad button').forEach(b => b.addEventListener('click', () => {
          if(b.dataset.r === '__cpt'){ shown = calcSolve(o); paint(); }
          else if(b.dataset.r === '__reset'){ shown = null; paint(); }
        }));
      };
      paint();
      return;
    }
    const reg = {n:null, iy:null, pv:null, pmt:null, fv:null, py:1, bgn:false};
    let entry = '', disp = 0, dispK = '', msg = '', solved = null;
    const cf = (pre.cf || []).slice();

    function load(){
      ['n','iy','pv','pmt','fv','py'].forEach(k => { if(pre[k] !== undefined) reg[k] = pre[k]; });
      reg.bgn = !!pre.bgn; if(reg.py === null) reg.py = 1;
      entry=''; disp = 0; dispK=''; solved=null; msg=''; draw();
    }
    function setReg(k){
      const v = entry === '' ? disp : parseFloat(entry);
      if(!isFinite(v)) return;
      reg[k] = v; disp = v; entry=''; dispK = k.toUpperCase(); solved=null; msg=''; draw();
    }
    function compute(k){
      const need = {N:['iy','pv','pmt','fv'], IY:['n','pv','pmt','fv'], PV:['n','iy','pmt','fv'], PMT:['n','iy','pv','fv'], FV:['n','iy','pv','pmt']}[k];
      const miss = need.filter(x => reg[x] === null || reg[x] === undefined);
      if(miss.length){ msg = (ar ? 'ينقص: ' : 'Missing: ') + miss.map(x => x.toUpperCase()).join(' · '); draw(); return; }
      const v = tvmSolve({n:reg.n, iy:reg.iy, pv:reg.pv, pmt:reg.pmt, fv:reg.fv, py:reg.py, bgn:reg.bgn}, k);
      reg[k === 'IY' ? 'iy' : k.toLowerCase()] = v; disp = v; dispK = k; solved = k; entry=''; msg=''; draw();
    }
    function press(key){
      if(/^[0-9.]$/.test(key)){ entry += key; disp = parseFloat(entry) || 0; dispK=''; draw(); return; }
      if(key === '+/-'){ if(entry) entry = entry.startsWith('-') ? entry.slice(1) : '-' + entry; else disp = -disp; draw(); return; }
      if(key === 'CE'){ entry=''; disp = 0; dispK=''; msg=''; draw(); return; }
      if(key === 'CLR'){ reg.n=reg.iy=reg.pv=reg.pmt=reg.fv=null; entry=''; disp=0; dispK=''; solved=null; msg=T.clr; draw(); return; }
      if(key === 'BGN'){ reg.bgn = !reg.bgn; msg=''; draw(); return; }
      if(key === 'RESET'){ load(); return; }
      if(key === 'CPT'){ msg = T.cpt; draw(); return; }
      if(['N','I/Y','PV','PMT','FV','P/Y'].indexOf(key) >= 0){
        const k = {'N':'n','I/Y':'iy','PV':'pv','PMT':'pmt','FV':'fv','P/Y':'py'}[key];
        if(entry === '' && reg[k] !== null && reg[k] !== undefined){ compute(key === 'I/Y' ? 'IY' : key === 'P/Y' ? null : key); return; }
        setReg(k); return;
      }
    }
    function draw(){
      const rows = [['N', reg.n, 4], ['I/Y', reg.iy, 4], ['PV', reg.pv, 2], ['PMT', reg.pmt, 2], ['FV', reg.fv, 2], ['P/Y', reg.py, 0]];
      el.innerHTML =
        '<div class="w5Title">' + T.t + '</div>' +
        '<div class="w5Calc">' +
          '<div class="w5CalcBody">' +
            '<div class="w5Disp"><span class="w5DispK">' + (dispK || '&nbsp;') + '</span><span class="w5DispV">' + (entry !== '' ? entry : F(disp, 4)) + '</span></div>' +
            '<div class="w5Mode"><span>' + (reg.bgn ? '<b>BGN</b>' : 'END') + '</span><span>P/Y = ' + (reg.py || 1) + '</span></div>' +
            '<div class="w5Pad">' +
              ['N','I/Y','PV','PMT','FV'].map(k => '<button class="tvm" data-k="' + k + '">' + k + '</button>').join('') +
              '<button class="cpt" data-k="CPT">CPT</button>' +
              '<button class="fn" data-k="P/Y">P/Y</button>' +
              '<button class="fn" data-k="BGN" aria-pressed="' + (reg.bgn ? 'true' : 'false') + '">BGN</button>' +
              '<button class="fn" data-k="CLR">CLR TVM</button>' +
              '<button class="fn" data-k="RESET">&#8635;</button>' +
              ['7','8','9','4','5','6','1','2','3','0','.'].map(k => '<button data-k="' + k + '">' + k + '</button>').join('') +
              '<button class="op" data-k="+/-">+/&minus;</button>' +
              '<button class="op" data-k="CE">CE</button>' +
            '</div>' +
          '</div>' +
          '<div class="w5CalcSide">' +
            '<div class="w5Regs">' + rows.map(function(r){
              const on = r[1] !== null && r[1] !== undefined;
              const sol = solved && (solved === r[0] || (solved === 'IY' && r[0] === 'I/Y'));
              return '<div class="w5Reg' + (sol ? ' solved' : (on ? ' set' : '')) + '"><span class="w5RegK">' + r[0] + '</span><span class="w5RegV">' + (on ? F(r[1], r[2]) : '—') + '</span></div>';
            }).join('') + '</div>' +
            (steps.length ? '<div class="w5Title" style="margin:4px 0 5px">' + T.keys + '</div><ol class="w5Steps">' + steps.map(s => '<li>' + s + '</li>').join('') + '</ol>' : '') +
            '<div class="w5CalcMsg">' + (msg ? msg : T.hintSign) + '</div>' +
          '</div>' +
        '</div>';
      el.querySelectorAll('.w5Pad button').forEach(function(b){ b.addEventListener('click', function(){ press(b.dataset.k); }); });
    }
    load();
  };

  // **إعلانُ النوع**: هذي **أداة** لا تمثيلٌ تفسيريّ. وعقدُ التمثيل (منزلقٌ يحرّكه
  // الطالب · جملةٌ تقول ماذا رأى · استدعاءٌ من شرحٍ) لا ينطبق عليها: مُدخَلُها لوحةُ
  // مفاتيح، وتُفتح من زرٍّ على البطاقة لا من EXPLAIN. فيقرأ `_vwidg` هذا الإعلانَ
  // ويطبّق عليها عقدَ الأداة (لوحةٌ + شاشةٌ + جملة)، وتبقى إتاحتُها وصوابُ أجوبتها
  // محروسَين في `_vcalc.html` — فلا ثغرة، بل تقسيمُ مسؤوليةٍ مُعلَن.

  // The same engine the panel uses is handed out, because the guard
  // that checks these chapters must measure what the reader is shown
  // and not a copy of it
  window.MyTermCalc = { draw: draw, solve: tvmSolve };
})();
