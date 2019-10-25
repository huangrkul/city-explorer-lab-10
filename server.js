'use strict';

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const superagent = require('superagent');
const pg = require('pg');

app.use(cors());

const PORT = process.env.PORT || 3003;
const client = new pg.Client(process.env.DATABASE_URL);
client.on('error', err => { throw err; });

//routes:
app.get('/location', handleLocation);
app.get('/weather', handleWeather);
app.get('/trails', handleTrails);
app.get('/yelp', handleYelp);
app.get('*', handleError);


//cached data:
let storedUrls = {};


function handleLocation(request, response) {
  const location = request.query.data;

  //query db to see if location is in the table:
  client.query('SELECT search_query FROM geocode WHERE search_query=$1', [location])
    .then(results => {

      //if it's not, make the api call and add the data to the table:
      if (results.rowCount === 0) {

        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${location}&key=${process.env.GEOCODE_API_KEY}`;

        console.log('making the api call to geocode');
        superagent.get(url)
          .then(resultsFromSuperagent => {
            const locationObject = new Location(location, resultsFromSuperagent.body.results[0]);
            let geoDataResults = resultsFromSuperagent.body.results[0];
            let SQL = 'INSERT INTO geocode (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4) RETURNING *';
            let safeValues = [location, geoDataResults.formatted_address, geoDataResults.geometry.location.lat, geoDataResults.geometry.location.lng];

            client.query(SQL, safeValues);
            response.status(200).send(locationObject);
          })
          .catch(error => {
            console.error(error);
          });
      } else {
        //else, if it is, use the data from the db
        let SQL = 'SELECT * FROM geocode WHERE search_query=$1';
        client.query(SQL, [location])
          .then(results => {
            let locationObj = results.rows[0];
            response.status(200).send(locationObj);
          })
          .catch(error => {
            console.error(error);
          });
      }
    })
    .catch((error) => {
      console.error(error);
      response.status(500).send('server error.');
    });
}

function Location(location, geoData) {
  this.search_query = location;
  this.formatted_query = geoData.formatted_address;
  this.latitude = geoData.geometry.location.lat;
  this.longitude = geoData.geometry.location.lng;
}


function handleWeather(request, response) {
  const locationObj = request.query.data;

  const url = `https://api.darksky.net/forecast/${process.env.DARKSKY_API_KEY}/${locationObj.latitude},${locationObj.longitude}`;

  console.log('making the api call to darksky');
  superagent.get(url)
    .then(resultsFromSuperagent => {
      let daysOfWeather = resultsFromSuperagent.body.daily.data;
      //console.log(daysOfWeather);
      let weatherArray = daysOfWeather.map(day => {
        return new Weather(day);
      });

      console.log('done calling the darksky API');
      response.status(200).send(weatherArray);
    })
    .catch((error) => {
      console.error(error);
      response.status(500).send('server error.');
    });

}

function Weather(day) {
  this.forecast = day.summary;
  this.time = new Date(day.time * 1000).toDateString();
}


function handleTrails(request, response) {
  const locationObj = request.query.data;
  //console.log(`trail: ${trail}`);
  const url = `https://www.hikingproject.com/data/get-trails?lat=${locationObj.latitude}&lon=${locationObj.longitude}&key=${process.env.TRAILS_API_KEY}`;

  // console.log('using cached url', storedUrls[url]);
  response.send(storedUrls[url]);
  console.log('making the api call to trails');
  superagent.get(url)
    .then(resultsFromSuperagent => {
      let trailsArr = resultsFromSuperagent.body.trails.map(prop => {
        return new Trail(prop);
      })
      //storedUrls[url] = trailsArr;
      response.status(200).send(trailsArr);
    })
    .catch((error) => {
      console.error(error);
      response.status(500).send('server error.');
    });
}

function Trail(obj) {
  this.name = obj.name;
  this.location = obj.location;
  this.length = obj.length;
  this.stars = obj.stars;
  this.star_votes = obj.star_votes;
  this.summary = obj.summary;
  this.trail_url = obj.trail_url;
  this.conditions = obj.conditionStatus;
  //API returns a full string but the front end requires that string to be split up:
  this.condition_date = obj.conditionDate.split(' ')[0];
  this.condition_time = obj.conditionDate.split(' ')[1];
}

function handleYelp() {
  const locationObj = request.query.data;
  const url = `https://api.yelp.com/v3/businesses/search?location=${locationObj.search_query}`;
  superagent.get(url)
  .set('Authorization', Bearer ${process.env.YELP_API_KEY})
  .then(resultsFromSuperagent => {
    let yelpArr = resultsFromSuperagent.body.businesses[0].map(prop => {
      return new Yelp(prop);
    })
    response.status(200).send(yelpArr);
  })
  .catch(error => {
    console.error(error);
    response.send(error).status(500);
  });
}

function Yelp(obj) {
    // "name": "Pike Place Chowder",
    // "image_url": "https://s3-media3.fl.yelpcdn.com/bphoto/ijju-wYoRAxWjHPTCxyQGQ/o.jpg",
    // "price": "$$   ",
    // "rating": "4.5",
    // "url": "https://www.yelp.com/biz/pike-place-chowder-seattle?adjust_creative=uK0rfzqjBmWNj6-d3ujNVA&utm_campaign=yelp_api_v3&utm_medium=api_v3_business_search&utm_source=uK0rfzqjBmWNj6-d3ujNVA"
    this.name = obj.businesses[0].name;
    this.image_url = obj.businesses[0].image_url;
    this.price = obj.businesses[0].price;
    this.rating = obj.businesses[0].rating;
    this.url = obj.businesses[0].url;
}

function handleError(request, response) {
  response.status(404).send('Server connection problem');
}

client.connect()
  .then(() => {
    console.log('connected to db');
    app.listen(PORT, () => console.log(`app is listening on ${PORT}`));
  })
  .catch(err => {
    throw `PG Startup Error: ${err.message}`;
  })
