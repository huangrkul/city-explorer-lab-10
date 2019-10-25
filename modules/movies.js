const client = require('./client.js');
const superagent = require('superagent');

function handleMovies(request, response) {
  const locationObj = request.query.data;
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.MOVIEDB_API_KEY}&query=${locationObj.search_query}`
  superagent.get(url)
    .then(resultsFromSuperagent => {
      let movieArr = resultsFromSuperagent.body.results.map(prop => {
        return new Movie(prop);
      })
      response.status(200).send(movieArr);
    })
    .catch(error => {
      console.error(error);
      response.send(error).status(500);
    });
}

function Movie(obj) {
  this.title = obj.title;
  this.overview = obj.overview;
  this.average_votes = obj.vote_average;
  this.total_votes = obj.vote_count;
  this.image_url = `https://image.tmdb.org/t/p/w500/${obj.poster_path}`;
  this.popularity = obj.popularity;
  this.released_on = obj.release_date;
}

module.exports = handleMovies;