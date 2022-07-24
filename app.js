import { CronJob } from "cron";
import { getGames } from "epic-free-games";
import { TwitterApi } from "twitter-api-v2";
import { IgApiClient } from "instagram-private-api";
import { readFile } from "fs";
import { promisify } from "util";
import dotenv from "dotenv";
import { encode, decode } from "node-base64-image";
import fs from "fs";
import { globby } from "globby";

dotenv.config();

// Fetch Today's Date
var today = new Date().toLocaleDateString("en-us", {
  month: "long",
  day: "numeric",
});

Date.prototype.addDays = function(days) {
  let date = new Date(this.valueOf());
  date.setDate(date.getDate() + days);
  return date;
}

let nextWeek = new Date();
nextWeek = nextWeek.addDays(7).toLocaleDateString("en-us", {
  month: "long",
  day: "numeric",
});

let nextNextWeek = new Date();
nextNextWeek = nextNextWeek.addDays(14).toLocaleDateString("en-us", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

console.log("Next week:", nextNextWeek);

const readFileAsync = promisify(readFile);
console.log("Today is:", today);

// Instagram client
const { username, password } = process.env;
const ig = new IgApiClient();

// Twitter client
const client = new TwitterApi({
  appKey: process.env.CONSUMER_KEY,
  appSecret: process.env.CONSUMER_SECRET,
  accessToken: process.env.ACCESS_TOKEN,
  accessSecret: process.env.ACCESS_TOKEN_SECRET,
});

const freetoclaim = client.readWrite;


async function tweetNow(status, firstLine, from, until) {
  const gameNames = fs.readFileSync(`public/${status}/gameData.txt`, "utf8");
  const imagePaths = await globby([`public/${status}/*.jpg`]);
  // console.log(gameNames);
  // console.log(imagePaths);

  const tweet = async () => {
    try {

      let randAd = [];

      for (var i = 0; i < imagePaths.length; i++) {
        let mediaId = await client.v1.uploadMedia(imagePaths[i]);
        randAd.push(mediaId);
      }
    
      await freetoclaim.v2.tweet(
        `🌟 Free on Epic Games Store ${firstLine}\n⏰ ${from} - ${until} (8:30 PM IST)\n\n${gameNames}\n\nUse code pri on the epic games store #ad`,
        {
          media: { media_ids: randAd},
        }
      );
      console.log(`Tweeted ${status}`);
    } catch (e) {
      console.log(e);
    }
  };
  tweet();
}

// async function instagramPost() {
//   try {
//     ig.state.generateDevice(username);
//     // await ig.simulate.preLoginFlow();
//     const user = await ig.account.login(username, password)
//     const path = "public/itemshop-square.jpg";
//     const published = await ig.publish.photo({
//       file: await readFileAsync(path),
//       caption: `Today's Item Shop on Fortnite.\n📅 | ${today}\n🌟 | Support-A-Creator: Pri (#EpicPartner)
//       \n➖➖➖➖➖➖➖➖➖➖➖➖\n
//       📺 Follow @freetoclaim for daily Fortnite updates!

//       ➖➖➖➖➖➖➖➖➖➖➖➖\n\n\n#freetoclaim #fortniteitemshop #fortnitelive #fortniteps5 #fortnitenews #fortnitepc #fortnitepictures #timenite #fortniteclips #fortniteteam #fortnitecombos #fortnite #fortniteleaks #fortnitebr #fortnitecommunity #fortnitememes`,
//     });
//     console.log("And now posted to Instagram");
//   } catch (error) {
//     console.log(error);
//   }
// }

async function fetchCurrentGames() {
  purgegameDataFiles('current');
  getGames("US", true)
    .then((res) => {
      let currentGames = res.currentGames;
      for (var i = 0; i < currentGames.length; i++) {
        let gameImage = currentGames[i].keyImages[1].url;
        let gameString = currentGames[i].title;
        let numberOfGames = i + 1;
        let status = "current";
        saveImage(gameImage, gameString, status, numberOfGames);
      }
      console.log('\n\nFetched current games.');
    })
    .catch((err) => {
      console.log("Error while fetching current games.");
    });
}

async function fetchUpcomingGames() {
  purgegameDataFiles('upcoming');
  getGames("US", true)
    .then((res) => {
      let upcomingGames = res.nextGames;
      for (var i = 0; i < upcomingGames.length; i++) {
        let gameImage = upcomingGames[i].keyImages[1].url;
        let gameString = upcomingGames[i].title;
        let numberOfGames = i + 1;
        let status = "upcoming";
        saveImage(gameImage, gameString, status, numberOfGames);
      }
      console.log('Fetched upcoming games.\n\n');
    })
    .catch((err) => {
      console.log("Error while fetching upcoming games.");
    });
}

async function saveImage(imageURL, gameName, status, noOfGames) {
  const options = {
    string: true,
  };

  if (!fs.existsSync("public")) {
    fs.mkdirSync("public");
  }

  if (!fs.existsSync("public/current")) {
    fs.mkdirSync("public/current");
  }

  if (!fs.existsSync("public/upcoming")) {
    fs.mkdirSync("public/upcoming");
  }

  let stream = fs.createWriteStream(`public/${status}/gameData.txt`, {
    flags: "a",
  });
  stream.once("open", function (fd) {
    stream.write(`- ${gameName}\n`);
  });

  // writing to file named 'example.jpg'
  const image = await encode(imageURL, options);
  await decode(image, { fname: `./public/${status}/${gameName}`, ext: "jpg" });
}

async function purgegameDataFiles(folder) {
  fs.unlink(`public/${folder}/gameData.txt`, function (err) {
    if (err && err.code == "ENOENT") {
      // console.info("public/upcoming/gameData.txt not found found");
    } else if (err) {
      console.error("Error occurred while trying to remove file");
    } else {
      // console.info(`Purged files.`);
    }
  });
}

// Set 3 second delay (For compressions and resizes.)
function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


// Run every week on Thursdays at 8:30 PM IST
let postCurrentGames = new CronJob(
  "0 15 * * 4",
  async function () {
  await fetchCurrentGames();
  await timeout(10000);
  await tweetNow("current", "today", today, nextWeek);
  console.log('Posted current games.');
  },
  true
);


// Run every week on Thursdays at 8:00 PM IST
let postUpcomingGames = new CronJob(
  "30 14 * * 4",
  async function () {
  await timeout(3000);
  await fetchUpcomingGames();
  await timeout(10000);
  await tweetNow("upcoming", "next week", nextWeek, nextNextWeek);
  console.log('Posted upcoming games automatically');
},
  true
);

await fetchCurrentGames();
await fetchUpcomingGames();

postCurrentGames.start();
postUpcomingGames.start();

await timeout(3000);
console.log('Cron jobs have begun.');
