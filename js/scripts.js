// inject current year in footer
const rightNow = new Date();
document.querySelector('#year').textContent = rightNow.getFullYear();

function vttTimeToSeconds(value) {
  const [hh, mm, rest] = value.split(':');
  const [ss, ms] = rest.split('.');
  return Number(hh) * 3600 + Number(mm) * 60 + Number(ss) + Number(ms) / 1000;
}

function parseVtt(vttText) {
  const blocks = vttText.replace(/\r/g, '').split('\n\n');
  const cues = [];

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const timeLine = lines.find((line) => line.includes('-->'));
    if (!timeLine) {
      continue;
    }

    const [start, end] = timeLine.split('-->').map((token) => token.trim());
    const textLines = lines.slice(lines.indexOf(timeLine) + 1);
    if (textLines.length === 0) {
      continue;
    }

    cues.push({
      start: vttTimeToSeconds(start),
      end: vttTimeToSeconds(end),
      text: textLines.join(' ')
    });
  }

  return cues;
}

function activeCueText(cues, currentTime) {
  const activeCue = cues.find((cue) => currentTime >= cue.start && currentTime <= cue.end);
  return activeCue ? activeCue.text : '';
}

async function enableDualCaptions() {
  const video = document.querySelector('#mainVideo');
  const overlay = document.querySelector('#dualCaptionOverlay');
  const captionEn = document.querySelector('#captionEn');
  const captionEs = document.querySelector('#captionEs');

  if (!video || !overlay || !captionEn || !captionEs) {
    return;
  }

  // Change 'disabled' to 'hidden' to allow JS to read cues without showing native boxes
  for (const track of video.textTracks) {
    track.mode = 'hidden';
  }

  try {
    const [enResponse, esResponse] = await Promise.all([
      fetch('media/main-video.en.vtt'),
      fetch('media/main-video.es.vtt')
    ]);

    const [enVtt, esVtt] = await Promise.all([enResponse.text(), esResponse.text()]);
    const englishCues = parseVtt(enVtt);
    const spanishCues = parseVtt(esVtt);

    const renderCaptions = () => {
      const now = video.currentTime;
      const enText = activeCueText(englishCues, now);
      const esText = activeCueText(spanishCues, now);

      captionEn.textContent = enText;
      captionEs.textContent = esText;
      overlay.style.display = enText || esText ? 'block' : 'none';
    };

    ['timeupdate', 'seeked', 'play', 'pause', 'loadedmetadata'].forEach((eventName) => {
      video.addEventListener(eventName, renderCaptions);
    });

    video.addEventListener('ended', () => {
      captionEn.textContent = '';
      captionEs.textContent = '';
      overlay.style.display = 'none';
    });

    renderCaptions();
  } catch (error) {
    // Keep playback functional even if caption files fail to load.
    overlay.style.display = 'none';
    console.error('Could not load bilingual captions.', error);
  }
}

enableDualCaptions();