const axios = require('axios');
const state = require('./scrape');
const { delay } = require('./util/delay');

const {
  GOOGLE_API_KEY = '',
  DISCORD_WEBHOOK_URL = ''
} = process.env;

const regex = /\b(poe|path.*of.*exile)/i;
const negativeRegex = /\b(diablo|torchlight|last.*epoch|wolcen|undecember|grim.*dawn)/i;

const isPoeVideo = (snippet) => {
  const { title = '', description = '' } = snippet;

  if (negativeRegex.test(title)) return false;
  if (negativeRegex.test(description)) return false;

  if (regex.test(title)) return true;
  if (regex.test(description)) return true;

  return false;
}

const run = async () => {

  const currentTimestamp = Date.now();
  const { timestamp, youtubers } = await state.getState();
  const lastTimestamp = new Date(timestamp);
  console.log(`last timestamp: ${timestamp} | ${lastTimestamp.toLocaleString()}`);

  const newVideos = [];

  // 1. Scan youtube channels for new videos

  for (const i in youtubers) {
    const youtuber = youtubers[i];
    const latestVideoTitles = youtuber.latestVideoTitles || [];

    console.log(`# scanning ${youtuber.channelTitle}\t\t${youtuber.url}`);

    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${youtuber.playlistId}&key=${GOOGLE_API_KEY}&maxResults=5`;
    const response = await axios.get(url);

    const { data = {} } = response;
    const { items = [] } = data;

    for (const item of items) {
      const date = new Date(item.snippet.publishedAt);
      const channelTitle = item.snippet.channelTitle; // youtuber name
      const title = item.snippet.title || '';
      const videoId = item.snippet.resourceId.videoId;

      console.log(`${date.getTime()} | ${date.toLocaleString()} | ${title.substr(0, 100)}`);

      if (date < lastTimestamp) continue;
      if (!isPoeVideo(item.snippet)) continue;

      if (latestVideoTitles.includes(title)) {
        console.log('  -> video has been posted before, skip (checkall)');
        continue;
      }

      console.log(`  -> ${channelTitle} new video: ${title}`);
      newVideos.push({ date, channelTitle, title, videoId });
    }

    youtuber.latestVideoTitles = items.map(item => item.snippet.title);
    delete youtuber.latestVideoTitle; // remove old field

    await delay(500);
  }

  // 2. Post to Discord

  if (newVideos.length > 0) {
    newVideos.sort((a, b) => a.date < b.date);

    for (const video of newVideos) {
      const videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
      const message = `**${video.channelTitle}** posted a new video: **${video.title}**\n${videoUrl}`

      await axios.post(DISCORD_WEBHOOK_URL, { content: message });
      await delay(1000);
    }
  }

  // 3. Save latest timestamp & youtubers list (latestVideoTitles is updated here)

  await state.save(currentTimestamp, youtubers);
}

run();