import { CronJob } from "cron";
import { getGames } from "epic-free-games";
import { TwitterApi } from "twitter-api-v2";
import dotenv from "dotenv";
import { encode, decode } from "node-base64-image";
import fs from "fs";
import { globby } from "globby";

dotenv.config();



    // Fetch Today's Date
    var tempToday = new Date().toLocaleDateString("en-us", {
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });


    console.log(tempToday);


// Twitter client
const client = new TwitterApi({
  appKey: process.env.CONSUMER_KEY,
  appSecret: process.env.CONSUMER_SECRET,
  accessToken: process.env.ACCESS_TOKEN,
  accessSecret: process.env.ACCESS_TOKEN_SECRET,
});

const freetoclaim = client.readWrite;

async function tweetNow(status, firstLine, from, until) {

    // Fetch Today's Date
    var today = new Date().toLocaleDateString("en-us", {
      month: "long",
      day: "numeric",
    });

  
    Date.prototype.addDays = function (days) {
      let date = new Date(this.valueOf());
      date.setDate(date.getDate() + days);
      return date;
    };
  
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
  

if ( status == 'current'){
  from = today
  until = nextWeek
}

if ( status == 'upcoming'){
  from = nextWeek
  until = nextNextWeek
}

const gameNames = fs.readFileSync(`public/${status}/gameData.txt`, "utf8");
const imagePaths = await globby([`public/${status}/*.jpg`]);

if (imagePaths.length > 0) {
  const tweet = async () => {
    try {
      let twitterMediaIDs = [];
      for (var i = 0; i < imagePaths.length; i++) {
        let mediaId = await client.v1.uploadMedia(imagePaths[i]);
        twitterMediaIDs.push(mediaId);
      }

      await freetoclaim.v2.tweet(
        `Free on Epic Games Store ${firstLine}\n${from} - ${until} (8:30 PM IST)\n\n${gameNames}\n\nUse code pri on the epic games store #ad`,
        {
          media: { media_ids: twitterMediaIDs },
        }
      );
      console.log(`Tweeted ${status} games`);
    } catch (e) {
      console.log(e);
    }
  };
  tweet();
} else {const tweet = async () => {
  try {
    await freetoclaim.v2.tweet(
      `OH S***, ERROR OR NO GAMES THIS WEEK\n\nSomeone tell Priyam AAAAAAAAAAAAAA`,
    );
    console.log(`Tweeted the error`);
  } catch (e) {
    console.log(e);
  }
};
tweet();
}
}


async function fetchCurrentGames() {
  await purgegameDataFiles("current");
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
      console.log("Fetched current games.");
    })
    .catch((err) => {
      console.log("Error while fetching current games");
    });
}

async function fetchUpcomingGames() {
  await purgegameDataFiles("upcoming");
  getGames("US", true)
    .then((res) => {
      let nextGames = res.nextGames;

      if (nextGames.length === 0) {
        let stream = fs.createWriteStream(`public/upcoming/gameData.txt`, {
          flags: "a",
        });
        stream.once("open", function (fd) {
          stream.write(`OH S***, ERROR OR NO GAMES THIS WEEK\nAAAAAAAAAAA`);
        });
      }

      for (var i = 0; i < nextGames.length; i++) {
        let gameImage = nextGames[i].keyImages[1].url;
        let gameString = nextGames[i].title;
        let numberOfGames = i + 1;
        let status = "upcoming";
        saveImage(gameImage, gameString, status, numberOfGames);
      }
      console.log("Fetched upcoming games");
    })
    .catch((err) => {
      console.log(err);
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
  fs.rm(`public/${folder}`, { recursive: true }, 
  function (err) {
    if (err && err.code == "ENOENT") {
      console.info(`public/${folder} not found`);
    } else if (err) {
      console.error("Error occurred while trying to remove file");
    } else {
      console.info(`Purged ${folder} files`);
    }
  });
}

// Set 3 second delay (For compressions and resizes.)
function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Run every week on Thursdays at 15:00:30 UTC 
let postCurrentGames = new CronJob(
  "10 30 20 * * 4",
  async function () {
    await fetchCurrentGames();
    await timeout(3000);
    await tweetNow("current", "today");
    console.log("Posted current games automatically");
  },
  true
);


// Run every week on Thursdays at 15:00:15 UTC 
let postUpcomingGames = new CronJob(
  "30 30 20 * * 4",
  async function () {
    await fetchUpcomingGames();
    await timeout(3000);
    await tweetNow("upcoming", "next week");
    console.log("Posted upcoming games automatically");
  },
  true
);


await fetchCurrentGames();
await fetchUpcomingGames();

postCurrentGames.start();
postUpcomingGames.start();

await timeout(3000);
console.log("Cron jobs have begun.");
