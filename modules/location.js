const client = require('./client.js');
const superagent = require('superagent');

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

module.exports = handleLocation;
