(function () {
  function fitAdBanner() {
    const banner = document.querySelector('.ad-player-banner');
    if (!banner) return;

    // 기본값으로 초기화
    banner.style.fontSize = '';

    const maxSteps = 30;
    let fs = parseFloat(getComputedStyle(banner).fontSize) || 16;
    let step = 0;

    // 내용이 배너 영역을 넘치면 조금씩 폰트 크기 줄이기
    while (
      step < maxSteps &&
      (banner.scrollHeight > banner.clientHeight ||
       banner.scrollWidth  > banner.clientWidth)
    ) {
      fs *= 0.9;
      banner.style.fontSize = fs + 'px';
      step++;
    }
  }

  // ✅ QRCode.js 버전 – 크기 계산 따로 안 하고 항상 큰 해상도로 만들고,
  // CSS로 스케일만 조절 (지금 외부 API img 방식이랑 느낌 같게)
    function setBannerQr(url) {
        const box = document.getElementById('ad-banner-qr-box');
        if (!box) return;

        if (!window.QRCode) {
            console.warn('QRCode library is not loaded.');
            return;
        }

        // 이전 QR 제거
        box.innerHTML = '';

        new QRCode(box, {
            text: url,
            width: 600,
            height: 600,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        });
    }


  // 외부에서도 fitAdBanner를 호출할 수 있게 노출
  window.fitAdBanner = fitAdBanner;

  // 페이지 로드될 때: QR 만들고 배너 폰트 맞추기
  window.addEventListener('load', function () {
    const popupUrl =
      'https://gb9fb258fe17506-dev2.adb.ap-seoul-1.oraclecloudapps.com/ords/r/ad_dev/adwright-user-dev/popup-info?session=40894845531';

    setBannerQr(popupUrl);
    fitAdBanner();
  });

  // 창 리사이즈 시 폰트 다시 계산
  window.addEventListener('resize', fitAdBanner);

  // modal-player 크기 바뀔 때마다 다시 맞추기
  const mp = document.getElementById('modal-player');
  if (window.ResizeObserver && mp) {
    const ro = new ResizeObserver(fitAdBanner);
    ro.observe(mp);
  }
})();
