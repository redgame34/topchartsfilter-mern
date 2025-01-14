// MERN = Mongo + Express + React + Node

const express = require('express');

// image
// const path = require('path');
// const fileRoute = require('./routes/file');

// mongo
require('./db/db');

const app = express();

var bodyParser = require("body-parser");
app.use(bodyParser.json({limit: '500kb'}));

// image
/*
app.use(express.static(path.join(__dirname, '..', 'build')));
app.use(fileRoute);
app.get('*', (req, res) => {
	res.sendFile(path.join(__dirname, '..', 'build', 'index.html'));
});
*/

// cors
const cors = require('cors');
app.use(cors());

app.use(express.json());

// image
const path = require('path');
// image
require('dotenv').config();
// image
app.use('/images', express.static(path.join(__dirname, './images'))); // needed to display images from backend

const cron = require('node-cron');
let shell = require('shelljs');

const TopCharts = require('./models/topcharts.model');
const NewReleases = require('./models/newreleases.model');

// const router = require('express').Router();
const axios = require('axios')

let topChartsData = [];
let newReleasesData = [];

/*
* * * * * *
  | | | | | |
  | | | | | day of week
  | | | | month
  | | | day of month
  | | hour
  | minute
  second ( optional )
  */

// Backup a database at 11:59 PM every day
// minute, hour
// 0 0 */23 * * * *
cron.schedule("0 0 */23 * * *", function()
{
	console.log("Scheduler running...");
	getTopCharts();
	getNewReleases();
});

let date_ob = new Date();

// current date
// adjust 0 before single digit date
let date = ("0" + date_ob.getDate()).slice(-2);

// current month
let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);

// current year
let year = date_ob.getFullYear();

const getTopCharts = () => {
	axios.get('http://ax.itunes.apple.com/WebObjects/MZStoreServices.woa/ws/RSS/topfreeapplications/sf=143441/limit=200/genre=6014/json')
	    .then((res) => {
			console.log(res.data);

			topChartsData = res.data.feed.entry;

			writeTopCharts();
		})
		.catch((err) => {
			console.log(err);
		});
};

const writeTopCharts = async () => {
	try {
		await TopCharts.create({
			data: topChartsData,
			date: (year + "-" + month + "-" + date)
		})
		// topChartsData.json({ status: 'ok' })
	} catch (err) {
		// topChartsData.json({ status: 'error', error: 'Duplicate email' })
	}
};

const getNewReleases = () => {
	axios.get('https://itunes.apple.com/us/rss/newapplications/limit=100/json')
	    .then((res) => {
			console.log(res.data);

			newReleasesData = res.data.feed.entry;

			writeNewReleases();
		})
		.catch((err) => {
			console.log(err);
		});
};

const writeNewReleases = async () => {
	try {
		await NewReleases.create({
			data: newReleasesData,
			date: (year + "-" + month + "-" + date)
		})
		// newReleasesData.json({ status: 'ok' })
	} catch (err) {
		// newReleasesData.json({ status: 'error', error: 'Duplicate email' })
	}
};

app.post('/api/top-charts/update', async (req, res) => {
	try {
		await TopCharts.update(
			{ date: req.body.date },
			{ 
				$set: 
				{ 
					data: req.body.data
			    }   
		    }
		)

		return res.json({ status: 'ok' })
	} catch (error) {
		console.log(error)
		res.json({ status: 'error', error: 'invalid date' })
	}
});

app.post('/api/new-releases/update', async (req, res) => {
	try {
		await NewReleases.update(
			{ date: req.body.date },
			{ 
				$set: 
				{ 
					data: req.body.data
			    }   
		    }
		)

		return res.json({ status: 'ok' })
	} catch (error) {
		console.log(error)
		res.json({ status: 'error', error: 'invalid date' })
	}
});

// jsonwebtoken
const jwt = require('jsonwebtoken');
// bcrypt.js
const bcrypt = require('bcryptjs');
// model
const User = require('./models/user.model');

// auth
app.post('/api/register', async (req, res) => {
	console.log(req.body)
	try {
		const newPassword = await bcrypt.hash(req.body.password, 10)

		await User.create({
			name: req.body.name,
			email: req.body.email,
			password: newPassword,
		})
		res.json({ status: 'ok' })
	} catch (err) {
		res.json({ status: 'error', error: 'Duplicate email' })
	}
})
app.post('/api/login', async (req, res) => {
	const user = await User.findOne({
		email: req.body.email,
	})

	if (!user) {
		return { status: 'error', error: 'Invalid login' }
	}

	const isPasswordValid = await bcrypt.compare(
		req.body.password,
		user.password
	)

	if (isPasswordValid) {
		const token = jwt.sign(
			{
				name: user.name,
				email: user.email,
			},
			'secret123'
		)

		return res.json({ status: 'ok', user: token })
	} else {
		return res.json({ status: 'error', user: false })
	}
})

// user
app.get('/api/user', async (req, res) => {
	const token = req.headers['x-access-token']

	try {
		const decoded = jwt.verify(token, 'secret123')
		const email = decoded.email
		const user = await User.findOne({ email: email })

		return res.json({ status: 'ok', 
		    name: user.name, 
			email: user.email, 
			password: user.password, 
			phone: user.phone, 
			title: user.title, 
			currentPosition: user.currentPosition,
		    about: user.about,
		    location: user.location })
	} catch (error) {
		console.log(error)
		res.json({ status: 'error', error: 'invalid token' })
	}
})
app.post('/api/user', async (req, res) => {
	const token = req.headers['x-access-token']

	try {
		const decoded = jwt.verify(token, 'secret123')
		const email = decoded.email
		await User.updateOne(
			{ email: email },
			{ $set: 
				{ 
					name: req.body.name, 
					email: req.body.email, 
					password: req.body.password, 
					phone: req.body.phone,
				    title: req.body.title,
				    currentPosition: req.body.currentPosition,
				    about: req.body.about,
				    location: req.body.location 
			}   }
		)

		return res.json({ status: 'ok' })
	} catch (error) {
		console.log(error)
		res.json({ status: 'error', error: 'invalid token' })
	}
})

// routers
const usersRouter = require('./routes/user');
app.use('/users-data', usersRouter);

const topchartsRouter = require('./routes/topcharts');
app.use('/top-charts', topchartsRouter);

const newreleasesRouter = require('./routes/newreleases');
app.use('/new-releases', newreleasesRouter);

// new
const blogRouter = require('./routes/blog');
app.use('/blogs', blogRouter);

const https = require('https');
const http = require('http');
// const path = reqire('path');
const fs = require('fs');

app.use('/', (req, res, next) => {
	res.send('👙 TopChartsFilter Server Is Working Good 👙');
})

// Listen both http & https ports
const httpServer = http.createServer(app);
httpServer.listen(80, () => {
    console.log('HTTP Server running on port 80');
});

/*
const https_options = {
	ca: fs.readFileSync("ca_bundle.crt"),
	key: fs.readFileSync("private.key"),
	cert: fs.readFileSync("certificate.crt")
};

https.createServer(https_options, function (req, res) {
	console.log('HTTPS Server running on port 3000');
	res.writeHead(200);
	res.end("Welcome to Node.js HTTPS Server");
}).listen(3000)
*/

const httpsServer = https.createServer({
	ca: fs.readFileSync("ca_bundle.crt"),
	key: fs.readFileSync('private.key'),
	cert: fs.readFileSync('certificate.crt'),
}, app);

httpsServer.listen(3000, () => {
    console.log('HTTPS Server running on port 3000');
});

// listen
/*
app.listen(3000, () => {
	console.log('Server started on port: 3000');
})
*/

// "dev": "nodemon index.js",