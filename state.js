const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { delay } = require('./util/delay');

const { GOOGLE_API_KEY = '' } = process.env;

let init = false;
let state = {};

const initialize = async () => {
  if (init) return;
  init = true;

  const youtubersData = [];

  const TIME_INTERVAL = 1 * 60 * 60 * 1000;
  let timestamp = Date.now() - TIME_INTERVAL; // set the default timestamp if there's no current timestamp in state.json

  // 1. Get list of youtubers.txt

  const youtubersPath = path.resolve(__dirname + '/youtubers.txt');
  const youtubersList = fs.readFileSync(youtubersPath);
  const txtYoutubers = youtubersList.toString().trim().split('\n');

  try {
    state = require('./state.json');
    timestamp == state.timestamp;
    if (txtYoutubers.length === state.youtubers.length) {
      return; // complete init() if state.json already populated
    }
  } catch (err) {
    console.log("state.json doesn't exist/invalid/outdated, start populating...");
  }

  // 2. Loop youtubers
  const stateYoutubers = state.youtubers || [];

  for (const youtuber of txtYoutubers) {

    // use existing data if exist
    const found = stateYoutubers.find((stateYoutuber) => stateYoutuber.username == youtuber);
    if (found && found.uploadPlaylistId) {
      youtubersData.push(found);
      continue;
    }

    let channelId = '';
    console.log(`processing ${youtuber}:`);

    // 2a. Get ChannelId by Username
    {
      const url = `https://www.googleapis.com/youtube/v3/search?part=id%2Csnippet&type=channel&q=${encodeURIComponent(youtuber)}&key=${GOOGLE_API_KEY}`;
      const response = await axios.get(url);

      console.log(JSON.stringify(response.data,null,2));

      const { data = {} } = response;
      const { items = [] } = data;
      const { snippet = {} } = items[0] || {};
      const { title = '' } = snippet;

      if (title !== youtuber) {
        // not the best validation but this is the only option we can use for verification
        throw new Error(`title "${title}" does not match username "${youtuber}".`);
      }

      channelId = items[0].id.channelId;
      await delay(500);
    }

    // 2b. Get UploadId from ChannelId
    {
      const url = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${GOOGLE_API_KEY}`;
      const response = await axios.get(url);

      const { data = {} } = response;
      const { items = [] } = data;
      const { contentDetails = {} } = items[0] || {};
      const { relatedPlaylists = {} } = contentDetails;
      const { uploads = '' } = relatedPlaylists;

      youtubersData.push({ username: youtuber, uploadPlaylistId: uploads });

      await delay(500);
    }
  }

  // 3. Save state into file

  state = { timestamp, youtubers: youtubersData };
  const stateStr = JSON.stringify(state, null, 2);
  const statePath = path.resolve(__dirname + '/state.json');
  fs.writeFileSync(statePath, Buffer.from(stateStr, 'utf8'));
}

exports.saveTimestamp = async (newTimestamp) => {
  await initialize();

  console.log(`save new timestamp: ${newTimestamp} | ${new Date(newTimestamp).toLocaleString()}`);

  state.timestamp = newTimestamp;

  const stateStr = JSON.stringify(state, null, 2);
  const statePath = path.resolve(__dirname + '/state.json');
  fs.writeFileSync(statePath, Buffer.from(stateStr, 'utf8'));
}

exports.getState = async () => {
  await initialize();
  return state;
}