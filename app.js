const express = require('express')
const expressHandlebars = require('express-handlebars')

const fs = require('fs')
const $rdf = require('rdflib')

//This function converts a runtime in seconds, to a date and time, and then finally to a runtime in the format H h:MM m
function toRuntime(seconds){
	var date = new Date(null)
	date.setSeconds(seconds)
	hour = date.toISOString().substr(12, 1)
	minutes = date.toISOString().substr(14, 2)
	return (hour.concat("h", " ", minutes, "m"))
}

function toReleaseYear(date){
	return date.substr(0, 4)
}

const turtleString = fs.readFileSync('resources.ttl').toString()

const store = $rdf.graph()

$rdf.parse(
	turtleString,
	store,
	"http://schema.org/Person",
	"text/turtle"
)

const userStringQuery = `
	SELECT
		?identifier
		?name
		?email
		?favoriteMovie
		?favoriteMovieTitle
		?favoriteMovieID
		?movieList
		?movieListTitle
	WHERE {
		?user a <http://schema.org/Person> .
		?user <http://schema.org/identifier> ?identifier .
		?user <http://schema.org/name> ?name .
		?user <http://schema.org/email> ?email .
		?user <http://cinemates/owl/resources#favoriteMovie> ?favoriteMovie .
		?favoriteMovie <http://schema.org/name> ?favoriteMovieTitle .
		?favoriteMovie <http://schema.org/identifier> ?favoriteMovieID .
		?user <http://cinemates/owl/resources#movieList> ?movieList .
		?movieList <http://schema.org/name> ?movieListTitle .
	}
`
const movieStringQuery = `
	SELECT
		?identifier
		?name
		?alternateName
	WHERE {
		?movie a <http://schema.org/Movie> .
		?movie <http://schema.org/identifier> ?identifier .
		?movie <http://schema.org/name> ?name .
		?movie <http://schema.org/alternateName> ?alternateName .
	}
`

const collectionStringQuery = `
	SELECT
		?creatorID
		?creatorName
		?movieList
		?movieListTitle
		?movie
		?movieTitle
		?movieID
	WHERE {
		?user a <http://schema.org/Person> .
		?user <http://schema.org/identifier> ?creatorID .
		?user <http://schema.org/name> ?creatorName .
		?user <http://cinemates/owl/resources#movieList> ?movieList .
		?movieList <http://schema.org/name> ?movieListTitle .
		?movieList <http://schema.org/hasPart> ?movie .
		?movie <http://schema.org/name> ?movieTitle .
		?movie <http://schema.org/identifier> ?movieID .
	}
`

const userQuery = $rdf.SPARQLToQuery(userStringQuery, false, store)
const movieQuery = $rdf.SPARQLToQuery(movieStringQuery, false, store)
const collectionQuery = $rdf.SPARQLToQuery(collectionStringQuery, false, store)

const users = store.querySync(userQuery).map(
	userResult => {
		console.log(userResult['?movieListTitle'].value);
		return {
			id: userResult['?identifier'].value,
			name: userResult['?name'].value,
			email: userResult['?email'].value,
			favoriteMovie: userResult['?favoriteMovieTitle'].value,
			favoriteMovieID: userResult['?favoriteMovieID'].value,
			movieList: userResult['?movieListTitle'].value
		}
	}
)
//console.log(users)

const moviesInList = store.querySync(collectionQuery).map(
	moviesInListResult => {
		return {
			movieList: moviesInListResult['?movieListTitle'].value,
			creatorID: moviesInListResult['?creatorID'].value,
			movieInListTitle: moviesInListResult['?movieTitle'].value,
			movieInListID: moviesInListResult['?movieID'].value,
			creatorName: moviesInListResult['?creatorName'].value,
			movieList: moviesInListResult['?movieListTitle'].value
		}
	}
)

//console.log(moviesInList)

const movies = store.querySync(movieQuery).map(
	movieResult => {
		return {
			id: movieResult['?identifier'].value,
			title: movieResult['?name'].value,
			label: movieResult['?alternateName'].value
		}
	}
)

const ParsingClient = require('sparql-http-client/ParsingClient')

const dbpClient = new ParsingClient({
	endpointUrl: 'https://dbpedia.org/sparql'
})

const wikidataClient = new ParsingClient({
	endpointUrl: 'https://query.wikidata.org/sparql'
})

for(const movie of movies){

	var actorList = [] 
	var genreList = []

	const dbpQuery = `
		SELECT
			?director
			?directorName
			?runtime
			?plot
			?topCast
			?actorName
		WHERE {
			?movie rdfs:label "${movie.label}"@en .
			?movie dbo:director ?director .
			?director rdfs:label ?directorName .
			?movie dbp:runtime ?runtime .
			?movie rdfs:comment ?plot .
			?movie dbo:starring ?topCast .
			?topCast rdfs:label ?actorName .
			FILTER(langMatches(lang(?plot), "EN") && langMatches(lang(?directorName), "EN") && langMatches(lang(?actorName), "EN")) .
		}
	`

	const wikidataQuery = `
	PREFIX q: <http://www.wikidata.org/prop/qualifier/>
	PREFIX s: <http://www.wikidata.org/prop/statement/>

	SELECT DISTINCT ?movie ?movieTitle ?movieGenre ?movieReleaseDate WHERE {
		?movie wdt:P31 wd:Q11424.
		?movie rdfs:label ?movieTitle filter (lang(?movieTitle) = "en").
		?movie wdt:P136 ?genre.
		?genre rdfs:label ?movieGenre filter (lang(?movieGenre) = "en").
		?movie p:P577 ?placeofpublication.
        ?placeofpublication q:P291 wd:Q183. 
        ?placeofpublication s:P577 ?movieReleaseDate.
		FILTER (STR(?movieTitle) = "${movie.title}")
	  } LIMIT 3
	`

	dbpClient.query.select(dbpQuery).then(rows => {
		rows.forEach(row => {
			movie.director = row.directorName.value
			movie.runtime = toRuntime(parseInt(row.runtime.value))
			movie.plot = row.plot.value
			actorList.push(row.actorName.value)
			movie.topCast = actorList.toString()
		})
		//Clearing the array in order to get the right actors connected to the right movie and not mix any actors with movies they don't belong to.
		actorList.length = 0
	}).catch(error => {
		//console.log(error)
	})

	wikidataClient.query.select(wikidataQuery).then(rows => {
		rows.forEach(row => {
			genreList.push(row.movieGenre.value)
			movie.genre = genreList.toString()
			movie.releaseDate = toReleaseYear(row.movieReleaseDate.value)
			//console.log(movie)
		})
		//Clearing the array in order to get the right genres connected to the right movie and not mix any genres with movies they don't belong to.
		genreList.length = 0
	}).catch(error => {
		//console.log(error)
	})
}

const app = express()

app.engine('hbs', expressHandlebars.engine({
	defaultLayout: 'main.hbs'
}))

var hbs = expressHandlebars.create({});

let userRegistered = "";

hbs.handlebars.registerHelper("registerUser", function(username) {
	userRegistered = username;
});

let movieList = [];
// register new function
hbs.handlebars.registerHelper("checkMovie", function(movie, movieLink, creator) {
	console.log(creator);
	var html = "";
	if(creator != userRegistered)
		return ;
	else {
		html += movie;
		return html;
	}
});

let usernames = [];

hbs.handlebars.registerHelper("checkUser", function(username, id, last) {
	var html = "";
	if (!last) {
		if (usernames.includes(username)) {
			return;
		} else {
			usernames.push(username);
			html += '<div class="card mx-2 my-2" style="width: 18rem;\"\><div class="card-body mx-auto"\><h5 class="card-title text-center">' + username + '</h5\><a class="btn btn-primary" href="/users/' + id + '">Visit profile</a\></div\></div>'
			return html;
		}
	} else
		usernames = [];
});

app.use(express.static('public'))

app.get('/', function(request, response){
	response.render('start.hbs')
})

app.get('/users', function(request, response){
	const model = {
		users
	}
	response.render('users.hbs', model)
})

app.get('/users/:id', function(request, response){
	const id = request.params.id // 123
	const model = {
		user: users.find(g => g.id == id),
		moviesInList
	}
	response.render('user.hbs', model)
	console.log(model)
})

app.get('/contact', function(request, response){
	response.render('contact.hbs')
})

app.get('/movies', function(request, response){
	const model = {
		movies
	}
	response.render('movies.hbs', model)
})

// E.g. /games/123
app.get('/movies/:id', function(request, response){
	const id = request.params.id // 123
	const model = {
		movie: movies.find(g => g.id == id)
	}
	response.render('movie.hbs', model)
})

// Catch all other GET requests.
app.get('*', function(request, response){
	response.render('not-found.hbs')
})

app.listen(8080)