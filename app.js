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

const app = express()

app.engine('hbs', expressHandlebars.engine({
	defaultLayout: 'main.hbs'
}))

app.use(express.static('public'))

app.get('/', function(request, response){
	response.render('start.hbs')
})

app.get('/about', function(request, response){
	response.render('about.hbs')
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