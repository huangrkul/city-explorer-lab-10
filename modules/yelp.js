const client = require('./client.js');
const superagent = require('superagent');

function handleYelp(request, response) {
  const locationObj = request.query.data;
  const url = `https://api.yelp.com/v3/businesses/search?location=${locationObj.search_query}`;
  superagent.get(url)
    .set('Authorization', `Bearer ${process.env.YELP_API_KEY}`)
    .then(resultsFromSuperagent => {
      let yelpArr = resultsFromSuperagent.body.businesses.map(prop => {
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
  this.name = obj.name;
  this.image_url = obj.image_url;
  this.price = obj.price;
  this.rating = obj.rating;
  this.url = obj.url;
}

module.exports = handleYelp;
