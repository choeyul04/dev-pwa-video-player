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
        banner.scrollWidth > banner.clientWidth)
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
      correctLevel: QRCode.CorrectLevel.M,
    });
  }

  // 외부에서도 fitAdBanner를 호출할 수 있게 노출
  window.fitAdBanner = fitAdBanner;

  // 페이지 로드될 때: (테스트용) QR 만들고 배너 폰트 맞추기
  window.addEventListener('load', function () {
    const popupUrl =
      'https://gb9fb258fe17506-dev2.adb.ap-seoul-1.oraclecloudapps.com/ords/r/ad_dev/adwright-user-dev/popup-info?aid=4411F0BD0B954F65E063975F000AA5E3';

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

/* -------------------------------------------------------
 * 배너 show / hide 제어
 *   - IS_POPUP = 1  → 배너 표시
 *   - IS_POPUP = 0  → 배너 숨김 (동영상만 보이게)
 * ----------------------------------------------------- */
function setBannerVisible(visible) {
  const banner = document.querySelector('.ad-player-banner');
  if (!banner) return;

  banner.style.display = visible ? '' : 'none';
}

/* -------------------------------------------------------
 * 현재 재생 중 파일의 FILE_ID 기준으로 배너 내용 갱신
 * ----------------------------------------------------- */
function updateBanner(fileId) {
  const $title = document.querySelector('#banner-title');
  const $subtitle = document.querySelector('#banner-subtitle');
  const $promotion = document.querySelector('#banner-promotion');
  const $location = document.querySelector('#banner-location');
  const $duration = document.querySelector('#banner-duration');
  const $opentime = document.querySelector('#banner-opentime');

  console.log('Banner is updated. fileId =', fileId);

  const file = getBannerById(fileId);

  // 데이터가 없으면 그냥 배너 숨김
  if (!file) {
    setBannerVisible(false);
    return;
  }

  // ✅ IS_POPUP 값에 따라 배너 표시 여부 결정
  //    1 → 배너 표시, 0 → 배너 숨김
  const flag = String(file.is_popup ?? '0'); // undefined이면 기본 0
  const showBanner = flag === '1';           // 🔁 여기만 반대로!

  setBannerVisible(showBanner);

  // 숨길 거면 내용 세팅 안 하고 바로 종료
  if (!showBanner) {
    return;
  }

  // ----- 아래부터는 내용 세팅 -----
  if ($title) {
    $title.textContent = file.popup_name || '';
  }

  if ($subtitle) {
    $subtitle.textContent = file.en_popup_name || '';
  }

  if ($promotion) {
    $promotion.textContent = file.promotion || '';
  }

  if ($location) {
    $location.textContent = file.popup_location || '';
  }

  if ($duration) {
    const from = file.open_from_date || '';
    const to = file.open_to_date || '';
    $duration.textContent =
      from && to ? from + ' ~ ' + to : from || to || '';
  }

  if ($opentime) {
    const opentimeHtml = (file.open_tm_range || '').replace(/\|/g, '<br>');
    $opentime.innerHTML = opentimeHtml;
  }

  // 텍스트 바뀐 뒤 폰트 다시 맞추기
  if (typeof window.fitAdBanner === 'function') {
    window.fitAdBanner();
  }
}

/* -------------------------------------------------------
 * AD_FILES에서 내려온 데이터 → 배너용 메모리에 저장
 * (api.js의 fileToPlaylistSrc()에서 호출 중)
 * ----------------------------------------------------- */
function pushBannerFromFile(file) {
  // 이미 존재하는지 검사
  const exists = player.bannerInfo.some(
    banner => banner.id === file.FILE_ID,
  );
  if (exists) return;

  player.bannerInfo.push({
    id: file.FILE_ID,
    is_popup: file.IS_POPUP,               // AD_FILES.IS_POPUP 값 그대로 저장
    popup_name: file.POPUP_NAME,
    en_popup_name: file.EN_POPUP_NAME,
    popup_location: file.POPUP_LOCATION,
    open_tm_range: file.OPEN_TM_RANGE,
    promotion: file.PROMOTION,
    open_from_date: formatDotDate(file.OPEN_FROM_DATE),
    open_to_date: formatDotDate(file.OPEN_TO_DATE),
  });
}

/* -------------------------------------------------------
 * FILE_ID로 배너 정보 찾기
 * ----------------------------------------------------- */
function getBannerById(id) {
  if (!player.bannerInfo || !player.bannerInfo.length) return null;

  const numId = Number(id);
  return (
    player.bannerInfo.find(banner => Number(banner.id) === numId) ||
    null
  );
}

/* -------------------------------------------------------
 * "YYYY-MM-DD" → "YYYY.MM.DD" 포맷으로 변환
 * ----------------------------------------------------- */
function formatDotDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}
