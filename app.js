const axios = require('axios');
const state = require('./state');
const { delay } = require('./util/delay');

const {
  GOOGLE_API_KEY = '',
  DISCORD_WEBHOOK_URL = ''
} = process.env;

const regex = /\bpoe\b|path.*of.*exile|discord\.tftrove\.com|discord\.gg\/tftrove/;

const isPoeVideo = (snippet) => {
  const { title = '', description = '' } = snippet;
  if (regex.test(title.toLowerCase())) return true;
  if (regex.test(description.toLowerCase())) return true;
  return false;
}

const run = async () => {

  const currentTimestamp = Date.now();
  const { timestamp, youtubers } = await state.getState();
  const lastTimestamp = new Date(timestamp);
  console.log(`last timestamp: ${timestamp} | ${lastTimestamp.toLocaleString()}`);

  const newVideos = [];

  // 1. Scan youtube channels for new videos

  for (const youtuber of youtubers) {
    console.log(`scanning ${youtuber.username}...`);

    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${youtuber.uploadPlaylistId}&key=${GOOGLE_API_KEY}&maxResults=5`;
    const response = await axios.get(url);

    const { data = {} } = response;
    const { items = [] } = data;

    for (const item of items) {
      const date = new Date(item.snippet.publishedAt);
      const channelTitle = item.snippet.channelTitle; // youtuber name
      const title = item.snippet.title || '';
      const videoId = item.snippet.resourceId.videoId;

      console.log(`${date.getTime()} | ${date.toLocaleString()} | ${title.substr(0, 40)}`);

      if (date < lastTimestamp) continue;
      if (!isPoeVideo(item.snippet)) continue;

      console.log(`  ${channelTitle} new video: ${title}`);
      newVideos.push({ date, channelTitle, title, videoId });
    }

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

  // 3. Save latest timestamp

  await state.saveTimestamp(currentTimestamp);
}

run();