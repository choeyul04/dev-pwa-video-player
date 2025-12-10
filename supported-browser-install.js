navigator.serviceWorker
  .register('sw.js')
  .then(registration =>  {
    console.log('running "supported-browser-install.js"');

    // 1) 이 순간 이미 installing 중인 워커가 있으면 한 번 잡아줌
    if (registration.installing) {
      watchWorker(registration.installing);
    }

    // 2) 이후에 업데이트가 발견되면 (sw.js 내용 바뀌었을 때)
    registration.addEventListener('updatefound', () => {
      console.log('updatefound!');
      watchWorker(registration.installing);
    });

    // 3) active 인 건 "이미 설치 완료" 상태
    if (registration.active) {
      console.log('SW active:', registration.active);
      window.location.reload();
    }
  })
.catch(error => status(error));
  
function watchWorker(worker) {
  if (!worker) return;

  const sw = worker || registration.waiting;

  sw.onstatechange = function () {
    if (sw.state === 'installed') {
      console.log("sw.state", sw.state);
      window.location.reload();
    }
  };
}