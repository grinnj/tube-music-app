	function getCookie(name) {
		var matches = document.cookie.match(new RegExp(
			"(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
		));
		return matches ? decodeURIComponent(matches[1]) : undefined;
	}
let currentSong = 0;
let tracks = JSON.parse(getCookie('playlist'));
document.getElementById("SongTitle").innerHTML=tracks[currentSong].name;
let mediaPath = './audio/';
let extension = '.mpeg';
let audio = document.getElementById("audio1"); //new Audio(mediaPath+currentSong+extension);
audio.src=mediaPath+currentSong+extension;
audio.controls=false;
audio.load();

let seekBar = document.querySelector('.seek-bar');
let playButton = document.querySelector('button.play');
let playButtonIcon = playButton.querySelector('i');
let fillBar = seekBar.querySelector('.fill');

let mouseDown = false;

document.getElementById("btnNext").addEventListener("click", function(){
	audio.pause();
    currentSong=currentSong+1;
	if(currentSong>=tracks.length){currentSong=0;}
	audio.src = mediaPath+currentSong+extension; //new Audio(mediaPath+currentSong+extension);
	document.getElementById("SongTitle").innerHTML=tracks[currentSong].name;
	audio.load();
	audio.play();
});

document.getElementById("btnPrev").addEventListener("click", function(){
	audio.pause();
    currentSong=currentSong-1;
	if(currentSong<0){currentSong=tracks.length-1;}
	audio.src = mediaPath+currentSong+extension; //new Audio(mediaPath+currentSong+extension);
	document.getElementById("SongTitle").innerHTML=tracks[currentSong].name;
	audio.load();
	audio.play();
});

playButton.addEventListener('click', function () {
    if (audio.paused) {
        audio.play();
    } else {
        audio.pause();
    }
});

audio.addEventListener('play', function () {
    playButtonIcon.className = 'ion-pause';
});

audio.addEventListener('ended', function () {
	currentSong=currentSong+1;
	if(currentSong<tracks.length){
		audio.src = mediaPath+currentSong+extension;//new Audio(mediaPath+currentSong+extension);
		document.getElementById("SongTitle").innerHTML=tracks[currentSong].name;
		audio.load();
		audio.play();
	}
});

audio.addEventListener('pause', function () {
    playButtonIcon.className = 'ion-play';
});

audio.addEventListener('timeupdate', function () {
    if (mouseDown) return;

    let p = audio.currentTime / audio.duration;

    fillBar.style.width = p * 100 + '%';
});

function clamp (min, val, max) {
    return Math.min(Math.max(min, val), max);
}

function getP (e) {
    let p = (e.clientX - seekBar.offsetLeft) / seekBar.clientWidth;
    p = clamp(0, p, 1);

    return p;
}

seekBar.addEventListener('mousedown', function (e) {
    mouseDown = true;

    let p = getP(e);

    fillBar.style.width = p * 100 + '%';
});

window.addEventListener('mousemove', function (e) {
    if (!mouseDown) return;

    let p = getP(e);

    fillBar.style.width = p * 100 + '%';
});

window.addEventListener('mouseup', function (e) {
    if (!mouseDown) return;

    mouseDown = false;

    let p = getP(e);

    fillBar.style.width = p * 100 + '%';
	//console.log(audio.currentTime);
    audio.currentTime = p * audio.duration;
});
