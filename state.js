const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { delay } = require('./util/delay');

const { GOOGLE_API_KEY = '' } = process.env;

exports.saveTimestamp = async (newTimestamp) => {
  console.log(`save new timestamp: ${newTimestamp}`);

  const state = require('./state.json');
  state.timestamp = newTimestamp;

  const stateStr = JSON.stringify(state, null, 2);
  const statePath = path.resolve(__dirname + '/state.json');
  fs.writeFileSync(statePath, Buffer.from(stateStr, 'utf8'));

}

exports.getState = async () => {

  const youtubersData = [];

  const TIME_INTERVAL = 1 * 60 * 60 * 1000;
  let timestamp = Date.now() - TIME_INTERVAL; // set the default timestamp if there's no current timestamp in state.json

  // 1. Get list of youtubers

  const youtubersPath = path.resolve(__dirname + '/youtubers.txt');
  const youtubersList = fs.readFileSync(youtubersPath);
  const youtubers = youtubersList.toString().split('\n');

  try {
    const currentState = require('./state.json');
    timestamp == currentState.timestamp;
    if (youtubers.length === currentState.youtubers.length) {
      // return current state if state.json already populated (from youtubers.txt)
      return currentState;
    }
  } catch (err) {
    console.log("state.json doesn't exist/invalid/outdated, start populating...");
  }

  // 2. Loop youtubers

  for (const youtuber of youtubers) {

    let channelId = '';
    console.log(`processing ${youtuber}:`);

    // 2a. Get ChannelId by Username
    {
      const url = `https://www.googleapis.com/youtube/v3/search?part=id%2Csnippet&type=channel&q=${youtuber}&key=${GOOGLE_API_KEY}`;
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

  // 3. Save & return state

  const state = { timestamp, youtubers: youtubersData };
  const stateStr = JSON.stringify(state, null, 2);
  const statePath = path.resolve(__dirname + '/state.json');
  fs.writeFileSync(statePath, Buffer.from(stateStr, 'utf8'));

  return state;

}