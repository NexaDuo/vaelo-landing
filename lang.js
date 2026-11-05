// Language for bilingual pages: saved choice, else the browser language (English only
// when it starts with "en"), else Portuguese. Same rule as nexaduo.com.
(function () {
  var KEY = 'vaelo-lang';
  var root = document.documentElement;
  function pick() {
    try {
      var s = localStorage.getItem(KEY);
      if (s === 'en' || s === 'pt') return s;
    } catch (e) { /* storage blocked */ }
    return (navigator.language || '').toLowerCase().indexOf('en') === 0 ? 'en' : 'pt';
  }
  function apply(lang) {
    root.setAttribute('data-lang', lang);
    root.lang = lang === 'en' ? 'en' : 'pt-BR';
    var title = root.getAttribute('data-title-' + lang);
    if (title) document.title = title;
    var buttons = document.querySelectorAll('.lang-btn');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-pressed', buttons[i].getAttribute('data-lang') === lang ? 'true' : 'false');
    }
  }
  apply(pick());
  document.addEventListener('DOMContentLoaded', function () {
    apply(root.getAttribute('data-lang'));
    var buttons = document.querySelectorAll('.lang-btn');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function () {
        var lang = this.getAttribute('data-lang');
        try { localStorage.setItem(KEY, lang); } catch (e) { /* storage blocked */ }
        apply(lang);
      });
    }
  });
})();
