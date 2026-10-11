// ============================================================
// # 🖼️ ✒️  THE DRAWINGS A LAW WEARS
// # 🔤 JavaScript
// # 🎯 Thirty-three line drawings, one per idea a law can be about:
// #    a clock, a scale, a funnel, a bank
// # 🔗 CARRIED OVER WHOLE FROM THE READER'S OWN ملفّ المفردات البصرية, not drawn
// #    again. Every law sheet already names one of these by its own
// #    name (`data-icon="growth"`), and a second hand's idea of what
// #    "growth" looks like would put a different picture on a page
// #    that was composed around this one.
// #
// #    They are line SVG in currentColor, so each takes the colour of
// #    wherever it is put and works in both lights
// ============================================================
// ============================================================================
// المفردات البصرية المشتركة — أيقوناتٌ ورسومٌ مفاهيمية تصلح للفصول كلها.
//
// لماذا هنا لا في ملفّ الفصل؟ لأن «المصرف» مصرفٌ في كل فصل، و«الميزان» ميزان.
// وما يخصّ قوانين فصلٍ بعينه فموضعه ملفّ الفصل نفسه.
//
// وكلها SVG خطّيّ بلون currentColor، فيأخذ لون سياقه ويعمل في الوضعين.
// ============================================================================

window.EP_ICONS = window.EP_ICONS || {};

(function(){
  const I = window.EP_ICONS;
  const w = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

  // — كيانات —
  I.bank      = w('<path d="M3 9.5 12 4l9 5.5"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8"/><path d="M3 21h18"/>');
  I.firm      = w('<rect x="4" y="7" width="16" height="14" rx="1.5"/><path d="M8 11h2M8 15h2M14 11h2M14 15h2"/><path d="M9 21v-3h6v3"/><path d="M8 7V4h8v3"/>');
  I.person    = w('<circle cx="12" cy="8" r="3.4"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/>');
  I.people    = w('<circle cx="8.5" cy="9" r="2.8"/><circle cx="16.5" cy="9.5" r="2.3"/><path d="M3 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/><path d="M15 14.4c2.6.2 4.5 2.1 4.5 4.6"/>');
  I.gov       = w('<path d="M3 20h18"/><path d="M5 20V9M9.7 20V9M14.3 20V9M19 20V9"/><path d="M3.5 9h17L12 3.5z"/>');
  I.market    = w('<path d="M3 20h18"/><path d="M6 20V9M10 20v-6M14 20v-9M18 20V6"/>');
  I.doc       = w('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>');
  I.gavel     = w('<path d="M3 21h8"/><path d="M6.5 17.5 13 11"/><path d="m11.5 4.5 8 8"/><path d="m14 2 8 8-2.5 2.5-8-8z"/>');

  // — أدوات مالية —
  I.stock     = w('<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M6.5 14l3-3.5 2.5 2 5-5.5"/><path d="M7 21h10"/>');
  I.bond      = w('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9.5h18"/><circle cx="8" cy="14" r="2"/><path d="M13 13h5M13 16h3"/>');
  I.cash      = w('<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 12h.01M18 12h.01"/>');
  I.dividend  = w('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9M9.5 10h4a1.8 1.8 0 0 1 0 3.6h-3a1.8 1.8 0 0 0 0 3.6h4"/>');
  I.tax       = w('<path d="M4 14 14 4l6 6-10 10z"/><circle cx="8.6" cy="9.4" r="1.1"/><circle cx="14.4" cy="15.2" r="1.1"/><path d="m8.5 15.5 7-7"/>');
  I.debt      = w('<path d="M5 8h11a3.5 3.5 0 0 1 0 7H8"/><path d="m10.5 12.5-2.5 2.5 2.5 2.5"/><path d="M4 4v16"/>');

  // — علاقات ومفاهيم —
  I.balance   = w('<path d="M12 4v16"/><path d="M7 20h10"/><path d="M4 8h16"/><path d="M4 8 1.8 13.2a2.8 2.8 0 0 0 4.4 0z"/><path d="M20 8l-2.2 5.2a2.8 2.8 0 0 0 4.4 0z"/>');
  I.flow      = w('<path d="M3 8h13"/><path d="m13 5 3 3-3 3"/><path d="M21 16H8"/><path d="m11 13-3 3 3 3"/>');
  I.queue     = w('<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="7" width="5" height="13" rx="1"/><rect x="17" y="11" width="4" height="9" rx="1"/>');
  I.timeline  = w('<path d="M3 12h18"/><circle cx="6" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="2"/><path d="M6 8V5M12 19v-3M18 8V5"/>');
  I.split     = w('<path d="M4 12h5"/><path d="M9 12 14 6h6"/><path d="m9 12 5 6h6"/><path d="m17 3 3 3-3 3"/><path d="m17 15 3 3-3 3"/>');
  I.risk      = w('<path d="M12 3 2.5 20h19z"/><path d="M12 9.5v5"/><path d="M12 17.5h.01"/>');
  I.growth    = w('<path d="M3 17.5 9 11l3.5 3.5L21 6"/><path d="M15.5 6H21v5.5"/>');
  I.clock     = w('<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.2l3.2 2"/>');
  I.shield    = w('<path d="M12 3 5 6v6c0 4.3 3 8 7 9 4-1 7-4.7 7-9V6z"/><path d="m9 12 2 2 4-4"/>');
  I.eye       = w('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>');
  I.link      = w('<path d="M10 13a4.5 4.5 0 0 0 6.6.4l2.6-2.6a4.5 4.5 0 0 0-6.4-6.4l-1.5 1.5"/><path d="M14 11a4.5 4.5 0 0 0-6.6-.4L4.8 13.2a4.5 4.5 0 0 0 6.4 6.4l1.5-1.5"/>');
  I.swap      = w('<path d="M7 4 3.5 7.5 7 11"/><path d="M3.5 7.5H16a4.5 4.5 0 0 1 0 9h-2"/><path d="m17 20 3.5-3.5L17 13"/>');
  I.target    = w('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r=".9" fill="currentColor"/>');
  I.scale2    = w('<path d="M3 6h18"/><path d="M12 6v14"/><path d="M7 20h10"/><rect x="2" y="9" width="7" height="5" rx="1"/><rect x="15" y="11" width="7" height="5" rx="1"/>');

  // — أيقوناتُ مربّعات القوانين (تُرطَّب على الورقة لا في الشرح وحده) —
  I.funnel    = w('<path d="M3 5h18l-7 8v6l-4 2v-8z"/>');                                            // وعاءٌ يُصفّى: الدخل الخاضع
  I.stairs    = w('<path d="M3 20h4v-4h4v-4h4v-4h4V4"/><rect x="7" y="12" width="4" height="4" fill="currentColor" opacity=".35" stroke="none"/>'); // شريحةٌ واحدةٌ من السلّم
  I.sigma     = w('<path d="M18 6H7l5 6-5 6h11"/>');                                                  // مجموع
  I.avg       = w('<path d="M5 12h14"/><circle cx="12" cy="7" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="17" r="1.7" fill="currentColor" stroke="none"/>'); // قسمة
  I.stepUp    = w('<path d="M3 19h5v-5h5V9h5"/><path d="m15 6 3 3-3 3"/><path d="M18 9h1"/>');      // الدولار التالي
})();
