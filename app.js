import { CronJob } from "cron";
import { getGames } from "epic-free-games";
import { TwitterApi } from "twitter-api-v2";
import { IgApiClient } from "instagram-private-api";
import { readFile } from "fs";
import { promisify } from "util";
import dotenv from "dotenv";
import { encode, decode } from "node-base64-image";
import fs from "fs";

dotenv.config();

// Fetch Today's Date
let today = new Date().toLocaleDateString("en-us", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

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
async function tweetNow() {



  const tweet = async () => {
    try {
      const mediaId = await client.v1.uploadMedia(
        `https://cdn1.epicgames.com/spt-assets/8ae16e8a55fa4f3897fa726a90dbd750/download-shop-titans-offer-1mnbg.jpg`
      );
      await freetoclaim.v2.tweet(
        `🌤 Free on Epic Games today\n📅 ${today}\n \n🌟 Support-A-Creator code: Pri #EpicPartner`,
        {
          media: { media_ids: [mediaId] },
        }
      );
      console.log("Tweeted.");
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
  purgegameDataFiles()
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
    })
    .catch((err) => {
      console.log("Error while fetching current games.");
    });
}

async function fetchUpcomingGames() {
  purgegameDataFiles()
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

  let stream = fs.createWriteStream(`public/${status}/gameData.txt` , {'flags': 'a'});
    stream.once("open", function (fd) {
    stream.write(`${gameName}\n`);
  });

  // writing to file named 'example.jpg'
  const image = await encode(imageURL, options);
  await decode(image, { fname: `./public/${status}/${gameName}`, ext: "jpg" });
}


async function purgegameDataFiles() {
fs.unlink('public/upcoming/gameData.txt', function(err) {
  if(err && err.code == 'ENOENT') {
      // console.info("public/upcoming/gameData.txt not found found");
  } else if (err) {
      console.error("Error occurred while trying to remove file");
  } else {
      // console.info(`Purged files.`);
  }
});

fs.unlink('public/current/gameData.txt', function(err) {
  if(err && err.code == 'ENOENT') {
      // console.info("public/current/gameData.txt not found");
  } else if (err) {
      console.error("Error occurred while trying to remove file");
  } else {
      // console.info(`Purged files.`);
  }
});
}


// let text = fs.readFileSync('public/current/gameData.txt','utf8')
// console.log (text)



// await fetchCurrentGames();
// await fetchUpcomingGames();



// Run every day at 00:03
// let socialPost = new CronJob(
//     "03 00 * * *",
//     async function () {
//       tweetNow();
//       instagramPost();
//     },
//     true
//   );
