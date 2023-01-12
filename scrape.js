// code copied from state.js, but instead of query via google API, we obtain id by scraping given url

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { delay } = require('./util/delay');

let init = false;
let state = {};

const initialize = async () => {
  if (init) return;
  init = true;

  const youtubersData = [];

  const TIME_INTERVAL = 1 * 60 * 60 * 1000;
  let timestamp = Date.now() - TIME_INTERVAL; // set the default timestamp if there's no current timestamp in state.json

  // 1. Get list of youtubers.txt

  const youtubersPath = path.resolve(__dirname + '/data/youtubers.txt');
  const youtubersList = fs.readFileSync(youtubersPath);
  const youtubersTxt = youtubersList.toString().trim().split('\n');

  try {
    state = require('./data/state.json');
    if (state.timestamp) timestamp = state.timestamp;
  } catch (err) {
    console.log("state.json doesn't exist/invalid/outdated, start populating...");
  }

  if (!state.youtubers) state.youtubers = [];
  
  // 2. Loop youtuber keywords
  for (const urlRaw of youtubersTxt) {
    const url = urlRaw.trim().split(/\s+/)[0]; // only get the first part, ignore any spacing onwards
    if (url.length === 0) continue;

    // use existing data if exist
    const found = state.youtubers.find((youtuber) => youtuber.url == url);
    if (found && found.playlistId) {
      youtubersData.push(found);
      continue;
    }

    console.log(`\nGetting channelId from ${url}`);

    // get ChannelId by Username, get playlistId from ChannelId
    const response = await axios.get(url);
    await delay(500);

    const scrape = response.data.match(/meta itemprop="channelId" content="UC[-\w]{22}"/);
    if (!scrape || scrape.length === 0) {
      throw new Error('Unable to find channelId metadata in page: ' + url);
    }
    const id = scrape[0].substr(37, 22);
    const channelId = 'UC' + id;
    const playlistId = 'UU' + id;

    const scrape2 = response.data.match(/meta itemprop="name" content="[^"]*"/);
    if (!scrape2 || scrape2.length === 0) {
      throw new Error('Unable to find name metadata in page: ' + url);
    }
    const channelTitle = scrape2[0].substr(30, scrape2[0].length - 31);

    const data = {
      channelTitle,
      url,
      channelId,
      playlistId,
    }

    console.log(JSON.stringify(data, null, 2));
    youtubersData.push(data);
  }

  // 3. Save state into file

  state = { timestamp, youtubers: youtubersData };
  const stateStr = JSON.stringify(state, null, 2);
  const statePath = path.resolve(__dirname + '/data/state.json');
  fs.writeFileSync(statePath, Buffer.from(stateStr, 'utf8'));
}

exports.save = async (newTimestamp, youtubers) => {
  await initialize();

  console.log(`save state. timestamp: ${newTimestamp} | ${new Date(newTimestamp).toLocaleString()}`);

  state.timestamp = newTimestamp;
  state.youtubers = youtubers;

  const stateStr = JSON.stringify(state, null, 2);
  const statePath = path.resolve(__dirname + '/data/state.json');
  fs.writeFileSync(statePath, Buffer.from(stateStr, 'utf8'));
}

/*
exports.saveTimestamp = async (newTimestamp) => {
  await initialize();

  console.log(`save new timestamp: ${newTimestamp} | ${new Date(newTimestamp).toLocaleString()}`);

  state.timestamp = newTimestamp;

  const stateStr = JSON.stringify(state, null, 2);
  const statePath = path.resolve(__dirname + '/data/state.json');
  fs.writeFileSync(statePath, Buffer.from(stateStr, 'utf8'));
}
*/

exports.getState = async () => {
  await initialize();
  return state;
}