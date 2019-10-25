const client = require('./client.js');
const superagent = require('superagent');

function handleTrails(request, response) {
  const locationObj = request.query.data;

  const url = `https://www.hikingproject.com/data/get-trails?lat=${locationObj.latitude}&lon=${locationObj.longitude}&key=${process.env.TRAILS_API_KEY}`;

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

module.exports = handleTrails;
