const BANNER_CACHE_NAME = 'site-banner-v1';
const POPUP_URL = 'https://gb9fb258fe17506-dev2.adb.ap-seoul-1.oraclecloudapps.com/ords/r/ad_dev/adwright-user-dev/popup-info?';

// 배너 정보 업데이트
async function updateBanner(fileId) {
  // 요소 찾기 (각 class는 하나씩만 존재한다고 가정)
  const $title = document.getElementById('banner-title');
  const $subtitle = document.getElementById('banner-subtitle');
  const $promotion = document.getElementById('banner-promotion');
  const $location = document.getElementById('banner-location');
  const $duration = document.getElementById('banner-duration');
  const $opentime = document.getElementById('banner-opentime');

  // Cache Storage에서 찾기
  const file = await getBannerFromCache(fileId);

  // 배너 정보 못 찾으면 숨기기
  if (!file) {
    console.log('배너 정보 없음', fileId);
    document.getElementById("banner").style.display = "none";
    return;
  }

  document.getElementById("banner").style.display = "block";

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
    $duration.textContent = file.open_from_date + ' ~ ' + file.open_to_date || '';
  }

  if ($opentime) {
    const opentimeHtml = (file.open_tm_range || '').replace(/\|/g, '<br>');
    $opentime.innerHTML = opentimeHtml;
  }

  const url = POPUP_URL + "aid=" + file.info_id;
  setBannerQr(url);

    // ✅ 색 적용 (DB 값 기반)
  if (typeof setBannerTheme === 'function') {
    const bg   = file.banner_bg_color  || '#7c4dff';   // 옵션: 기본값
    const text = file.banner_text_color || '#ffffff';  // 옵션: 기본값
    setBannerTheme(bg, text);
  }

  // 폰트 자동 축소
  if (typeof fitAdBanner === 'function') {
    fitAdBanner();
  }
}
window.updateBanner = updateBanner;

function getBannerDataFromFile(file) {
  return {
    id: file.FILE_ID,
    info_id: file.INFO_ID,
    is_popup: file.IS_POPUP,
    popup_name: file.POPUP_NAME,
    en_popup_name: file.EN_POPUP_NAME,
    category: file.CATEGORY,
    popup_location: file.POPUP_LOCATION,
    open_tm_range: file.OPEN_TM_RANGE,
    promotion: file.PROMOTION,
    open_from_date: formatDotDate(file.OPEN_FROM_DATE),
    open_to_date: formatDotDate(file.OPEN_TO_DATE),
    banner_bg_color: file.BANNER_COLOR || null,
    banner_text_color: file.TEXT_COLOR || null,
  };
}

async function getBannerFromCache(fileId) {
  const key = `/banner/${fileId}`;
  const response = await caches.match(key);
  if (!response) return null;
  return await response.json();
}


function formatDotDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

async function cacheBanners(banners) {
  const cache = await caches.open(BANNER_CACHE_NAME);

  for (const banner of banners) {
    if (!banner || banner.id == null) continue;

    const key = `/banner/${banner.id}`; // 키로 쓸 “가짜 URL”

    const response = new Response(JSON.stringify(banner), {
      headers: { 'Content-Type': 'application/json' },
    });

    await cache.put(key, response);
  }
}

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
    fitAdBanner();
  });

  window.addEventListener('resize', fitAdBanner);


  const mp = document.getElementById('modal-player');
  if (window.ResizeObserver && mp) {
    const ro = new ResizeObserver(fitAdBanner);
    ro.observe(mp);
  }

})();

