const express = require('express')
const expressHandlebars = require('express-handlebars')


const fs = require('fs')
const $rdf = require('rdflib')

function toRuntime(seconds) {
	var date = new Date(null)
	date.setSeconds(seconds)
	hour = date.toISOString().substr(12, 1)
	minutes = date.toISOString().substr(14, 2)
	return (hour.concat("h", " ", minutes, "m"))
}

const turtleUserString = fs.readFileSync('users.ttl').toString()
const turtleMovieString = fs.readFileSync('movies.ttl').toString()

const store = $rdf.graph()

$rdf.parse(
	turtleUserString,
	store,
	"http://cinemates/owl/users",
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
		?user a <http://cinemates/owl/users#User> .
		?user <http://cinemates/owl/users#id> ?id .
		?user <http://cinemates/owl/users#name> ?name .
		?user <http://cinemates/owl/users#email> ?email .
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
			email: userResult['?email'].value
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

const client = new ParsingClient({
	endpointUrl: 'https://dbpedia.org/sparql'
})

for(const movie of movies){
	
	const query = `
		SELECT
			?director
			?runtime
		WHERE {
			?movie rdfs:label "${movie.label}"@en .
			?movie dbo:director ?director .
			?movie dbp:runtime ?runtime .
		}
	`
	///Problem: Several movies have the same name, will give multiple directors and runtime
	client.query.select(query).then(rows => {
		movie.director = ''
		rows.forEach(row => {
			movie.director = row.director.value
			movie.runtime = toRuntime(parseInt(row.runtime.value))
			console.log(movie)
		})
	}).catch(error => {
		console.log(error)
	})
}

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