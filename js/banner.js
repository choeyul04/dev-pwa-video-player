const BANNER_CACHE_NAME = 'site-banner-v1';
const POPUP_URL = 'https://gb9fb258fe17506-dev2.adb.ap-seoul-1.oraclecloudapps.com/ords/r/ad_dev/adwright-user-dev/popup-info?';

// =======================
// 1) 배너 정보 업데이트
// =======================
async function updateBanner(fileId) {
  const $title     = document.getElementById('banner-title');
  const $subtitle  = document.getElementById('banner-subtitle');
  const $promotion = document.getElementById('banner-promotion');
  const $location  = document.getElementById('banner-location');
  const $duration  = document.getElementById('banner-duration');
  const $opentime  = document.getElementById('banner-opentime');

  const file = await getBannerFromCache(fileId);
  const bannerEl = document.getElementById("banner");

  // 배너 정보 못 찾으면 숨기기
  if (!file) {
    console.log('배너 정보 없음', fileId);
    if (bannerEl) bannerEl.style.display = "none";
    return;
  }

  if (bannerEl) bannerEl.style.display = "block";

  if ($title)     $title.textContent     = file.popup_name     || '';
  if ($subtitle)  $subtitle.textContent  = file.en_popup_name  || '';
  if ($promotion) $promotion.textContent = file.promotion      || '';
  if ($location)  $location.textContent  = file.popup_location || '';

  if ($duration) {
    let durationText = '';
    if (file.open_from_date && file.open_to_date) {
      durationText = `${file.open_from_date} ~ ${file.open_to_date}`;
    }
    $duration.textContent = durationText;
  }

  if ($opentime) {
    const opentimeHtml = (file.open_tm_range || '').replace(/\|/g, '<br>');
    $opentime.innerHTML = opentimeHtml;
  }

  // ✅ category → 태그 렌더링 (이모지 제거)
  if (typeof setBannerTags === 'function') {
    setBannerTags(file.category || '');
  }

  const url = POPUP_URL + "aid=" + file.info_id;
  setBannerQr(url);

  // ✅ 색 적용 (DB 값 기반)
  if (typeof setBannerTheme === 'function') {
    const bg   = file.banner_bg_color   || '#7c4dff';  // 메인 배너 색
    const text = file.banner_text_color || '#ffffff';  // 텍스트 색
    setBannerTheme(bg, text);
  }

  // 폰트 자동 축소
  if (typeof fitAdBanner === 'function') {
    fitAdBanner();
  }
}
window.updateBanner = updateBanner;

// =======================
// 2) 파일 → 배너 데이터 변환
// =======================
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

// =======================
// 3) 캐시 I/O
// =======================
async function getBannerFromCache(fileId) {
  const key = `/banner/${fileId}`;
  const response = await caches.match(key);
  if (!response) return null;
  return await response.json();
}

function formatDotDate(dateStr) {
  if (!dateStr) return null;
  const d   = new Date(dateStr);
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

async function cacheBanners(banners) {
  const cache = await caches.open(BANNER_CACHE_NAME);

  for (const banner of banners) {
    if (!banner || banner.id == null) continue;

    const key = `/banner/${banner.id}`;
    const response = new Response(JSON.stringify(banner), {
      headers: { 'Content-Type': 'application/json' },
    });

    await cache.put(key, response);
  }
}

// =======================
// 4) UI 헬퍼 (IIFE)
// =======================
(function () {

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
      fs *= 0.9;
      banner.style.fontSize = fs + 'px';
      step++;
    }
  }

  // QRCode.js로 QR 생성
  function setBannerQr(url) {
    const box = document.getElementById('ad-banner-qr-box');
    if (!box || !url) return;

    if (!window.QRCode) {
      console.warn('QRCode library is not loaded.');
      return;
    }

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

  // ===== 카테고리 → 태그 렌더링 =====

  // "🚗 리빙:💄 뷰티"  →  ["리빙", "뷰티"]
  function parseCategoryTags(categoryStr) {
    if (!categoryStr) return [];

    return categoryStr
      .split(':')               // 콜론 기준 분리
      .map(s => s.trim())
      // 앞쪽 이모지·기호 제거 (처음 한글/영문/숫자 전까지 삭제)
      .map(s => s.replace(/^[^0-9A-Za-z가-힣]+/, ''))
      .filter(s => s.length > 0);
  }

  function setBannerTags(categoryStr) {
    const wrap =
      document.getElementById('banner-tags') ||
      document.querySelector('.ad-banner-tags');

    if (!wrap) return;

    const tags = parseCategoryTags(categoryStr);

    // 카테고리 없으면 감춤
    if (!tags.length) {
      wrap.innerHTML = '';
      wrap.style.display = 'none';
      return;
    }

    wrap.style.display = 'flex';
    wrap.innerHTML = '';

    tags.forEach(tag => {
      const span = document.createElement('span');
      span.className = 'ad-banner-tag';
      span.textContent = tag;
      wrap.appendChild(span);
    });
  }

  // ===== 색 관련 유틸 =====
  function hexToRgb(hex) {
    if (!hex) return null;
    let h = hex.trim();

    if (h[0] === '#') h = h.slice(1);
    if (h.length === 3) {
      h = h.split('').map(c => c + c).join('');
    }
    if (h.length !== 6) return null;

    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
    return { r, g, b };
  }

  function rgbToHex(r, g, b) {
    const toHex = (v) => {
      const n = Math.max(0, Math.min(255, Math.round(v)));
      return n.toString(16).padStart(2, '0');
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  // color1을 base, color2(흰/검정)와 섞기
  function mixRgb(c1, c2, ratio) {
    const t = Math.max(0, Math.min(1, ratio));
    return {
      r: c1.r * (1 - t) + c2.r * t,
      g: c1.g * (1 - t) + c2.g * t,
      b: c1.b * (1 - t) + c2.b * t,
    };
  }

  // ▶ 사용자 지정 색 적용
  //   bgHex: 메인 색 (#rrggbb)
  //   textHex: 텍스트 색
  function setBannerTheme(bgHex, textHex) {
    const banner = document.querySelector('.ad-player-banner');
    if (!banner) return;

    // 1) 메인 색 기준으로 그라디언트 색 계산
    if (bgHex) {
      const base = hexToRgb(bgHex);
      if (base) {
        const white = { r: 255, g: 255, b: 255 };
        const black = { r: 0, g: 0, b: 0 };

        const light = mixRgb(base, white, 0.40); // 40% 정도 흰색 섞기
        const dark  = mixRgb(base, black, 0.20); // 20% 정도만 검정 섞기
        const deep  = mixRgb(base, black, 0.32); // dark보다 조금 더 진하게

        banner.style.setProperty('--ad-banner-main',  bgHex);
        banner.style.setProperty('--ad-banner-light', rgbToHex(light.r, light.g, light.b));
        banner.style.setProperty('--ad-banner-dark',  rgbToHex(dark.r,  dark.g,  dark.b));
        banner.style.setProperty('--ad-banner-deep',  rgbToHex(deep.r,  deep.g,  deep.b));
        // border는 기존 느낌 유지
        banner.style.setProperty('--ad-banner-border', 'rgba(255, 255, 255, 0.2)');
      }
    }

    // 2) 텍스트 색
    if (textHex) {
      banner.style.color = textHex;
    }
  }

  // 전역 노출
  window.fitAdBanner    = fitAdBanner;
  window.setBannerQr    = setBannerQr;
  window.setBannerTheme = setBannerTheme;
  window.setBannerTags  = setBannerTags;

  // 초기 로드 / 리사이즈
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
