const express = require('express')
const expressHandlebars = require('express-handlebars')

<<<<<<< HEAD
const movies = [{
	id: 1,
	name: "No Time To Die",
	description: "James Bond is a cool guy not looking back at explosions."
}, {
	id: 2,
	name: "Harry Potter",
	description: "Yer a wizard Harry."
}, {
	id: 3,
	name: "Scarface",
	description: "Gangster guy screaming in Italian."
}, {
	id: 4,
	name: "Mission Impossible",
	description: "Tom Cruise is also a cool guy who does his own stunts."
},{
	id: 5,
	name: "No Time To Die",
	description: "James Bond is a cool guy not looking back at explosions."
}, {
	id: 6,
	name: "Harry Potter",
	description: "Yer a wizard Harry."
}, {
	id: 7,
	name: "Scarface",
	description: "Gangster guy screaming in Italian."
}, {
	id: 8,
	name: "Mission Impossible",
	description: "Tom Cruise is also a cool guy who does his own stunts."
}, {
	id: 9,
	name: "Mission Impossible",
	description: "Tom Cruise is also a cool guy who does his own stunts."
}]
=======

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

const turtleUserString = fs.readFileSync('users.ttl').toString()
const turtleMovieString = fs.readFileSync('movies.ttl').toString()

const store = $rdf.graph()

$rdf.parse(
	turtleUserString,
	store,
	"http://schema.org/Person",
	"text/turtle"
)

$rdf.parse(
	turtleMovieString,
	store,
	"http://cinemates/owl/movies",
	"text/turtle"
)

const userStringQuery = `
	SELECT
		?id
		?name
		?email
	WHERE {
		?user a <http://schema.org/Person> .
		?user <http://schema.org/identifier> ?id .
		?user <http://schema.org/name> ?name .
		?user <http://schema.org/email> ?email .
	}
`
const movieStringQuery = `
	SELECT
		?id
		?label
		?title
	WHERE {
		?movie a <http://cinemates/owl/movies#Movie> .
		?movie <http://cinemates/owl/movies#id> ?id .
		?movie <http://cinemates/owl/movies#label> ?label .
		?movie <http://cinemates/owl/movies#title> ?title .
	}
`
const userQuery = $rdf.SPARQLToQuery(userStringQuery, false, store)
const movieQuery = $rdf.SPARQLToQuery(movieStringQuery, false, store)

const users = store.querySync(userQuery).map(
	userResult => {
		return {
			id: userResult['?id'].value,
			name: userResult['?name'].value,
			email: userResult['?email'].value,
		}
	}
)

const movies = store.querySync(movieQuery).map(
	movieResult => {
		return {
			id: movieResult['?id'].value,
			label: movieResult['?label'].value,
			title: movieResult['?title'].value
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

	SELECT DISTINCT ?movie ?movieTitle ?movieGenre ?releaseDate WHERE {
		?movie wdt:P31 wd:Q11424.
		?movie rdfs:label ?movieTitle filter (lang(?movieTitle) = "en").
		?movie wdt:P136 ?genre.
		?genre rdfs:label ?movieGenre filter (lang(?movieGenre) = "en").
		?movie p:P577 ?placeofpublication.
        ?placeofpublication q:P291 wd:Q183. 
        ?placeofpublication s:P577 ?releaseDate.
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
		console.log(error)
	})

	wikidataClient.query.select(wikidataQuery).then(rows => {
		rows.forEach(row => {
			genreList.push(row.movieGenre.value)
			movie.genre = genreList.toString()
			movie.releaseDate = toReleaseYear(row.releaseDate.value)
			console.log(movie)
		})
		//Clearing the array in order to get the right genres connected to the right movie and not mix any genres with movies they don't belong to.
		genreList.length = 0
	}).catch(error => {
		console.log(error)
	})
}
>>>>>>> 132240c349cf0fe521352b4f53404c81021fc6d5

const app = express()


app.engine('hbs', expressHandlebars.engine({
	defaultLayout: 'main.hbs'
}))

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
		user: users.find(g => g.id == id)
	}
	response.render('user.hbs', model)
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