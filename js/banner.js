const BANNER_CACHE_NAME = 'site-banner-v1';

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
      'https://gb9fb258fe17506-dev2.adb.ap-seoul-1.oraclecloudapps.com/ords/r/ad_dev/adwright-user-dev/popup-info?aid=44008AC390844E7CE063975F000ACB59';

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

// 배너 정보 업데이트
async function updateBanner(fileId) {
  // 요소 찾기 (각 class는 하나씩만 존재한다고 가정)
  const $title = document.querySelector('#banner-title');
  const $subtitle = document.querySelector('#banner-subtitle');
  const $promotion = document.querySelector('#banner-promotion');
  const $location = document.querySelector('#banner-location');
  const $duration = document.querySelector('#banner-duration');
  const $opentime = document.querySelector('#banner-opentime');

  // 1. 우선 메모리(player.bannerInfo)에서 찾고
  let file =
    player.bannerInfo &&
    player.bannerInfo.find(b => Number(b.id) === Number(fileId));

  // 2. 없으면 Cache Storage에서 찾기
  if (!file) {
    file = await getBannerFromCache(fileId);
  }

  if (!file) {
    console.log('배너 정보 없음', fileId);
    return;
  }

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
}

function getBannerDataFromFile(file) {
  return {
    id: file.FILE_ID,
    is_popup: file.IS_POPUP,
    popup_name: file.POPUP_NAME,
    en_popup_name: file.EN_POPUP_NAME,
    popup_location: file.POPUP_LOCATION,
    open_tm_range: file.OPEN_TM_RANGE,
    promotion: file.PROMOTION,
    open_from_date: formatDotDate(file.OPEN_FROM_DATE),
    open_to_date: formatDotDate(file.OPEN_TO_DATE),
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
