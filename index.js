// This code is pretty messy, it was not set up with modularity in mind and could be destructed some day.

const Discord = require("discord.js");
const Pagination = require("discord-paginationembed");
const bot = new Discord.Client(); // This creates a variable called bot from the Client class in the Discord variable
require('dotenv').config()
const TOKEN = process.env.TOKEN;

const db = require("./database.js");

bot.login(TOKEN); // This logs in your bot using its token

bot.on("ready", () => {
  bot.user.setPresence({
    status: "idle",
    activity: {
      name: "for lost animals. Ping me to help!",
      type: "WATCHING",
    },
  });
  console.log(`Logged in as ${bot.user.tag}!`);
});

function blinkStatus(name) {
  bot.user.setPresence({
    status: "online",
    activity: {
      name: "with " + name,
      type: "PLAYING",
    },
  });
  setTimeout(() => {
    bot.user.setPresence({
      status: "idle",
      activity: {
        name: "for lost animals. Ping me to help!",
        type: "WATCHING",
      },
    });
  }, 3000);
}

bot.on("message", (msg) => {
  const words = msg.content.toLowerCase().split(" ");

  if (
    msg.content.toLowerCase().startsWith("zoo help") ||
    msg.content.toLowerCase().startsWith("zoo guide") ||
    msg.content.startsWith("<@!821150624212451338>")
  ) {
    const commandsEmbed = new Discord.MessageEmbed()
      .setColor("#6cc979")
      .setTitle("Commands")
      .setTimestamp()
      .setFooter("Requested by " + msg.author.username, msg.author.avatarURL());

    const rules = [
      [
        "`search for a {species}`\nor  `zoo find {species}`",
        "try to find *{species}* with a chance of success",
      ],
      [
        "`zoo animals`",
        "list the known lost species and how many have been found",
      ],
      ["`zoo leaderboard`", "who found how many animals"],
      ["`zoo (my || @person) animals`", "your own animals"],
      ["`zoo code`", "source code of Casual Zoo"],
      ["`zoo help`", "this helpful message"],
    ];

    rules.forEach((rule) => {
      commandsEmbed.addField(rule[0], rule[1]);
    });

    msg.channel.send(
      "I need your help! At night the zoo animals escaped and are now running around town. Can you help bring them back to the zoo?",
      commandsEmbed
    );
    blinkStatus(msg.author.username);
  } else if (msg.content.toLowerCase().startsWith("zoo animals")) {
    db.animal.all("select * from animal", [], (err, animals) => {
      if (err) throw err;

      animals.sort((a, b) => (a.found < b.found ? 1 : -1));
      chunk(animals, 24, (chunks) => {
        let totalFound = 0;
        let knownSpecies = 0;
        const embeds = [];

        chunks.forEach((chunk, index) => {
          embeds[index] = new Discord.MessageEmbed();

          chunk.forEach((animal) => {
            const emoji = animal.emoji;
            if (animal.found > 0) {
              embeds[index].addField(
                `:${emoji}:   ${capitalize(animal.name)}`,
                `${animal.found} found`,
                true
              );
              totalFound = totalFound + animal.found;
              knownSpecies++;
            } else {
              embeds[index].addField(
                `:black_large_square:   Unknown`,
                `??? found`,
                true
              );
            }
          });

          const reminder = chunk.length % 3;
          if (reminder > 0 && reminder < 3) {
            for (let i = reminder * -1 + 3; i > 0; i--) {
              embeds[index].addField("\u200B", "\u200B", true);
            }
          }
        });

        const unknownSpecies = animals.length - knownSpecies;

        msg.channel.send(
          `**${knownSpecies}** known species\n**${unknownSpecies}** undiscovered species\n**${totalFound}** animals found`
        );
        new Pagination.Embeds()
          .setArray(embeds)
          .setChannel(msg.channel)
          .setPageIndicator(true)
          .setDisabledNavigationEmojis(["jump", "delete"])
          .setTitle("Animals")
          .setFooter(
            "Requested by " + msg.author.username,
            msg.author.avatarURL()
          )
          // Methods below are for customising all embeds
          .setTimestamp()
          .setColor("#6cc979")
          .build();
      });
    });

    blinkStatus(msg.author.username);
  } else if (
    ((words[0] == "search" || words[0] == "look") &&
      words[1] == "for" &&
      (words[2] == "a" || words[2] == "an")) ||
    (words[0] == "zoo" && words[1] == "find")
    || (words[0] == "search" && words[1] == "for")
  ) {
    const query = (words[1] == "find" || words[1] == "for") ? words[2] : words[3];
    db.animal.all(
      "select * from animal where name = ?",
      [query],
      (err, row) => {
        if (err) throw err;
        const animal = row[0];
        if (animal) {
          animal.found++;
          const animal_image =
            "https://loremflickr.com/320/240/" +
            animal.url +
            "?" +
            Math.random().toString(36).substring(7);
          const animalEmbed = new Discord.MessageEmbed()
            .setColor("#6cc979")
            .setTitle(capitalize(animal.name))
            .setTimestamp()
            .setFooter(
              "Caught by " + msg.author.username,
              msg.author.avatarURL()
            )
            .setImage(animal_image);
          db.user.all(
            "select * from user where user_id = ?",
            [msg.author.id],
            (err, rows) => {
              if (err) throw err;
              if (rows[0]) {
                const user = rows[0];
                const found = JSON.parse(rows[0].found);
                found[animal.name] =
                  found[animal.name] != undefined ? found[animal.name] + 1 : 1;
                var update = "UPDATE user SET found = ? WHERE user_id = ?";
                db.user.run(update, [JSON.stringify(found), msg.author.id]);
                let count;
                switch (found[animal.name]) {
                  case 1:
                    count = found[animal.name] + "st";
                    break;
                  case 2:
                    count = found[animal.name] + "nd";
                    break;
                  case 3:
                    count = found[animal.name] + "rd";
                    break;
                  default:
                    count = found[animal.name] + "th";
                }
                msg.channel.send(
                  `You discovered a stray ${animal.name} and caught it!` + ((animal.found > 1) ? `\nThis is your ${count} ${animal.name}.` : `\n**This is the very first ${animal.name} to be found.**`) + ` :${animal.emoji}:`,
                  animalEmbed
                );
              } else {
                const found = {};
                found[animal.name] = 1;
                var insert =
                  "INSERT INTO user (user_id, username, found) VALUES (?,?,?)";
                db.user.run(insert, [
                  msg.author.id,
                  msg.author.tag,
                  JSON.stringify(found),
                ]);
                msg.channel.send(
                  `You found a wandering ${animal.name}. Congrats! You got your first animal! :${animal.emoji}:`,
                  animalEmbed
                );
              }

              var update = "UPDATE animal SET found = ? WHERE name = ?";
              db.animal.run(update, [animal.found, animal.name]);
            }
          );
        } else {
          msg.channel.send(
            `I don't think there was a **${query}** at the zoo...`
          );
        }
      }
    );
    blinkStatus(msg.author.username);
  } else if (words[0] == "zoo" && words[2] == "animals") {
    const selectedUserID =
      words[1] == "my" || words[1] == "own"
        ? msg.author.id
        : words[1].substring(3, 21);
    db.user.all(
      "select * from user where user_id = ?",
      [selectedUserID],
      (err, rows) => {
        if (err) throw err;
        if (!rows[0]) {
          msg.channel.send(
            `Uh oh! Looks like ${words[1]} hasn't found any animals. Try finding a panda with \`search for a panda\``,
            { allowedMentions: { users: [] } }
          );
        } else {
          const user_found = JSON.parse(rows[0].found);
          db.animal.all("select * from animal", [], (err, animals) => {
            if (err) throw err;
            animals.sort((a, b) => {
              if (user_found[a.name] == undefined) {
                return 1;
              } else if (user_found[b.name] == undefined) {
                return -1;
              } else if (user_found[a.name] < user_found[b.name]) {
                return 1;
              } else {
                return -1;
              }
            });

            chunk(animals, 24, (chunks) => {
              let totalFound = 0;
              let knownSpecies = 0;
              const embeds = [];

              chunks.forEach((chunk, index) => {
                embeds[index] = new Discord.MessageEmbed();

                chunk.forEach((animal) => {
                  const emoji = animal.emoji;
                  const found_animal = user_found[animal.name]
                  if (found_animal > 0) {
                    embeds[index].addField(
                      `:${emoji}:   ${capitalize(animal.name)}`,
                      `${animal.found} found`,
                      true
                    );
                    totalFound = totalFound + found_animal;
                    knownSpecies++;
                  } else {
                    embeds[index].addField(
                      `:black_large_square:   Unknown`,
                      `??? found`,
                      true
                    );
                  }
                });

                const reminder = chunk.length % 3;
                if (reminder > 0 && reminder < 3) {
                  for (let i = reminder * -1 + 3; i > 0; i--) {
                    embeds[index].addField("\u200B", "\u200B", true);
                  }
                }
              });

              msg.channel.send(
                `${rows[0].username} has discovered **${knownSpecies}**/${animals.length - knownSpecies} species and found **${totalFound}** animals.`
              );

              new Pagination.Embeds()
                .setArray(embeds)
                .setChannel(msg.channel)
                .setPageIndicator(true)
                .setDisabledNavigationEmojis(["jump", "delete"])
                .setTitle(`${rows[0].username}'s Animals`)
                .setFooter(
                  "Requested by " + msg.author.username,
                  msg.author.avatarURL()
                )
                // Methods below are for customising all embeds
                .setTimestamp()
                .setColor("#6cc979")
                .build();
            });
          });
        }
      }
    );
    blinkStatus(msg.author.username);
  } else if (
    words[0] == "zoo" &&
    (words[1] == "rank" || words[1] == "leaderboard" || words[1] == "lb")
  ) {
    db.user.all("select * from user", [], (err, rows) => {
      if (err) throw err;
      if (!rows[0]) {
        msg.channel.send(
          "Uh oh! Looks no animals have been found. Try finding a lizard with `search for a lizard`"
        );
      } else {
        const listEmbed = new Discord.MessageEmbed()
          .setColor("#6cc979")
          .setTitle("Leaderboard")
          .setTimestamp()
          .setFooter(
            "Requested by " + msg.author.username,
            msg.author.avatarURL()
          );

        let users = [];
        rows.forEach((row) => {
          found = JSON.parse(row.found);
          row.species_found = Object.keys(found).length;
          row.total_found = Object.values(found).reduce((a, b) => a + b, 0);
          users.push(row);
        });

        let rank = -1;
        users.sort((a, b) => (a.total_found < b.total_found ? 1 : -1));
        users.forEach((user, index) => {
          listEmbed.addField(
            `${user.username}`,
            `${user.total_found} animals (${user.species_found} species)`
          );
          if (rank == -1 && user.username == msg.author.tag) {
            rank = index + 1;
          }
        });

        let place = "";
        switch (rank) {
          case 1:
            place = rank + "st";
            break;
          case 2:
            place = rank + "nd";
            break;
          case 3:
            place = rank + "rd";
            break;
          default:
            place = rank + "th";
        }

        msg.channel.send(`You are in ${place} place.`, listEmbed);
      }
    });
    blinkStatus(msg.author.username);
  }  else if (
    words[0] == "zoo" &&
    (words[1] == "source" || words[1] == "code" || words[1] == "author")
  ) {
    msg.channel.send('Casual Zoo is licensed under the MIT license and its source code can be found here:\nhttps://github.com/venashial/Casual-Zoo');
    blinkStatus(msg.author.username);
  }
});

const capitalize = (s) => {
  if (typeof s !== "string") return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

function chunk(arr, len, callback) {
  var chunks = [],
    i = 0,
    n = arr.length;

  while (i < n) {
    chunks.push(arr.slice(i, (i += len)));
  }

  callback(chunks);
}
