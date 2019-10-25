const client = require('./client.js');
const superagent = require('superagent');

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

module.exports = handleWeather;
