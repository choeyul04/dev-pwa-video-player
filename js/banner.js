/***************************************************************************************
 * AD Wright - banner.js (FULL)
 * 목표:
 * 1) overflow(잘림) 없게 자동 폰트 조절 (…/스크롤/자르기 금지)
 * 2) Ctrl+휠 줌에는 window resize로 반응하지 않음 (ResizeObserver 기반)
 * 3) 하단 모드에서 발생하던 "과한 축소" 방지:
 *    - overflow 판정 EPS/SAFE 완화
 *    - 타겟을 '실제 잘림이 의미있는 영역' 중심으로 구성
 ***************************************************************************************/

const BANNER_CACHE_NAME = 'site-banner-v1';
const POPUP_URL =
  'https://gb9fb258fe17506-dev2.adb.ap-seoul-1.oraclecloudapps.com/ords/r/ad_dev/adwright-user-dev/popup-info?';

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

  if (!file) {
    console.log('배너 정보 없음', fileId);
    setBannerVisible(false);
    return;
  }

  const flag = String(file.is_popup ?? '0');
  const showBanner = flag === '1';
  setBannerVisible(showBanner);
  if (!showBanner) return;

  if ($title)    $title.textContent    = file.popup_name    || '';
  if ($subtitle) $subtitle.textContent = file.en_popup_name || '';

  if ($promotion) {
    let promo = file.promotion || '';
    promo = promo.replace(/\r\n/g, '\n');
    promo = promo.replace(/\n/g, '<br>');
    $promotion.innerHTML = promo;
  }

  if ($location) $location.textContent = file.popup_location || '';

  if ($duration) {
    let durationText = '';
    if (file.open_from_date && file.open_to_date) {
      durationText = `${file.open_from_date} ~ ${file.open_to_date}`;
    }
    $duration.textContent = durationText;
  }

  if ($opentime) {
    const raw = file.open_tm_range || '';
    const parts = raw
      .split('|')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // ✅ '|' 기준으로만 라인 생성 (라인 내부 줄바꿈 금지)
    const opentimeHtml = parts
      .map(line => `<span class="ad-banner-time-line">${escapeHtml(line)}</span>`)
      .join('');

    $opentime.innerHTML = opentimeHtml;
  }

  if (typeof setBannerTags === 'function') {
    setBannerTags(file.category || '');
  }

  const url = POPUP_URL + 'aid=' + file.info_id;
  if (typeof setBannerQr === 'function') {
    setBannerQr(url);
  }

  if (typeof setBannerTheme === 'function') {
    const bg   = file.banner_bg_color   || '#7c4dff';
    const text = file.banner_text_color || '#ffffff';
    setBannerTheme(bg, text);
  }

  if (typeof scheduleFit === 'function') scheduleFit();
  else if (typeof fitAdBanner === 'function') fitAdBanner();
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
  const m   = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
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

/* -------------------------------------------------------
 * 배너 show / hide 제어
 * ----------------------------------------------------- */
function setBannerVisible(visible) {
  const banner = document.getElementById('banner');
  const modal  = document.getElementById('modal-player');

  if (banner) banner.style.display = visible ? '' : 'none';

  // ✅ 핵심: 배너 OFF 상태 클래스
  if (modal) modal.classList.toggle('banner-off', !visible);
}

/* -------------------------------------------------------
 * XSS/깨짐 방지용
 * ----------------------------------------------------- */
function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// =======================
// 4) UI 헬퍼 (IIFE)
// =======================
(function () {

  function isBottomMode() {
    const layout = document.querySelector('.ad-player-layout');
    if (!layout) return false;
    return getComputedStyle(layout).flexDirection === 'column';
  }

  /* =====================================================
   * ✅ fitAdBanner: "절대 잘림/…/스크롤 없이" 폰트만 줄여서 맞추기
   * - CSS 계산 폰트(컨테이너 기반)를 상한(max)으로 사용
   * - 하단 모드 과소 축소 방지: EPS/SAFE 완화
   * ===================================================== */
  function fitAdBanner() {
    const banner = document.querySelector('.ad-player-banner');
    if (!banner) return;

    // ✅ CSS가 계산한 폰트를 상한으로 쓰기 위해 inline을 비움
    banner.style.fontSize = '';
    const maxFont = parseFloat(getComputedStyle(banner).fontSize) || 16;

    // 사실상 제한 없음(0은 위험 -> 0.1)
    const minFont = 0.1;

    const bottom = isBottomMode();

    // ✅ 하단 모드: 과민한 오판 줄이기 (미세 서브픽셀을 과하게 “넘침”으로 보지 않게)
    const EPS  = bottom ? 1.2 : 0.9;   // overflow 판정 허용치
    const SAFE = bottom ? 0.05 : 0.10; // 마지막 안전 마진

    // ✅ 측정 대상: "진짜로 잘림이 의미있는 래퍼들" 위주로
    const targets = [
      banner,
      banner.querySelector('.ad-banner-inner'),
      banner.querySelector('.ad-banner-main'),
      banner.querySelector('.ad-banner-subtitle'),
      banner.querySelector('.ad-banner-heading'),
      banner.querySelector('.ad-banner-desc'),
      banner.querySelector('.ad-banner-meta'),
      ...banner.querySelectorAll('.ad-banner-meta-row'),
      banner.querySelector('#banner-opentime'),
      ...banner.querySelectorAll('#banner-opentime .ad-banner-time-line'),
      banner.querySelector('.ad-banner-qr'),
      banner.querySelector('.ad-banner-qr-text'),
    ].filter(Boolean);

    const isOverflow = (el) => {
      if (!el || !el.getClientRects().length) return false;

      const sh = el.scrollHeight;
      const ch = el.clientHeight;
      const sw = el.scrollWidth;
      const cw = el.clientWidth;

      return (sh - ch) > EPS || (sw - cw) > EPS;
    };

    const anyOverflow = () => targets.some(isOverflow);

    // ✅ 이진탐색: "넘치지 않는 최대 폰트"
    let lo = minFont;
    let hi = maxFont;
    let best = minFont;

    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2;
      banner.style.fontSize = mid + 'px';

      if (anyOverflow()) {
        hi = mid;
      } else {
        best = mid;
        lo = mid;
      }
    }

    // ✅ 안전마진(미세 1px 잘림 방지) - 하단 모드는 너무 깎지 않게
    const finalSize = Math.max(minFont, best - SAFE);
    banner.style.fontSize = finalSize + 'px';
  }

  // ✅ QRCode.js로 QR 생성
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
  function parseCategoryTags(categoryStr) {
    if (!categoryStr) return [];

    return categoryStr
      .split(':')
      .map(s => s.trim())
      .map(s => s.replace(/^[^0-9A-Za-z가-힣]+/, ''))
      .filter(s => s.length > 0);
  }

  function setBannerTags(categoryStr) {
    const wrap =
      document.getElementById('banner-tags') ||
      document.querySelector('.ad-banner-tags');

    if (!wrap) return;

    const tags = parseCategoryTags(categoryStr);

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
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
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

  function mixRgb(c1, c2, ratio) {
    const t = Math.max(0, Math.min(1, ratio));
    return {
      r: c1.r * (1 - t) + c2.r * t,
      g: c1.g * (1 - t) + c2.g * t,
      b: c1.b * (1 - t) + c2.b * t,
    };
  }

  function setBannerTheme(bgHex, textHex) {
    const banner = document.querySelector('.ad-player-banner');
    if (!banner) return;

    if (bgHex && bgHex[0] !== '#') bgHex = '#' + bgHex;
    if (textHex && textHex[0] !== '#') textHex = '#' + textHex;

    if (bgHex) {
      const base = hexToRgb(bgHex);
      if (base) {
        const white = { r: 255, g: 255, b: 255 };
        const black = { r:   0, g:   0, b:   0 };

        const light = mixRgb(base, white, 0.20);
        const dark  = mixRgb(base, black, 0.10);
        const deep  = mixRgb(base, black, 0.18);

        banner.style.setProperty('--ad-banner-main',  bgHex);
        banner.style.setProperty('--ad-banner-light', rgbToHex(light.r, light.g, light.b));
        banner.style.setProperty('--ad-banner-dark',  rgbToHex(dark.r,  dark.g,  dark.b));
        banner.style.setProperty('--ad-banner-deep',  rgbToHex(deep.r,  deep.g,  deep.b));
        banner.style.setProperty('--ad-border', 'rgba(255,255,255,0.2)');
      }
    }

    if (textHex) banner.style.color = textHex;
  }


  /* =====================================================
   * ✅ scheduleFit (디바운스)
   * - 브라우저 줌(Ctrl+휠)은 window resize로도 흔들리므로
   *   -> window resize 리스너는 두지 않음
   * - ResizeObserver(모달/배너) + MutationObserver만 사용
   * ===================================================== */
  let _fitT = 0;
  function scheduleFit() {
    clearTimeout(_fitT);

    _fitT = setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          fitAdBanner();
        });
      });
    }, 80);
  }

  // 전역 노출
  window.fitAdBanner    = fitAdBanner;
  window.setBannerQr    = setBannerQr;
  window.setBannerTheme = setBannerTheme;
  window.setBannerTags  = setBannerTags;
  window.scheduleFit    = scheduleFit;

  // ✅ 초기 로드만
  window.addEventListener('load', scheduleFit);

  // ✅ modal-player + banner 관찰 (모달 크기 조절에만 반응)
  const mp = document.getElementById('modal-player');
  const bannerEl = document.querySelector('.ad-player-banner');

  if (window.ResizeObserver && mp) {
    const ro = new ResizeObserver(() => scheduleFit());
    ro.observe(mp);
  }
  if (window.ResizeObserver && bannerEl) {
    const ro2 = new ResizeObserver(() => scheduleFit());
    ro2.observe(bannerEl);
  }

  // ✅ 내용 변경(텍스트/QR 생성 등)도 관찰
  if (window.MutationObserver && bannerEl) {
    const mo = new MutationObserver(() => scheduleFit());
    mo.observe(bannerEl, { childList: true, subtree: true, characterData: true });
  }

})();
