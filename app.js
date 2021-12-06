const express = require('express')
const expressHandlebars = require('express-handlebars')

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
}]

const fs = require('fs')
const $rdf = require('rdflib')

const turtleString = fs.readFileSync('users.ttl').toString()

const store = $rdf.graph()

$rdf.parse(
	turtleString,
	store,
	"http://cinemates/owl/users",
	"text/turtle"
)

const stringQuery = `
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

const query = $rdf.SPARQLToQuery(stringQuery, false, store)

const users = store.querySync(query).map(
	userResult => {
		return {
			id: userResult['?id'].value,
			name: userResult['?name'].value,
			email: userResult['?email'].value
		}
	}
)

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