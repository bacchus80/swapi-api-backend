const express = require("express");
const PORT = 8080;

const responseTime = require("response-time")
const redis = require("redis");
const axios = require("axios");

const BASE_URL = "https://swapi.py4e.com/api/";


const Server = async () => {
  const client = redis.createClient();
  client.on("error", (err) => console.log("\n\nRedis Client Error", err));
  await client.connect();
  console.log("Redis connected!")

  const app = express();
  app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header('Content-Type', 'application/json');
    responseTime();
    next();
  });

  // Fetch all movies
  app.get("/films", async (req, res) => {
    try {
      const id = req.params.id;
      const cacheFilms = await client.get("cacheFilms");
      if (cacheFilms) {
        return res.json(JSON.parse(cacheFilms))
      }

      const response = await axios.get(BASE_URL + "/films/")

      await client.set("cacheFilms" + id, JSON.stringify(response.data))

      return res.json(response.data);

    } catch (err) {
      return res.status(err.response)
        .json({ message: err.message })
    }
  })

  // Find movie characters/people
  app.get("/people", async (req, res) => {
    try {
      const page = parseInt(req.query["page"]);
      const cacheName = "cacheFindPeople" + page;
      const cacheFindPeople = await client.get(cacheName);
      if (cacheFindPeople) {
        return res.json(JSON.parse(cacheFindPeople))
      }
      const response = await axios.get(BASE_URL + "people/?page=" + page);

      await client.set(cacheName, JSON.stringify(response.data))
      return res.json(response.data)

    } catch (err) {
      return res.status(err.response)
        .json({ message: err.message })
    }
  })

  // Fetch one people, planet, species, starship or vehicle
  app.get(["/people/:id", "/planets/:id", "/species/:id", "/starships/:id", "/vehicles/:id"
  ], async (req, res) => {
    try {
      const id = req.params.id;
      const route = req.url.split("/")[1];
      const cacheName = "cache_" + route + id;

      const cacheRoute = await client.get(cacheName);
      if (cacheRoute) {
        return res.json(JSON.parse(cacheRoute))
      }

      const response = await axios.get(BASE_URL + "/" + route + "/" + id + "/")

      await client.set(cacheName, JSON.stringify(response.data))
      return res.json(response.data)

    } catch (err) {
      return res.status(err.response)
        .json({ message: err.message })
    }
  })

  app.listen(PORT, () => {
    console.log("server on port " + PORT)
  })

}

Server();
