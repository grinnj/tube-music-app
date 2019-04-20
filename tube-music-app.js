

const PORT = process.env.PORT || 80 //heroku port
const audioExt='mpeg'
// Dependencies.
const express = require('express')
const fs = require('fs')
const path = require('path')
//const youtubeAudioStream = require('youtube-audio-stream')
const ytdl = require('ytdl-core')
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const app = express()
const http = require('http');
const https = require('https');
var ssl=true;
if(ssl){
try{
	var privateKey  = fs.readFileSync('sslcert/private.key', 'utf8');
	var certificate = fs.readFileSync('sslcert/server.crt', 'utf8');
	const credentials = {key: privateKey, cert: certificate};//ssl certificate
}catch(err){
	ssl=false;
}}

//const passport = require('passport')
//const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session')
const crypto = require('crypto');
const genuuid = require('uuid');
const mysql = require('mysql');
const cors = require('cors');

var whitelist = ['http://example1.com', 'http://example2.com']

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

/*app.use(cors());
app.options('*', cors());{
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }));*/

/*var db = new sqlite3.Database('./database.sqlite3', (err) => {
      if (err) {
        console.log('Could not connect to database', err)
      } else {
        console.log('Connected to database')
      }
    });*/
var db = mysql.createConnection({
  host: "eu-cdbr-west-02.cleardb.net",
  user: "b77b308d24ec7f",
  password: "535bc240",
  database: "heroku_99a46f4a9f368b0"
});

db.connect(function(err) {
  if (err) {
        console.log('Could not connect to database', err)
      } else {
        console.log('Connected to database')
		db.query(`CREATE TABLE IF NOT EXISTS users (id INT PRIMARY KEY AUTO_INCREMENT, username VARCHAR(255), password VARCHAR(255), salt VARCHAR(255))`,function (err, result) {
			if (err) throw err;
				console.log("Table users created");
			});
      }
});

//const uuid = require('uuid/v1');
//const RedisStore = require('connect-redis')(session)
function hashPassword(password, salt) {
  var hash = crypto.createHash('sha256');
  hash.update(password);
  hash.update(salt);
  return hash.digest('hex');
}

var auth = (req, res, next) => {//добавить проверку юзера и пароля
	let cookie = false
	if (req.session.user && req.cookies.user_sid) {
		var userName=req.session.user.username;
		var pass=req.session.user.password;
		cookie=true;
	}else{
		var userName=req.body.username;
		var pass=req.body.password;
		cookie=false;
	}
	
	let salt = 'Hello'
	
	db.query(`SELECT username FROM users WHERE username = '${userName}' AND password = '${pass}'`, function(err, row) {//problemo
		if(err) throw err;
		if(row){
			if (cookie==false) {
				let user = {username:userName, password:pass};
				req.session.user = user;
			}
			console.log(`user ${userName} logined`);
			next();}
		else{
			res.redirect('/');}
	})
}

app.set('view engine', 'ejs');

app.use('/client', express.static(path.join(__dirname, '/client')))

app.use(bodyParser.urlencoded({extended: false}))
app.use(cookieParser());
app.use(bodyParser.json())

app.use(session({
  genid: function(req) {return genuuid()},
  key: 'user_sid',
  secret: 'Dodik',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}))

app.use((req, res, next) => {
    if (req.cookies.user_sid && !req.session.user) {
        res.clearCookie('user_sid');
		res.clearCookie('playlist');        
    }
    next();
});

app.get('/', (req, res) => {
  if (req.session.user && req.cookies.user_sid) {
        res.redirect('/home')
    } else {
        res.render('login.ejs')
    };
})

app.post('/login', auth,  (req, res) => {
        res.redirect('/home')
    });

app.get('/home', auth, (request, response) => {
	let Links=[];
	Links[0]={};Links[0].name='Your playlist is empty right now.';
	let username=request.session.user.username;
	let buffer = JSON.parse(fs.readFileSync(`./users/${username}/${username}.json`, 'utf8'));
	if(!buffer.isEmpty){
		for(i=0;i<buffer.playlist.length;i++){
			Links[i]={};
			Links[i].name=`${buffer.playlist[i].snippet.title}`;
			Links[i].url=`/audio/${buffer.playlist[i].snippet.position}.${audioExt}`;
			//playList=playList+`\n<a href='/audio/${buffer.playlist[i].snippet.position}'>${buffer.playlist[i].snippet.title}</a>`
		}
	}
	response.render('home.ejs',{
		links:Links
	});
})

app.post('/register', (req, res) => {
	var username = req.body.register_username
	var salt = 'Hello'
	var pass =req.body.register_password;
	//var hash = hashPassword(pass, salt);
	db.query(`SELECT username FROM users WHERE username = '${username}'`, function(err, row) {//no problemo
		if(row){ res.redirect('/');}//res.render('/register_error')
			else{
		db.query(`INSERT INTO users (username, password, salt) VALUES('${username}','${pass}','${salt}')`,function (err, result) {
			if (err) throw err;
				console.log(`user ${username} registered successfully.`);
			});//no problemO
		try{
			fs.mkdirSync(path.join(__dirname,`./users/${username}`))
			let buffer = {};
			buffer.isEmpty=true;
			fs.writeFileSync(path.join(__dirname,`./users/${username}/${username}.json`),JSON.stringify(buffer))
		}catch(err){console.error(err)}
		let user = {username:username, password:pass};
		req.session.user = user;
			res.redirect('/');}
	})
});

app.get('/logout', (req, res) => {
    if (req.session.user && req.cookies.user_sid) {
        res.clearCookie('user_sid');
        res.redirect('/');
    } else {
        res.redirect('/');
    }
});

app.post('/newPlaylist', auth, (req, res) =>{
	let username=req.session.user.username;
	let plylist = JSON.parse(fs.readFileSync(`./users/${username}/${username}.json`, 'utf8'));
	let url=req.body.playlistUrl.split("list=");
	if((plylist.isEmpty==false)&&(plylist.playlist[0].snippet.playlistId!==url[1])){
		deleteFolderRecursive(path.join(__dirname,`./users/${username}`));
		createFolder(username);
	}
	let superagent = require('superagent');
	superagent.get(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${url[1]}&key=AIzaSyB7O-2biEX4Opc2WCWN58hv_hCbZrq8FcQ&maxResults=50`).accept('json')
	.then((result)=>{
		let buffer={};
		buffer.current=0;
		buffer.isEmpty=false;
		buffer.playlist=JSON.parse(result.text).items;
		
	
		fs.writeFile(`./users/${username}/${username}.json`, JSON.stringify(buffer),(err)=>{if(err)console.error(err);});
		try{downloadPlaylist(buffer, username, 0);}catch(err){console.error(err);}
		res.redirect('/home');//should be render
	}).catch(console.error)
})

app.get(('/audio/:videoId.'+audioExt), auth, (request, response) => {
	let videoId = request.params.videoId
	let username=request.session.user.username;
	let buffer = JSON.parse(fs.readFileSync(`./users/${username}/${username}.json`, 'utf8'));
	let fileName = path.join(__dirname, `./users/${username}/`, `${buffer.playlist[videoId].snippet.resourceId.videoId}.${audioExt}`)
	if(fs.existsSync(fileName)){
		
			let stat = fs.statSync(fileName);
			let fileSize = stat.size;
			let range = request.headers.range;
			if(range){
				const parts = range.replace(/bytes=/, "").split("-")
				const start = parseInt(parts[0], 10)
				const end = parts[1] 
					? parseInt(parts[1], 10)
					: fileSize-1
				const chunksize = (end-start)+1
				const file = fs.createReadStream(fileName, {start, end})
				const head = {
					'Content-Range': `bytes ${start}-${end}/${fileSize}`,
					'Accept-Ranges': 'bytes',
					'Content-Length': chunksize,
					'Content-Type': `audio/${audioExt}`
				}
				response.writeHead(206, head);
				file.pipe(response);
			}else{
				response.writeHead(200, {
				'Content-Type': `audio/${audioExt}`,
				'Content-Length': fileSize
				});
		//response.download(fileName);
				fs.createReadStream(fileName).pipe(response)
		/*readStream.on('end', () => {
			// Do processing before piping the file back to the client.
			let nextVid=videoId+1;
			if(nextVid>buffer.playlist.length){nextVid=0;}
			response.redirect(`/audio/${nextVid}`)
		})*/
			}
	}else{response.status(500).send('File not exist. Try later, or load another playlist!');}
})

async function downloadPlaylist(buffer, username, videoIndex){
	//let buffer = JSON.parse(fs.readFileSync(`./users/${username}/${username}.json`, 'utf8'));
		let videoId = buffer.playlist[videoIndex].snippet.resourceId.videoId;
		let fileName = path.join(__dirname, `./users/${username}/`, `${videoId}.${audioExt}`)
		let videoUrl = `https://www.youtube.com/watch?v=${videoId}`
		try {
			if(!fs.existsSync(fileName)){
				let writeStream = fs.createWriteStream(fileName)
				ytdl(videoUrl, {filter: "audioonly"}).pipe(writeStream)
				writeStream.on('finish', () => {
				// Do processing before piping the file back to the client.
				if(videoIndex<(buffer.playlist.length-1)){
					downloadPlaylist(buffer, username, (videoIndex+1));
				}
				})
			}else{
				if(videoIndex<(buffer.playlist.length-1)){
					downloadPlaylist(buffer, username, (videoIndex+1));
				}
			}
		} catch (exception) {
			console.error(exception)
			//response.status(500).send(exception)
		}
}

app.get('/play', auth, (req, res)=>{
	let tracks = [];
	let username=req.session.user.username;
	let buffer = JSON.parse(fs.readFileSync(`./users/${username}/${username}.json`, 'utf8'));
	for(i=0;i<buffer.playlist.length;i++){
		let	track={}
		track.track=1+i;
		track.name=buffer.playlist[i].snippet.title;
		track.duration=3;
		track.file=buffer.playlist[i].snippet.resourceId.videoId
		tracks[i]=track;
	}
	res.cookie('playlist',JSON.stringify(tracks),{ secure: false })
	res.render('play.ejs')//{racks:tracks})
})

function deleteFolderRecursive(path) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function(file, index){
      var curPath = path + "/" + file;
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

function createFolder(username){
	fs.mkdirSync(path.join(__dirname,`./users/${username}`)).then(()=>{
		let buffer = {};
		buffer.isEmpty=true;
		fs.writeFileSync(path.join(__dirname,`./users/${username}/${username}.json`),JSON.stringify(buffer))
	})
}

/*app.get('/home.html', (request, response) => {
	response.sendFile(path.join(__dirname, 'home.html'))
})

app.get('/login.html', (request, response) => {
	response.sendFile(path.join(__dirname, 'login.html'))
})

app.get('/users/:username', (request, response) => {
	const username = request.params.username
	const login = username.split(';')[0]
	const pass = username.split(';')[1]
	const fileName = path.join(__dirname, 'users', `${login}.json`)
	if(!fs.existsSync(fileName)){
		response.redirect('back')
		console.error('redirected back')
	}else{
		response.redirect('/home.html')
		console.error('redirected to home')
	}
	response.end
})*/

// Starts the server.
if(ssl){
	var httpsServer = https.createServer(credentials, app);
	httpsServer.listen(PORT, function(){
		console.log(`Starting https server on port ${PORT}`)
	});
}else{
	var httpServer = http.createServer(app);
	httpServer.listen(PORT, () => {
		console.log(`Starting http server on port ${PORT}`)
	});
}
