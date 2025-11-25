(function () {
  // ------------------ 1) 배너 폰트 자동 축소 ------------------
  function fitAdBanner() {
    const banner = document.querySelector('.ad-player-banner');
    if (!banner) return;

    banner.style.fontSize = '';

    const maxSteps = 30;
    let fs   = parseFloat(getComputedStyle(banner).fontSize) || 16;
    let step = 0;

    while (
      step < maxSteps &&
      (banner.scrollHeight > banner.clientHeight ||
       banner.scrollWidth  > banner.clientWidth)
    ) {
      fs *= 0.9;                       // 10%씩 감소
      banner.style.fontSize = fs + 'px';
      step++;
    }
  }

  // ------------------ 2) QRCode.js로 QR 생성 ------------------
  function setBannerQr(url) {
    const box = document.getElementById('ad-banner-qr-box');
    if (!box || !url) return;

    if (!window.QRCode) {
      console.warn('QRCode library is not loaded.');
      return;
    }

    box.innerHTML = ''; // 이전 QR 제거

    new QRCode(box, {
      text: url,
      width: 600,
      height: 600,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  }

  // ------------------ 3) 사용자 지정 색 적용 ------------------
  // ex) setBannerTheme('#95FAFA', '#222222');
  function setBannerTheme(bgHex, textHex) {
    const banner = document.querySelector('.ad-player-banner');
    if (!banner) return;

    if (bgHex) {
      // 사용자가 준 배경색 그대로 사용 (단색)
      banner.style.background = bgHex;
    }

    if (textHex) {
      // 배너 전체 텍스트 컬러
      banner.style.color = textHex;
    }
    // 나머지 요소들은 CSS에서 color: inherit; 이라
    // 자동으로 textHex 색을 따라감.
  }

  // ------------------ 전역 노출 ------------------
  window.fitAdBanner   = fitAdBanner;
  window.setBannerQr   = setBannerQr;
  window.setBannerTheme = setBannerTheme;

  // ------------------ 초기 로드/리사이즈 ------------------
  window.addEventListener('load', function () {
    const popupUrl =
      'https://gb9fb258fe17506-dev2.adb.ap-seoul-1.oraclecloudapps.com/ords/r/ad_dev/adwright-user-dev/popup-info?aid=4411F0BD0B954F65E063975F000AA5E3';

    setBannerQr(popupUrl);

    // ✅ 나중에 여기를 DB 값으로 바꾸면 됨
    //   배경색: POPUP_BG_COLOR (예: #95FAFA)
    //   글자색: POPUP_TEXT_COLOR (예: #222222)
    setBannerTheme('#7c4dff', '#ffffff');

    fitAdBanner();
  });

  window.addEventListener('resize', fitAdBanner);

  const mp = document.getElementById('modal-player');
  if (window.ResizeObserver && mp) {
    const ro = new ResizeObserver(fitAdBanner);
    ro.observe(mp);
  }
})();
